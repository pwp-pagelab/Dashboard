import React, { useEffect, useMemo, useState } from 'react'
import OnboardingHelper from './OnboardingHelper.jsx'

function shellStyle() {
  return {
    minHeight: '100vh',
    background:
      'radial-gradient(circle at top left, rgba(196,181,253,0.18), transparent 25%), radial-gradient(circle at top right, rgba(251,191,36,0.12), transparent 20%), linear-gradient(180deg, #f8fafc 0%, #f3f4f6 100%)',
    color: '#111827'
  }
}

function glassCard() {
  return {
    background: 'rgba(255,255,255,0.82)',
    border: '1px solid rgba(229,231,235,0.9)',
    borderRadius: '24px',
    boxShadow: '0 16px 40px rgba(15,23,42,0.08)',
    backdropFilter: 'blur(10px)'
  }
}

function sectionCardStyle() {
  return {
    ...glassCard(),
    padding: '24px'
  }
}

function metricCardStyle() {
  return {
    ...glassCard(),
    padding: '20px',
    minHeight: '118px'
  }
}

function filterCardStyle() {
  return {
    ...glassCard(),
    padding: '16px'
  }
}

function buttonStyle(primary = false) {
  return {
    padding: '12px 18px',
    borderRadius: '14px',
    border: primary ? 'none' : '1px solid #d1d5db',
    background: primary ? '#111827' : '#ffffff',
    color: primary ? '#ffffff' : '#111827',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: primary ? '0 10px 25px rgba(17,24,39,0.18)' : 'none'
  }
}

function selectStyle() {
  return {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    background: '#fff',
    color: '#111827'
  }
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
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>{title}</h3>
          {subtitle ? (
            <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: '14px' }}>{subtitle}</p>
          ) : null}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

function badgeStyle(label) {
  const lower = String(label || '').toLowerCase()

  if (lower.includes('meta')) {
    return {
      background: '#eef2ff',
      color: '#3730a3'
    }
  }

  if (lower.includes('google')) {
    return {
      background: '#ecfeff',
      color: '#155e75'
    }
  }

  if (lower.includes('snap')) {
    return {
      background: '#fef9c3',
      color: '#854d0e'
    }
  }

  return {
    background: '#f3f4f6',
    color: '#374151'
  }
}

function PlatformBadge({ label }) {
  return (
    <span
      style={{
        ...badgeStyle(label),
        padding: '6px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 700,
        display: 'inline-block'
      }}
    >
      {label}
    </span>
  )
}

function ReportView({ data, platform, range, setView }) {
  const summaryCards = Array.isArray(data?.summaryCards) ? data.summaryCards : []
  const campaignRows = Array.isArray(data?.campaignRows) ? data.campaignRows : []

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#111827', padding: '32px' }}>
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

      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
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
            borderBottom: '1px solid #e5e7eb',
            paddingBottom: '24px',
            marginBottom: '26px'
          }}
        >
          <div
            style={{
              display: 'inline-block',
              padding: '8px 12px',
              borderRadius: '999px',
              background: '#f3f4f6',
              color: '#4b5563',
              fontSize: '12px',
              fontWeight: 800,
              marginBottom: '12px'
            }}
          >
            Client Performance Report
          </div>
          <h1 style={{ margin: 0, fontSize: '40px', fontWeight: 900 }}>
            {data?.client?.name || 'Report'}
          </h1>
          <p style={{ color: '#6b7280', marginTop: '10px', fontSize: '15px' }}>
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
                border: '1px solid #e5e7eb',
                borderRadius: '18px',
                padding: '18px'
              }}
            >
              <div style={{ fontSize: '13px', color: '#6b7280' }}>{card.label}</div>
              <div style={{ fontSize: '30px', fontWeight: 800, marginTop: '8px' }}>{card.value}</div>
            </div>
          ))}
        </div>

        <SectionCard
          title="Performance Breakdown"
          subtitle="Summary of the selected client, platform, and date range."
        >
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
                    <td colSpan="5" style={{ padding: '16px 8px', color: '#6b7280' }}>
                      No data available for this report.
                    </td>
                  </tr>
                ) : (
                  campaignRows.map((row, index) => (
                    <tr
                      key={`${row.platform}-${row.campaign}-${index}`}
                      style={{ borderBottom: '1px solid #f3f4f6' }}
                    >
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
      <div
        style={{
          padding: '40px',
          fontFamily: 'Arial, sans-serif',
          color: 'crimson',
          whiteSpace: 'pre-wrap'
        }}
      >
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
            ...glassCard(),
            padding: '24px',
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
            <div>
              <div
                style={{
                  display: 'inline-block',
                  background: '#ede9fe',
                  color: '#5b21b6',
                  padding: '8px 14px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 800,
                  marginBottom: '14px'
                }}
              >
                Paid Media Intelligence
              </div>
              <h1 style={{ margin: 0, fontSize: '42px', lineHeight: 1.05, fontWeight: 900 }}>
                {data?.client?.name || 'Dashboard'}
              </h1>
              <p style={{ marginTop: '10px', color: '#6b7280', fontSize: '15px', maxWidth: '720px' }}>
                Unified cross-platform reporting for client performance across Meta, Google Ads,
                and Snapchat.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'stretch' }}>
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  padding: '14px 18px',
                  border: '1px solid #e5e7eb',
                  minWidth: '250px'
                }}
              >
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>Last Updated</div>
                <div style={{ marginTop: '8px', fontWeight: 800, fontSize: '15px' }}>
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
          <div style={filterCardStyle()}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: 700 }}>
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

          <div style={filterCardStyle()}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: 700 }}>
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

          <div style={filterCardStyle()}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: 700 }}>
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
              <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 700 }}>{card.label}</div>
              <div style={{ fontSize: '30px', fontWeight: 900, marginTop: '10px', lineHeight: 1.1 }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 0.95fr',
            gap: '20px',
            marginBottom: '20px'
          }}
        >
          <SectionCard
            title="Campaign / Platform Performance"
            subtitle="Current totals for the selected client, platform, and reporting window."
          >
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
                        No data available for this filter selection.
                      </td>
                    </tr>
                  ) : (
                    campaignRows.map((row, index) => (
                      <tr
                        key={`${row.platform}-${row.campaign}-${index}`}
                        style={{ borderBottom: '1px solid #f3f4f6' }}
                      >
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
          </SectionCard>

          <SectionCard
            title="Platform Split"
            subtitle="Spend and conversion view by active platform."
          >
            <div style={{ display: 'grid', gap: '14px' }}>
              {Object.keys(platformSplit).length === 0 ? (
                <div
                  style={{
                    background: '#f9fafb',
                    borderRadius: '16px',
                    padding: '16px',
                    color: '#6b7280',
                    border: '1px dashed #d1d5db'
                  }}
                >
                  No connected platform data for this selection.
                </div>
              ) : (
                Object.entries(platformSplit).map(([key, value]) => (
                  <div
                    key={key}
                    style={{
                      borderRadius: '18px',
                      padding: '16px',
                      border: '1px solid #e5e7eb',
                      background: '#ffffff'
                    }}
                  >
                    <div style={{ marginBottom: '10px' }}>
                      <PlatformBadge label={key.replace(/_/g, ' ')} />
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 900, lineHeight: 1.1 }}>
                      {value?.spend || 'N/A'}
                    </div>
                    <div style={{ marginTop: '8px', color: '#6b7280', fontSize: '13px' }}>
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
