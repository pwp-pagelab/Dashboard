import React, { useEffect, useMemo, useState } from 'react'
import OnboardingHelper from './OnboardingHelper.jsx'

function shellStyle() {
  return {
    minHeight: '100vh',
    background:
      'radial-gradient(circle at top left, rgba(229,213,255,0.28), transparent 22%), radial-gradient(circle at top right, rgba(254,240,138,0.18), transparent 18%), linear-gradient(180deg, #faf7f4 0%, #f6f2ee 100%)',
    color: '#1f1f1f'
  }
}

function cardStyle() {
  return {
    background: 'rgba(255,255,255,0.78)',
    border: '1px solid rgba(231,224,217,0.95)',
    borderRadius: '28px',
    boxShadow: '0 18px 45px rgba(64,43,24,0.07)',
    backdropFilter: 'blur(12px)'
  }
}

function sectionCardStyle() {
  return {
    ...cardStyle(),
    padding: '26px'
  }
}

function metricCardStyle() {
  return {
    ...cardStyle(),
    padding: '22px',
    minHeight: '126px'
  }
}

function controlCardStyle() {
  return {
    ...cardStyle(),
    padding: '16px 16px 18px'
  }
}

function sectionLabel(text) {
  return (
    <div
      style={{
        display: 'inline-block',
        padding: '8px 14px',
        borderRadius: '999px',
        background: '#efe7ff',
        color: '#6b46c1',
        fontSize: '11px',
        fontWeight: 800,
        letterSpacing: '0.08em',
        textTransform: 'uppercase'
      }}
    >
      {text}
    </div>
  )
}

function buttonStyle(primary = false) {
  return {
    padding: '12px 18px',
    borderRadius: '999px',
    border: primary ? 'none' : '1px solid #d8cec5',
    background: primary ? '#1f1f1f' : '#ffffff',
    color: primary ? '#ffffff' : '#1f1f1f',
    fontWeight: 800,
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: primary ? '0 14px 30px rgba(31,31,31,0.18)' : 'none'
  }
}

function selectStyle() {
  return {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '14px',
    border: '1px solid #d8cec5',
    fontSize: '14px',
    background: '#fffdfb',
    color: '#1f1f1f',
    outline: 'none'
  }
}

function PlatformBadge({ label }) {
  const lower = String(label || '').toLowerCase()

  let bg = '#f3f4f6'
  let color = '#374151'

  if (lower.includes('meta')) {
    bg = '#eef2ff'
    color = '#4338ca'
  } else if (lower.includes('google')) {
    bg = '#ecfeff'
    color = '#0f766e'
  } else if (lower.includes('snap')) {
    bg = '#fef9c3'
    color = '#92400e'
  }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '7px 11px',
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

function SectionCard({ title, subtitle, children, right }) {
  return (
    <div style={sectionCardStyle()}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          marginBottom: '18px',
          flexWrap: 'wrap'
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 900 }}>{title}</h3>
          {subtitle ? (
            <p style={{ margin: '7px 0 0', color: '#7a6f66', fontSize: '14px', lineHeight: 1.6 }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

function ReportView({ data, platform, range, setView }) {
  const summaryCards = Array.isArray(data?.summaryCards) ? data.summaryCards : []
  const campaignRows = Array.isArray(data?.campaignRows) ? data.campaignRows : []

  return (
    <div style={{ minHeight: '100vh', background: '#fbf8f5', color: '#1f1f1f', padding: '34px' }}>
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>

      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        <div
          className="no-print"
          style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}
        >
          <button onClick={() => setView('dashboard')} style={buttonStyle(false)}>
            Back to Dashboard
          </button>
          <button onClick={() => window.print()} style={buttonStyle(true)}>
            Export PDF
          </button>
        </div>

        <div
          style={{
            borderBottom: '1px solid #e7e0d9',
            paddingBottom: '24px',
            marginBottom: '26px'
          }}
        >
          {sectionLabel('Report · تقرير')}
          <h1 style={{ margin: '16px 0 0', fontSize: '42px', fontWeight: 900, lineHeight: 1.05 }}>
            {data?.client?.name || 'Client Report'}
          </h1>
          <p style={{ color: '#7a6f66', marginTop: '12px', fontSize: '15px', lineHeight: 1.7 }}>
            A branded snapshot of current paid media performance across the selected platforms and date range.
          </p>
          <p style={{ color: '#8a8178', marginTop: '10px', fontSize: '13px' }}>
            Platform: {platform} · Range: {range} · Generated:{' '}
            {data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'N/A'}
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginBottom: '28px'
          }}
        >
          {summaryCards.map((card) => (
            <div
              key={card.label}
              style={{
                border: '1px solid #e7e0d9',
                borderRadius: '22px',
                padding: '18px',
                background: '#fff'
              }}
            >
              <div style={{ fontSize: '12px', color: '#7a6f66', fontWeight: 700 }}>{card.label}</div>
              <div style={{ fontSize: '31px', fontWeight: 900, marginTop: '8px', lineHeight: 1.1 }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>

        <SectionCard
          title="Performance Breakdown"
          subtitle="A clean summary of active channels and top-level totals for the selected view."
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e7e0d9' }}>
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
                    <td colSpan="5" style={{ padding: '18px 8px', color: '#7a6f66' }}>
                      No data available for this report.
                    </td>
                  </tr>
                ) : (
                  campaignRows.map((row, index) => (
                    <tr
                      key={`${row.platform}-${row.campaign}-${index}`}
                      style={{ borderBottom: '1px solid #f1ece7' }}
                    >
                      <td style={{ padding: '14px 8px' }}>
                        <PlatformBadge label={row.platform} />
                      </td>
                      <td style={{ padding: '14px 8px', fontWeight: 800 }}>{row.campaign}</td>
                      <td style={{ padding: '14px 8px' }}>{row.spend}</td>
                      <td style={{ padding: '14px 8px' }}>{row.clicks}</td>
                      <td style={{ padding: '14px 8px' }}>{row.conversions}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [client, setClient] = useState('rimiya')
  const [platform, setPlatform] = useState('all')
  const [range, setRange] = useState('30d')
  const [view, setView] = useState('dashboard')

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
  const platformSplit =
    data?.platformSplit && typeof data.platformSplit === 'object' && !Array.isArray(data.platformSplit)
      ? data.platformSplit
      : {}

  return (
    <div style={shellStyle()}>
      <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '32px 20px 60px' }}>
        <div
          style={{
            ...cardStyle(),
            padding: '28px',
            marginBottom: '24px'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '20px',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ maxWidth: '760px' }}>
              {sectionLabel('Performance · الأداء')}
              <h1 style={{ margin: '18px 0 0', fontSize: '48px', lineHeight: 1.02, fontWeight: 900 }}>
                Turning performance
                <br />
                into a clearer story.
              </h1>
              <p style={{ marginTop: '14px', color: '#7a6f66', fontSize: '15px', lineHeight: 1.8 }}>
                A brand-aligned dashboard for following client performance across channels, filtering fast,
                and turning active campaign data into a presentable report.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'stretch' }}>
              <div
                style={{
                  background: '#fffdfb',
                  borderRadius: '20px',
                  padding: '16px 18px',
                  border: '1px solid #e7e0d9',
                  minWidth: '255px'
                }}
              >
                <div style={{ fontSize: '12px', color: '#7a6f66', fontWeight: 800 }}>Last Updated</div>
                <div style={{ marginTop: '8px', fontWeight: 900, fontSize: '15px' }}>
                  {data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'N/A'}
                </div>
              </div>

              <button onClick={() => setView('report')} style={buttonStyle(false)}>
                Open Report View
              </button>

              <button onClick={() => setView('onboarding')} style={buttonStyle(true)}>
                Onboarding Helper
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}
        >
          <div style={controlCardStyle()}>
            <div style={{ fontSize: '12px', color: '#7a6f66', marginBottom: '8px', fontWeight: 800 }}>
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

          <div style={controlCardStyle()}>
            <div style={{ fontSize: '12px', color: '#7a6f66', marginBottom: '8px', fontWeight: 800 }}>
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

          <div style={controlCardStyle()}>
            <div style={{ fontSize: '12px', color: '#7a6f66', marginBottom: '8px', fontWeight: 800 }}>
              Date Range
            </div>
            <select value={range} onChange={(e) => setRange(e.target.value)} style={selectStyle()}>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="max">Maximum</option>
            </select>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '16px',
            marginBottom: '26px'
          }}
        >
          {summaryCards.map((card) => (
            <div key={card.label} style={metricCardStyle()}>
              <div style={{ fontSize: '12px', color: '#7a6f66', fontWeight: 800 }}>{card.label}</div>
              <div style={{ fontSize: '32px', fontWeight: 900, marginTop: '12px', lineHeight: 1.08 }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.55fr 0.95fr',
            gap: '20px',
            marginBottom: '20px'
          }}
        >
          <SectionCard
            title="Campaign / Platform Performance"
            subtitle="A clear summary of active channels for the selected client and reporting window."
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #e7e0d9' }}>
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
                      <td colSpan="5" style={{ padding: '18px 8px', color: '#7a6f66' }}>
                        No data available for this filter selection.
                      </td>
                    </tr>
                  ) : (
                    campaignRows.map((row, index) => (
                      <tr key={`${row.platform}-${row.campaign}-${index}`} style={{ borderBottom: '1px solid #f1ece7' }}>
                        <td style={{ padding: '14px 8px' }}>
                          <PlatformBadge label={row.platform} />
                        </td>
                        <td style={{ padding: '14px 8px', fontWeight: 800 }}>{row.campaign}</td>
                        <td style={{ padding: '14px 8px' }}>{row.spend}</td>
                        <td style={{ padding: '14px 8px' }}>{row.clicks}</td>
                        <td style={{ padding: '14px 8px' }}>{row.conversions}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard
            title="Platform Split"
            subtitle="Spend and conversion totals by active platform."
          >
            <div style={{ display: 'grid', gap: '14px' }}>
              {Object.keys(platformSplit).length === 0 ? (
                <div
                  style={{
                    background: '#fff',
                    borderRadius: '18px',
                    padding: '16px',
                    color: '#7a6f66',
                    border: '1px dashed #d8cec5'
                  }}
                >
                  No connected platform data for this selection.
                </div>
              ) : (
                Object.entries(platformSplit).map(([key, value]) => (
                  <div
                    key={key}
                    style={{
                      borderRadius: '20px',
                      padding: '16px',
                      border: '1px solid #e7e0d9',
                      background: '#fffdfb'
                    }}
                  >
                    <div style={{ marginBottom: '10px' }}>
                      <PlatformBadge label={key.replace(/_/g, ' ')} />
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, lineHeight: 1.1 }}>
                      {value?.spend || 'N/A'}
                    </div>
                    <div style={{ marginTop: '8px', color: '#7a6f66', fontSize: '13px' }}>
                      {value?.conversions ?? 'N/A'} conversions
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
