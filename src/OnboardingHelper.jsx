import React, { useEffect, useState } from 'react'

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
    borderLeft: active ? '4px solid #2563eb' : '4px solid transparent'
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

function inputStyle() {
  return {
    width: '100%',
    padding: '11px 12px',
    borderRadius: '12px',
    border: '1px solid #d6dce8',
    background: '#ffffff',
    fontSize: '14px',
    color: '#111827',
    outline: 'none',
    boxSizing: 'border-box'
  }
}

function labelStyle() {
  return {
    fontSize: '12px',
    color: '#94a3b8',
    marginBottom: '8px',
    fontWeight: 700
  }
}

function helperCardStyle() {
  return {
    border: '1px solid #edf0f5',
    borderRadius: '18px',
    background: '#fbfdff',
    padding: '16px'
  }
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
    <div style={{ minHeight: '100vh', background: '#f5f7fb', color: '#111827' }}>
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
            <div style={navItemStyle(false)}>Dashboard</div>
            <div style={navItemStyle(false)}>Performance</div>
            <div style={navItemStyle(false)}>Reports</div>
            <div style={navItemStyle(false)}>Platforms</div>
            <div style={navItemStyle(true)}>Clients</div>
          </div>

          <div style={{ marginTop: '26px', ...cardStyle(), padding: '18px' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
              Quick Actions
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              <button onClick={() => setView('dashboard')} style={buttonStyle(false)}>
                Back to Dashboard
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
                ONBOARDING
              </div>
              <h1 style={{ margin: 0, fontSize: '34px', fontWeight: 900, color: '#111827' }}>
                Add a new client
              </h1>
              <p style={{ marginTop: '8px', color: '#6b7280', fontSize: '14px', maxWidth: '700px' }}>
                Choose a portfolio, inspect available Meta accounts, and generate a clean client config
                snippet for your dashboard.
              </p>
            </div>

            <div
              style={{
                ...cardStyle(),
                padding: '14px 18px',
                minWidth: '250px'
              }}
            >
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>Current Portfolio</div>
              <div style={{ marginTop: '8px', fontWeight: 900, color: '#111827' }}>
                {businessKey}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '0.95fr 1.25fr',
              gap: '18px'
            }}
          >
            <div style={panelStyle()}>
              <div style={{ marginBottom: '18px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>Client Setup</h3>
                <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: '13px' }}>
                  Configure the client identity and choose the platforms you want to enable.
                </p>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <div style={labelStyle()}>Portfolio</div>
                <select value={businessKey} onChange={(e) => setBusinessKey(e.target.value)} style={inputStyle()}>
                  <option value="PWP_MAIN">PWP_MAIN</option>
                  <option value="PWP_SECOND">PWP_SECOND</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <div style={labelStyle()}>Client Name</div>
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  style={inputStyle()}
                  placeholder="Calistra"
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <div style={labelStyle()}>Client Slug</div>
                <input
                  value={clientSlug}
                  onChange={(e) => setClientSlug(e.target.value)}
                  style={inputStyle()}
                  placeholder="calistrafitness"
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <div style={labelStyle()}>Meta Match Value</div>
                <input
                  value={matchValue}
                  onChange={(e) => setMatchValue(e.target.value)}
                  style={inputStyle()}
                  placeholder="calistra"
                />
              </div>

              <div style={helperCardStyle()}>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px', fontWeight: 700 }}>
                  Platforms
                </div>

                <div style={{ display: 'grid', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={googleEnabled}
                      onChange={(e) => setGoogleEnabled(e.target.checked)}
                    />
                    Enable Google Ads
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={snapEnabled}
                      onChange={(e) => setSnapEnabled(e.target.checked)}
                    />
                    Enable Snapchat
                  </label>
                </div>
              </div>

              {error ? (
                <div style={{ marginTop: '16px', color: 'crimson', whiteSpace: 'pre-wrap' }}>
                  {error}
                </div>
              ) : null}
            </div>

            <div style={panelStyle()}>
              <div style={{ marginBottom: '18px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>Available Meta Ad Accounts</h3>
                <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: '13px' }}>
                  Pick an account to auto-fill the client name and match value.
                </p>
              </div>

              {loading ? (
                <div>Loading accounts...</div>
              ) : accounts.length === 0 ? (
                <EmptyState text="No accounts found for this portfolio." />
              ) : (
                <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
                  {accounts.map((account) => (
                    <div
                      key={account.account_id || account.id}
                      style={{
                        border: '1px solid #edf0f5',
                        borderRadius: '18px',
                        background: '#fbfdff',
                        padding: '16px'
                      }}
                    >
                      <div style={{ fontWeight: 800, color: '#111827' }}>{account.name}</div>
                      <div style={{ color: '#6b7280', fontSize: '13px', marginTop: '6px' }}>
                        Account ID: {account.account_id || account.id}
                      </div>
                      <div style={{ marginTop: '12px' }}>
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

              <div style={{ marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Generated Client Config</h3>
              </div>

              <textarea
                readOnly
                value={generatedSnippet}
                style={{
                  width: '100%',
                  minHeight: '320px',
                  borderRadius: '16px',
                  border: '1px solid #d6dce8',
                  padding: '16px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  resize: 'vertical',
                  background: '#fcfcfd',
                  color: '#111827',
                  boxSizing: 'border-box'
                }}
              />

              <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '10px' }}>
                Copy this snippet into <code>data/clients.js</code>.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
