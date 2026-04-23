import React, { useEffect, useState } from 'react'

function cardStyle() {
  return {
    background: '#ffffff',
    borderRadius: '20px',
    padding: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.06)'
  }
}

function inputStyle() {
  return {
    width: '100%',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid #d1d5db',
    fontSize: '14px'
  }
}

function buttonStyle(primary = false) {
  return {
    padding: '12px 18px',
    borderRadius: '14px',
    border: primary ? 'none' : '1px solid #d1d5db',
    background: primary ? '#1f2937' : '#fff',
    color: primary ? '#fff' : '#1f2937',
    fontWeight: 600,
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
  id: '${clientSlug || 'client_slug'}',
  name: '${clientName || 'Client Name'}',
  metaBusinessKey: '${businessKey}',
  metaMatch: {
    type: 'includes',
    value: '${matchValue || 'match_value'}'
  },
  platforms: {
    meta: { enabled: true },
    google: { enabled: ${googleEnabled ? 'true' : 'false'} },
    tiktok: { enabled: false },
    snapchat: { enabled: false }
  }
}`

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f8f7f5 0%, #f2f0ec 100%)',
        color: '#1f2937'
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 20px 60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '28px' }}>
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
              Onboarding Helper
            </div>
            <h1 style={{ margin: 0, fontSize: '38px' }}>Add a New Meta Client</h1>
            <p style={{ marginTop: '10px', color: '#6b7280' }}>
              Pick a portfolio, inspect its ad accounts, and generate the client config snippet.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={() => setView('dashboard')} style={buttonStyle(false)}>
              Back to Dashboard
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.2fr',
            gap: '20px'
          }}
        >
          <div style={cardStyle()}>
            <h3 style={{ marginTop: 0 }}>Setup</h3>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Portfolio</div>
              <select value={businessKey} onChange={(e) => setBusinessKey(e.target.value)} style={inputStyle()}>
                <option value="PWP_MAIN">PWP_MAIN</option>
                <option value="PWP_SECOND">PWP_SECOND</option>
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Client Name</div>
              <input value={clientName} onChange={(e) => setClientName(e.target.value)} style={inputStyle()} placeholder="Calistra" />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Client Slug</div>
              <input value={clientSlug} onChange={(e) => setClientSlug(e.target.value)} style={inputStyle()} placeholder="calistrafitness" />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Meta Match Value</div>
              <input value={matchValue} onChange={(e) => setMatchValue(e.target.value)} style={inputStyle()} placeholder="calistra" />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={googleEnabled}
                onChange={(e) => setGoogleEnabled(e.target.checked)}
              />
              This client also uses Google Ads
            </label>

            {error ? (
              <div style={{ marginTop: '16px', color: 'crimson', whiteSpace: 'pre-wrap' }}>
                {error}
              </div>
            ) : null}
          </div>

          <div style={cardStyle()}>
            <h3 style={{ marginTop: 0 }}>Available Meta Ad Accounts</h3>

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
                      padding: '14px'
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{account.name}</div>
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

            <h3>Generated Client Config</h3>
            <textarea
              readOnly
              value={generatedSnippet}
              style={{
                width: '100%',
                minHeight: '280px',
                borderRadius: '16px',
                border: '1px solid #d1d5db',
                padding: '16px',
                fontFamily: 'monospace',
                fontSize: '13px',
                resize: 'vertical'
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
