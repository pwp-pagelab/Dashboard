import test from 'node:test'
import assert from 'node:assert/strict'
import { getContentPerformance, scopeContentAccounts, filterPublishedPosts, rankAds } from '../lib/contentPerformance.js'

const account = { clientId: 'cloud-chefs', platform: 'meta', accountId: '640964945046086', accountName: 'Cloud Chefs', businessKey: 'CLOUD_CHEFS' }
const dates = () => ({ startDate: '2026-08-01', endDate: '2026-08-31' })
const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => data })
function setEnv(values) {
  const old = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]))
  Object.assign(process.env, values)
  return () => Object.entries(old).forEach(([key, value]) => { if (value == null) delete process.env[key]; else process.env[key] = value })
}

test('content account scope excludes other clients/accounts and deduplicates selected accounts', () => {
  const other = { ...account, clientId: 'rimiya', accountId: 'other' }
  const linkedin = { ...account, platform: 'linkedin', accountId: '551744400' }
  assert.deepEqual(scopeContentAccounts([account, account, other, linkedin], { lockedAccount: account, platform: 'meta' }), [account])
  assert.deepEqual(scopeContentAccounts([account, linkedin], { platform: 'linkedin' }), [linkedin])
})

test('published post dates are inclusive and invalid/undated records are not misrepresented', () => {
  const posts = ['2026-07-31', '2026-08-01', '2026-08-31T23:59:59Z', '2026-09-01', '', 'invalid']
    .map((publishedAt) => ({ publishedAt }))
  assert.deepEqual(filterPublishedPosts(posts, '2026-08-01', '2026-08-31'), posts.slice(1, 3))
})

test('ranking requires an ad ID, never ranks account totals, and preserves unknown leads', () => {
  const ranked = rankAds([
    { name: 'Account aggregate', clicks: 99999, leads: 9999 },
    { adId: 'no-delivery', clicks: 0, impressions: 0 },
    { adId: 'traffic', leads: null, clicks: 100, impressions: 1000 },
    { adId: 'costly', leads: 2, spend: 80, clicks: 4, currencyCode: 'SAR' },
    { adId: 'efficient', leads: 2, spend: 20, clicks: 4, currencyCode: 'SAR' }
  ])
  assert.deepEqual(ranked.map((ad) => ad.adId), ['efficient', 'costly', 'traffic'])
  assert.equal(ranked[2].leads, null)
})

test('a failed organic reader does not remove paid ads or expose error bodies', async () => {
  const result = await getContentPerformance([account], {
    getDates: dates,
    adsAdapter: async () => [{ adId: 'ad-1', name: 'Real ad name', clicks: 1, leads: null }],
    postsAdapter: async () => { throw new Error('secret-access-token') }
  })
  assert.equal(result.ads[0].name, 'Real ad name')
  assert.equal(result.posts.length, 0)
  assert.equal(result.connections.find((c) => c.kind === 'posts').status, 'unavailable')
  assert.doesNotMatch(JSON.stringify(result), /secret-access-token/)
})

test('an unselected client is never passed to platform readers', async () => {
  const called = []
  await getContentPerformance([account, { ...account, accountId: 'other' }], {
    lockedAccount: account, getDates: dates,
    adsAdapter: async (a) => { called.push(a.accountId); return [] },
    postsAdapter: async () => []
  })
  assert.deepEqual(called, [account.accountId])
})

test('Meta uses ad-level reporting with real ad names and strict form/message leads', async () => {
  const restore = setEnv({ META_ACCESS_TOKEN_CLOUD_CHEFS: 'test-token' })
  try {
    const result = await getContentPerformance([account], {
      getDates: dates, postsAdapter: async () => [],
      fetchImpl: async (target, options) => {
        const parsed = new URL(target)
        assert.equal(parsed.searchParams.get('level'), 'ad')
        assert.ok(parsed.searchParams.get('fields').includes('ad_name'))
        assert.equal(JSON.parse(parsed.searchParams.get('time_range')).until, '2026-08-31')
        assert.equal(options.headers.Authorization, 'Bearer test-token')
        assert.ok(!target.includes('test-token'))
        return response({ data: [{ ad_id: '123', ad_name: 'Summer menu video', account_currency: 'SAR', clicks: '10',
          actions: [{ action_type: 'lead', value: '2' }, { action_type: 'omni_lead', value: '2' },
            { action_type: 'purchase', value: '900' }, { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '3' }] }] })
      }
    })
    assert.equal(result.ads[0].name, 'Summer menu video')
    assert.equal(result.ads[0].leads, 5)
    assert.equal(result.ads[0].currencyCode, 'SAR')
  } finally { restore() }
})

test('cross-origin pagination does not forward the platform token', async () => {
  const restore = setEnv({ META_ACCESS_TOKEN_CLOUD_CHEFS: 'test-token' })
  let calls = 0
  try {
    const result = await getContentPerformance([account], {
      getDates: dates, postsAdapter: async () => [],
      fetchImpl: async () => { calls++; return response({ data: [], paging: { next: 'https://attacker.invalid/' } }) }
    })
    assert.equal(calls, 1)
    assert.equal(result.connections[0].status, 'unavailable')
  } finally { restore() }
})

test('TikTok Display API is client-scoped, handles pagination, and filters posts by date', async () => {
  const restore = setEnv({ TIKTOK_CONTENT_ACCESS_TOKEN_CLOUD_CHEFS: 'client-profile-token' })
  let calls = 0
  try {
    const result = await getContentPerformance([{ ...account, platform: 'tiktok' }], {
      getDates: dates, adsAdapter: async () => [],
      fetchImpl: async (target, options) => {
        assert.equal(new URL(target).pathname, '/v2/video/list/')
        assert.equal(options.headers.Authorization, 'Bearer client-profile-token')
        calls++
        return response({ error: { code: 'ok' }, data: {
          videos: [{ id: String(calls), title: 'Published video', create_time: Date.parse(calls === 1 ? '2026-08-15' : '2026-07-01') / 1000, view_count: 100 }],
          cursor: Date.parse('2026-08-10'), has_more: calls === 1
        } })
      }
    })
    assert.equal(calls, 2)
    assert.equal(result.posts.length, 1)
    assert.equal(result.posts[0].views, 100)
  } finally { restore() }
})

test('Meta profile mapping is required; no agency-wide feed discovery is performed', async () => {
  const restore = setEnv({ FACEBOOK_PAGE_ID_CLOUD_CHEFS: '', INSTAGRAM_ACCOUNT_ID_CLOUD_CHEFS: '' })
  try {
    const result = await getContentPerformance([account], {
      getDates: dates, adsAdapter: async () => [],
      fetchImpl: async () => { assert.fail('must not fetch an unmapped profile') }
    })
    assert.equal(result.connections.find((c) => c.kind === 'posts').status, 'unavailable')
    assert.match(result.connections.find((c) => c.kind === 'posts').message, /FACEBOOK_PAGE_ID_CLOUD_CHEFS/)
  } finally { restore() }
})

test('LinkedIn joins creative metadata by ID, not campaign/account display name', async () => {
  const restore = setEnv({ LINKEDIN_ACCESS_TOKEN: 'test-linkedin' })
  try {
    const result = await getContentPerformance([{ ...account, platform: 'linkedin' }], {
      getDates: dates, postsAdapter: async () => [],
      fetchImpl: async (target) => new URL(target).pathname.endsWith('/adAnalytics')
        ? response({ elements: [{ pivotValues: ['urn:li:sponsoredCreative:45'], clicks: 5, oneClickLeads: 2, leadGenerationMailContactInfoShares: 2 }] })
        : response({ elements: [{ id: 'urn:li:sponsoredCreative:45', name: 'Kitchen launch creative' }] })
    })
    assert.equal(result.ads[0].name, 'Kitchen launch creative')
    assert.equal(result.ads[0].leads, 2)
  } finally { restore() }
})

test('TikTok paid data uses AUCTION_AD and keeps unknown form counts null', async () => {
  const restore = setEnv({ TIKTOK_ACCESS_TOKEN: 'ad-token' })
  try {
    const result = await getContentPerformance([{ ...account, platform: 'tiktok', currencyCode: 'SAR' }], {
      getDates: dates, postsAdapter: async () => [],
      fetchImpl: async (target) => {
        const params = new URL(target).searchParams
        assert.equal(params.get('data_level'), 'AUCTION_AD')
        assert.deepEqual(JSON.parse(params.get('dimensions')), ['ad_id'])
        return response({ code: 0, data: { list: [{ dimensions: { ad_id: '77' }, metrics: { ad_name: 'Real TikTok ad', clicks: '8' } }], page_info: { total_page: 1 } } })
      }
    })
    assert.equal(result.ads[0].name, 'Real TikTok ad')
    assert.equal(result.ads[0].leads, null)
  } finally { restore() }
})

test('Snapchat joins ad definitions to ad stats and converts microcurrency exactly once', async () => {
  const restore = setEnv({ SNAP_CLIENT_ID: 'client', SNAP_CLIENT_SECRET: 'secret', SNAP_REFRESH_TOKEN: 'refresh' })
  const previousFetch = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, text: async () => JSON.stringify({ access_token: 'snap-test' }) })
  try {
    const result = await getContentPerformance([{ ...account, platform: 'snapchat', currencyCode: 'USD' }], {
      getDates: dates, postsAdapter: async () => [],
      fetchImpl: async (target) => {
        const parsed = new URL(target)
        if (parsed.pathname.endsWith('/ads')) return response({ ads: [{ ad: { id: 'snap-ad', name: 'Chef demonstration' } }] })
        assert.equal(parsed.searchParams.get('breakdown'), 'ad')
        assert.equal(parsed.searchParams.get('end_time'), '2026-09-01T00:00:00.000Z')
        return response({ total_stats: [{ total_stat: { breakdown_stats: { ad: [{ id: 'snap-ad', stats: { spend: 1250000, swipes: 9 } }] } } }] })
      }
    })
    assert.equal(result.ads[0].name, 'Chef demonstration')
    assert.equal(result.ads[0].spend, 1.25)
    assert.equal(result.ads[0].currencyCode, 'USD')
    assert.equal(result.ads[0].leads, null)
  } finally { globalThis.fetch = previousFetch; restore() }
})

test('Google preserves ad names and excludes purchase actions from ad leads', async () => {
  const restore = setEnv({ GOOGLE_ADS_CLIENT_ID: 'client', GOOGLE_ADS_CLIENT_SECRET: 'secret', GOOGLE_ADS_REFRESH_TOKEN: 'refresh' })
  const previousFetch = globalThis.fetch
  globalThis.fetch = async (target, options) => {
    if (target.includes('oauth2.googleapis.com')) return { ok: true, text: async () => JSON.stringify({ access_token: 'google-test' }) }
    const query = JSON.parse(options.body).query
    const rows = query.includes('segments.conversion_action_category') ? [
      { adGroupAd: { ad: { id: '12' } }, segments: { conversionActionCategory: 'SUBMIT_LEAD_FORM' }, metrics: { conversions: 2 } },
      { adGroupAd: { ad: { id: '12' } }, segments: { conversionActionCategory: 'PURCHASE' }, metrics: { conversions: 50 } }
    ] : [{ adGroupAd: { ad: { id: '12', name: 'Catering search ad' } }, metrics: { clicks: 4, costMicros: 5000000 }, customer: { currencyCode: 'SAR' } }]
    return { ok: true, text: async () => JSON.stringify([{ results: rows }]) }
  }
  try {
    const result = await getContentPerformance([{ ...account, platform: 'google' }], { getDates: dates })
    assert.equal(result.ads[0].name, 'Catering search ad')
    assert.equal(result.ads[0].leads, 2)
    assert.equal(result.ads[0].spend, 5)
    assert.equal(result.connections.length, 1)
  } finally { globalThis.fetch = previousFetch; restore() }
})

test('pagination caps explicitly mark incomplete coverage', async () => {
  const restore = setEnv({ META_ACCESS_TOKEN_CLOUD_CHEFS: 'test-token' })
  try {
    let calls = 0
    const result = await getContentPerformance([account], {
      getDates: dates, postsAdapter: async () => [],
      fetchImpl: async (target) => {
        calls++
        return response({ data: [{ ad_id: String(calls), ad_name: 'Paged ad', clicks: 1 }], paging: { next: target } })
      }
    })
    assert.equal(calls, 5)
    assert.equal(result.connections[0].status, 'partial')
  } finally { restore() }
})
