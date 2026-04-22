import React from 'react'

const summaryCards = [
  { label: 'Total Spend', value: 'SAR 12,450' },
  { label: 'Impressions', value: '485,320' },
  { label: 'Clicks', value: '14,280' },
  { label: 'Conversions', value: '126' },
  { label: 'CTR', value: '2.94%' },
  { label: 'ROAS', value: '3.82x' }
]

const campaignRows = [
  { platform: 'Meta', campaign: 'Prospecting', spend: 'SAR 3,200', clicks: '4,120', conversions: '31' },
  { platform: 'Meta', campaign: 'Retargeting', spend: 'SAR 1,850', clicks: '2,010', conversions: '28' },
  { platform: 'Google Ads', campaign: 'Brand Search', spend: 'SAR 2,100', clicks: '3,430', conversions: '35' },
  { platform: 'Google Ads', campaign: 'Shopping', spend: 'SAR 5,300', clicks: '4,720', conversions: '32' }
]

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
            <div style={{ marginTop: '6px', fontWeight: 700 }}>Today · 1:30 PM</div>
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
                  {campaignRows.map((row) => (
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
            <div
              style={{
                display: 'grid',
                gap: '14px'
              }}
            >
              <div style={{ background: '#f7f4ef', borderRadius: '16px', padding: '16px' }}>
                <div style={{ color: '#6b7280', fontSize: '13px' }}>Meta</div>
                <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '6px' }}>SAR 5,050</div>
                <div style={{ marginTop: '6px', color: '#6b7280', fontSize: '13px' }}>59 conversions</div>
              </div>

              <div style={{ background: '#f4f1fb', borderRadius: '16px', padding: '16px' }}>
                <div style={{ color: '#6b7280', fontSize: '13px' }}>Google Ads</div>
                <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '6px' }}>SAR 7,400</div>
                <div style={{ marginTop: '6px', color: '#6b7280', fontSize: '13px' }}>67 conversions</div>
              </div>

              <div style={{ background: '#f5f5f5', borderRadius: '16px', padding: '16px' }}>
                <div style={{ color: '#6b7280', fontSize: '13px' }}>Status</div>
                <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '6px' }}>Ready for API connection</div>
                <div style={{ marginTop: '6px', color: '#6b7280', fontSize: '13px' }}>
                  Next step is to replace sample values with live Meta and Google Ads data.
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
