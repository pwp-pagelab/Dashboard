import React, { useEffect, useMemo, useState } from 'react'
import OnboardingHelper from './OnboardingHelper.jsx'

function SectionCard({ title, children }) {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '22px',
        padding: '24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.06)'
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: '18px', fontSize: '20px' }}>{title}</h3>
      {children}
    </div>
  )
}

function buttonStyle(primary = false) {
  return {
    padding: '12px 18px',
    borderRadius: '14px',
    border: primary ? 'none' : '1px solid #ddd',
    background: primary ? '#1f2937' : '#fff',
    color: primary ? '#fff' : '#1f2937',
    fontWeight: 600,
    cursor: 'pointer'
  }
}

function ReportView({ data, platform, range, setView }) {
  const summaryCards = Array.isArray(data?.summaryCards) ? data.summaryCards : []
  const campaignRows = Array.isArray(data?.campaignRows) ? data.campaignRows : []

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#1f2937', padding: '32px' }}>
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
        <div className="no-print" style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button onClick={() => setView('dashboard')} style={buttonStyle(false)}>
            Back to Dashboard
          </button>
          <button onClick={() => window.print()} style={buttonStyle(true)}>
            Export PDF
          </button>
        </div>

        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Client Report</div>
          <h1 style={{ margin: 0, fontSize: '38px' }}>{data?.client?.name || 'Report'}</h1>
          <p style={{ color: '#6b7280', marginTop: '10px' }}>
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
            <div key={card.label} style={{ border: '1px solid #e5e7eb', borderRadius: '18px', padding: '18px' }}>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>{card.label}</div>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px' }}>{card.value}</div>
            </div>
          ))}
        </div>

        <SectionCard title="Performance Breakdown">
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
                    <tr key={`${row.platform}-${row.campaign}-${index}`} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '14px 8px' }}>{row.platform}</td>
                      <td style={{ padding: '14px 8px', fontWeight: 600 }}>{row.campaign}</td>
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
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f8f7f5 0%, #f2f0ec 100%)',
        color: '#1f2937'
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 20px 60px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '20px',
            flexWrap: 'wrap',
            marginBottom: '28px'
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-block',
                background: '#ece7df',
                color: '#6b5c4b',
                padding: '8px 14px',
                borderRadius: '999px',
                fontSize: '13px',
                marginBottom: '14px'
              }}
            >
              Paid Media Dashboard
            </div>
            <h1 style={{ margin: 0, fontSize: '40px', lineHeight: 1.1 }}>
              {data?.client?.name || 'Dashboard'}
            </h1>
            <p style={{ marginTop: '10px', color: '#6b7280', fontSize: '16px' }}>
              Multi-client paid media reporting with platform and date filtering.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'stretch' }}>
            <div
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '14px 18px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
                minWidth: '260px'
              }}
            >
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Last Updated</div>
              <div style={{ marginTop: '6px', fontWeight: 700 }}>
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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}
        >
          <div style={{ background: '#fff', borderRadius: '18px', padding: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Client</div>
            <select value={client} onChange={(e) => setClient(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px' }}>
              {availableClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ background: '#fff', borderRadius: '18px', padding: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Platform</div>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px' }}>
              {availablePlatforms.map((p) => (
                <option key={p} value={p}>
                  {p === 'all' ? 'All Platforms' : p}
                </option>
              ))}
            </select>
          </div>

          <div style={{ background: '#fff', borderRadius: '18px', padding: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Date Range</div>
            <select value={range} onChange={(e) => setRange(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px' }}>
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginBottom: '26px'
          }}
        >
          {summaryCards.map((card) => (
            <div
              key={card.label}
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '20px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.06)'
              }}
            >
              <div style={{ fontSize: '14px', color: '#6b7280' }}>{card.label}</div>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '10px' }}>{card.value}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr',
            gap: '20px',
            marginBottom: '20px'
          }}
        >
          <SectionCard title="Campaign / Platform Performance">
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
                        No data available for this filter selection.
                      </td>
                    </tr>
                  ) : (
                    campaignRows.map((row, index) => (
                      <tr key={`${row.platform}-${row.campaign}-${index}`} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '14px 8px' }}>{row.platform}</td>
                        <td style={{ padding: '14px 8px', fontWeight: 600 }}>{row.campaign}</td>
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

          <SectionCard title="Platform Split">
            <div style={{ display: 'grid', gap: '14px' }}>
              {Object.keys(platformSplit).length === 0 ? (
                <div style={{ background: '#f5f5f5', borderRadius: '16px', padding: '16px', color: '#6b7280' }}>
                  No connected platform data for this selection.
                </div>
              ) : (
                Object.entries(platformSplit).map(([key, value]) => (
                  <div key={key} style={{ background: '#f5f5f5', borderRadius: '16px', padding: '16px' }}>
                    <div style={{ color: '#6b7280', fontSize: '13px', textTransform: 'capitalize' }}>
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '6px' }}>
                      {value?.spend || 'N/A'}
                    </div>
                    <div style={{ marginTop: '6px', color: '#6b7280', fontSize: '13px' }}>
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
