import { getClientById } from '../data/clients.js'
import { getMetaAccessTokenForBusiness } from './metaAccounts.js'
import { getMetaActionBreakdown } from './meta.js'
import { getGoogleAccessToken, runGoogleQuery } from './googleAds.js'
import { getSnapAccessToken } from './snapchat.js'
import { classifyGoogleLeadAction } from './leads.js'
import { buildLinkedInUrl } from './linkedin.js'

const GRAPH = 'https://graph.facebook.com/v25.0'
const SNAP = 'https://adsapi.snapchat.com/v1'
const TIKTOK = 'https://business-api.tiktok.com/open_api/v1.3'
const MAX_PAGES = 5
const num = (value) => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value)
const sum = (...values) => values.every((v) => v == null) ? null : values.reduce((total, v) => total + (num(v) || 0), 0)
const suffix = (id) => String(id).toUpperCase().replace(/[^A-Z0-9]+/g, '_')
const envFor = (prefix, clientId) => process.env[`${prefix}_${suffix(clientId)}`] || ''
const bearer = (token) => ({ Authorization: `Bearer ${token}` })
const url = (base, params = {}) => `${base}?${new URLSearchParams(params)}`
const endExclusive = (end) => new Date(new Date(`${end}T00:00:00Z`).getTime() + 86400000).toISOString()
const liHeaders = () => ({
  ...bearer(process.env.LINKEDIN_ACCESS_TOKEN),
  'LinkedIn-Version': process.env.LINKEDIN_API_VERSION || '202604',
  'X-Restli-Protocol-Version': '2.0.0'
})

// Never return API error bodies, request URLs, or tokens to public dashboards.
async function request(target, options = {}, ctx) {
  const response = await ctx.fetchImpl(target, { ...options, signal: ctx.signal })
  if (!response.ok) {
    const error = new Error(response.status === 401 || response.status === 403
      ? 'Account authorization or read permission is missing. Reconnect this account with the required read scope.'
      : `Platform request failed (HTTP ${response.status}). Check the account mapping and try again.`)
    error.status = response.status
    throw error
  }
  const data = await response.json()
  if (data.error && data.error.code !== 'ok' || data.code != null && Number(data.code) !== 0 ||
      ['ERROR', 'PARTIAL'].includes(String(data.request_status || '').toUpperCase()) ||
      ['ads', 'total_stats', 'spotlights'].some((key) => data[key]?.some((item) =>
        ['ERROR', 'PARTIAL'].includes(String(item.sub_request_status || '').toUpperCase())))) {
    throw new Error('The platform rejected this request. Check account access, read scopes, and reporting availability.')
  }
  return data
}

// Follow only same-origin pagination URLs: credentials must never leave the provider.
async function pages(target, options, ctx, pick = (data) => data.data || []) {
  const output = []
  const origin = new URL(target).origin
  for (let page = 0; target && page < MAX_PAGES; page++) {
    if (new URL(target).origin !== origin) throw new Error('Invalid platform pagination URL.')
    const data = await request(target, options, ctx)
    output.push(...pick(data))
    target = data.paging?.next || data.paging?.next_link || null
  }
  if (target) ctx.partial = true
  return output
}

function requireValue(value, message) {
  if (!value) throw new Error(message)
  return value
}

export function scopeContentAccounts(accounts, { lockedAccount = null, platform = 'all' } = {}) {
  const seen = new Set()
  return accounts.filter((account) => {
    if (platform !== 'all' && account.platform !== platform) return false
    if (lockedAccount && (account.platform !== lockedAccount.platform ||
        String(account.accountId) !== String(lockedAccount.accountId))) return false
    const key = `${account.clientId}:${account.platform}:${account.accountId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function filterPublishedPosts(posts, startDate, endDate) {
  return posts.filter((post) => {
    if (!post.publishedAt) return false
    const date = new Date(post.publishedAt)
    if (!Number.isFinite(date.getTime())) return false
    const day = date.toISOString().slice(0, 10)
    return day >= startDate && day <= endDate
  })
}

export function rankAds(ads) {
  return ads.filter((ad) => ad.adId && (ad.clicks > 0 || ad.impressions > 0 || ad.spend > 0 || ad.leads > 0))
    .sort((a, b) => {
      const leadDifference = (b.leads || 0) - (a.leads || 0)
      if (leadDifference) return leadDifference
      if (a.leads > 0 && b.leads > 0 && a.currencyCode && a.currencyCode === b.currencyCode &&
          a.spend != null && b.spend != null) return a.spend / a.leads - b.spend / b.leads || b.clicks - a.clicks
      return (b.clicks || 0) - (a.clicks || 0) || (b.impressions || 0) - (a.impressions || 0)
    })
}

async function metaAds(account, ctx) {
  const client = getClientById(account.clientId)
  const keys = [...new Set([account.businessKey, ...(client?.metaBusinessKeys || []), client?.metaBusinessKey].filter(Boolean))]
  const tokens = [...new Set(keys.map(getMetaAccessTokenForBusiness).filter(Boolean))]
  requireValue(tokens.length, 'Meta ad-account token is not configured.')
  let lastError
  for (const token of tokens) {
    try {
      const rows = await pages(url(`${GRAPH}/act_${String(account.accountId).replace(/^act_/, '')}/insights`, {
        level: 'ad', fields: 'ad_id,ad_name,campaign_name,adset_name,account_currency,spend,impressions,reach,clicks,actions',
        time_range: JSON.stringify({ since: ctx.startDate, until: ctx.endDate }),
        action_report_time: 'conversion', use_account_attribution_setting: 'true', limit: '100'
      }), { headers: bearer(token) }, ctx)
      return rows.map((row) => {
        const actions = getMetaActionBreakdown(row.actions)
        return { adId: row.ad_id, name: row.ad_name || null, campaign: row.campaign_name,
          adGroup: row.adset_name, currencyCode: row.account_currency, spend: num(row.spend),
          reach: num(row.reach), impressions: num(row.impressions), clicks: num(row.clicks),
          leads: actions.leads + actions.messagingConversations }
      })
    } catch (error) { lastError = error }
  }
  throw lastError
}

async function tiktokAds(account, ctx) {
  const token = requireValue(process.env.TIKTOK_ACCESS_TOKEN, 'TikTok advertiser authorization is missing.')
  const headers = { 'Access-Token': token }
  const rows = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await request(url(`${TIKTOK}/report/integrated/get/`, {
      advertiser_id: account.accountId, report_type: 'BASIC', data_level: 'AUCTION_AD',
      dimensions: JSON.stringify(['ad_id']),
      metrics: JSON.stringify(['ad_name', 'campaign_name', 'spend', 'impressions', 'clicks', 'onsite_form']),
      start_date: ctx.startDate, end_date: ctx.endDate, page: String(page), page_size: '100'
    }), { headers }, ctx)
    rows.push(...(data.data?.list || []))
    if (page >= Number(data.data?.page_info?.total_page || 1)) break
    if (page === MAX_PAGES) ctx.partial = true
  }
  return rows.map((row) => ({
    adId: row.dimensions?.ad_id, name: row.metrics?.ad_name || null, campaign: row.metrics?.campaign_name,
    spend: num(row.metrics?.spend), currencyCode: account.currencyCode || null,
    impressions: num(row.metrics?.impressions), clicks: num(row.metrics?.clicks),
    leads: num(row.metrics?.onsite_form), leadNote: 'TikTok instant-form leads; other lead types are not included in this ad-level metric.'
  }))
}

async function snapchatAds(account, ctx) {
  const token = requireValue(await getSnapAccessToken({ signal: ctx.signal }), 'Snapchat authorization is missing.')
  const options = { headers: bearer(token) }
  const [definitions, stats] = await Promise.all([
    pages(url(`${SNAP}/adaccounts/${account.accountId}/ads`, { limit: '100' }), options, ctx, (d) => (d.ads || []).map((a) => a.ad)),
    pages(url(`${SNAP}/adaccounts/${account.accountId}/stats`, {
      granularity: 'TOTAL', breakdown: 'ad', fields: 'impressions,swipes,spend',
      start_time: `${ctx.startDate}T00:00:00Z`, end_time: endExclusive(ctx.endDate)
    }), options, ctx, (d) => (d.total_stats || []).flatMap((s) => s.total_stat?.breakdown_stats?.ad || []))
  ])
  const names = new Map(definitions.filter(Boolean).map((ad) => [ad.id, ad]))
  return stats.map((row) => ({ adId: row.id, name: names.get(row.id)?.name || null,
    spend: num(row.stats?.spend) == null ? null : num(row.stats.spend) / 1e6,
    currencyCode: account.currencyCode || null, impressions: num(row.stats?.impressions),
    clicks: num(row.stats?.swipes), leads: null }))
}

async function googleAds(account, ctx) {
  const token = await getGoogleAccessToken({ signal: ctx.signal })
  const query = `SELECT ad_group_ad.ad.id, ad_group_ad.ad.name,
    ad_group_ad.ad.responsive_search_ad.headlines, campaign.name, ad_group.name,
    customer.currency_code, metrics.impressions, metrics.clicks, metrics.cost_micros
    FROM ad_group_ad WHERE segments.date BETWEEN '${ctx.startDate}' AND '${ctx.endDate}'
    ORDER BY metrics.impressions DESC LIMIT 500`
  const chunks = await runGoogleQuery(account.accountId, token, process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    account.loginCustomerId || process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID, query, { signal: ctx.signal })
  const rows = chunks.flatMap((chunk) => chunk.results || [])
  if (rows.length === 500) ctx.partial = true
  // Conversion-action categories keep purchases and calls out of the lead column.
  let leadRows = null
  try {
    const leadChunks = await runGoogleQuery(account.accountId, token, process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      account.loginCustomerId || process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
      `SELECT ad_group_ad.ad.id, segments.conversion_action_category, segments.conversion_action_name,
        metrics.conversions FROM ad_group_ad
        WHERE segments.date BETWEEN '${ctx.startDate}' AND '${ctx.endDate}'`, { signal: ctx.signal })
    leadRows = leadChunks.flatMap((chunk) => chunk.results || [])
  } catch { ctx.partial = true }
  return rows.map((row) => {
    const ad = row.adGroupAd?.ad || {}
    const headline = ad.responsiveSearchAd?.headlines?.map((h) => h.text).join(' · ')
    return { adId: String(ad.id || ''), name: ad.name || headline || null,
      nameSource: ad.name ? 'ad_name' : headline ? 'headline' : 'unavailable',
      campaign: row.campaign?.name, adGroup: row.adGroup?.name, currencyCode: row.customer?.currencyCode,
      spend: num(row.metrics?.costMicros) == null ? null : Number(row.metrics.costMicros) / 1e6,
      impressions: num(row.metrics?.impressions), clicks: num(row.metrics?.clicks),
      leads: leadRows == null ? null : leadRows.filter((item) => String(item.adGroupAd?.ad?.id) === String(ad.id) &&
        classifyGoogleLeadAction({ category: item.segments?.conversionActionCategory, name: item.segments?.conversionActionName }))
        .reduce((total, item) => total + Number(item.metrics?.conversions || 0), 0) }
  })
}

async function linkedinAds(account, ctx) {
  requireValue(process.env.LINKEDIN_ACCESS_TOKEN, 'LinkedIn ad authorization is missing.')
  const datePart = (date) => { const [year, month, day] = date.split('-').map(Number); return `(year:${year},month:${month},day:${day})` }
  const result = await request(buildLinkedInUrl('/rest/adAnalytics', {
    q: 'analytics', pivot: 'CREATIVE', timeGranularity: 'ALL',
    accounts: `List(urn:li:sponsoredAccount:${account.accountId})`,
    dateRange: `(start:${datePart(ctx.startDate)},end:${datePart(ctx.endDate)})`,
    fields: 'pivotValues,costInLocalCurrency,impressions,clicks,oneClickLeads,leadGenerationMailContactInfoShares'
  }), { headers: liHeaders() }, ctx)
  const definitions = []
  let pageToken = ''
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await request(buildLinkedInUrl(`/rest/adAccounts/${account.accountId}/creatives`, {
      q: 'criteria', pageSize: '100', ...(pageToken ? { pageToken } : {})
    }), { headers: { ...liHeaders(), 'X-RestLi-Method': 'FINDER' } }, ctx)
    definitions.push(...(data.elements || []))
    pageToken = data.metadata?.nextPageToken || ''
    if (!pageToken) break
  }
  if (pageToken) ctx.partial = true
  const key = (value) => String(value || '').split(':').pop()
  const names = new Map(definitions.map((ad) => [key(ad.id), ad]))
  if ((result.elements || []).length >= 15000) ctx.partial = true
  return (result.elements || []).map((row) => {
    const id = key(row.pivotValues?.[0])
    const creative = names.get(id)
    return { adId: id, name: creative?.name || null, campaign: creative?.campaign || null,
      spend: num(row.costInLocalCurrency), currencyCode: account.currencyCode || null,
      impressions: num(row.impressions), clicks: num(row.clicks),
      leads: Math.max(num(row.oneClickLeads) || 0, num(row.leadGenerationMailContactInfoShares) || 0) }
  })
}

const paidAdapters = { meta: metaAds, tiktok: tiktokAds, google: googleAds, snapchat: snapchatAds, linkedin: linkedinAds }

async function publishedPosts(account, ctx) {
  const client = getClientById(account.clientId)
  const social = client?.socialAccounts || {}
  const id = account.clientId
  if (account.platform === 'meta') {
    const pageId = social.facebookPageId || envFor('FACEBOOK_PAGE_ID', id)
    const instagramId = social.instagramAccountId || envFor('INSTAGRAM_ACCOUNT_ID', id)
    requireValue(pageId || instagramId, 'Connect this client’s Facebook Page ID / Instagram professional account ID to read published posts. Ad-account access alone does not identify the social profile.')
    const token = requireValue(envFor('META_PAGE_ACCESS_TOKEN', id) || getMetaAccessTokenForBusiness(account.businessKey),
      'A Page token with pages_read_engagement and instagram_basic is required.')
    const outputs = await Promise.allSettled([
      ...(pageId ? [pages(url(`${GRAPH}/${encodeURIComponent(pageId)}/published_posts`, {
        fields: 'id,message,created_time,permalink_url,full_picture',
        since: `${ctx.startDate}T00:00:00Z`, until: endExclusive(ctx.endDate), limit: '100'
      }), { headers: bearer(token) }, ctx).then((items) => items.map((p) => ({
        id: p.id, title: p.message || 'Facebook post', channel: 'Facebook', publishedAt: p.created_time,
        url: p.permalink_url, thumbnailUrl: p.full_picture
      })))] : []),
      ...(instagramId ? [pages(url(`${GRAPH}/${encodeURIComponent(instagramId)}/media`, {
        fields: 'id,caption,timestamp,permalink,media_type,media_url,thumbnail_url,like_count,comments_count', limit: '100'
      }), { headers: bearer(token) }, ctx).then((items) => items.map((p) => ({
        id: p.id, title: p.caption || 'Instagram post', channel: 'Instagram', publishedAt: p.timestamp,
        url: p.permalink, thumbnailUrl: p.thumbnail_url || (p.media_type !== 'VIDEO' ? p.media_url : null),
        engagements: sum(p.like_count, p.comments_count), metricNote: 'Lifetime likes + comments'
      })))] : [])
    ])
    if (outputs.every((r) => r.status === 'rejected')) throw outputs[0].reason
    if (outputs.some((r) => r.status === 'rejected')) ctx.partial = true
    return outputs.flatMap((r) => r.status === 'fulfilled' ? r.value : [])
  }
  if (account.platform === 'tiktok') {
    // Display API tokens are user-specific; never reuse the agency advertiser token.
    const token = requireValue(envFor('TIKTOK_CONTENT_ACCESS_TOKEN', id),
      'Connect this client’s TikTok profile using a Display API token with video.list. The advertising token cannot read its published videos.')
    const posts = []
    let cursor = new Date(endExclusive(ctx.endDate)).getTime()
    for (let page = 0; page < MAX_PAGES; page++) {
      const data = await request(url('https://open.tiktokapis.com/v2/video/list/', {
        fields: 'id,title,video_description,create_time,share_url,cover_image_url,view_count,like_count,comment_count,share_count'
      }), { method: 'POST', headers: { ...bearer(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_count: 20, cursor }) }, ctx)
      posts.push(...(data.data?.videos || []).map((p) => ({
        id: p.id, title: p.title || p.video_description || 'TikTok video', channel: 'TikTok',
        publishedAt: new Date(p.create_time * 1000).toISOString(), url: p.share_url, thumbnailUrl: p.cover_image_url,
        views: num(p.view_count), engagements: sum(p.like_count, p.comment_count, p.share_count), metricNote: 'Lifetime platform metrics'
      })))
      if (!data.data?.has_more || data.data.cursor < new Date(ctx.startDate).getTime()) break
      cursor = data.data.cursor
      if (page === MAX_PAGES - 1) ctx.partial = true
    }
    return posts
  }
  if (account.platform === 'linkedin') {
    const organization = requireValue(social.linkedinOrganizationId || envFor('LINKEDIN_ORGANIZATION_ID', id),
      'Connect this client’s LinkedIn organization ID. The token also needs r_organization_social to read company posts.')
    requireValue(process.env.LINKEDIN_ACCESS_TOKEN, 'LinkedIn authorization is missing.')
    const posts = []
    for (let page = 0; page < MAX_PAGES; page++) {
      const data = await request(buildLinkedInUrl('/rest/posts', {
        q: 'author', author: `urn:li:organization:${organization}`, count: '100', start: String(page * 100), sortBy: 'LAST_MODIFIED'
      }), { headers: liHeaders() }, ctx)
      const items = data.elements || []
      posts.push(...items.filter((p) => p.lifecycleState === 'PUBLISHED' && p.distribution?.feedDistribution !== 'NONE')
        .map((p) => ({ id: p.id, title: p.commentary || 'LinkedIn post', channel: 'LinkedIn',
          publishedAt: p.publishedAt ? new Date(p.publishedAt).toISOString() : null,
          url: `https://www.linkedin.com/feed/update/${encodeURIComponent(p.id)}/` })))
      if (items.length < 100) break
      if (page === MAX_PAGES - 1) ctx.partial = true
    }
    return posts
  }
  if (account.platform === 'snapchat') {
    const profile = requireValue(social.snapchatProfileId || envFor('SNAPCHAT_PROFILE_ID', id),
      'Connect this client’s Snapchat Public Profile ID and authorize snapchat-profile-api. Its ad account ID is not a Public Profile ID.')
    const token = requireValue(envFor('SNAPCHAT_CONTENT_ACCESS_TOKEN', id),
      'A client-authorized Snapchat Public Profile token is required (snapchat-profile-api).')
    const items = await pages(url(`https://businessapi.snapchat.com/v1/public_profiles/${profile}/spotlights`, { limit: '100' }),
      { headers: bearer(token) }, ctx, (data) => (data.spotlights || []).map((p) => p.spotlight))
    return items.filter((p) => p?.status === 'LIVE').map((p) => ({ id: p.id,
      title: p.title || p.caption || 'Snapchat Spotlight', channel: 'Snapchat', publishedAt: p.created_at,
      thumbnailUrl: p.thumbnail_url }))
  }
  return []
}

export async function getContentPerformance(accounts, { fetchImpl = fetch, getDates, lockedAccount = null, platform = 'all',
  adsAdapter = null, postsAdapter = null } = {}) {
  const selected = scopeContentAccounts(accounts, { lockedAccount, platform })
  const results = await Promise.all(selected.map(async (account) => {
    const dates = getDates(account)
    const run = async (kind, adapter) => {
      const ctx = { ...dates, fetchImpl, partial: false, signal: AbortSignal.timeout(20000) }
      try {
        if (kind === 'ads') requireValue(account.accountId, 'Confirm the ad account ID to enable ad-level reporting.')
        const items = await adapter(account, ctx)
        return { items, connection: { kind, platform: account.platform, accountName: account.accountName,
          status: ctx.partial ? 'partial' : 'loaded',
          message: ctx.partial ? 'Partial results: a platform limit or an unavailable detail request reduced coverage.' :
            kind === 'posts' && account.platform === 'snapchat' ? 'Spotlights synced; Stories and Saved Stories are not included.' : 'Synced directly from the connected account.' } }
      } catch (error) {
        // Describe setup needs without leaking provider response bodies or credentials.
        let message = error?.status ? `Unable to sync (HTTP ${error.status}). Check the connected account, token expiry, and read permissions.` :
          'Unable to sync. Check the connected account, token expiry, and read permissions.'
        try {
          // Configuration-only checks supply actionable hints, without making a second network request.
          if (kind === 'posts') {
            const key = suffix(account.clientId)
            message = ({ meta: `Confirm FACEBOOK_PAGE_ID_${key} / INSTAGRAM_ACCOUNT_ID_${key} and a Page read token.`,
              tiktok: `Authorize the client profile with video.list and set TIKTOK_CONTENT_ACCESS_TOKEN_${key}.`,
              linkedin: `Set LINKEDIN_ORGANIZATION_ID_${key} and authorize r_organization_social.`,
              snapchat: `Set SNAPCHAT_PROFILE_ID_${key} and SNAPCHAT_CONTENT_ACCESS_TOKEN_${key} with snapchat-profile-api.` })[account.platform] || message
          }
        } catch { /* Leave safe generic message. */ }
        return { items: [], connection: { kind, platform: account.platform, accountName: account.accountName, status: 'unavailable', message } }
      }
    }
    const [ads, posts] = await Promise.all([
      run('ads', adsAdapter || paidAdapters[account.platform]),
      account.platform === 'google' ? Promise.resolve(null) : run('posts', postsAdapter || publishedPosts)
    ])
    return {
      ads: ads.items.map((ad) => ({ ...ad, id: `${account.platform}:${account.accountId}:${ad.adId}`,
        platform: account.platform, accountId: account.accountId, accountName: account.accountName })),
      posts: filterPublishedPosts(posts?.items || [], dates.startDate, dates.endDate).map((post) => ({
        ...post, id: `${account.platform}:${account.clientId}:${post.id}`, accountName: account.accountName
      })),
      connections: [ads.connection, ...(posts ? [posts.connection] : [])]
    }
  }))
  const unique = (items) => [...new Map(items.map((item) => [item.id, item])).values()]
  return {
    ads: rankAds(unique(results.flatMap((r) => r.ads))),
    posts: unique(results.flatMap((r) => r.posts)).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    connections: results.flatMap((r) => r.connections),
    syncedAt: new Date().toISOString()
  }
}
