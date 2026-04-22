import React, { useEffect, useState } from 'react'

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

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true)
        const res = await fetch('/api/dashboard')
        if (!res.ok) {
          throw new Error('Failed to load dashboard data')
        }
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err.message || 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
        Loading dashboard...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', color: 'crimson' }}>
        Error: {error}
      </div>
    )
  }

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
              Rimiya Paid Media Dashboard
            </div>
            <h1 style={{ margin: 0, fontSize: '40px', lineHeight: 1.1 }}>Performance Overview</h1>
            <p style={{ marginTop: '10px', color: '#6b7280', fontSize: '16px' }}>
              Meta + Google Ads dashboard with room for daily synced live data.
            </p>
          </div>

          <div
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              padding: '14px 18px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
              minWidth: '220px'
            }}
          >
            <div style={{ fontSize: '13px', color: '#6b7280' }}>Last Updated</div>
            <div style={{ marginTop: '6px', fontWeight: 700 }}>
              {new Date(data.updatedAt).toLocaleString()}
            </div>
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
          {data.summaryCards.map((card) => (
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
          <SectionCard title="Campaign Performance">
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
                  {data.campaignRows.map((row) => (
                    <tr key={`${row.platform}-${row.campaign}`} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '14px 8px' }}>{row.platform}</td>
                      <td style={{ padding: '14px 8px', fontWeight: 600 }}>{row.campaign}</td>
                      <td style={{ padding: '14px 8px' }}>{row.spend}</td>
                      <td style={{ padding: '14px 8px' }}>{row.clicks}</td>
                      <td style={{ padding: '14px 8px' }}>{row.conversions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Platform Split">
            <div style={{ display: 'grid', gap: '14px' }}>
              <div style={{ background: '#f7f4ef', borderRadius: '16px', padding: '16px' }}>
                <div style={{ color: '#6b7280', fontSize: '13px' }}>Meta</div>
                <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '6px' }}>
                  {data.platformSplit.meta.spend}
                </div>
                <div style={{ marginTop: '6px', color: '#6b7280', fontSize: '13px' }}>
                  {data.platformSplit.meta.conversions} conversions
                </div>
              </div>

              <div style={{ background: '#f4f1fb', borderRadius: '16px', padding: '16px' }}>
                <div style={{ color: '#6b7280', fontSize: '13px' }}>Google Ads</div>
                <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '6px' }}>
                  {data.platformSplit.google.spend}
                </div>
                <div style={{ marginTop: '6px', color: '#6b7280', fontSize: '13px' }}>
                  {data.platformSplit.google.conversions} conversions
                </div>
              </div>

              <div style={{ background: '#f5f5f5', borderRadius: '16px', padding: '16px' }}>
                <div style={{ color: '#6b7280', fontSize: '13px' }}>Status</div>
                <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '6px' }}>Backend connected</div>
                <div style={{ marginTop: '6px', color: '#6b7280', fontSize: '13px' }}>
                  The dashboard is now reading from a serverless API route.
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
