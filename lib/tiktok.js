import { getClientById } from '../data/clients.js'

const REPORTING_START_DATE = '2026-01-01'
const TIKTOK_MAX_CHUNK_DAYS = 180

function safeNum(value) {
  return Number(value || 0)
}

function formatDate(date) {
  return date.toISOString().slice(0, 10)
}

function getDateRange(range, client) {
  const endDate = new Date()
  const startDate = new Date()

  if (range === '7d') {
    startDate.setDate(endDate.getDate() - 7)
  } else if (range === 'this_month') {
    startDate.setDate(1)
  } else if (range === 'max') {
    startDate.setTime(new Date(client?.platformStartDates?.tiktok || client?.reportingStartDate || REPORTING_START_DATE).getTime())
  } else {
    startDate.setDate(endDate.getDate() - 30)
  }

  return {
    start_date: formatDate(startDate),
    end_date: formatDate(endDate)
  }
}

function splitDateRange(startDate, endDate) {
  const chunks = []
  let cursor = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T00:00:00.000Z`)

  while (cursor <= end) {
    const chunkStart = new Date(cursor)
    const chunkEnd = new Date(cursor)
    chunkEnd.setUTCDate(chunkEnd.getUTCDate() + TIKTOK_MAX_CHUNK_DAYS - 1)
    if (chunkEnd > end) chunkEnd.setTime(end.getTime())

    chunks.push({
      start_date: formatDate(chunkStart),
      end_date: formatDate(chunkEnd)
    })

    cursor = new Date(chunkEnd)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return chunks
}

async function fetchTikTokMetrics({ accessToken, advertiserId, start_date, end_date }) {
  const params = new URLSearchParams({
    advertiser_id: advertiserId,
    report_type: 'BASIC',
    data_level: 'AUCTION_ADVERTISER',
    dimensions: JSON.stringify(['advertiser_id']),
    metrics: JSON.stringify(['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'conversion']),
    start_date,
    end_date,
    page: '1',
    page_size: '100'
  })

  const response = await fetch(
    `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    }
  )

  const text = await response.text()

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`TikTok returned non-JSON response: ${text.slice(0, 300)}`)
  }

  if (!response.ok || data.code !== 0) {
    throw new Error(data.message || 'TikTok API error')
  }

  const row = data?.data?.list?.[0]
  if (!row) return null

  return row.metrics || row
}

function sumTikTokMetrics(metricsRows) {
  const totals = metricsRows.reduce(
    (acc, metrics) => {
      acc.spend += safeNum(metrics.spend)
      acc.impressions += safeNum(metrics.impressions)
      acc.clicks += safeNum(metrics.clicks)
      acc.conversions += safeNum(metrics.conversion)
      return acc
    },
    {
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0
    }
  )

  return {
    spend: totals.spend,
    impressions: totals.impressions,
    clicks: totals.clicks,
    conversion: totals.conversions,
    ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0
  }
}

export async function getTikTokData({ clientId, range = '30d', advertiserId = null, clientName = null } = {}) {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN
  if (!accessToken) return null

  const client = getClientById(clientId)
  const effectiveAdvertiserId = advertiserId || client?.tiktokAdvertiserId
  if (!effectiveAdvertiserId) return null

  const { start_date, end_date } = getDateRange(range, client)
  const chunks = range === 'max' ? splitDateRange(start_date, end_date) : [{ start_date, end_date }]
  const chunkResults = []

  for (const chunk of chunks) {
    const metrics = await fetchTikTokMetrics({
      accessToken,
      advertiserId: effectiveAdvertiserId,
      ...chunk
    })

    if (metrics) {
      chunkResults.push({
        ...chunk,
        metrics
      })
    }
  }

  if (!chunkResults.length) return null

  const metrics = sumTikTokMetrics(chunkResults.map((result) => result.metrics))

  return {
    platform: 'TikTok',
    campaign: clientName || client.name,
    spend: safeNum(metrics.spend),
    impressions: safeNum(metrics.impressions),
    clicks: safeNum(metrics.clicks),
    ctr: safeNum(metrics.ctr),
    cpc: safeNum(metrics.cpc),
    conversions: safeNum(metrics.conversion),
    tiktokAdvertiserId: String(effectiveAdvertiserId),
    tiktokDateRange: {
      start: start_date,
      end: end_date
    },
    tiktokRawMetrics: metrics,
    tiktokChunks: chunkResults
  }
}
