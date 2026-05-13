import React, { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts'
import OnboardingHelper from './OnboardingHelper.jsx'

const COLORS = {
  green: '#0A4C3E',
  greenMid: '#2F7465',
  greenLight: '#9BBEAE',
  amber: '#E8BE51',
  amberDeep: '#9A6A12',
  cream: '#F8F4EA',
  white: '#FFFFFF',
  text: '#1D2925',
  muted: '#69746E',
  line: '#E8DEC8',
  softGreen: '#E7F0EC',
  softAmber: '#FBF1D7',
  softRed: '#FBE9E7',
  red: '#B42318'
}

function navItemStyle(active) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: '12px',
    background: active ? 'rgba(232,190,81,0.2)' : 'transparent',
    color: active ? '#ffffff' : 'rgba(255,255,255,0.82)',
    fontWeight: active ? 800 : 600,
    borderLeft: active ? `4px solid ${COLORS.amber}` : '4px solid transparent'
  }
}

function cardStyle() {
  return {
    background: COLORS.white,
    borderRadius: '12px',
    border: `0.5px solid ${COLORS.line}`,
    boxShadow: '0 10px 28px rgba(10,76,62,0.06)'
  }
}

function panelStyle() {
  return {
    ...cardStyle(),
    padding: '16px'
  }
}

function buttonStyle(primary = false) {
  return {
    padding: '11px 16px',
    borderRadius: '12px',
    border: primary ? 'none' : `1px solid ${COLORS.line}`,
    background: primary ? COLORS.green : COLORS.white,
    color: primary ? COLORS.amber : COLORS.green,
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer'
  }
}

function selectStyle() {
  return {
    width: '100%',
    padding: '11px 12px',
    borderRadius: '12px',
    border: `1px solid ${COLORS.line}`,
    background: COLORS.white,
    fontSize: '14px',
    color: COLORS.text,
    outline: 'none'
  }
}

function BrandMark({ dark = false }) {
  const bg = dark ? 'rgba(255,255,255,0.08)' : COLORS.white
  const border = dark ? '1px solid rgba(255,255,255,0.12)' : `1px solid ${COLORS.line}`
  const titleColor = dark ? '#ffffff' : COLORS.green
  const subColor = dark ? 'rgba(255,255,255,0.72)' : COLORS.muted

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 14px',
        borderRadius: '16px',
        background: bg,
        border
      }}
    >
      <div
        style={{
          width: '54px',
          height: '54px',
          borderRadius: '14px',
          overflow: 'hidden',
          flexShrink: 0
        }}
      >
        <img
          src="/logo-pwp.jpg"
          alt="Post With Passion logo"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block'
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>

      <div>
        <div
          style={{
            fontSize: '15px',
            fontWeight: 900,
            color: titleColor,
            lineHeight: 1.1
          }}
        >
          PWP Client Dashboard
        </div>
        <div
          style={{
            fontSize: '12px',
            color: subColor,
            marginTop: '4px'
          }}
        >
          Performance reporting
        </div>
      </div>
    </div>
  )
}

function PlatformBadge({ label }) {
  const lower = String(label || '').toLowerCase()

  let bg = COLORS.softGreen
  let color = COLORS.green

  if (lower.includes('google')) {
    bg = '#EEF6F3'
    color = '#0F766E'
  } else if (lower.includes('snap')) {
    bg = COLORS.softAmber
    color = COLORS.amber
  } else if (lower.includes('meta')) {
    bg = '#EDF3FF'
    color = '#244F7A'
  } else if (lower.includes('tiktok')) {
    bg = '#F3F4F6'
    color = '#1D2925'
  } else if (lower.includes('linkedin')) {
    bg = '#E8F1FF'
    color = '#0A66C2'
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

function MetricCard({ label, value }) {
  return (
    <div style={{ ...cardStyle(), padding: '14px' }}>
      <div style={{ color: COLORS.muted, fontSize: '12px', fontWeight: 800 }}>{label}</div>
      <div style={{ color: COLORS.green, fontSize: '22px', fontWeight: 900, marginTop: '6px', lineHeight: 1.1 }}>
        {value || 'N/A'}
      </div>
    </div>
  )
}

function SectionTitle({ title, subtitle, right }) {
  return (
    <div
      style={{
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '14px',
        flexWrap: 'wrap'
      }}
    >
      <div>
        <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: COLORS.green }}>{title}</h3>
        {subtitle ? (
          <p style={{ margin: '6px 0 0', color: COLORS.muted, fontSize: '13px' }}>{subtitle}</p>
        ) : null}
      </div>
      {right}
    </div>
  )
}

function EmptyState({ title = 'Data is still building', text }) {
  return (
    <div
      style={{
        padding: '16px 18px',
        borderRadius: '12px',
        background: '#FBFAF7',
        border: `1px dashed ${COLORS.line}`,
        color: COLORS.muted,
        fontSize: '14px',
        lineHeight: 1.55
      }}
    >
      <div style={{ color: COLORS.green, fontWeight: 800, marginBottom: '4px' }}>{title}</div>
      <div>{text}</div>
    </div>
  )
}

function formatSar(value) {
  if (value == null || Number.isNaN(Number(value))) return 'N/A'
  return `SAR ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function parseSarString(value) {
  if (!value) return 0
  const n = String(value).replace(/[^0-9.-]/g, '')
  return Number(n || 0)
}

function parseNumberString(value) {
  return Number(String(value || '0').replace(/,/g, ''))
}

function percent(value) {
  if (!Number.isFinite(value)) return '0.0%'
  return `${value.toFixed(1)}%`
}

const METRIC_LABELS = {
  'Total Spend': 'Spend (الإنفاق)',
  Impressions: 'Impressions (الظهور)',
  Clicks: 'Clicks (النقرات)',
  CTR: 'CTR (معدل النقر)',
  Results: 'Results (النتائج)',
  Conversions: 'Results (النتائج)',
  'Platforms Active': 'Platforms active (المنصات النشطة)',
  Spend: 'Spend (الإنفاق)',
  CPA: 'Cost per result (تكلفة النتيجة)',
  CPC: 'CPC (تكلفة النقرة)',
  Platform: 'Platform',
  Campaign: 'Campaign',
  'Spend share': 'Spend share (حصة الإنفاق)',
  'Click share': 'Click share (حصة النقرات)',
  'Conversion share': 'Result share (حصة النتائج)',
  'Result share': 'Result share (حصة النتائج)'
}

function metricLabel(label) {
  return METRIC_LABELS[label] || label
}

function StatusBanner({ text }) {
  return (
    <div style={panelStyle()}>
      <SectionTitle
        title="Next action"
        subtitle="Recommended focus based on the current results."
      />
      <div
        style={{
          padding: '13px 15px',
          borderRadius: '10px',
          border: `1px solid ${COLORS.line}`,
          borderLeft: `4px solid ${COLORS.amber}`,
          background: '#FCFBF8',
          color: COLORS.text,
          fontWeight: 700,
          fontSize: '14px',
          lineHeight: 1.55
        }}
      >
        {text}
      </div>
    </div>
  )
}

function statusPillStyle(status) {
  if (status === 'loaded') {
    return { background: COLORS.softGreen, color: COLORS.green, border: `1px solid ${COLORS.greenLight}` }
  }

  if (status === 'error') {
    return { background: COLORS.softRed, color: COLORS.red, border: `1px solid ${COLORS.softRed}` }
  }

  return { background: COLORS.softAmber, color: COLORS.amberDeep, border: `1px solid ${COLORS.line}` }
}

function formatConversionBreakdown(breakdown) {
  if (!breakdown || typeof breakdown !== 'object') return ''

  const labels = [
    ['leads', 'Leads'],
    ['messagingConversations', 'Messaging conversations'],
    ['purchases', 'Purchases'],
    ['registrations', 'Registrations']
  ]

  return labels
    .map(([key, label]) => [label, Number(breakdown[key] || 0)])
    .filter(([, value]) => value > 0)
    .map(([label, value]) => `${label}: ${value.toLocaleString()}`)
    .join(' · ')
}

function getSummaryCardValue(summaryCards, label) {
  const cards = Array.isArray(summaryCards) ? summaryCards : []
  const direct = cards.find((card) => card.label === label)?.value
  if (direct != null) return direct
  if (label === 'Results') return cards.find((card) => card.label === 'Conversions')?.value || ''
  if (label === 'Conversions') return cards.find((card) => card.label === 'Results')?.value || ''
  return ''
}

function DataConfidencePanel({ data }) {
  const quality = data?.dataQuality || {}
  const statuses = Array.isArray(data?.accountStatuses) ? data.accountStatuses : []
  const loaded = quality.loadedAccounts ?? statuses.filter((item) => item.status === 'loaded').length
  const failed = quality.failedAccounts ?? statuses.filter((item) => item.status === 'error').length
  const noData = quality.noDataAccounts ?? statuses.filter((item) => item.status === 'no_data').length
  const total = quality.selectedAccounts ?? statuses.length
  const statusText = failed > 0
    ? 'Needs attention'
    : noData > 0
      ? 'Partially loaded'
      : 'Loaded'

  return (
    <div style={{ ...cardStyle(), padding: '13px 14px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <div style={{ color: COLORS.green, fontWeight: 900, fontSize: '13px' }}>Data confidence</div>
          <div style={{ color: COLORS.muted, fontSize: '12px', marginTop: '3px' }}>
            {loaded} loaded · {noData} no spend/data · {failed} needs attention · {total} selected
          </div>
        </div>
        <span style={{ ...statusPillStyle(failed > 0 ? 'error' : noData > 0 ? 'no_data' : 'loaded'), borderRadius: '999px', padding: '7px 10px', fontSize: '12px', fontWeight: 900 }}>
          {statusText}
        </span>
      </div>

      {quality.currencyWarning || quality.conversionWarning ? (
        <div style={{ display: 'grid', gap: '6px', marginTop: '10px' }}>
          {quality.currencyWarning ? (
            <div style={{ color: COLORS.amberDeep, fontSize: '12px', lineHeight: 1.45 }}>{quality.currencyWarning}</div>
          ) : null}
          {quality.conversionWarning ? (
            <div style={{ color: COLORS.amberDeep, fontSize: '12px', lineHeight: 1.45 }}>{quality.conversionWarning}</div>
          ) : null}
        </div>
      ) : null}

      {statuses.length ? (
        <details style={{ marginTop: '10px' }}>
          <summary style={{ color: COLORS.green, cursor: 'pointer', fontSize: '12px', fontWeight: 900 }}>
            View included account status
          </summary>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '8px', marginTop: '10px' }}>
            {statuses.map((account) => (
              <div key={account.id} style={{ border: `1px solid ${COLORS.line}`, borderRadius: '10px', padding: '10px', background: '#FBFAF7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ color: COLORS.green, fontWeight: 900, fontSize: '13px' }}>{account.accountName}</div>
                    <div style={{ color: COLORS.muted, fontSize: '12px', marginTop: '2px' }}>
                      {account.platformLabel} · {account.accountId}
                    </div>
                  </div>
                  <span style={{ ...statusPillStyle(account.status), borderRadius: '999px', padding: '4px 7px', fontSize: '11px', fontWeight: 900 }}>
                    {account.status === 'loaded' ? 'Loaded' : account.status === 'error' ? 'Issue' : 'No data'}
                  </span>
                </div>
                <div style={{ color: COLORS.muted, fontSize: '12px', marginTop: '8px', lineHeight: 1.45 }}>
                  {account.message}
                </div>
                {formatConversionBreakdown(account.conversionBreakdown) ? (
                  <div style={{ color: COLORS.green, fontSize: '12px', marginTop: '6px', lineHeight: 1.45, fontWeight: 800 }}>
                    {formatConversionBreakdown(account.conversionBreakdown)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  )
}

function DashboardFooter() {
  return (
    <footer
      style={{
        marginTop: '18px',
        padding: '18px 20px',
        borderTop: `1px solid ${COLORS.line}`,
        color: COLORS.muted,
        fontSize: '13px',
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap'
      }}
    >
      <div style={{ fontWeight: 800, color: COLORS.green }}>PWP Client Dashboard</div>
      <div>Prepared as a live client performance report.</div>
    </footer>
  )
}

function FunnelHero({ impressions, clicks, conversions, compact = false }) {
  const clickRate = impressions > 0 ? (clicks / impressions) * 100 : 0
  const resultOfImpressions = impressions > 0 ? (conversions / impressions) * 100 : 0
  const resultOfClicks = clicks > 0 ? (conversions / clicks) * 100 : 0

  const rows = [
    {
      label: metricLabel('Impressions'),
      value: impressions.toLocaleString(),
      width: 100,
      color: COLORS.green,
      topRight: '100%',
      showInsidePercent: true
    },
    {
      label: metricLabel('Clicks'),
      value: clicks.toLocaleString(),
      width: Math.max(clickRate, clicks > 0 ? 6 : 0),
      color: COLORS.greenMid,
      topRight: `CTR ${percent(clickRate)}`
    },
    {
      label: metricLabel('Results'),
      value: conversions.toLocaleString(),
      width: Math.max(resultOfClicks, conversions > 0 ? 4 : 0),
      color: COLORS.greenLight,
      topRight: `${percent(resultOfImpressions)} of impressions · Click-to-result ${percent(resultOfClicks)}`
    }
  ]

  return (
    <div style={panelStyle()}>
      <SectionTitle
        title="Customer journey funnel"
        subtitle="A simple view of how attention turns into action."
      />

      <div style={{ display: 'grid', gap: compact ? '12px' : '18px' }}>
        {rows.map((row) => (
          <div key={row.label}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '8px',
                flexWrap: 'wrap',
                alignItems: 'center'
              }}
            >
              <div style={{ fontWeight: 800, color: COLORS.text }}>
                {row.label}: <span style={{ color: COLORS.green }}>{row.value}</span>
              </div>
              <div style={{ color: COLORS.amberDeep, fontWeight: 700, fontSize: '13px' }}>{row.topRight}</div>
            </div>

            <div
              style={{
                width: '100%',
                background: '#EFE7D5',
                borderRadius: '8px',
                height: compact ? '34px' : '44px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${row.width}%`,
                  minWidth: row.width > 0 ? '10px' : 0,
                  height: '100%',
                  background: row.color,
                  borderRadius: '4px',
                  transition: 'width 0.4s ease'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: row.showInsidePercent || row.width >= 22 ? '12px' : `calc(${row.width}% + 8px)`,
                  right: row.showInsidePercent ? '12px' : 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontWeight: 800,
                  fontSize: compact ? '11px' : '12px',
                  color: row.showInsidePercent || row.width >= 22 ? '#fff' : COLORS.green,
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{row.value}</span>
                {row.showInsidePercent ? <span>100%</span> : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SummaryBlock({ text, onChange, onReset, onExport }) {
  return (
    <div style={panelStyle()}>
      <SectionTitle
        title="Suggested insight"
        subtitle="Positive client-ready wording you can edit before sharing."
        right={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={onReset} style={buttonStyle(false)}>Reset insight</button>
            <button onClick={onExport} style={buttonStyle(true)}>Share as PDF</button>
          </div>
        }
      />
      <textarea
        value={text}
        onChange={(event) => onChange(event.target.value)}
        style={{
          width: '100%',
          minHeight: '96px',
          background: '#FCFBF8',
          border: `0.5px solid ${COLORS.line}`,
          borderRadius: '12px',
          padding: '14px',
          color: COLORS.text,
          fontSize: '15px',
          lineHeight: 1.65,
          resize: 'vertical',
          outline: 'none',
          fontFamily: 'inherit',
          boxSizing: 'border-box'
        }}
      />
    </div>
  )
}

function SimpleTooltipValue({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null

  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${COLORS.line}`,
        borderRadius: '10px',
        padding: '10px 12px',
        boxShadow: '0 10px 24px rgba(10,76,62,0.08)'
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: '6px', color: COLORS.text }}>{label}</div>
      {payload.map((item) => (
        <div key={item.name} style={{ fontSize: '13px', color: COLORS.text }}>
          <span style={{ color: item.color, fontWeight: 800 }}>{metricLabel(item.name)}:</span>{' '}
          {item.name.toLowerCase().includes('spend') || item.name.toLowerCase().includes('cpa')
            ? formatSar(item.value)
            : Number(item.value).toLocaleString()}
        </div>
      ))}
    </div>
  )
}

function TrendCharts({ daily, targetCPA, compact = false }) {
  const hasDaily = Array.isArray(daily) && daily.length > 0
  const actualTargetCPA = Number.isFinite(targetCPA) && targetCPA > 0 ? targetCPA : null

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
        gap: '14px'
      }}
    >
      <div style={panelStyle()}>
        <SectionTitle
          title="Spend vs. results over time"
          subtitle="Green bars for spend, amber line for daily results."
        />
        {!hasDaily ? (
          <EmptyState
            title="Daily trend will appear once reporting returns dates"
            text="The dashboard still shows the period totals above. When the platform sends day-by-day results, this chart will show how spend and results moved over time."
          />
        ) : (
          <div style={{ width: '100%', height: compact ? 220 : 300 }}>
            <ResponsiveContainer>
              <ComposedChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEE4D4" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: COLORS.muted }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12, fill: COLORS.muted }}
                  tickFormatter={(v) => `${Math.round(v)}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12, fill: COLORS.muted }}
                  tickFormatter={(v) => `${Math.round(v)}`}
                />
                <Tooltip content={<SimpleTooltipValue />} />
                <Legend />
                <Bar yAxisId="left" dataKey="spend" name={metricLabel('Spend')} fill={COLORS.green} radius={[4, 4, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="conversions"
                  name={metricLabel('Results')}
                  stroke={COLORS.amber}
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div style={panelStyle()}>
        <SectionTitle
          title="Cost per result trend"
          subtitle="Trending down is good."
        />
        {!hasDaily ? (
          <EmptyState
            title="Cost trend will appear with daily reporting"
            text="The dashboard still shows the overall performance story. Once daily data is available, this chart will show whether efficiency is improving over time."
          />
        ) : !daily.some((row) => row.cpa != null) ? (
          <EmptyState
            title="Cost per result will appear after results"
            text="Current activity is creating reach and clicks. Once results are recorded, this chart will show the cost trend and make optimization easier to track."
          />
        ) : (
          <div style={{ width: '100%', height: compact ? 220 : 300 }}>
            <ResponsiveContainer>
              <AreaChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEE4D4" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: COLORS.muted }} />
                <YAxis tick={{ fontSize: 12, fill: COLORS.muted }} />
                <Tooltip content={<SimpleTooltipValue />} />
                <Legend />
                <defs>
                  <linearGradient id="cpaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={COLORS.green} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="cpa"
                  name={metricLabel('CPA')}
                  stroke={COLORS.green}
                  fill="url(#cpaFill)"
                  strokeWidth={3}
                />
                {actualTargetCPA ? (
                  <Line
                    type="monotone"
                    dataKey={() => actualTargetCPA}
                    name="Target CPA (هدف تكلفة التحويل)"
                    stroke={COLORS.amber}
                    strokeDasharray="8 6"
                    dot={false}
                    strokeWidth={2}
                  />
                ) : null}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

function PlatformContribution({ rows, totalSpend, totalClicks, totalConversions, compact = false }) {
  const platformMap = new Map()

  rows.forEach((row) => {
    const existing = platformMap.get(row.platform) || {
      platform: row.platform,
      spend: 0,
      clicks: 0,
      conversions: 0
    }

    existing.spend += parseSarString(row.spend)
    existing.clicks += parseNumberString(row.clicks)
    existing.conversions += row.conversions === 'N/A' ? 0 : parseNumberString(row.conversions)
    platformMap.set(row.platform, existing)
  })

  const platforms = Array.from(platformMap.values())

  const chartData = [
    {
      metric: metricLabel('Spend share'),
      ...Object.fromEntries(
        platforms.map((p) => [p.platform, totalSpend > 0 ? (p.spend / totalSpend) * 100 : 0])
      )
    },
    {
      metric: metricLabel('Click share'),
      ...Object.fromEntries(
        platforms.map((p) => [p.platform, totalClicks > 0 ? (p.clicks / totalClicks) * 100 : 0])
      )
    },
    {
      metric: metricLabel('Result share'),
      ...Object.fromEntries(
        platforms.map((p) => [p.platform, totalConversions > 0 ? (p.conversions / totalConversions) * 100 : 0])
      )
    }
  ]

  const palette = [COLORS.green, COLORS.amber, COLORS.greenMid, '#5F766E', '#2B2F2D', '#B08D2B']

  return (
    <div style={panelStyle()}>
      <SectionTitle
        title="Platform contribution"
        subtitle="How each platform contributes to spend, clicks, and results."
      />

      {platforms.length === 0 ? (
        <EmptyState
          title="Platform contribution will appear when results are available"
          text="When platform data is returned, this section will show how spend, clicks, and results are split across each channel."
        />
      ) : (
        <div style={{ width: '100%', height: compact ? 190 : 280 }}>
          <ResponsiveContainer>
            <ComposedChart
              layout="vertical"
              data={chartData}
              margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#EEE4D4" />
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 12, fill: COLORS.muted }}
              />
              <YAxis type="category" dataKey="metric" tick={{ fontSize: 13, fill: COLORS.text }} width={110} />
              <Tooltip
                formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]}
                contentStyle={{
                  borderRadius: 10,
                  border: `1px solid ${COLORS.line}`
                }}
              />
              <Legend />
              {platforms.map((p, index) => (
                <Bar
                  key={p.platform}
                  dataKey={p.platform}
                  stackId="a"
                  fill={palette[index % palette.length]}
                  radius={index === platforms.length - 1 ? [4, 4, 4, 4] : [0, 0, 0, 0]}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function AdvancedTable({ rows, googleDiagnostics }) {
  const platformPerformanceRows = rows.map((row) => {
    const spendNum = parseSarString(row.spend)
    const clicksNum = parseNumberString(row.clicks)
    const conversionsNum = row.conversions === 'N/A' ? null : parseNumberString(row.conversions)

    const ctrValue = row.platform === 'Google Ads' ? googleDiagnostics?.snapshot?.ctr : null
    const cpcValue =
      row.platform === 'Google Ads'
        ? googleDiagnostics?.snapshot?.avgCpc
        : clicksNum > 0
          ? spendNum / clicksNum
          : null

    const cpaValue =
      conversionsNum != null && conversionsNum > 0
        ? spendNum / conversionsNum
        : null

    return {
      ...row,
      ctr: ctrValue,
      cpc: cpcValue,
      cpa: cpaValue,
      roas: null
    }
  })

  return (
    <div style={panelStyle()}>
      <SectionTitle
        title="Platform performance"
        subtitle="Optional advanced view."
      />
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: `1px solid ${COLORS.line}` }}>
              <th style={{ padding: '12px 8px' }}>Platform</th>
              <th style={{ padding: '12px 8px' }}>{metricLabel('Spend')}</th>
              <th style={{ padding: '12px 8px' }}>{metricLabel('Clicks')}</th>
              <th style={{ padding: '12px 8px' }}>{metricLabel('CTR')}</th>
              <th style={{ padding: '12px 8px' }}>{metricLabel('CPC')}</th>
              <th style={{ padding: '12px 8px' }}>{metricLabel('Results')}</th>
              <th style={{ padding: '12px 8px' }}>{metricLabel('CPA')}</th>
            </tr>
          </thead>
          <tbody>
            {platformPerformanceRows.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '18px 8px' }}>
                  <EmptyState
                    title="Advanced table will appear when platform rows are available"
                    text="Once campaign or platform results are returned, this optional view will list spend, clicks, CTR, CPC, results, and cost per result in one place."
                  />
                </td>
              </tr>
            ) : (
              platformPerformanceRows.map((row, index) => (
                <tr key={`${row.platform}-${index}`} style={{ borderBottom: '1px solid #F1E9D8' }}>
                  <td style={{ padding: '14px 8px' }}>
                    <PlatformBadge label={row.platform} />
                  </td>
                  <td style={{ padding: '14px 8px' }}>{row.spend}</td>
                  <td style={{ padding: '14px 8px' }}>{row.clicks}</td>
                  <td style={{ padding: '14px 8px' }}>{row.ctr != null ? `${row.ctr.toFixed(2)}%` : 'N/A'}</td>
                  <td style={{ padding: '14px 8px' }}>{row.cpc != null ? formatSar(row.cpc) : 'N/A'}</td>
                  <td style={{ padding: '14px 8px' }}>{row.conversions}</td>
                  <td style={{ padding: '14px 8px' }}>{row.cpa != null ? formatSar(row.cpa) : 'N/A'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {platformPerformanceRows.some((row) => formatConversionBreakdown(row.conversionBreakdown)) ? (
          <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
            {platformPerformanceRows
              .filter((row) => formatConversionBreakdown(row.conversionBreakdown))
              .map((row, index) => (
                <div key={`${row.platform}-breakdown-${index}`} style={{ color: COLORS.muted, fontSize: '13px', lineHeight: 1.5 }}>
                  <strong style={{ color: COLORS.green }}>{row.platform} result breakdown:</strong>{' '}
                  {formatConversionBreakdown(row.conversionBreakdown)}
                </div>
              ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function buildClientSummary({ totalSpend, totalImpressions, totalClicks, totalConversions, googleDiagnostics }) {
  const spendText = formatSar(totalSpend)
  const impressionText = totalImpressions.toLocaleString()
  const clicksText = totalClicks.toLocaleString()

  if (totalConversions === 0) {
    if (googleDiagnostics?.interpretation?.mainLimiter === 'Rank-limited') {
      return `This period, ${spendText} was spent to generate ${impressionText} impressions and ${clicksText} clicks. The next positive step is to improve ranking signals so more eligible demand can be captured.`
    }

    if (googleDiagnostics?.interpretation?.mainLimiter === 'Budget-limited') {
      return `This period, ${spendText} was spent to generate ${impressionText} impressions and ${clicksText} clicks. The next positive step is to review budget coverage so more eligible demand can be captured.`
    }

    return `This period, ${spendText} was spent to generate ${impressionText} impressions and ${clicksText} clicks. The next positive step is to confirm result tracking and make the post-click path easier before scaling spend.`
  }

  return `This period, ${spendText} was spent to generate ${impressionText} impressions, ${clicksText} clicks, and ${totalConversions.toLocaleString()} results. Performance is producing measurable action, and the next step is to compare efficiency against target benchmarks before scaling.`
}

function buildDailyChartData(data, totalSpend, totalConversions) {
  const raw = Array.isArray(data?.trends?.daily) ? data.trends.daily : []
  if (!raw.length) return []

  return raw.map((row) => {
    const spend = Number(row.spend || 0)
    const conversions = Number(row.conversions || 0)
    const cpa = conversions > 0 ? spend / conversions : null

    return {
      date: row.date,
      spend,
      conversions,
      cpa,
      targetCPA: Number(row.targetCPA || 0)
    }
  })
}

function getInitialQueryParam(name, fallback = '') {
  if (typeof window === 'undefined') return fallback
  return new URLSearchParams(window.location.search).get(name) || fallback
}

function getInitialShareToken() {
  if (typeof window === 'undefined') return ''

  const queryToken = getInitialQueryParam('shareToken') || getInitialQueryParam('token')
  if (queryToken) return queryToken

  const match = window.location.pathname.match(/^\/share\/([^/]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function excelCell(value) {
  const numberValue = typeof value === 'number' ? value : Number(value)
  const isNumber = value !== '' && value != null && Number.isFinite(numberValue) && String(value).trim() !== ''

  return `<Cell><Data ss:Type="${isNumber ? 'Number' : 'String'}">${xmlEscape(isNumber ? numberValue : value)}</Data></Cell>`
}

function excelSheet(name, rows) {
  return `
    <Worksheet ss:Name="${xmlEscape(name).slice(0, 31)}">
      <Table>
        ${rows.map((row) => `<Row>${row.map(excelCell).join('')}</Row>`).join('')}
      </Table>
    </Worksheet>
  `
}

function saveExcelWorkbook(title, sheets) {
  const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${sheets.join('')}
</Workbook>`

  const filenameBase = title
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'case-study'
  const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filenameBase}.xls`
  link.click()
  URL.revokeObjectURL(url)
}

function downloadExcelWorkbook({ data, campaignRows, dailyChartData, accountOptions, selectedAccountIds, insightsText, caseStudyName }) {
  if (typeof window === 'undefined') return

  const summaryCards = Array.isArray(data?.summaryCards) ? data.summaryCards : []
  const selectedSet = new Set(selectedAccountIds || [])
  const selectedAccounts = accountOptions.filter((account) => selectedSet.has(account.id))
  const platformSplit = data?.platformSplit || {}
  const title = caseStudyName || `${data?.client?.name || 'Client'} case study`
  const generatedAt = new Date().toLocaleString()

  const sheets = [
    excelSheet('Overview', [
      ['Case study', title],
      ['Client', data?.client?.name || ''],
      ['Date range', data?.filters?.range || ''],
      ['Generated at', generatedAt],
      ['Insight', insightsText || data?.insights?.suggested || ''],
      ['Next action', data?.insights?.nextAction || ''],
      [],
      ['Metric', 'Value'],
      ...summaryCards.map((card) => [card.label, card.value])
    ]),
    excelSheet('Selected accounts', [
      ['Platform', 'Account name', 'Account ID', 'Client group'],
      ...selectedAccounts.map((account) => [
        account.platformLabel,
        account.accountName,
        account.accountId,
        account.clientName
      ])
    ]),
    excelSheet('Platform rows', [
      ['Platform', 'Campaign or account', 'Spend', 'Clicks', 'Results'],
      ...campaignRows.map((row) => [
        row.platform,
        row.campaign,
        parseSarString(row.spend),
        parseNumberString(row.clicks),
        row.conversions === 'N/A' ? '' : parseNumberString(row.conversions)
      ])
    ]),
    excelSheet('Platform totals', [
      ['Platform', 'Spend', 'Results'],
      ...Object.entries(platformSplit).map(([platformKey, value]) => [
        platformKey.replace(/_/g, ' '),
        parseSarString(value?.spend),
        value?.conversions === 'N/A' ? '' : parseNumberString(value?.conversions)
      ])
    ]),
    excelSheet('Daily trend', [
      ['Date', 'Spend', 'Results', 'Cost per result'],
      ...dailyChartData.map((row) => [
        row.date,
        row.spend,
        row.conversions,
        row.cpa == null ? '' : row.cpa
      ])
    ])
  ]

  saveExcelWorkbook(title, sheets)
}

function downloadAgencyExcelWorkbook({ title, clientReports, range }) {
  const generatedAt = new Date().toLocaleString()
  const overviewRows = [
    ['Agency workbook', title],
    ['Date range', range],
    ['Generated at', generatedAt],
    ['Clients included', clientReports.length],
    [],
    ['Client', 'Spend', 'Impressions', 'Clicks', 'Results', 'Platforms active']
  ]

  const accountRows = [['Client', 'Platform', 'Account name', 'Account ID', 'Account group']]
  const platformRows = [['Client', 'Platform', 'Campaign or account', 'Spend', 'Clicks', 'Results']]
  const platformTotals = [['Client', 'Platform', 'Spend', 'Results']]
  const dailyRows = [['Client', 'Date', 'Spend', 'Results', 'Cost per result']]
  const insightRows = [['Client', 'Insight', 'Next action']]

  clientReports.forEach(({ client, payload }) => {
    const summaryCards = Array.isArray(payload.summaryCards) ? payload.summaryCards : []
    const campaigns = Array.isArray(payload.campaignRows) ? payload.campaignRows : []
    const daily = buildDailyChartData(payload)
    const platformSplit = payload.platformSplit || {}
    const accounts = Array.isArray(payload.accountOptions) ? payload.accountOptions : []

    overviewRows.push([
      payload.client?.name || client.name,
      parseSarString(summaryCards.find((card) => card.label === 'Total Spend')?.value),
      parseNumberString(summaryCards.find((card) => card.label === 'Impressions')?.value),
      parseNumberString(summaryCards.find((card) => card.label === 'Clicks')?.value),
      parseNumberString(getSummaryCardValue(summaryCards, 'Results')),
      parseNumberString(summaryCards.find((card) => card.label === 'Platforms Active')?.value)
    ])

    accounts.forEach((account) => {
      accountRows.push([
        payload.client?.name || client.name,
        account.platformLabel,
        account.accountName,
        account.accountId,
        account.clientName
      ])
    })

    campaigns.forEach((row) => {
      platformRows.push([
        payload.client?.name || client.name,
        row.platform,
        row.campaign,
        parseSarString(row.spend),
        parseNumberString(row.clicks),
        row.conversions === 'N/A' ? '' : parseNumberString(row.conversions)
      ])
    })

    Object.entries(platformSplit).forEach(([platformKey, value]) => {
      platformTotals.push([
        payload.client?.name || client.name,
        platformKey.replace(/_/g, ' '),
        parseSarString(value?.spend),
        value?.conversions === 'N/A' ? '' : parseNumberString(value?.conversions)
      ])
    })

    daily.forEach((row) => {
      dailyRows.push([
        payload.client?.name || client.name,
        row.date,
        row.spend,
        row.conversions,
        row.cpa == null ? '' : row.cpa
      ])
    })

    insightRows.push([
      payload.client?.name || client.name,
      payload.insights?.suggested || '',
      payload.insights?.nextAction || ''
    ])
  })

  saveExcelWorkbook(title, [
    excelSheet('Agency overview', overviewRows),
    excelSheet('All accounts', accountRows),
    excelSheet('Platform rows', platformRows),
    excelSheet('Platform totals', platformTotals),
    excelSheet('Daily trends', dailyRows),
    excelSheet('Insights', insightRows)
  ])
}

const CUSTOM_REPORT_METRICS = [
  { id: 'spend', label: 'Spend', summaryLabel: 'Total Spend' },
  { id: 'reach', label: 'Reach', summaryLabel: 'Reach' },
  { id: 'impressions', label: 'Impressions', summaryLabel: 'Impressions' },
  { id: 'clicks', label: 'Clicks', summaryLabel: 'Clicks' },
  { id: 'ctr', label: 'CTR', summaryLabel: 'CTR' },
  { id: 'conversions', label: 'Results', summaryLabel: 'Results' },
  { id: 'cpc', label: 'Cost per click' },
  { id: 'cpa', label: 'Cost per result' }
]

const CUSTOM_RESULT_DEFINITIONS = [
  { id: 'all', label: 'All results' },
  { id: 'leads', label: 'Leads' },
  { id: 'messages', label: 'Messages' },
  { id: 'purchases', label: 'Purchases' },
  { id: 'registrations', label: 'Registrations' },
  { id: 'clicks', label: 'Clicks as results' }
]

function getRowResultValue(row, resultDefinition = 'all') {
  const breakdown = row?.conversionBreakdown || {}

  if (resultDefinition === 'leads') return Number(breakdown.leads || 0)
  if (resultDefinition === 'messages') return Number(breakdown.messagingConversations || 0)
  if (resultDefinition === 'purchases') return Number(breakdown.purchases || 0)
  if (resultDefinition === 'registrations') return Number(breakdown.registrations || 0)
  if (resultDefinition === 'clicks') return parseNumberString(row?.clicks)

  return row?.conversions === 'N/A' ? 0 : parseNumberString(row?.conversions)
}

function getResultDefinitionLabel(resultDefinition) {
  return CUSTOM_RESULT_DEFINITIONS.find((item) => item.id === resultDefinition)?.label || 'All results'
}

function applyResultDefinition(data, resultDefinition = 'all') {
  if (!data || resultDefinition === 'all') return data

  const campaignRows = Array.isArray(data.campaignRows) ? data.campaignRows : []
  const nextRows = campaignRows.map((row) => {
    const resultValue = getRowResultValue(row, resultDefinition)
    return {
      ...row,
      conversions: resultValue.toLocaleString(),
      conversionLabel: getResultDefinitionLabel(resultDefinition)
    }
  })
  const totalResults = nextRows.reduce((sum, row) => sum + parseNumberString(row.conversions), 0)
  const summaryCards = (data.summaryCards || []).map((card) => {
    if (card.label === 'Results' || card.label === 'Conversions') {
      return { ...card, label: 'Results', value: totalResults.toLocaleString() }
    }
    return card
  })

  if (!summaryCards.some((card) => card.label === 'Results')) {
    summaryCards.push({ label: 'Results', value: totalResults.toLocaleString() })
  }

  const platformSplit = nextRows.reduce((acc, row) => {
    const key = row.platform.toLowerCase().replace(/\s+/g, '_')
    const existing = acc[key] || { spend: 0, conversions: 0 }
    existing.spend += parseSarString(row.spend)
    existing.conversions += parseNumberString(row.conversions)
    acc[key] = existing
    return acc
  }, {})

  return {
    ...data,
    summaryCards,
    campaignRows: nextRows,
    platformSplit: Object.fromEntries(
      Object.entries(platformSplit).map(([key, value]) => [
        key,
        {
          spend: formatSar(value.spend),
          conversions: value.conversions.toLocaleString()
        }
      ])
    )
  }
}

const CUSTOM_REPORT_SECTIONS = [
  { id: 'summary', label: 'Insight summary' },
  { id: 'funnel', label: 'Funnel' },
  { id: 'trends', label: 'Trends' },
  { id: 'platforms', label: 'Platform contribution' },
  { id: 'benchmarks', label: 'Benchmark indicators' },
  { id: 'audience', label: 'Audience and action insights' },
  { id: 'advanced', label: 'Detailed table' }
]

function getSummaryValue(data, metricId) {
  const summaryCards = Array.isArray(data?.summaryCards) ? data.summaryCards : []
  const byLabel = (label) => getSummaryCardValue(summaryCards, label)
  const spend = parseSarString(byLabel('Total Spend'))
  const clicks = parseNumberString(byLabel('Clicks'))
  const conversions = parseNumberString(byLabel('Results'))

  if (metricId === 'cpc') return clicks > 0 ? formatSar(spend / clicks) : 'N/A'
  if (metricId === 'cpa') return conversions > 0 ? formatSar(spend / conversions) : 'N/A'

  const metric = CUSTOM_REPORT_METRICS.find((item) => item.id === metricId)
  return metric?.summaryLabel ? byLabel(metric.summaryLabel) : ''
}

function getBenchmarkIndicators(data) {
  const summaryCards = Array.isArray(data?.summaryCards) ? data.summaryCards : []
  const byLabel = (label) => getSummaryCardValue(summaryCards, label)
  const spend = parseSarString(byLabel('Total Spend'))
  const reach = parseNumberString(byLabel('Reach'))
  const impressions = parseNumberString(byLabel('Impressions'))
  const clicks = parseNumberString(byLabel('Clicks'))
  const conversions = parseNumberString(byLabel('Results'))
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
  const resultRate = clicks > 0 ? (conversions / clicks) * 100 : 0
  const cpc = clicks > 0 ? spend / clicks : null
  const cpa = conversions > 0 ? spend / conversions : null
  const frequency = reach > 0 ? impressions / reach : null
  const indicators = []

  if (ctr >= 2) {
    indicators.push({
      label: 'CTR over target',
      value: `${ctr.toFixed(2)}%`,
      target: 'Target 2.00%+',
      note: 'Creative and audience fit are generating stronger-than-benchmark engagement.'
    })
  }

  if (resultRate >= 3) {
    indicators.push({
      label: 'Result rate over target',
      value: `${resultRate.toFixed(2)}%`,
      target: 'Target 3.00%+',
      note: 'Traffic is turning into measurable action at a healthy rate.'
    })
  }

  if (cpc != null && cpc <= 1) {
    indicators.push({
      label: 'Cost per click under target',
      value: formatSar(cpc),
      target: 'Target SAR 1.00 or lower',
      note: 'The selected accounts are buying traffic efficiently.'
    })
  }

  if (cpa != null && cpa <= 50) {
    indicators.push({
      label: 'Cost per result under target',
      value: formatSar(cpa),
      target: 'Target SAR 50.00 or lower',
      note: 'Results are being generated at an efficient cost level.'
    })
  }

  if (frequency != null && frequency > 0 && frequency <= 3) {
    indicators.push({
      label: 'Reach frequency healthy',
      value: `${frequency.toFixed(2)}x`,
      target: 'Target below 3.00x',
      note: 'Reach is not being over-used, which gives room to scale without heavy fatigue.'
    })
  }

  return indicators
}

function BenchmarkIndicators({ data }) {
  const indicators = getBenchmarkIndicators(data)

  return (
    <div style={panelStyle()}>
      <SectionTitle
        title="Benchmark indicators"
        subtitle="Positive signals when the selected metrics are beating target levels."
      />

      {indicators.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: '10px' }}>
          {indicators.map((indicator) => (
            <div key={indicator.label} style={{ border: `1px solid ${COLORS.green}`, borderRadius: '10px', background: '#F5FAF7', padding: '12px' }}>
              <div style={{ color: COLORS.green, fontWeight: 900, fontSize: '13px' }}>{indicator.label}</div>
              <div style={{ color: COLORS.green, fontSize: '24px', fontWeight: 900, marginTop: '6px' }}>{indicator.value}</div>
              <div style={{ color: COLORS.amberDeep, fontSize: '12px', fontWeight: 800, marginTop: '4px' }}>{indicator.target}</div>
              <div style={{ color: COLORS.muted, fontSize: '12px', lineHeight: 1.45, marginTop: '8px' }}>{indicator.note}</div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Benchmarks are ready"
          text="No selected metric is above the current benchmark yet. This still gives a clear baseline for the next optimization period."
        />
      )}
    </div>
  )
}

function AudienceActionInsights({ data }) {
  const rows = Array.isArray(data?.campaignRows) ? data.campaignRows : []
  const statuses = Array.isArray(data?.accountStatuses) ? data.accountStatuses : []
  const bestByResults = [...rows]
    .filter((row) => row.conversions !== 'N/A')
    .sort((a, b) => parseNumberString(b.conversions) - parseNumberString(a.conversions))[0]
  const bestByClicks = [...rows]
    .sort((a, b) => parseNumberString(b.clicks) - parseNumberString(a.clicks))[0]
  const breakdowns = statuses
    .map((account) => ({
      account,
      text: formatConversionBreakdown(account.conversionBreakdown)
    }))
    .filter((item) => item.text)

  return (
    <div style={panelStyle()}>
      <SectionTitle
        title="Audience and action insights"
        subtitle="Signals from the selected accounts and available platform action data."
      />

      <div style={{ display: 'grid', gap: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '10px' }}>
          <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: '10px', padding: '12px', background: '#FBFAF7' }}>
            <div style={{ color: COLORS.muted, fontSize: '12px', fontWeight: 800 }}>Strongest result source</div>
            <div style={{ color: COLORS.green, fontWeight: 900, marginTop: '5px' }}>
              {bestByResults ? `${bestByResults.platform} · ${bestByResults.campaign}` : 'Not enough result data yet'}
            </div>
          </div>
          <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: '10px', padding: '12px', background: '#FBFAF7' }}>
            <div style={{ color: COLORS.muted, fontSize: '12px', fontWeight: 800 }}>Strongest traffic source</div>
            <div style={{ color: COLORS.green, fontWeight: 900, marginTop: '5px' }}>
              {bestByClicks ? `${bestByClicks.platform} · ${bestByClicks.campaign}` : 'Not enough click data yet'}
            </div>
          </div>
        </div>

        {breakdowns.length ? (
          <div style={{ display: 'grid', gap: '8px' }}>
            {breakdowns.map(({ account, text }) => (
              <div key={account.id} style={{ color: COLORS.text, fontSize: '13px', lineHeight: 1.5, padding: '10px', border: `1px solid ${COLORS.line}`, borderRadius: '10px' }}>
                <strong style={{ color: COLORS.green }}>{account.accountName}:</strong> {text}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Audience details need platform breakdown data"
            text="The report can already compare platforms and result actions. Age, gender, location, placement, and interest breakdowns need dedicated audience reporting endpoints before they can be charted accurately."
          />
        )}
      </div>
    </div>
  )
}

function downloadCustomReportWorkbook({ title, data, selectedMetrics, selectedSections, accountOptions, selectedAccountIds, insightText }) {
  const metricRows = selectedMetrics.map((metricId) => {
    const metric = CUSTOM_REPORT_METRICS.find((item) => item.id === metricId)
    return [metric?.label || metricId, getSummaryValue(data, metricId)]
  })
  const selectedSet = new Set(selectedAccountIds || [])
  const selectedAccounts = accountOptions.filter((account) => selectedSet.has(account.id))
  const campaignRows = Array.isArray(data?.campaignRows) ? data.campaignRows : []
  const daily = buildDailyChartData(data)

  saveExcelWorkbook(title, [
    excelSheet('Report setup', [
      ['Report', title],
      ['Client', data?.client?.name || ''],
      ['Date range', data?.filters?.range || ''],
      ['Generated at', new Date().toLocaleString()],
      ['Sections', selectedSections.join(', ')],
      ['Insight', insightText || data?.insights?.suggested || ''],
      [],
      ['Metric', 'Value'],
      ...metricRows
    ]),
    excelSheet('Selected accounts', [
      ['Platform', 'Account name', 'Account ID', 'Client group'],
      ...selectedAccounts.map((account) => [
        account.platformLabel,
        account.accountName,
        account.accountId,
        account.clientName
      ])
    ]),
    excelSheet('Platform rows', [
      ['Platform', 'Campaign or account', 'Spend', 'Reach', 'Clicks', 'Results', 'Result breakdown'],
      ...campaignRows.map((row) => [
        row.platform,
        row.campaign,
        parseSarString(row.spend),
        row.reach === 'N/A' ? '' : parseNumberString(row.reach),
        parseNumberString(row.clicks),
        row.conversions === 'N/A' ? '' : parseNumberString(row.conversions),
        formatConversionBreakdown(row.conversionBreakdown)
      ])
    ]),
    selectedSections.includes('benchmarks')
      ? excelSheet('Benchmark indicators', [
          ['Indicator', 'Value', 'Target', 'Note'],
          ...getBenchmarkIndicators(data).map((indicator) => [
            indicator.label,
            indicator.value,
            indicator.target,
            indicator.note
          ])
        ])
      : null,
    excelSheet('Daily trends', [
      ['Date', 'Spend', 'Results', 'Cost per result'],
      ...daily.map((row) => [
        row.date,
        row.spend,
        row.conversions,
        row.cpa == null ? '' : row.cpa
      ])
    ]),
    excelSheet('Data confidence', [
      ['Account', 'Platform', 'Account ID', 'Status', 'Message'],
      ...(data?.accountStatuses || []).map((account) => [
        account.accountName,
        account.platformLabel,
        account.accountId,
        account.status,
        account.message
      ])
    ])
  ].filter(Boolean))
}

function ReportView({ data, platform, range, setView, insightsText, isSharedView = false }) {
  const campaignRows = Array.isArray(data?.campaignRows) ? data.campaignRows : []
  const summaryCards = Array.isArray(data?.summaryCards) ? data.summaryCards : []
  const googleDiagnostics = data?.diagnostics?.google || null
  const totalSpend = parseSarString(summaryCards.find((c) => c.label === 'Total Spend')?.value)
  const totalImpressions = parseNumberString(summaryCards.find((c) => c.label === 'Impressions')?.value)
  const totalClicks = parseNumberString(summaryCards.find((c) => c.label === 'Clicks')?.value)
  const totalConversions = parseNumberString(getSummaryCardValue(summaryCards, 'Results'))
  const dailyChartData = buildDailyChartData(data)
  const targetCPA = dailyChartData.length > 0 ? Number(dailyChartData[0]?.targetCPA || 0) : null
  const nextActionText = data?.insights?.nextAction || 'Healthy momentum. Next step: keep optimizing efficiency.'

  return (
    <div style={{ minHeight: '100vh', background: COLORS.cream, padding: '28px', color: COLORS.text }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .report-card { box-shadow: none !important; }
        }
      `}</style>

      <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
        <div className="no-print" style={{ display: 'flex', gap: '12px', marginBottom: '22px', flexWrap: 'wrap' }}>
          {!isSharedView ? (
            <button onClick={() => setView('dashboard')} style={buttonStyle(false)}>
              Back to dashboard
            </button>
          ) : null}
          <button onClick={() => window.print()} style={buttonStyle(true)}>
            Export PDF
          </button>
        </div>

        <div className="report-card" style={{ ...cardStyle(), marginBottom: '18px', padding: 0, overflow: 'hidden' }}>
          <div style={{ background: COLORS.green, color: '#ffffff', padding: '26px 28px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '18px',
                flexWrap: 'wrap',
                alignItems: 'flex-start'
              }}
            >
              <div style={{ maxWidth: '720px' }}>
                <div style={{ marginBottom: '14px', maxWidth: '360px' }}>
                  <BrandMark dark={true} />
                </div>
                <h1 style={{ margin: 0, fontSize: '38px', fontWeight: 900, lineHeight: 1.05 }}>
                  {data?.client?.name || 'Client report'}
                </h1>
                <p style={{ marginTop: '10px', color: 'rgba(255,255,255,0.82)', fontSize: '14px', lineHeight: 1.7 }}>
                  Paid media performance report across the selected platform mix and reporting window.
                </p>
              </div>

              <div
                style={{
                  minWidth: '260px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '18px',
                  padding: '16px'
                }}
              >
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)', fontWeight: 700, marginBottom: '10px' }}>
                  Report details
                </div>
                <div style={{ display: 'grid', gap: '8px', fontSize: '14px', color: '#ffffff' }}>
                  <div><strong>Client:</strong> {data?.client?.name || 'N/A'}</div>
                  <div><strong>Platform:</strong> {platform}</div>
                  <div><strong>Range:</strong> {range}</div>
                  <div><strong>Generated:</strong> {data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: '5px', background: COLORS.amber }} />
        </div>

        <div className="report-card" style={panelStyle()}>
          <SectionTitle title="Suggested insight" subtitle="Client-ready interpretation for this reporting period." />
          <div
            style={{
              background: '#FCFBF8',
              border: `0.5px solid ${COLORS.line}`,
              borderRadius: '12px',
              padding: '18px',
              color: COLORS.text,
              fontSize: '15px',
              lineHeight: 1.8,
              marginBottom: '18px'
            }}
          >
            {insightsText}
          </div>
        </div>

        <div style={{ display: 'grid', gap: '18px' }}>
          <FunnelHero impressions={totalImpressions} clicks={totalClicks} conversions={totalConversions} />
          <TrendCharts daily={dailyChartData} targetCPA={targetCPA} />
          <PlatformContribution
            rows={campaignRows}
            totalSpend={totalSpend}
            totalClicks={totalClicks}
            totalConversions={totalConversions}
          />
          <StatusBanner text={nextActionText} />
          <AdvancedTable rows={campaignRows} googleDiagnostics={googleDiagnostics} />
        </div>
        <DashboardFooter />
      </div>
    </div>
  )
}

function AgencyExportView({ availableClients, setView }) {
  const [exportRange, setExportRange] = useState('max')
  const [clientPayloads, setClientPayloads] = useState([])
  const [selectedAccountIds, setSelectedAccountIds] = useState([])
  const [resolvedClients, setResolvedClients] = useState(availableClients || [])
  const [exportName, setExportName] = useState('Agency performance')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadAccounts() {
      try {
        setLoading(true)
        setError('')
        let clientsToLoad = Array.isArray(availableClients) ? availableClients : []

        if (!clientsToLoad.length) {
          const fallbackResponse = await fetch('/api/dashboard?client=rimiya&platform=all&range=30d')
          const fallbackPayload = await fallbackResponse.json()
          clientsToLoad = Array.isArray(fallbackPayload?.availableClients) ? fallbackPayload.availableClients : []
        }

        setResolvedClients(clientsToLoad)

        if (!clientsToLoad.length) {
          setClientPayloads([])
          setSelectedAccountIds([])
          setError('No client list is available yet. Go back to the dashboard, wait for it to load, then open Agency Excel again.')
          return
        }

        const payloads = []

        for (const agencyClient of clientsToLoad) {
          const params = new URLSearchParams({
            client: agencyClient.id,
            platform: 'all',
            range: exportRange
          })
          const response = await fetch(`/api/dashboard?${params.toString()}`)
          const payload = await response.json()
          if (response.ok) {
            payloads.push({
              client: agencyClient,
              payload
            })
          }
        }

        setClientPayloads(payloads)
        setSelectedAccountIds((current) => {
          const nextIds = payloads.flatMap(({ payload }) =>
            (payload.accountOptions || []).map((account) => account.id)
          )
          const currentSet = new Set(current)
          const filtered = nextIds.filter((id) => currentSet.has(id))
          return current.length ? filtered : nextIds
        })
      } catch (err) {
        setError(err.message || 'Unable to load agency accounts.')
      } finally {
        setLoading(false)
      }
    }

    loadAccounts()
  }, [availableClients, exportRange])

  const accountOptions = clientPayloads.flatMap(({ payload }) => payload.accountOptions || [])
  const selectedSet = new Set(selectedAccountIds)

  function toggleAccount(accountId) {
    setSelectedAccountIds((current) => {
      const next = new Set(current)
      if (next.has(accountId)) {
        next.delete(accountId)
      } else {
        next.add(accountId)
      }
      return Array.from(next)
    })
  }

  function selectAllAccounts() {
    setSelectedAccountIds(accountOptions.map((account) => account.id))
  }

  function clearAccounts() {
    setSelectedAccountIds([])
  }

  async function exportSelectedAccounts() {
    try {
      setExporting(true)
      setError('')
      const selectedByClient = new Map()

      clientPayloads.forEach(({ client, payload }) => {
        const selectedForClient = (payload.accountOptions || [])
          .filter((account) => selectedSet.has(account.id))
          .map((account) => account.id)

        if (selectedForClient.length) {
          selectedByClient.set(client.id, {
            client,
            accountIds: selectedForClient
          })
        }
      })

      const clientReports = []
      for (const selectedClient of selectedByClient.values()) {
        const params = new URLSearchParams({
          client: selectedClient.client.id,
          platform: 'all',
          range: exportRange,
          accounts: selectedClient.accountIds.join(',')
        })
        const response = await fetch(`/api/dashboard?${params.toString()}`)
        const payload = await response.json()
        if (response.ok) {
          clientReports.push({
            client: selectedClient.client,
            payload
          })
        }
      }

      const title = exportName || `Agency performance ${exportRange}`
      downloadAgencyExcelWorkbook({ title, clientReports, range: exportRange })
    } catch (err) {
      setError(err.message || 'Unable to generate agency Excel.')
    } finally {
      setExporting(false)
    }
  }

  const groupedByClient = clientPayloads.map(({ client, payload }) => ({
    client,
    platformGroups: (payload.accountOptions || []).reduce((groups, account) => {
      const key = account.platformLabel || account.platform
      if (!groups[key]) groups[key] = []
      groups[key].push(account)
      return groups
    }, {})
  }))

  return (
    <div style={{ minHeight: '100vh', background: COLORS.cream, color: COLORS.text, padding: '24px' }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: COLORS.green, fontWeight: 800, marginBottom: '6px' }}>
              Agency export
            </div>
            <h1 style={{ margin: 0, fontSize: '30px', fontWeight: 900, color: COLORS.green }}>
              All accounts workbook
            </h1>
            <p style={{ marginTop: '6px', color: COLORS.muted, fontSize: '13px' }}>
              Select the exact accounts and date range before downloading agency-wide performance data.
            </p>
          </div>
          <button onClick={() => setView('dashboard')} style={buttonStyle(false)}>
            Back to dashboard
          </button>
        </div>

        <div style={{ ...cardStyle(), padding: '14px', marginBottom: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '10px', alignItems: 'end' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '6px', fontWeight: 700 }}>
                Workbook name
              </div>
              <input
                value={exportName}
                onChange={(event) => setExportName(event.target.value)}
                style={selectStyle()}
              />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '6px', fontWeight: 700 }}>
                Date range
              </div>
              <select value={exportRange} onChange={(event) => setExportRange(event.target.value)} style={selectStyle()}>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="this_month">This month</option>
                <option value="max">Since promotion start</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={selectAllAccounts} style={buttonStyle(false)}>
                Select all
              </button>
              <button onClick={clearAccounts} style={buttonStyle(false)}>
                Clear
              </button>
              <button
                onClick={exportSelectedAccounts}
                disabled={exporting || loading || selectedAccountIds.length === 0}
                style={buttonStyle(true)}
              >
                {exporting ? 'Preparing...' : 'Download selected'}
              </button>
            </div>
          </div>

          <div style={{ marginTop: '10px', fontSize: '13px', color: COLORS.muted }}>
            {selectedAccountIds.length} of {accountOptions.length} accounts selected across {resolvedClients.length} clients.
          </div>
        </div>

        {error ? (
          <div style={{ ...cardStyle(), padding: '12px 14px', marginBottom: '14px', color: COLORS.red, fontWeight: 700 }}>
            {error}
          </div>
        ) : null}

        {loading ? (
          <div style={{ ...cardStyle(), padding: '18px', color: COLORS.muted }}>
            Loading accounts...
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {groupedByClient.map(({ client, platformGroups }) => (
              <div key={client.id} style={{ ...cardStyle(), padding: '14px' }}>
                <div style={{ color: COLORS.green, fontWeight: 900, marginBottom: '10px' }}>
                  {client.name}
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {Object.entries(platformGroups).map(([platformName, accounts]) => (
                    <details key={`${client.id}-${platformName}`} open style={{ border: `1px solid ${COLORS.line}`, borderRadius: '10px', overflow: 'hidden' }}>
                      <summary style={{ padding: '10px 12px', color: COLORS.green, fontWeight: 900, cursor: 'pointer', background: '#FBFAF7' }}>
                        {platformName} · {accounts.filter((account) => selectedSet.has(account.id)).length}/{accounts.length}
                      </summary>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '8px', padding: '10px' }}>
                        {accounts.map((account) => (
                          <label key={account.id} style={{ display: 'flex', gap: '9px', padding: '9px', borderRadius: '9px', border: `1px solid ${selectedSet.has(account.id) ? COLORS.green : COLORS.line}`, background: selectedSet.has(account.id) ? '#F5FAF7' : '#FFFFFF', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={selectedSet.has(account.id)}
                              onChange={() => toggleAccount(account.id)}
                              style={{ marginTop: '3px', accentColor: COLORS.green }}
                            />
                            <span>
                              <span style={{ display: 'block', color: COLORS.green, fontWeight: 900, fontSize: '13px' }}>
                                {account.accountName}
                              </span>
                              <span style={{ display: 'block', color: COLORS.muted, fontSize: '12px', marginTop: '2px' }}>
                                {account.accountId}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CustomReportBuilder({ availableClients, setView }) {
  const [resolvedClients, setResolvedClients] = useState(availableClients || [])
  const [selectedClientId, setSelectedClientId] = useState(availableClients?.[0]?.id || 'rimiya')
  const [reportRange, setReportRange] = useState('max')
  const [reportTitle, setReportTitle] = useState('Custom client report')
  const [reportData, setReportData] = useState(null)
  const [selectedAccountIds, setSelectedAccountIds] = useState(null)
  const [selectedMetrics, setSelectedMetrics] = useState(['spend', 'reach', 'impressions', 'clicks', 'ctr', 'conversions', 'cpa'])
  const [selectedSections, setSelectedSections] = useState(['summary', 'funnel', 'trends', 'platforms', 'audience'])
  const [resultDefinition, setResultDefinition] = useState('all')
  const [insightText, setInsightText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function ensureClients() {
      if (Array.isArray(availableClients) && availableClients.length) {
        setResolvedClients(availableClients)
        if (!selectedClientId) setSelectedClientId(availableClients[0].id)
        return
      }

      const response = await fetch('/api/dashboard?client=rimiya&platform=all&range=30d')
      const payload = await response.json()
      const clients = Array.isArray(payload?.availableClients) ? payload.availableClients : []
      setResolvedClients(clients)
      if (!selectedClientId && clients[0]?.id) setSelectedClientId(clients[0].id)
    }

    ensureClients().catch((err) => setError(err.message || 'Unable to load clients.'))
  }, [availableClients, selectedClientId])

  useEffect(() => {
    async function loadReportData() {
      try {
        setLoading(true)
        setError('')
        const params = new URLSearchParams({
          client: selectedClientId || 'rimiya',
          platform: 'all',
          range: reportRange
        })

        if (Array.isArray(selectedAccountIds) && selectedAccountIds.length > 0) {
          params.set('accounts', selectedAccountIds.join(','))
        }

        const response = await fetch(`/api/dashboard?${params.toString()}`)
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Unable to load custom report data.')

        setReportData(payload)
        setInsightText(payload?.insights?.suggested || '')
        if (selectedAccountIds === null) {
          setSelectedAccountIds((payload.accountOptions || []).map((account) => account.id))
        }
      } catch (err) {
        setError(err.message || 'Unable to load custom report.')
      } finally {
        setLoading(false)
      }
    }

    if (selectedClientId) loadReportData()
  }, [selectedClientId, reportRange, selectedAccountIds])

  const displayReportData = applyResultDefinition(reportData, resultDefinition)
  const accountOptions = Array.isArray(displayReportData?.accountOptions) ? displayReportData.accountOptions : []
  const selectedAccountSet = new Set(Array.isArray(selectedAccountIds) ? selectedAccountIds : accountOptions.map((account) => account.id))
  const summaryCards = Array.isArray(displayReportData?.summaryCards) ? displayReportData.summaryCards : []
  const campaignRows = Array.isArray(displayReportData?.campaignRows) ? displayReportData.campaignRows : []
  const totalSpend = parseSarString(getSummaryCardValue(summaryCards, 'Total Spend'))
  const totalImpressions = parseNumberString(getSummaryCardValue(summaryCards, 'Impressions'))
  const totalClicks = parseNumberString(getSummaryCardValue(summaryCards, 'Clicks'))
  const totalConversions = parseNumberString(getSummaryCardValue(summaryCards, 'Results'))
  const dailyChartData = buildDailyChartData(displayReportData)
  const targetCPA = dailyChartData.length > 0 ? Number(dailyChartData[0]?.targetCPA || 0) : null
  const accountGroups = accountOptions.reduce((groups, account) => {
    const key = account.platformLabel || account.platform
    if (!groups[key]) groups[key] = []
    groups[key].push(account)
    return groups
  }, {})

  function toggleFromList(value, setter) {
    setter((current) => {
      const next = new Set(current)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return Array.from(next)
    })
  }

  function toggleAccount(accountId) {
    setSelectedAccountIds((current) => {
      const base = Array.isArray(current) ? current : accountOptions.map((account) => account.id)
      const next = new Set(base)
      if (next.has(accountId)) next.delete(accountId)
      else next.add(accountId)
      if (next.size === 0 && accountOptions.length > 0) return base
      return Array.from(next)
    })
  }

  function selectPlatformAccounts(platformName, checked) {
    const platformAccountIds = (accountGroups[platformName] || []).map((account) => account.id)
    setSelectedAccountIds((current) => {
      const base = Array.isArray(current) ? current : accountOptions.map((account) => account.id)
      const next = new Set(base)
      platformAccountIds.forEach((id) => {
        if (checked) next.add(id)
        else next.delete(id)
      })
      if (next.size === 0 && accountOptions.length > 0) return base
      return Array.from(next)
    })
  }

  function exportExcel() {
    if (!reportData) return
    downloadCustomReportWorkbook({
      title: reportTitle || `${reportData.client?.name || 'Client'} custom report`,
      data: displayReportData,
      selectedMetrics,
      selectedSections,
      accountOptions,
      selectedAccountIds: Array.from(selectedAccountSet),
      insightText
    })
  }

  const showFunnel = selectedSections.includes('funnel') && ['impressions', 'clicks', 'conversions'].some((metric) => selectedMetrics.includes(metric))
  const showTrends = selectedSections.includes('trends') && ['spend', 'conversions', 'cpa'].some((metric) => selectedMetrics.includes(metric))
  const showPlatforms = selectedSections.includes('platforms')

  return (
    <div style={{ minHeight: '100vh', background: COLORS.cream, color: COLORS.text, padding: '24px' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-report { box-shadow: none !important; }
        }
      `}</style>

      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: COLORS.green, fontWeight: 800, marginBottom: '6px' }}>
              Custom report builder
            </div>
            <h1 style={{ margin: 0, color: COLORS.green, fontSize: '30px', fontWeight: 900 }}>
              Build a client report
            </h1>
            <p style={{ marginTop: '6px', color: COLORS.muted, fontSize: '13px' }}>
              Select the client, channels, date range, metrics, and sections before exporting.
            </p>
          </div>
          <button onClick={() => setView('dashboard')} style={buttonStyle(false)}>
            Back to dashboard
          </button>
        </div>

        <div className="no-print" style={{ display: 'grid', gap: '14px', marginBottom: '16px' }}>
          <div style={{ ...cardStyle(), padding: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '10px', alignItems: 'end' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '6px', fontWeight: 700 }}>Client</div>
                <select
                  value={selectedClientId}
                  onChange={(event) => {
                    setSelectedClientId(event.target.value)
                    setSelectedAccountIds(null)
                  }}
                  style={selectStyle()}
                >
                  {resolvedClients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '6px', fontWeight: 700 }}>Date range</div>
                <select value={reportRange} onChange={(event) => setReportRange(event.target.value)} style={selectStyle()}>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="this_month">This month</option>
                  <option value="max">Since promotion start</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '6px', fontWeight: 700 }}>Report name</div>
                <input value={reportTitle} onChange={(event) => setReportTitle(event.target.value)} style={selectStyle()} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '6px', fontWeight: 700 }}>Result definition</div>
                <select value={resultDefinition} onChange={(event) => setResultDefinition(event.target.value)} style={selectStyle()}>
                  {CUSTOM_RESULT_DEFINITIONS.map((definition) => (
                    <option key={definition.id} value={definition.id}>{definition.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => window.print()} style={buttonStyle(true)}>Export PDF</button>
                <button onClick={exportExcel} style={buttonStyle(false)}>Export Excel</button>
              </div>
            </div>
          </div>

          {error ? (
            <div style={{ ...cardStyle(), padding: '12px 14px', color: COLORS.red, fontWeight: 800 }}>
              {error}
            </div>
          ) : null}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '14px' }}>
            <div style={{ ...cardStyle(), padding: '14px' }}>
              <SectionTitle title="Channels and accounts" subtitle="Choose all channels or exact accounts." />
              <div style={{ display: 'grid', gap: '10px' }}>
                {Object.entries(accountGroups).length ? Object.entries(accountGroups).map(([platformName, accounts]) => {
                  const checkedCount = accounts.filter((account) => selectedAccountSet.has(account.id)).length
                  return (
                    <details key={platformName} open style={{ border: `1px solid ${COLORS.line}`, borderRadius: '10px', overflow: 'hidden' }}>
                      <summary style={{ padding: '10px 12px', color: COLORS.green, fontWeight: 900, cursor: 'pointer', background: '#FBFAF7' }}>
                        {platformName} · {checkedCount}/{accounts.length}
                      </summary>
                      <div style={{ padding: '10px', display: 'grid', gap: '8px' }}>
                        <label style={{ display: 'flex', gap: '8px', color: COLORS.text, fontSize: '13px', fontWeight: 800 }}>
                          <input
                            type="checkbox"
                            checked={checkedCount === accounts.length}
                            onChange={(event) => selectPlatformAccounts(platformName, event.target.checked)}
                            style={{ accentColor: COLORS.green }}
                          />
                          Include all {platformName}
                        </label>
                        {accounts.map((account) => (
                          <label key={account.id} style={{ display: 'flex', gap: '8px', color: COLORS.muted, fontSize: '13px' }}>
                            <input
                              type="checkbox"
                              checked={selectedAccountSet.has(account.id)}
                              onChange={() => toggleAccount(account.id)}
                              style={{ accentColor: COLORS.green }}
                            />
                            {account.accountName} · {account.accountId}
                          </label>
                        ))}
                      </div>
                    </details>
                  )
                }) : (
                  <EmptyState
                    title="No connected accounts found"
                    text="This client does not have selectable accounts for the current setup yet."
                  />
                )}
              </div>
            </div>

            <div style={{ ...cardStyle(), padding: '14px' }}>
              <SectionTitle title="Metrics and sections" subtitle="The preview changes based on what you choose." />
              <div style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <div style={{ color: COLORS.green, fontWeight: 900, fontSize: '13px', marginBottom: '8px' }}>Metrics</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '7px' }}>
                    {CUSTOM_REPORT_METRICS.map((metric) => (
                      <label key={metric.id} style={{ display: 'flex', gap: '7px', fontSize: '13px', color: COLORS.text }}>
                        <input
                          type="checkbox"
                          checked={selectedMetrics.includes(metric.id)}
                          onChange={() => toggleFromList(metric.id, setSelectedMetrics)}
                          style={{ accentColor: COLORS.green }}
                        />
                        {metric.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ color: COLORS.green, fontWeight: 900, fontSize: '13px', marginBottom: '8px' }}>Report sections</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '7px' }}>
                    {CUSTOM_REPORT_SECTIONS.map((section) => (
                      <label key={section.id} style={{ display: 'flex', gap: '7px', fontSize: '13px', color: COLORS.text }}>
                        <input
                          type="checkbox"
                          checked={selectedSections.includes(section.id)}
                          onChange={() => toggleFromList(section.id, setSelectedSections)}
                          style={{ accentColor: COLORS.green }}
                        />
                        {section.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ ...cardStyle(), padding: '18px', color: COLORS.muted }}>Loading custom report...</div>
        ) : reportData ? (
          <div className="print-report" style={{ display: 'grid', gap: '14px' }}>
            <div style={{ ...cardStyle(), padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ marginBottom: '12px', maxWidth: '320px' }}>
                    <BrandMark />
                  </div>
                  <h1 style={{ margin: 0, color: COLORS.green, fontSize: '30px', fontWeight: 900 }}>
                    {reportTitle || `${reportData.client?.name} report`}
                  </h1>
                  <p style={{ margin: '6px 0 0', color: COLORS.muted, fontSize: '13px' }}>
                    {displayReportData.client?.name} · {reportRange} · {selectedAccountSet.size} selected accounts · {getResultDefinitionLabel(resultDefinition)}
                  </p>
                </div>
                <div style={{ color: COLORS.muted, fontSize: '12px', alignSelf: 'flex-start' }}>
                  Generated {new Date().toLocaleString()}
                </div>
              </div>
            </div>

            <DataConfidencePanel data={displayReportData} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: '10px' }}>
              {selectedMetrics.map((metricId) => {
                const metric = CUSTOM_REPORT_METRICS.find((item) => item.id === metricId)
                return (
                  <MetricCard
                    key={metricId}
                    label={metric?.label || metricId}
                    value={getSummaryValue(displayReportData, metricId)}
                  />
                )
              })}
            </div>

            {selectedSections.includes('summary') ? (
              <SummaryBlock
                text={insightText}
                onChange={setInsightText}
                onReset={() => setInsightText(displayReportData?.insights?.suggested || '')}
                onExport={() => window.print()}
              />
            ) : null}

            {showFunnel ? <FunnelHero impressions={totalImpressions} clicks={totalClicks} conversions={totalConversions} /> : null}
            {showTrends ? <TrendCharts daily={dailyChartData} targetCPA={targetCPA} /> : null}
            {showPlatforms ? (
              <PlatformContribution
                rows={campaignRows}
                totalSpend={totalSpend}
                totalClicks={totalClicks}
                totalConversions={totalConversions}
              />
            ) : null}
            {selectedSections.includes('benchmarks') ? <BenchmarkIndicators data={displayReportData} /> : null}
            {selectedSections.includes('audience') ? <AudienceActionInsights data={displayReportData} /> : null}
            {selectedSections.includes('advanced') ? <AdvancedTable rows={campaignRows} googleDiagnostics={displayReportData?.diagnostics?.google || null} /> : null}
            <StatusBanner text={displayReportData?.insights?.nextAction || 'Review the strongest result source and scale carefully.'} />
            <DashboardFooter />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function App() {
  const [shareToken] = useState(() => getInitialShareToken())
  const isSharedView = Boolean(shareToken)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [client, setClient] = useState('rimiya')
  const [platform, setPlatform] = useState('all')
  const [range, setRange] = useState(() => getInitialQueryParam('range', '30d'))
  const [view, setView] = useState('dashboard')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [insightsText, setInsightsText] = useState('')
  const [shareStatus, setShareStatus] = useState('')
  const [selectedAccountIds, setSelectedAccountIds] = useState(null)
  const [caseStudyName, setCaseStudyName] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true)
        setError('')

        const params = isSharedView
          ? new URLSearchParams({
              token: shareToken,
              range
            })
          : new URLSearchParams({
              client,
              platform,
              range
            })

        if (!isSharedView && Array.isArray(selectedAccountIds) && selectedAccountIds.length > 0) {
          params.set('accounts', selectedAccountIds.join(','))
        }

        const endpoint = isSharedView ? '/api/public-dashboard' : '/api/dashboard'
        const res = await fetch(`${endpoint}?${params.toString()}`)
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
  }, [client, platform, range, isSharedView, shareToken, selectedAccountIds])

  useEffect(() => {
    setInsightsText(data?.insights?.suggested || '')
  }, [data?.insights?.suggested])

  useEffect(() => {
    if (!isSharedView) {
      setPlatform('all')
      setSelectedAccountIds(null)
    }
  }, [client, isSharedView])

  const availableClients = useMemo(() => {
    return Array.isArray(data?.availableClients) ? data.availableClients : []
  }, [data])

  const availablePlatforms = useMemo(() => {
    const platforms = Array.isArray(data?.availablePlatforms) ? data.availablePlatforms : []
    return ['all', ...platforms]
  }, [data])

  const accountOptions = useMemo(() => {
    return Array.isArray(data?.accountOptions) ? data.accountOptions : []
  }, [data])

  const accountGroups = useMemo(() => {
    return accountOptions.reduce((groups, account) => {
      const key = account.platformLabel || account.platform
      if (!groups[key]) groups[key] = []
      groups[key].push(account)
      return groups
    }, {})
  }, [accountOptions])

  useEffect(() => {
    if (isSharedView || !accountOptions.length || selectedAccountIds !== null) return
    setSelectedAccountIds(accountOptions.map((account) => account.id))
  }, [accountOptions, isSharedView, selectedAccountIds])

  useEffect(() => {
    if (!isSharedView && !availablePlatforms.includes(platform)) {
      setPlatform('all')
    }
  }, [availablePlatforms, isSharedView, platform])

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
    return (
      <ReportView
        data={data}
        platform={data?.filters?.platform || platform}
        range={range}
        setView={setView}
        insightsText={insightsText}
        isSharedView={isSharedView}
      />
    )
  }

  if (view === 'agency-export') {
    return <AgencyExportView key="agency-export" availableClients={availableClients} setView={setView} />
  }

  if (view === 'custom-report') {
    return <CustomReportBuilder key="custom-report" availableClients={availableClients} setView={setView} />
  }

  const summaryCards = Array.isArray(data?.summaryCards) ? data.summaryCards : []
  const campaignRows = Array.isArray(data?.campaignRows) ? data.campaignRows : []
  const googleDiagnostics = data?.diagnostics?.google || null

  const totalSpend = parseSarString(summaryCards.find((c) => c.label === 'Total Spend')?.value)
  const totalImpressions = parseNumberString(summaryCards.find((c) => c.label === 'Impressions')?.value)
  const totalClicks = parseNumberString(summaryCards.find((c) => c.label === 'Clicks')?.value)
  const totalConversions = parseNumberString(getSummaryCardValue(summaryCards, 'Results'))

  const summaryText = insightsText || buildClientSummary({
    totalSpend,
    totalImpressions,
    totalClicks,
    totalConversions,
    googleDiagnostics
  })

  const dailyChartData = buildDailyChartData(data, totalSpend, totalConversions)
  const targetCPA = dailyChartData.length > 0 ? Number(dailyChartData[0]?.targetCPA || 0) : null
  const nextActionText = data?.insights?.nextAction || 'Healthy momentum. Next step: keep optimizing efficiency.'
  const selectedAccountSet = new Set(
    Array.isArray(selectedAccountIds)
      ? selectedAccountIds
      : accountOptions.map((account) => account.id)
  )

  function toggleAccountSelection(accountId) {
    setSelectedAccountIds((current) => {
      const base = Array.isArray(current) ? current : accountOptions.map((account) => account.id)
      const next = new Set(base)
      if (next.has(accountId)) {
        next.delete(accountId)
      } else {
        next.add(accountId)
      }

      return Array.from(next)
    })
  }

  function selectAllAccounts() {
    setSelectedAccountIds(accountOptions.map((account) => account.id))
  }

  function downloadCaseStudyExcel() {
    downloadExcelWorkbook({
      data,
      campaignRows,
      dailyChartData,
      accountOptions,
      selectedAccountIds: Array.from(selectedAccountSet),
      insightsText,
      caseStudyName: caseStudyName || `${data?.client?.name || 'Client'} case study`
    })
  }

  async function createShareLink() {
    try {
      setShareStatus('Creating client link...')
      const params = new URLSearchParams({
        client,
        platform,
        range
      })
      if (Array.isArray(selectedAccountIds) && selectedAccountIds.length > 0) {
        params.set('accounts', selectedAccountIds.join(','))
      }
      const response = await fetch(`/api/share-link?${params.toString()}`)
      const json = await response.json()

      if (!response.ok || !json.url) {
        throw new Error(json.error || 'Unable to create client link.')
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(json.url)
        setShareStatus('Client link copied. You can paste it and send it.')
      } else {
        setShareStatus(json.url)
      }
    } catch (err) {
      setShareStatus(err.message || 'Unable to create client link.')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.cream, color: COLORS.text }}>
      <div style={{ display: 'grid', gridTemplateColumns: isSharedView ? '1fr' : '260px 1fr', minHeight: '100vh' }}>
        {!isSharedView ? (
          <aside
            style={{
              background: COLORS.green,
              borderRight: '1px solid rgba(255,255,255,0.08)',
              padding: '26px 18px',
              boxShadow: '8px 0 30px rgba(15,23,42,0.03)'
            }}
          >
          <div style={{ marginBottom: '28px' }}>
            <BrandMark dark={true} />
          </div>

          <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '14px', marginBottom: '14px' }}>
            Main menu
          </div>

          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={navItemStyle(true)}>Dashboard</div>
            <div style={navItemStyle(false)}>Performance</div>
            <div style={navItemStyle(false)}>Reports</div>
            <div style={navItemStyle(false)}>Platforms</div>
            <div style={navItemStyle(false)}>Clients</div>
          </div>

          <div
            style={{
              marginTop: '26px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '18px',
              padding: '18px',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.72)', marginBottom: '12px' }}>
              Quick actions
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              <button
                onClick={() => setView('onboarding')}
                style={{
                  ...buttonStyle(true),
                  background: COLORS.amber,
                  color: COLORS.green
                }}
              >
                Open onboarding
              </button>
              <button
                onClick={() => setView('report')}
                style={{
                  ...buttonStyle(false),
                  background: 'transparent',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.18)'
                }}
              >
                Export report
              </button>
              <button
                onClick={() => setView('agency-export')}
                style={{
                  ...buttonStyle(false),
                  background: 'transparent',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.18)'
                }}
              >
                Agency Excel
              </button>
              <button
                onClick={() => setView('custom-report')}
                style={{
                  ...buttonStyle(false),
                  background: 'transparent',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.18)'
                }}
              >
                Custom report
              </button>
            </div>
          </div>
          </aside>
        ) : null}

        <main style={{ padding: '20px 22px 30px' }}>
          <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
            {isSharedView ? (
              <div
                style={{
                  ...cardStyle(),
                  padding: '12px 14px',
                  marginBottom: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ maxWidth: '320px' }}>
                  <BrandMark />
                </div>
                <button onClick={() => setView('report')} style={buttonStyle(true)}>
                  Export PDF
                </button>
              </div>
            ) : null}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '14px',
                flexWrap: 'wrap',
                marginBottom: '14px'
              }}
            >
              <div>
                <div style={{ fontSize: '12px', color: COLORS.green, fontWeight: 800, marginBottom: '6px' }}>
                  {isSharedView ? 'CLIENT REPORT' : 'CLIENT VIEW'}
                </div>
                <h1 style={{ margin: 0, fontSize: '30px', fontWeight: 900, color: COLORS.green }}>
                  {data?.client?.name || 'Dashboard'}
                </h1>
                <p style={{ marginTop: '6px', color: COLORS.muted, fontSize: '13px' }}>
                  A simple visual story of funnel performance, efficiency, and next action.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {!isSharedView ? (
                  <button onClick={() => setShowAdvanced((v) => !v)} style={buttonStyle(false)}>
                    {showAdvanced ? 'Hide advanced view' : 'Show advanced view'}
                  </button>
                ) : null}
                {!isSharedView ? (
                  <button onClick={createShareLink} style={buttonStyle(true)}>
                    Create client link
                  </button>
                ) : null}

                <div style={{ ...cardStyle(), padding: '11px 14px', minWidth: '220px' }}>
                  <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700 }}>Last updated</div>
                  <div style={{ marginTop: '6px', fontWeight: 900, color: COLORS.green, fontSize: '13px' }}>
                    {data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {shareStatus ? (
              <div
                style={{
                  ...cardStyle(),
                  padding: '11px 14px',
                  marginBottom: '12px',
                  color: shareStatus.startsWith('http') ? COLORS.green : COLORS.text,
                  fontSize: '13px',
                  fontWeight: 700,
                  wordBreak: 'break-word'
                }}
              >
                {shareStatus}
              </div>
            ) : null}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: '10px',
                marginBottom: '12px'
              }}
            >
              {!isSharedView ? (
                <div style={cardStyle()}>
                <div style={{ padding: '11px 12px 13px' }}>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '6px', fontWeight: 700 }}>
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
              ) : null}

              {!isSharedView ? (
                <div style={cardStyle()}>
                <div style={{ padding: '11px 12px 13px' }}>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '6px', fontWeight: 700 }}>
                    Platform
                  </div>
                  <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={selectStyle()}>
                    {availablePlatforms.map((p) => (
                      <option key={p} value={p}>
                        {p === 'all' ? 'All platforms' : p}
                      </option>
                    ))}
                  </select>
                </div>
                </div>
              ) : (
                <div style={cardStyle()}>
                  <div style={{ padding: '11px 12px 13px' }}>
                    <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '6px', fontWeight: 700 }}>
                      Report access
                    </div>
                    <div style={{ color: COLORS.green, fontWeight: 900, fontSize: '14px' }}>
                      {data?.share?.platform === 'all'
                        ? 'All active platforms'
                        : `${data?.filters?.platform || 'platform'} · ${data?.share?.accountId || 'locked report'}`}
                    </div>
                  </div>
                </div>
              )}

              <div style={cardStyle()}>
                <div style={{ padding: '11px 12px 13px' }}>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '6px', fontWeight: 700 }}>
                    Date range
                  </div>
                  <select value={range} onChange={(e) => setRange(e.target.value)} style={selectStyle()}>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="this_month">This month</option>
                    <option value="max">Since promotion start</option>
                  </select>
                </div>
              </div>
            </div>

            <DataConfidencePanel data={data} />

            {!isSharedView && accountOptions.length > 0 ? (
              <div style={{ ...cardStyle(), padding: '13px 14px', marginBottom: '12px' }}>
                <details>
                  <summary style={{ cursor: 'pointer', color: COLORS.green, fontWeight: 900, fontSize: '13px' }}>
                    Change included accounts · {selectedAccountSet.size}/{accountOptions.length} selected
                  </summary>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      flexWrap: 'wrap',
                      margin: '12px 0 10px'
                    }}
                  >
                    <div style={{ fontSize: '12px', color: COLORS.muted }}>
                      Use this when you want one dashboard to include exact confirmed accounts only.
                    </div>
                    <button onClick={selectAllAccounts} style={buttonStyle(false)}>
                      Select all
                    </button>
                  </div>

                  <div style={{ display: 'grid', gap: '10px' }}>
                    {Object.entries(accountGroups).map(([platformName, accounts]) => (
                      <details
                        key={platformName}
                        open
                        style={{
                          border: `1px solid ${COLORS.line}`,
                          borderRadius: '10px',
                          background: '#FBFAF7',
                          overflow: 'hidden'
                        }}
                      >
                        <summary
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            color: COLORS.green,
                            fontWeight: 900,
                            fontSize: '13px',
                            listStyle: 'none'
                          }}
                        >
                          {platformName} · {accounts.filter((account) => selectedAccountSet.has(account.id)).length}/{accounts.length}
                        </summary>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '8px', padding: '0 10px 10px' }}>
                          {accounts.map((account) => (
                            <label
                              key={account.id}
                              style={{
                                display: 'flex',
                                gap: '9px',
                                alignItems: 'flex-start',
                                padding: '9px',
                                borderRadius: '9px',
                                border: `1px solid ${selectedAccountSet.has(account.id) ? COLORS.green : '#EFE7D6'}`,
                                background: selectedAccountSet.has(account.id) ? '#F5FAF7' : '#FFFFFF',
                                cursor: 'pointer'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedAccountSet.has(account.id)}
                                onChange={() => toggleAccountSelection(account.id)}
                                style={{ marginTop: '3px', accentColor: COLORS.green }}
                              />
                              <span>
                                <span style={{ display: 'block', fontSize: '13px', color: COLORS.green, fontWeight: 900 }}>
                                  {account.accountName}
                                </span>
                                <span style={{ display: 'block', fontSize: '12px', color: COLORS.muted, marginTop: '2px' }}>
                                  {account.clientName} · {account.accountId}
                                </span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </details>
              </div>
            ) : null}

            {!isSharedView ? (
              <div style={{ ...cardStyle(), padding: '13px 14px', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', color: COLORS.green, fontWeight: 900 }}>
                  Case study Excel
                </div>
                <div style={{ fontSize: '12px', color: COLORS.muted, marginTop: '3px', marginBottom: '10px' }}>
                  Generate a client workbook, or download all dashboard clients in one agency workbook.
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    value={caseStudyName}
                    onChange={(event) => setCaseStudyName(event.target.value)}
                    placeholder={`${data?.client?.name || 'Client'} case study`}
                    style={{
                      ...selectStyle(),
                      flex: '1 1 260px',
                      minWidth: 0
                    }}
                  />
                  <button onClick={downloadCaseStudyExcel} style={buttonStyle(true)}>
                    Client Excel
                  </button>
                  <button onClick={() => setView('agency-export')} style={buttonStyle(false)}>
                    Agency export
                  </button>
                  <button onClick={() => setView('custom-report')} style={buttonStyle(false)}>
                    Custom report
                  </button>
                </div>
              </div>
            ) : null}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '14px', alignItems: 'stretch' }}>
              <SummaryBlock
                text={summaryText}
                onChange={setInsightsText}
                onReset={() => setInsightsText(data?.insights?.suggested || '')}
                onExport={() => setView('report')}
              />

              <FunnelHero
                impressions={totalImpressions}
                clicks={totalClicks}
                conversions={totalConversions}
                compact={true}
              />
            </div>

            <div style={{ display: 'grid', gap: '14px', marginTop: '14px' }}>
              <TrendCharts daily={dailyChartData} targetCPA={targetCPA} compact={true} />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '14px', alignItems: 'stretch' }}>
                <PlatformContribution
                  rows={campaignRows}
                  totalSpend={totalSpend}
                  totalClicks={totalClicks}
                  totalConversions={totalConversions}
                  compact={true}
                />
                <StatusBanner text={nextActionText} />
              </div>

              {showAdvanced ? (
                <AdvancedTable rows={campaignRows} googleDiagnostics={googleDiagnostics} />
              ) : null}
            </div>
            {isSharedView ? <DashboardFooter /> : null}
          </div>
        </main>
      </div>
    </div>
  )
}
