import React, { useEffect, useMemo, useState } from 'react'
import OnboardingHelper from './OnboardingHelper.jsx'

function navItemStyle(active) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: '12px',
    background: active ? '#eef3ff' : 'transparent',
    color: active ? '#1d4ed8' : '#4b5563',
    fontWeight: active ? 800 : 600,
    borderLeft: active ? '4px solid #2563eb' : '4px solid transparent',
    cursor: 'pointer'
  }
}

function cardStyle() {
  return {
    background: '#ffffff',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(15,23,42,0.06)',
    border: '1px solid #edf0f5'
  }
}

function metricCardStyle(accent = '#2563eb') {
  return {
    ...cardStyle(),
    padding: '18px',
    minHeight: '112px',
    position: 'relative',
    overflow: 'hidden',
    borderBottom: `4px solid ${accent}`
  }
}

function panelStyle() {
  return {
    ...cardStyle(),
    padding: '22px'
  }
}

function buttonStyle(primary = false) {
  return {
    padding: '11px 16px',
    borderRadius: '12px',
    border: primary ? 'none' : '1px solid #d6dce8',
    background: primary ? '#2563eb' : '#ffffff',
    color: primary ? '#ffffff' : '#111827',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: primary ? '0 10px 25px rgba(37,99,235,0.22)' : 'none'
  }
}

function selectStyle() {
  return {
    width: '100%',
    padding: '11px 12px',
    borderRadius: '12px',
    border: '1px solid #d6dce8',
    background: '#ffffff',
    fontSize: '14px',
    color: '#111827',
    outline: 'none'
  }
}

function PlatformBadge({ label }) {
  const lower = String(label || '').toLowerCase()

  let bg = '#eef2ff'
  let color = '#4338ca'

  if (lower.includes('google')) {
    bg = '#ecfeff'
    color = '#0f766e'
  } else if (lower.includes('snap')) {
    bg = '#fef9c3'
    color = '#92400e'
  } else if (lower.includes('meta')) {
    bg = '#eef2ff'
    color = '#4338ca'
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
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '12px',
        flexWrap: 'wrap',
        marginBottom: '18px'
      }}
    >
      <div>
        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#111827' }}>{title}</h3>
        {subtitle ? (
          <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: '13px' }}>{subtitle}</p>
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
        background: '#f8fafc',
        border: '1px dashed #d6dce8',
        color: '#6b7280',
        fontSize: '14px'
      }}
    >
      {text}
    </div>
  )
}

function ReportView({ data, platform, range, setView }) {
  const summaryCards = Array.isArray(data?.summaryCards) ? data.summaryCards : []
  const campaignRows = Array.isArray(data?.campaignRows) ? data.campaignRows : []

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fb', padding: '28px', color: '#111827' }}>
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

      <div style={{ maxWidth: '1150px', margin: '0 auto' }}>
        <div className="no-print" style={{ display: 'flex', gap: '12px', marginBottom: '22px', flexWrap: 'wrap' }}>
          <button onClick={() => setView('dashboard')} style={buttonStyle(false)}>
            Back to Dashboard
          </button>
          <button onClick={() => window.print()} style={buttonStyle(true)}>
            Export PDF
          </button>
        </div>

        <div style={{ ...panelStyle(), marginBottom: '18px' }}>
          <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 800, marginBottom: '10px' }}>
            CLIENT REPORT
          </div>
          <h1 style={{ margin: 0, fontSize: '36px', fontWeight: 900 }}>{data?.client?.name || 'Report'}</h1>
          <p style={{ marginTop: '10px', color: '#6b7280', fontSize: '14px' }}>
            Platform: {platform} · Range: {range} · Generated:{' '}
            {data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'N/A'}
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px',
            marginBottom: '18px'
          }}
        >
          {summaryCards.map((card, i) => (
            <div key={card.label} style={metricCardStyle(['#22c55e', '#a855f7', '#ec4899', '#facc15', '#2563eb'][i % 5])}>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>{card.label}</div>
              <div style={{ marginTop: '10px', fontSize: '30px', fontWeight: 900, lineHeight: 1.1 }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>

        <div style={panelStyle()}>
          <SectionTitle
            title="Performance Table"
            subtitle="Filtered performance across active platforms."
          />

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
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
                    <td colSpan="5" style={{ padding: '18px 8px', color: '#6b7280' }}>
                      No data available for this report.
                    </td>
                  </tr>
                ) : (
                  campaignRows.map((row, index) => (
                    <tr key={`${row.platform}-${row.campaign}-${index}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
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

  const accentColors = ['#22c55e', '#a855f7', '#ec4899', '#facc15', '#2563eb', '#06b6d4']

  return (
    <div style={shellStyle()}>
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh' }}>
        <aside
          style={{
            background: '#ffffff',
            borderRight: '1px solid #eef2f7',
            padding: '26px 18px',
            boxShadow: '8px 0 30px rgba(15,23,42,0.03)'
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px', color: '#111827' }}>
            PWP
          </div>
          <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '28px' }}>
            Performance Dashboard
          </div>

          <div style={{ color: '#111827', fontWeight: 800, fontSize: '14px', marginBottom: '14px' }}>
            Main Menu
          </div>

          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={navItemStyle(true)}>Dashboard</div>
            <div style={navItemStyle(false)}>Performance</div>
            <div style={navItemStyle(false)}>Reports</div>
            <div style={navItemStyle(false)}>Platforms</div>
            <div style={navItemStyle(false)}>Clients</div>
          </div>

          <div style={{ marginTop: '26px', ...cardStyle(), padding: '18px' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
              Quick Actions
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              <button onClick={() => setView('onboarding')} style={buttonStyle(true)}>
                Open Onboarding
              </button>
              <button onClick={() => setView('report')} style={buttonStyle(false)}>
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
              <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 800, marginBottom: '8px' }}>
                DASHBOARD
              </div>
              <h1 style={{ margin: 0, fontSize: '34px', fontWeight: 900, color: '#111827' }}>
                {data?.client?.name || 'Dashboard'}
              </h1>
              <p style={{ marginTop: '8px', color: '#6b7280', fontSize: '14px' }}>
                A clean overview of your paid media performance across active platforms.
              </p>
            </div>

            <div
              style={{
                ...cardStyle(),
                padding: '14px 18px',
                minWidth: '250px'
              }}
            >
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>Last Updated</div>
              <div style={{ marginTop: '8px', fontWeight: 900, color: '#111827' }}>
                {data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'N/A'}
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
                  <option value="max">Maximum</option>
                </select>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: '14px',
              marginBottom: '20px'
            }}
          >
            {summaryCards.map((card, i) => (
              <div key={card.label} style={metricCardStyle(accentColors[i % accentColors.length])}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>{card.label}</div>
                <div style={{ marginTop: '12px', fontSize: '30px', fontWeight: 900, lineHeight: 1.08, color: '#111827' }}>
                  {card.value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.55fr 0.95fr',
              gap: '18px'
            }}
          >
            <div style={panelStyle()}>
              <SectionTitle
                title="Campaign / Platform Performance"
                subtitle="Top-level numbers for the selected platforms."
              />

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
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
                          <EmptyState text="No data available for this filter selection." />
                        </td>
                      </tr>
                    ) : (
                      campaignRows.map((row, index) => (
                        <tr key={`${row.platform}-${row.campaign}-${index}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
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

            <div style={panelStyle()}>
              <SectionTitle
                title="Platform Split"
                subtitle="Spend and conversion totals by platform."
              />

              <div style={{ display: 'grid', gap: '12px' }}>
                {Object.keys(platformSplit).length === 0 ? (
                  <EmptyState text="No connected platform data for this selection." />
                ) : (
                  Object.entries(platformSplit).map(([key, value]) => (
                    <div
                      key={key}
                      style={{
                        border: '1px solid #edf0f5',
                        borderRadius: '18px',
                        background: '#fbfdff',
                        padding: '16px'
                      }}
                    >
                      <div style={{ marginBottom: '10px' }}>
                        <PlatformBadge label={key.replace(/_/g, ' ')} />
                      </div>
                      <div style={{ fontSize: '27px', fontWeight: 900, lineHeight: 1.1, color: '#111827' }}>
                        {value?.spend || 'N/A'}
                      </div>
                      <div style={{ marginTop: '8px', color: '#6b7280', fontSize: '13px' }}>
                        {value?.conversions ?? 'N/A'} conversions
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
