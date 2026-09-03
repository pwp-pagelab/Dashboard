import React, { useState } from 'react'

const panel = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 16, minWidth: 0 }
const label = { color: '#717784', fontSize: 12, lineHeight: 1.5 }
const control = { border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff', padding: '8px 10px', color: '#252B36', cursor: 'pointer' }
const names = { meta: 'Meta', tiktok: 'TikTok', linkedin: 'LinkedIn', snapchat: 'Snapchat', google: 'Google Ads', all: 'All platforms' }
const number = (value) => value == null ? 'N/A' : Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })
function money(value, currency) {
  if (value == null || !currency) return 'N/A'
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value) } catch { return 'N/A' }
}
function safeLink(value) {
  try { const target = new URL(value); return ['https:', 'http:'].includes(target.protocol) ? target.href : undefined } catch { return undefined }
}

function ConnectionStatus({ connections, kind, isSharedView }) {
  const issues = connections.filter((item) => item.kind === kind && item.status !== 'loaded')
  if (!issues.length) return null
  return <details style={{ marginTop: 14, background: '#FFF8E4', borderRadius: 8, padding: 10 }}>
    <summary style={{ fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{issues.length} channel connection{issues.length === 1 ? '' : 's'} need attention</summary>
    <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
      {issues.map((item, index) => <div key={index} style={label}>
        <strong>{names[item.platform] || item.platform} · {item.accountName || 'Connection'}:</strong>{' '}
        {isSharedView ? (item.status === 'partial' ? 'Partial platform coverage.' : 'Awaiting authorized account access.') : item.message}
      </div>)}
    </div>
  </details>
}

export default function ContentPerformanceStudio({ report, isSharedView = false }) {
  const [channel, setChannel] = useState('all')
  const [postLimit, setPostLimit] = useState(12)
  const [adLimit, setAdLimit] = useState(10)
  const posts = Array.isArray(report?.posts) ? report.posts : []
  const ads = Array.isArray(report?.ads) ? report.ads : []
  const connections = Array.isArray(report?.connections) ? report.connections : []
  const channels = [...new Set(posts.map((p) => p.channel))]
  const effectiveChannel = channels.includes(channel) ? channel : 'all'
  const shownPosts = posts.filter((post) => effectiveChannel === 'all' || post.channel === effectiveChannel)
  const postAccess = connections.some((item) => item.kind === 'posts' && ['loaded', 'partial'].includes(item.status))
  const adAccess = connections.some((item) => item.kind === 'ads' && ['loaded', 'partial'].includes(item.status))
  return <div id="content-performance" style={{ display: 'grid', gap: 14, scrollMarginTop: 20 }}>
    <section style={panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 17 }}>Published content <span style={{ color: '#635BFF', fontSize: 11 }}>ACCOUNT SYNC</span></h3>
          <p style={{ ...label, margin: '5px 0 0' }}>Published posts in the selected reporting dates. Post metrics are lifetime values where available; they are not added to paid totals. Snapchat coverage currently includes Spotlights only.</p>
        </div>
        <select aria-label="Published content channel" value={effectiveChannel} onChange={(e) => { setChannel(e.target.value); setPostLimit(12) }} style={control}>
          <option value="all">All channels</option>{channels.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      {shownPosts.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: 12 }}>
        {shownPosts.slice(0, postLimit).map((post) => {
          const link = safeLink(post.url)
          const thumbnail = safeLink(post.thumbnailUrl)
          return <article key={post.id} style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden', minWidth: 0 }}>
            {thumbnail ? <img src={thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" style={{ width: '100%', height: 160, objectFit: 'cover', background: '#ECE9FF' }} /> : null}
            <div style={{ padding: 12 }}>
              <div style={{ ...label, marginBottom: 6 }}>{post.channel} · {post.publishedAt?.slice(0, 10)}</div>
              {link ? <a href={link} target="_blank" rel="noreferrer" style={{ color: '#252B36', fontWeight: 750, fontSize: 13, overflowWrap: 'anywhere' }}>{post.title?.slice(0, 240)}</a>
                : <div style={{ color: '#252B36', fontWeight: 750, fontSize: 13, overflowWrap: 'anywhere' }}>{post.title?.slice(0, 240)}</div>}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10, ...label }}>
                {post.views != null ? <span><strong>{number(post.views)}</strong> views</span> : null}
                {post.engagements != null ? <span><strong>{number(post.engagements)}</strong> engagements</span> : null}
                {post.views == null && post.engagements == null ? <span>Performance metrics not provided by this endpoint.</span> : null}
              </div>
              {post.metricNote ? <div style={{ ...label, marginTop: 5, fontSize: 10 }}>{post.metricNote}</div> : null}
            </div>
          </article>
        })}
      </div> : <div style={{ ...label, background: '#F7F7F9', borderRadius: 10, padding: 20 }}>
        {postAccess ? 'No published posts were returned for these dates. Check channel coverage below.' : 'Published content needs a linked social profile and permission to read its posts. Advertising-account access alone is not sufficient.'}
      </div>}
      {shownPosts.length > postLimit ? <button onClick={() => setPostLimit(postLimit + 12)} style={{ ...control, marginTop: 12 }}>Show more posts</button> : null}
      <ConnectionStatus connections={connections} kind="posts" isSharedView={isSharedView} />
    </section>

    <section style={panel}>
      <h3 style={{ margin: 0, fontSize: 17 }}>Best-performing ads <span style={{ color: '#635BFF', fontSize: 11 }}>AD-LEVEL DATA</span></h3>
      <p style={{ ...label, margin: '5px 0 14px' }}>Actual ads ranked by reported leads, then cost per lead within the same currency, then clicks. Campaign/account totals and Sheet conversions are not used as ad results.</p>
      {ads.length ? <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
          <thead><tr>{['Ad name', 'Channel / campaign', 'Spend', 'Impressions', 'Clicks', 'Leads', 'Cost per lead'].map((item) => <th key={item} style={{ padding: '10px 8px', color: '#717784', whiteSpace: 'nowrap', borderBottom: '1px solid #E5E7EB' }}>{item}</th>)}</tr></thead>
          <tbody>{ads.slice(0, adLimit).map((ad) => <tr key={ad.id}>
            <td style={{ padding: '12px 8px', borderBottom: '1px solid #F0F1F4', minWidth: 170, maxWidth: 300, overflowWrap: 'anywhere' }}>
              <strong>{ad.name || 'Ad name unavailable'}</strong>
              <div style={{ ...label, fontSize: 10, marginTop: 4 }}>Ad ID: {ad.adId}{ad.nameSource === 'headline' ? ' · Headline (ad has no name)' : ''}</div>
            </td>
            <td style={{ padding: 8, minWidth: 130 }}>{names[ad.platform] || ad.platform}<div style={{ ...label, fontSize: 10 }}>{ad.campaign || ad.accountName}</div></td>
            <td style={{ padding: 8, whiteSpace: 'nowrap' }}>{money(ad.spend, ad.currencyCode)}</td>
            <td style={{ padding: 8 }}>{number(ad.impressions)}</td>
            <td style={{ padding: 8 }}>{number(ad.clicks)}</td>
            <td title={ad.leadNote || ''} style={{ padding: 8 }}>{number(ad.leads)}{ad.leadNote ? '*' : ''}</td>
            <td style={{ padding: 8, whiteSpace: 'nowrap' }}>{ad.leads > 0 && ad.spend != null ? money(ad.spend / ad.leads, ad.currencyCode) : 'N/A'}</td>
          </tr>)}</tbody>
        </table>
      </div> : <div style={{ ...label, background: '#F7F7F9', borderRadius: 10, padding: 20 }}>
        {adAccess ? 'No ads with delivery were returned for this reporting period.' : 'Ad-level reporting is unavailable. Check account authorization below; no account totals are substituted.'}
      </div>}
      {ads.length > adLimit ? <button onClick={() => setAdLimit(adLimit + 10)} style={{ ...control, marginTop: 12 }}>Show more ads</button> : null}
      <div style={{ ...label, marginTop: 10, fontSize: 11 }}>N/A means the API did not supply that metric. Spend uses each ad account’s currency. * TikTok leads currently include instant forms only.</div>
      <ConnectionStatus connections={connections} kind="ads" isSharedView={isSharedView} />
    </section>
  </div>
}
