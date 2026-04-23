import React, { useEffect, useState } from 'react'

function cardStyle() {
  return {
    background: 'rgba(255,255,255,0.86)',
    borderRadius: '22px',
    padding: '22px',
    border: '1px solid rgba(229,231,235,0.9)',
    boxShadow: '0 14px 35px rgba(15,23,42,0.08)',
    backdropFilter: 'blur(10px)'
  }
}

function inputStyle() {
  return {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    background: '#fff'
  }
}

function buttonStyle(primary = false) {
  return {
    padding: '12px 18px',
    borderRadius: '14px',
    border: primary ? 'none' : '1px solid #d1d5db',
    background: primary ? '#111827' : '#fff',
    color: primary ? '#fff' : '#111827',
    fontWeight: 700,
    cursor: 'pointer'
  }
}

export default function OnboardingHelper({ setView }) {
  const [businessKey, setBusinessKey] = useState('PWP_SECOND')
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [clientName, setClientName] = useState('')
  const [clientSlug, setClientSlug] = useState('')
  const [matchValue, setMatchValue] = useState('')
  const [googleEnabled, setGoogleEnabled] = useState(false)
  const [snapEnabled, setSnapEnabled] = useState(false)

  useEffect(() => {
    async function loadAccounts() {
      try {
        setLoading(true)
        setError('')
        const res = await fetch(`/api/meta-debug?businessKey=${encodeURIComponent(businessKey)}`)
        const text = await res.text()

        let json
        try {
          json = JSON.parse(text)
        } catch {
          throw new Error(text.slice(0, 300) || 'Non-JSON response')
        }

        if (!res.ok) {
          throw new Error(json.error || 'Failed to load accounts')
        }

        setAccounts(Array.isArray(json.accounts) ? json.accounts : [])
      } catch (err) {
        setAccounts([])
        setError(err.message || 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    loadAccounts()
  }, [businessKey])

  const generatedSnippet = `{
  id: '${clientSlug || 'clientslug'}',
  name: '${clientName || 'Client Name'}',
  metaBusinessKey: '${businessKey}',
  metaMatch: {
    type: 'includes',
    value: '${matchValue || 'match_value'}'
  },
  snapMatch: ${snapEnabled ? `{
    type: 'includes',
    value: '${clientName || 'Client Name'}'
  }` : 'null'},
  platforms: {
    meta: { enabled: true },
    google: { enabled: ${googleEnabled ? 'true' : 'false'} },
    tiktok: { enabled: false },
    snapchat: { enabled: ${snapEnabled ? 'true' : 'false'} }
  }
}`

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, rgba(196,181,253,0.18), transparent 25%), radial-gradient(circle at top right, rgba(251,191,36,0.12), transparent 20%), linear-gradient(180deg, #f8fafc 0%, #f3f4f6 100%)',
        color: '#111827'
      }}
    >
      <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '32px 20px 60px' }}>
        <div
          style={{
            ...cardStyle(),
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '16px',
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
              Onboarding Helper
            </div>
            <h1 style={{ margin: 0, fontSize: '38px', fontWeight: 900 }}>Add a New Client</h1>
            <p style={{ marginTop: '10px', color: '#6b7280' }}>
              Inspect Meta portfolio accounts and generate a clean client config snippet.
            </p>
          </div>

          <div>
            <button onClick={() => setView('dashboard')} style={buttonStyle(false)}>
              Back to Dashboard
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '0.95fr 1.25fr',
            gap: '20px'
          }}
        >
          <div style={cardStyle()}>
            <h3 style={{ marginTop: 0, fontSize: '20px', fontWeight: 800 }}>Client Setup</h3>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: 700 }}>
                Portfolio
              </div>
              <select value={businessKey} onChange={(e) => setBusinessKey(e.target.value)} style={inputStyle()}>
                <option value="PWP_MAIN">PWP_MAIN</option>
                <option value="PWP_SECOND">PWP_SECOND</option>
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: 700 }}>
                Client Name
              </div>
              <input value={clientName} onChange={(e) => setClientName(e.target.value)} style={inputStyle()} placeholder="Calistra" />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: 700 }}>
                Client Slug
              </div>
              <input value={clientSlug} onChange={(e) => setClientSlug(e.target.value)} style={inputStyle()} placeholder="calistrafitness" />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: 700 }}>
                Meta Match Value
              </div>
              <input value={matchValue} onChange={(e) => setMatchValue(e.target.value)} style={inputStyle()} placeholder="calistra" />
            </div>

            <div style={{ display: 'grid', gap: '10px', marginTop: '18px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={googleEnabled}
                  onChange={(e) => setGoogleEnabled(e.target.checked)}
                />
                Client also uses Google Ads
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={snapEnabled}
                  onChange={(e) => setSnapEnabled(e.target.checked)}
                />
                Client also uses Snapchat
              </label>
            </div>

            {error ? (
              <div style={{ marginTop: '16px', color: 'crimson', whiteSpace: 'pre-wrap' }}>
                {error}
              </div>
            ) : null}
          </div>

          <div style={cardStyle()}>
            <h3 style={{ marginTop: 0, fontSize: '20px', fontWeight: 800 }}>Available Meta Ad Accounts</h3>

            {loading ? (
              <div>Loading accounts...</div>
            ) : accounts.length === 0 ? (
              <div style={{ color: '#6b7280' }}>No accounts found for this portfolio.</div>
            ) : (
              <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
                {accounts.map((account) => (
                  <div
                    key={account.account_id || account.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '16px',
                      padding: '14px',
                      background: '#fff'
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>{account.name}</div>
                    <div style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px' }}>
                      Account ID: {account.account_id || account.id}
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <button
                        style={buttonStyle(false)}
                        onClick={() => {
                          setClientName(account.name)
                          setMatchValue(account.name)
                          if (!clientSlug) {
                            setClientSlug(
                              String(account.name || '')
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, '')
                            )
                          }
                        }}
                      >
                        Use this account
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Generated Client Config</h3>
            <textarea
              readOnly
              value={generatedSnippet}
              style={{
                width: '100%',
                minHeight: '300px',
                borderRadius: '16px',
                border: '1px solid #d1d5db',
                padding: '16px',
                fontFamily: 'monospace',
                fontSize: '13px',
                resize: 'vertical',
                background: '#fcfcfd'
              }}
            />
            <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '10px' }}>
              Copy this snippet and paste it into <code>data/clients.js</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
