import React from 'react'

export default function App() {
  return (
    <div style={{ padding: '40px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '36px' }}>Rimiya Dashboard</h1>
        <p style={{ color: '#6b7280', marginTop: '10px' }}>
          React + Vercel starter. Next we’ll connect Meta and Google Ads.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px'
        }}
      >
        {[
          ['Spend', 'SAR 0'],
          ['Impressions', '0'],
          ['Clicks', '0'],
          ['Conversions', '0']
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              background: '#fff',
              borderRadius: '18px',
              padding: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
            }}
          >
            <div style={{ color: '#6b7280', fontSize: '14px' }}>{label}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '10px' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: '24px',
          background: '#fff',
          borderRadius: '18px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
        }}
      >
        <h2 style={{ marginTop: 0 }}>Status</h2>
        <p style={{ marginBottom: 0, color: '#4b5563' }}>
          If you can see this on Vercel, the frontend is working correctly.
        </p>
      </div>
    </div>
  )
}
