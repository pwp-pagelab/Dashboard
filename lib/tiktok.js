import { getClientById } from '../data/clients.js'

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
  } else if (range === 'max' && client?.reportingStartDate) {
    startDate.setTime(new Date(client.reportingStartDate).getTime())
  } else {
    startDate.setDate(endDate.getDate() - 30)
  }

  return {
    start_date: formatDate(startDate),
    end_date: formatDate(endDate)
  }
}

export async function getTikTokData({ clientId, range = '30d' } = {}) {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN
  if (!accessToken) return null

  const client = getClientById(clientId)
  if (!client?.tiktokAdvertiserId) return null

  const { start_date, end_date } = getDateRange(range, client)

  const params = new URLSearchParams({
    advertiser_id: client.tiktokAdvertiserId,
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

  const metrics = row.metrics || row

  return {
    platform: 'TikTok',
    campaign: client.name,
    spend: safeNum(metrics.spend),
    impressions: safeNum(metrics.impressions),
    clicks: safeNum(metrics.clicks),
    ctr: safeNum(metrics.ctr),
    cpc: safeNum(metrics.cpc),
    conversions: safeNum(metrics.conversion)
  }
}
