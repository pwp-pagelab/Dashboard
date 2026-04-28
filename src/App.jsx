import React, { useEffect, useMemo, useState } from 'react'
import OnboardingHelper from './OnboardingHelper.jsx'

const COLORS = {
  green: '#0a4c3e',
  gold: '#e7bd52',
  cream: '#f7f3ec',
  text: '#1f2937',
  muted: '#6b7280',
  line: '#e7dfd2',
  softGreen: '#e8f1ee',
  softGold: '#f8edd0',
  softRed: '#fbe9e7',
  red: '#b42318',
  softBlue: '#edf3ff',
  blue: '#3559b7'
}

function navItemStyle(active) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: '12px',
    background: active ? 'rgba(231,189,82,0.18)' : 'transparent',
    color: active ? '#ffffff' : 'rgba(255,255,255,0.82)',
    fontWeight: active ? 800 : 600,
    borderLeft: active ? `4px solid ${COLORS.gold}` : '4px solid transparent'
  }
}

function cardStyle() {
  return {
    background: '#ffffff',
    borderRadius: '20px',
    border: `1px solid ${COLORS.line}`,
    boxShadow: '0 10px 30px rgba(10,76,62,0.06)'
  }
}

function panelStyle() {
  return {
    ...cardStyle(),
    padding: '22px'
  }
}

function metricCardStyle(accent = COLORS.gold) {
  return {
    ...cardStyle(),
    padding: '18px',
    minHeight: '122px',
    borderTop: `4px solid ${accent}`
  }
}

function buttonStyle(primary = false) {
  return {
    padding: '11px 16px',
    borderRadius: '12px',
    border: primary ? 'none' : `1px solid ${COLORS.line}`,
    background: primary ? COLORS.green : '#ffffff',
    color: primary ? '#ffffff' : COLORS.green,
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: primary ? '0 10px 25px rgba(10,76,62,0.18)' : 'none'
  }
}

function selectStyle() {
  return {
    width: '100%',
    padding: '11px 12px',
    borderRadius: '12px',
    border: `1px solid ${COLORS.line}`,
    background: '#ffffff',
    fontSize: '14px',
    color: COLORS.text,
    outline: 'none'
  }
}

function BrandMark({ dark = false }) {
  const bg = dark ? 'rgba(255,255,255,0.08)' : '#ffffff'
  const border = dark ? '1px solid rgba(255,255,255,0.12)' : `1px solid ${COLORS.line}`
  const titleColor = dark ? '#ffffff' : COLORS.green
  const subColor = dark ? 'rgba(255,255,255,0.72)' : COLORS.muted

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 14px',
        borderRadius: '16px',
        background: bg,
        border
      }}
    >
      <div
        style={{
          width: '54px',
          height: '54px',
          borderRadius: '14px',
          overflow: 'hidden',
          flexShrink: 0,
          boxShadow: dark ? 'none' : '0 4px 14px rgba(10,76,62,0.10)'
        }}
      >
        <img
          src="/logo-pwp.jpg"
          alt="Post With Passion logo"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block'
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>

      <div>
        <div
          style={{
            fontSize: '15px',
            fontWeight: 900,
            color: titleColor,
            lineHeight: 1.1
          }}
        >
          Post With Passion
        </div>
        <div
          style={{
            fontSize: '12px',
            color: subColor,
            marginTop: '4px'
          }}
        >
          Performance Dashboard
        </div>
      </div>
    </div>
  )
}

function PlatformBadge({ label }) {
  const lower = String(label || '').toLowerCase()

  let bg = COLORS.softGreen
  let color = COLORS.green

  if (lower.includes('google')) {
    bg = '#eef6f3'
    color = '#0f766e'
  } else if (lower.includes('snap')) {
    bg = COLORS.softGold
    color = '#8a6212'
  } else if (lower.includes('meta')) {
    bg = COLORS.softBlue
    color = COLORS.blue
  }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '6px 10px',
        borderRadius: '999px',
        background: bg,
        color,
        fontSize: '12px',
        fontWeight: 800
      }}
    >
      {label}
    </span>
  )
}

function SectionTitle({ title, subtitle, right }) {
  return (
    <div
      style={{
        marginBottom: '18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '14px',
        flexWrap: 'wrap'
      }}
    >
      <div>
        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: COLORS.green }}>{title}</h3>
        {subtitle ? (
          <p style={{ margin: '6px 0 0', color: COLORS.muted, fontSize: '13px' }}>{subtitle}</p>
        ) : null}
      </div>
      {right}
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div
      style={{
        padding: '18px',
        borderRadius: '14px',
        background: '#fbfaf7',
        border: `1px dashed ${COLORS.line}`,
        color: COLORS.muted,
        fontSize: '14px'
      }}
    >
      {text}
    </div>
  )
}

function statusTone(status) {
  if (status === 'good') {
    return {
      bg: COLORS.softGreen,
      text: COLORS.green,
      border: `1px solid rgba(10,76,62,0.14)`
    }
  }
  if (status === 'warning') {
    return {
      bg: COLORS.softGold,
      text: '#8a6212',
      border: `1px solid rgba(231,189,82,0.25)`
    }
  }
  return {
    bg: COLORS.softRed,
    text: COLORS.red,
    border: `1px solid rgba(180,35,24,0.15)`
  }
}

function HealthCard({ title, value, target, status = 'warning', note }) {
  const tone = statusTone(status)

  return (
    <div style={{ ...metricCardStyle(status === 'danger' ? COLORS.red : status === 'good' ? COLORS.green : COLORS.gold) }}>
      <div style={{ fontSize: '12px', color: '#8a8f98', fontWeight: 700 }}>{title}</div>
      <div style={{ marginTop: '12px', fontSize: '30px', fontWeight: 900, lineHeight: 1.08, color: COLORS.green }}>
        {value}
      </div>
      {target ? (
        <div style={{ marginTop: '8px', color: COLORS.muted, fontSize: '13px' }}>
          Target: {target}
        </div>
      ) : null}
      <div
        style={{
          display: 'inline-block',
          marginTop: '10px',
          padding: '6px 10px',
          borderRadius: '999px',
          fontSize: '12px',
          fontWeight: 800,
          background: tone.bg,
          color: tone.text,
          border: tone.border
        }}
      >
        {note}
      </div>
    </div>
  )
}

function InsightCard({ type = 'warning', title, text, action }) {
  const tone = statusTone(type === 'good' ? 'good' : type === 'danger' ? 'danger' : 'warning')

  return (
    <div
      style={{
        ...cardStyle(),
        padding: '18px',
        borderTop: `4px solid ${type === 'good' ? COLORS.green : type === 'danger' ? COLORS.red : COLORS.gold}`
      }}
    >
      <div
        style={{
          display: 'inline-block',
          padding: '6px 10px',
          borderRadius: '999px',
          fontSize: '12px',
          fontWeight: 800,
          background: tone.bg,
          color: tone.text,
          border: tone.border
        }}
      >
        {title}
      </div>
      <p style={{ margin: '12px 0 0', color: COLORS.text, fontSize: '14px', lineHeight: 1.7 }}>
        {text}
      </p>
      {action ? (
        <p style={{ margin: '10px 0 0', color: COLORS.green, fontSize: '14px', lineHeight: 1.7, fontWeight: 700 }}>
          Action: {action}
        </p>
      ) : null}
    </div>
  )
}

function formatSar(value) {
  if (value == null || Number.isNaN(Number(value))) return 'N/A'
  return `SAR ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function parseSarString(value) {
  if (!value) return 0
  const n = String(value).replace(/[^0-9.-]/g, '')
  return Number(n || 0)
}

function ReportMetricCard({ label, value, accent }) {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '18px',
        border: `1px solid ${COLORS.line}`,
        padding: '18px',
        minHeight: '110px',
        borderTop: `4px solid ${accent}`
      }}
    >
      <div style={{ fontSize: '12px', color: '#8a8f98', fontWeight: 700 }}>{label}</div>
      <div style={{ marginTop: '12px', fontSize: '30px', fontWeight: 900, lineHeight: 1.08, color: COLORS.green }}>
        {value}
      </div>
    </div>
  )
}

function ReportView({ data, platform, range, setView }) {
  const summaryCards = Array.isArray(data?.summaryCards) ? data.summaryCards : []
  const campaignRows = Array.isArray(data?.campaignRows) ? data.campaignRows : []

  const accentColors = [COLORS.gold, COLORS.green, '#c89b2b', '#2e6b5d', '#d4aa45', '#14594a']

  return (
    <div style={{ minHeight: '100vh', background: COLORS.cream, padding: '28px', color: COLORS.text }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .report-card { box-shadow: none !important; }
        }
      `}</style>

      <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
        <div className="no-print" style={{ display: 'flex', gap: '12px', marginBottom: '22px', flexWrap: 'wrap' }}>
          <button onClick={() => setView('dashboard')} style={buttonStyle(false)}>
            Back to Dashboard
          </button>
          <button onClick={() => window.print()} style={buttonStyle(true)}>
            Export PDF
          </button>
        </div>

        <div className="report-card" style={{ ...cardStyle(), marginBottom: '18px', padding: 0, overflow: 'hidden' }}>
          <div style={{ background: COLORS.green, color: '#ffffff', padding: '26px 28px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '18px',
                flexWrap: 'wrap',
                alignItems: 'flex-start'
              }}
            >
              <div style={{ maxWidth: '720px' }}>
                <div style={{ marginBottom: '14px', maxWidth: '360px' }}>
                  <BrandMark dark={true} />
                </div>
                <h1 style={{ margin: 0, fontSize: '38px', fontWeight: 900, lineHeight: 1.05 }}>
                  {data?.client?.name || 'Client Report'}
                </h1>
                <p style={{ marginTop: '10px', color: 'rgba(255,255,255,0.82)', fontSize: '14px', lineHeight: 1.7 }}>
                  Paid media performance report across the selected platform mix and reporting window.
                </p>
              </div>

              <div
                style={{
                  minWidth: '260px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '18px',
                  padding: '16px'
                }}
              >
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)', fontWeight: 700, marginBottom: '10px' }}>
                  Report Details
                </div>
                <div style={{ display: 'grid', gap: '8px', fontSize: '14px', color: '#ffffff' }}>
                  <div><strong>Client:</strong> {data?.client?.name || 'N/A'}</div>
                  <div><strong>Platform:</strong> {platform}</div>
                  <div><strong>Range:</strong> {range}</div>
                  <div><strong>Generated:</strong> {data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: '5px', background: COLORS.gold }} />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
            gap: '14px',
            marginBottom: '18px'
          }}
        >
          {summaryCards.map((card, i) => (
            <ReportMetricCard key={card.label} label={card.label} value={card.value} accent={accentColors[i % accentColors.length]} />
          ))}
        </div>

        <div className="report-card" style={panelStyle()}>
          <SectionTitle title="Platform Performance" subtitle="Client-facing performance summary by platform." />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: `1px solid ${COLORS.line}` }}>
                  <th style={{ padding: '12px 8px' }}>Platform</th>
                  <th style={{ padding: '12px 8px' }}>Campaign</th>
                  <th style={{ padding: '12px 8px' }}>Spend</th>
                  <th style={{ padding: '12px 8px' }}>Clicks</th>
                  <th style={{ padding: '12px 8px' }}>Conversions</th>
                </tr>
              </thead>
              <tbody>
                {campaignRows.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '18px 8px' }}>
                      <EmptyState text="No data available for this report." />
                    </td>
                  </tr>
                ) : (
                  campaignRows.map((row, index) => (
                    <tr key={`${row.platform}-${row.campaign}-${index}`} style={{ borderBottom: '1px solid #f1ece3' }}>
                      <td style={{ padding: '14px 8px' }}>
                        <PlatformBadge label={row.platform} />
                      </td>
                      <td style={{ padding: '14px 8px', fontWeight: 700 }}>{row.campaign}</td>
                      <td style={{ padding: '14px 8px' }}>{row.spend}</td>
                      <td style={{ padding: '14px 8px' }}>{row.clicks}</td>
                      <td style={{ padding: '14px 8px' }}>{row.conversions}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function buildClientSummary({ totalSpend, totalImpressions, totalClicks, totalConversions, googleDiagnostics }) {
  const spendText = formatSar(totalSpend)
  const impressionText = totalImpressions.toLocaleString()
  const clicksText = totalClicks.toLocaleString()

  if (totalConversions === 0) {
    if (googleDiagnostics?.interpretation?.mainLimiter === 'Rank-limited') {
      return `This period, ${spendText} was spent to generate ${impressionText} impressions and ${clicksText} clicks, but no tracked conversions were recorded. Google visibility is being limited mainly by ranking, which suggests missed demand and weaker competitiveness in search.`
    }

    if (googleDiagnostics?.interpretation?.mainLimiter === 'Budget-limited') {
      return `This period, ${spendText} was spent to generate ${impressionText} impressions and ${clicksText} clicks, but no tracked conversions were recorded. Campaign visibility appears constrained by budget, which means additional eligible demand may not be fully captured.`
    }

    return `This period, ${spendText} was spent to generate ${impressionText} impressions and ${clicksText} clicks, but no tracked conversions were recorded yet. The immediate priority is to verify conversion tracking and review post-click performance before scaling spend.`
  }

  return `This period, ${spendText} was spent to generate ${impressionText} impressions, ${clicksText} clicks, and ${totalConversions.toLocaleString()} conversions. Performance is producing measurable results, and the next step is to compare efficiency against target benchmarks before scaling.`
}

function buildInsights({ totalConversions, googleDiagnostics, platformRows }) {
  const insights = []

  if (totalConversions === 0) {
    insights.push({
      type: 'danger',
      title: 'No tracked conversions',
      text: 'The campaigns generated traffic, but no recorded conversions appeared in the selected period.',
      action: 'Check conversion tracking, conversion actions, and landing page event setup immediately.'
    })
  }

  if (googleDiagnostics?.interpretation?.mainLimiter === 'Rank-limited') {
    insights.push({
      type: 'warning',
      title: 'Missed demand in Google',
      text: 'Google Ads visibility is being limited more by ranking than by budget, so potential customers may not be seeing the ads often enough.',
      action: 'Improve relevance, bids, and landing page competitiveness before scaling.'
    })
  }

  if (googleDiagnostics?.interpretation?.mainLimiter === 'Budget-limited') {
    insights.push({
      type: 'warning',
      title: 'Budget is restricting reach',
      text: 'The account appears to be losing a meaningful share of available visibility because budget is limiting delivery.',
      action: 'Review whether increasing budget is justified once conversion tracking is validated.'
    })
  }

  const blendedCtr = totalClicksFromRows(platformRows) > 0 && totalImpressionsFromRows(platformRows) > 0
    ? (totalClicksFromRows(platformRows) / totalImpressionsFromRows(platformRows)) * 100
    : 0

  if (blendedCtr >= 2) {
    insights.push({
      type: 'good',
      title: 'Engagement is healthy',
      text: 'The click-through rate indicates that the ads are attracting attention and generating traffic.',
      action: 'Focus next on improving conversion efficiency after the click.'
    })
  }

  if (!insights.length) {
    insights.push({
      type: 'warning',
      title: 'Performance needs review',
      text: 'The account has delivery data, but the results need additional validation against targets and tracking quality.',
      action: 'Review goals, benchmarks, and conversion setup before presenting conclusions.'
    })
  }

  return insights.slice(0, 4)
}

function totalClicksFromRows(rows) {
  return rows.reduce((sum, row) => sum + Number(String(row.clicks || '0').replace(/,/g, '')), 0)
}

function totalImpressionsFromRows(rows) {
  return rows.reduce((sum, row) => {
    return sum
  }, 0)
}

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [client, setClient] = useState('rimiya')
  const [platform, setPlatform] = useState('all')
  const [range, setRange] = useState('30d')
  const [view, setView] = useState('dashboard')
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (view !== 'dashboard' && view !== 'report') return

    async function loadDashboard() {
      try {
        setLoading(true)
        setError('')

        const params = new URLSearchParams({
          client,
          platform,
          range
        })

        const res = await fetch(`/api/dashboard?${params.toString()}`)
        const text = await res.text()

        let json
        try {
          json = JSON.parse(text)
        } catch {
          throw new Error(text.slice(0, 300) || 'Server returned non-JSON response')
        }

        if (!res.ok) {
          throw new Error(json.error || 'Failed to load dashboard data')
        }

        setData(json)
      } catch (err) {
        setData(null)
        setError(err.message || 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [client, platform, range, view])

  const availableClients = useMemo(() => {
    return Array.isArray(data?.availableClients) ? data.availableClients : []
  }, [data])

  const availablePlatforms = useMemo(() => {
    const platforms = Array.isArray(data?.availablePlatforms) ? data.availablePlatforms : []
    return ['all', ...platforms]
  }, [data])

  if (view === 'onboarding') {
    return <OnboardingHelper setView={setView} />
  }

  if (loading) {
    return <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>Loading dashboard...</div>
  }

  if (error) {
    return (
      <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', color: 'crimson', whiteSpace: 'pre-wrap' }}>
        Error: {error}
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', color: 'crimson' }}>
        Error: No data returned
      </div>
    )
  }

  if (view === 'report') {
    return <ReportView data={data} platform={platform} range={range} setView={setView} />
  }

  const summaryCards = Array.isArray(data?.summaryCards) ? data.summaryCards : []
  const campaignRows = Array.isArray(data?.campaignRows) ? data.campaignRows : []
  const googleDiagnostics = data?.diagnostics?.google || null

  const totalSpend = parseSarString(summaryCards.find((c) => c.label === 'Total Spend')?.value)
  const totalImpressions = Number((summaryCards.find((c) => c.label === 'Impressions')?.value || '0').replace(/,/g, ''))
  const totalClicks = Number((summaryCards.find((c) => c.label === 'Clicks')?.value || '0').replace(/,/g, ''))
  const totalConversions = Number((summaryCards.find((c) => c.label === 'Conversions')?.value || '0').replace(/,/g, ''))

  const healthCards = [
    {
      title: 'Spend Pacing',
      value: formatSar(totalSpend),
      target: 'Set monthly budget',
      status: totalSpend > 0 ? 'good' : 'warning',
      note: totalSpend > 0 ? 'Live spend' : 'No spend'
    },
    {
      title: 'Conversions',
      value: totalConversions.toLocaleString(),
      target: 'Set conversion goal',
      status: totalConversions > 0 ? 'good' : 'danger',
      note: totalConversions > 0 ? 'Tracking results' : 'Below target'
    },
    {
      title: 'Cost per Conversion',
      value:
        totalConversions > 0
          ? formatSar(totalSpend / totalConversions)
          : 'N/A',
      target: 'Set CPA target',
      status: totalConversions > 0 ? 'good' : 'danger',
      note: totalConversions > 0 ? 'Review efficiency' : 'No conversion data'
    },
    {
      title: 'ROAS',
      value: 'N/A',
      target: 'Set ROAS target',
      status: 'warning',
      note: 'Revenue data not connected'
    }
  ]

  const summaryText = buildClientSummary({
    totalSpend,
    totalImpressions,
    totalClicks,
    totalConversions,
    googleDiagnostics
  })

  const insights = buildInsights({
    totalConversions,
    googleDiagnostics,
    platformRows: campaignRows
  })

  const platformPerformanceRows = campaignRows.map((row) => {
    const spendNum = parseSarString(row.spend)
    const clicksNum = Number(String(row.clicks || '0').replace(/,/g, ''))
    const conversionsNum =
      row.conversions === 'N/A' ? null : Number(String(row.conversions || '0').replace(/,/g, ''))

    const ctrValue =
      row.platform === 'Google Ads'
        ? googleDiagnostics?.snapshot?.ctr
        : null

    const cpcValue =
      row.platform === 'Google Ads'
        ? googleDiagnostics?.snapshot?.avgCpc
        : clicksNum > 0
          ? spendNum / clicksNum
          : null

    const cpaValue =
      conversionsNum != null && conversionsNum > 0
        ? spendNum / conversionsNum
        : null

    return {
      ...row,
      ctr: ctrValue,
      cpc: cpcValue,
      cpa: cpaValue,
      roas: null
    }
  })

  return (
    <div style={{ minHeight: '100vh', background: COLORS.cream, color: COLORS.text }}>
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh' }}>
        <aside
          style={{
            background: COLORS.green,
            borderRight: '1px solid rgba(255,255,255,0.08)',
            padding: '26px 18px',
            boxShadow: '8px 0 30px rgba(15,23,42,0.03)'
          }}
        >
          <div style={{ marginBottom: '28px' }}>
            <BrandMark dark={true} />
          </div>

          <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '14px', marginBottom: '14px' }}>
            Main Menu
          </div>

          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={navItemStyle(true)}>Dashboard</div>
            <div style={navItemStyle(false)}>Performance</div>
            <div style={navItemStyle(false)}>Reports</div>
            <div style={navItemStyle(false)}>Platforms</div>
            <div style={navItemStyle(false)}>Clients</div>
          </div>

          <div
            style={{
              marginTop: '26px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '18px',
              padding: '18px',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.72)', marginBottom: '12px' }}>
              Quick Actions
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              <button
                onClick={() => setView('onboarding')}
                style={{
                  ...buttonStyle(true),
                  background: COLORS.gold,
                  color: COLORS.green,
                  boxShadow: '0 10px 25px rgba(231,189,82,0.18)'
                }}
              >
                Open Onboarding
              </button>
              <button
                onClick={() => setView('report')}
                style={{
                  ...buttonStyle(false),
                  background: 'transparent',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.18)'
                }}
              >
                Export Report
              </button>
            </div>
          </div>
        </aside>

        <main style={{ padding: '26px 26px 40px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '16px',
              flexWrap: 'wrap',
              marginBottom: '20px'
            }}
          >
            <div>
              <div style={{ fontSize: '12px', color: COLORS.green, fontWeight: 800, marginBottom: '8px' }}>
                CLIENT VIEW
              </div>
              <h1 style={{ margin: 0, fontSize: '34px', fontWeight: 900, color: COLORS.green }}>
                {data?.client?.name || 'Dashboard'}
              </h1>
              <p style={{ marginTop: '8px', color: COLORS.muted, fontSize: '14px' }}>
                A client-first view focused on results, business impact, and next actions.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => setShowAdvanced((v) => !v)} style={buttonStyle(false)}>
                {showAdvanced ? 'Hide Advanced View' : 'Show Advanced View'}
              </button>

              <div style={{ ...cardStyle(), padding: '14px 18px', minWidth: '250px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>Last Updated</div>
                <div style={{ marginTop: '8px', fontWeight: 900, color: COLORS.green }}>
                  {data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
              marginBottom: '18px'
            }}
          >
            <div style={cardStyle()}>
              <div style={{ padding: '14px 16px 18px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', fontWeight: 700 }}>
                  Client
                </div>
                <select value={client} onChange={(e) => setClient(e.target.value)} style={selectStyle()}>
                  {availableClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={cardStyle()}>
              <div style={{ padding: '14px 16px 18px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', fontWeight: 700 }}>
                  Platform
                </div>
                <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={selectStyle()}>
                  {availablePlatforms.map((p) => (
                    <option key={p} value={p}>
                      {p === 'all' ? 'All Platforms' : p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={cardStyle()}>
              <div style={{ padding: '14px 16px 18px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', fontWeight: 700 }}>
                  Date Range
                </div>
                <select value={range} onChange={(e) => setRange(e.target.value)} style={selectStyle()}>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="this_month">This Month</option>
                  <option value="max">Since onboarding</option>
                </select>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
              marginBottom: '18px'
            }}
          >
            {healthCards.map((card) => (
              <HealthCard key={card.title} {...card} />
            ))}
          </div>

          <div style={{ ...panelStyle(), marginBottom: '18px' }}>
            <SectionTitle
              title="Summary"
              subtitle="Plain-English interpretation of the current reporting period."
            />
            <div
              style={{
                background: '#fcfbf8',
                border: `1px solid ${COLORS.line}`,
                borderRadius: '16px',
                padding: '18px',
                color: COLORS.text,
                fontSize: '15px',
                lineHeight: 1.8
              }}
            >
              {summaryText}
            </div>
          </div>

          <div style={{ ...panelStyle(), marginBottom: '18px' }}>
            <SectionTitle
              title="Platform Performance"
              subtitle="Simplified performance view for client reporting."
            />
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: `1px solid ${COLORS.line}` }}>
                    <th style={{ padding: '12px 8px' }}>Platform</th>
                    <th style={{ padding: '12px 8px' }}>Spend</th>
                    <th style={{ padding: '12px 8px' }}>Clicks</th>
                    <th style={{ padding: '12px 8px' }}>CTR</th>
                    <th style={{ padding: '12px 8px' }}>CPC</th>
                    <th style={{ padding: '12px 8px' }}>Conversions</th>
                    <th style={{ padding: '12px 8px' }}>CPA</th>
                    <th style={{ padding: '12px 8px' }}>ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {platformPerformanceRows.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '18px 8px' }}>
                        <EmptyState text="No platform data available." />
                      </td>
                    </tr>
                  ) : (
                    platformPerformanceRows.map((row, index) => (
                      <tr key={`${row.platform}-${index}`} style={{ borderBottom: '1px solid #f1ece3' }}>
                        <td style={{ padding: '14px 8px' }}>
                          <PlatformBadge label={row.platform} />
                        </td>
                        <td style={{ padding: '14px 8px' }}>{row.spend}</td>
                        <td style={{ padding: '14px 8px' }}>{row.clicks}</td>
                        <td style={{ padding: '14px 8px' }}>
                          {row.ctr != null ? `${row.ctr.toFixed(2)}%` : 'N/A'}
                        </td>
                        <td style={{ padding: '14px 8px' }}>
                          {row.cpc != null ? formatSar(row.cpc) : 'N/A'}
                        </td>
                        <td style={{ padding: '14px 8px' }}>{row.conversions}</td>
                        <td style={{ padding: '14px 8px' }}>
                          {row.cpa != null ? formatSar(row.cpa) : 'N/A'}
                        </td>
                        <td style={{ padding: '14px 8px' }}>N/A</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '18px' }}>
            {insights.map((item, idx) => (
              <InsightCard key={idx} {...item} />
            ))}
          </div>

          {showAdvanced && googleDiagnostics ? (
            <div style={{ marginTop: '8px', display: 'grid', gap: '18px' }}>
              <div style={panelStyle()}>
                <SectionTitle
                  title="Advanced Google View"
                  subtitle="Agency-facing diagnostics and account health details."
                />
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '14px'
                  }}
                >
                  <div style={metricCardStyle(COLORS.gold)}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>Search IS</div>
                    <div style={{ marginTop: '12px', fontSize: '28px', fontWeight: 900, color: COLORS.green }}>
                      {googleDiagnostics.visibility?.searchImpressionShare != null
                        ? `${googleDiagnostics.visibility.searchImpressionShare.toFixed(1)}%`
                        : 'N/A'}
                    </div>
                  </div>

                  <div style={metricCardStyle(COLORS.green)}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>Lost IS (Budget)</div>
                    <div style={{ marginTop: '12px', fontSize: '28px', fontWeight: 900, color: COLORS.green }}>
                      {googleDiagnostics.visibility?.lostIsBudget != null
                        ? `${googleDiagnostics.visibility.lostIsBudget.toFixed(1)}%`
                        : 'N/A'}
                    </div>
                  </div>

                  <div style={metricCardStyle('#c89b2b')}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>Lost IS (Rank)</div>
                    <div style={{ marginTop: '12px', fontSize: '28px', fontWeight: 900, color: COLORS.green }}>
                      {googleDiagnostics.visibility?.lostIsRank != null
                        ? `${googleDiagnostics.visibility.lostIsRank.toFixed(1)}%`
                        : 'N/A'}
                    </div>
                  </div>

                  <div style={metricCardStyle('#2e6b5d')}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>Avg Quality Score</div>
                    <div style={{ marginTop: '12px', fontSize: '28px', fontWeight: 900, color: COLORS.green }}>
                      {googleDiagnostics.keywordHealth?.avgQualityScore != null
                        ? googleDiagnostics.keywordHealth.avgQualityScore.toFixed(1)
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '18px' }}>
                <div style={panelStyle()}>
                  <SectionTitle title="Main Limiter" subtitle="Internal diagnostic" />
                  <div style={{ fontSize: '18px', fontWeight: 800, color: COLORS.green }}>
                    {googleDiagnostics.interpretation?.mainLimiter || 'N/A'}
                  </div>
                </div>

                <div style={panelStyle()}>
                  <SectionTitle title="Efficiency Status" subtitle="Internal diagnostic" />
                  <div style={{ fontSize: '18px', fontWeight: 800, color: COLORS.green }}>
                    {googleDiagnostics.interpretation?.efficiencyStatus || 'N/A'}
                  </div>
                </div>

                <div style={panelStyle()}>
                  <SectionTitle title="Scale Status" subtitle="Internal diagnostic" />
                  <div style={{ fontSize: '18px', fontWeight: 800, color: COLORS.green }}>
                    {googleDiagnostics.interpretation?.scaleStatus || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  )
}
