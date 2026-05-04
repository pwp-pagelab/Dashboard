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
    padding: '20px'
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
          Post With Passion
        </div>
        <div
          style={{
            fontSize: '12px',
            color: subColor,
            marginTop: '4px'
          }}
        >
          Performance dashboard
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

function EmptyState({ text }) {
  return (
    <div
      style={{
        padding: '18px',
        borderRadius: '12px',
        background: '#FBFAF7',
        border: `1px dashed ${COLORS.line}`,
        color: COLORS.muted,
        fontSize: '14px'
      }}
    >
      {text}
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
  Conversions: 'Conversions (التحويلات)',
  'Platforms Active': 'Platforms active (المنصات النشطة)',
  Spend: 'Spend (الإنفاق)',
  CPA: 'CPA (تكلفة التحويل)',
  CPC: 'CPC (تكلفة النقرة)',
  Platform: 'Platform',
  Campaign: 'Campaign',
  'Spend share': 'Spend share (حصة الإنفاق)',
  'Click share': 'Click share (حصة النقرات)',
  'Conversion share': 'Conversion share (حصة التحويلات)'
}

function metricLabel(label) {
  return METRIC_LABELS[label] || label
}

function StatusBanner({ text }) {
  return (
    <div
      style={{
        ...cardStyle(),
        padding: '16px 18px',
        borderLeft: `4px solid ${COLORS.amber}`,
        background: '#FCFBF8'
      }}
    >
      <div style={{ color: COLORS.green, fontWeight: 800, fontSize: '15px' }}>{text}</div>
    </div>
  )
}

function FunnelHero({ impressions, clicks, conversions }) {
  const clickRate = impressions > 0 ? (clicks / impressions) * 100 : 0
  const convOfImpressions = impressions > 0 ? (conversions / impressions) * 100 : 0
  const convOfClicks = clicks > 0 ? (conversions / clicks) * 100 : 0

  let dropOffInsight = 'Top of funnel is healthy.'
  if (clicks === 0 && impressions > 0) {
    dropOffInsight = 'The clearest opportunity is from impressions to clicks — a stronger creative hook can help more people engage.'
  } else if (conversions === 0 && clicks > 0) {
    dropOffInsight = 'The clearest opportunity is from clicks to conversions — traffic is arriving, and the next win is making the post-click path easier.'
  } else if (clickRate < convOfClicks) {
    dropOffInsight = 'The clearest opportunity is from impressions to clicks — improving first-touch engagement can lift the whole journey.'
  } else {
    dropOffInsight = 'The clearest opportunity is from clicks to conversions — post-click improvements can turn more existing interest into action.'
  }

  const rows = [
    {
      label: metricLabel('Impressions'),
      value: impressions.toLocaleString(),
      width: 100,
      inside: '100%',
      color: COLORS.green,
      topRight: '100%'
    },
    {
      label: metricLabel('Clicks'),
      value: clicks.toLocaleString(),
      width: Math.max(clickRate, clicks > 0 ? 6 : 0),
      inside: `${percent(clickRate)}`,
      color: COLORS.greenMid,
      topRight: `CTR ${percent(clickRate)}`
    },
    {
      label: metricLabel('Conversions'),
      value: conversions.toLocaleString(),
      width: Math.max(convOfClicks, conversions > 0 ? 4 : 0),
      inside: `${percent(convOfImpressions)} of impressions`,
      color: COLORS.greenLight,
      topRight: `Click-to-conversion ${percent(convOfClicks)}`
    }
  ]

  return (
    <div style={panelStyle()}>
      <SectionTitle
        title="Customer journey funnel"
        subtitle="A simple view of how attention turns into action."
      />

      <div style={{ display: 'grid', gap: '18px' }}>
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
                height: '44px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${row.width}%`,
                  minWidth: row.width > 0 ? '64px' : 0,
                  height: '100%',
                  background: row.color,
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 12px',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '12px',
                  transition: 'width 0.4s ease'
                }}
              >
                <span>{row.value}</span>
                <span>{row.inside}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: '16px',
          padding: '12px 14px',
          borderRadius: '10px',
          background: COLORS.softAmber,
          color: COLORS.text,
          fontSize: '14px',
          lineHeight: 1.6
        }}
      >
        {dropOffInsight}
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
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
          minHeight: '122px',
          background: '#FCFBF8',
          border: `0.5px solid ${COLORS.line}`,
          borderRadius: '12px',
          padding: '18px',
          color: COLORS.text,
          fontSize: '15px',
          lineHeight: 1.8,
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

function TrendCharts({ daily, targetCPA }) {
  const hasDaily = Array.isArray(daily) && daily.length > 0
  const actualTargetCPA = Number.isFinite(targetCPA) && targetCPA > 0 ? targetCPA : null

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px'
      }}
    >
      <div style={panelStyle()}>
        <SectionTitle
          title="Spend vs. conversions over time"
          subtitle="Green bars for spend, amber line for daily conversions."
        />
        {!hasDaily ? (
          <EmptyState text="Trend data is not available for this platform yet." />
        ) : (
          <div style={{ width: '100%', height: 300 }}>
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
                  name={metricLabel('Conversions')}
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
          title="Cost per conversion trend"
          subtitle="Trending down is good."
        />
        {!hasDaily || !daily.some((row) => row.cpa != null) ? (
          <EmptyState text="Cost trend data is not available for this platform yet." />
        ) : (
          <div style={{ width: '100%', height: 300 }}>
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

function PlatformContribution({ rows, totalSpend, totalClicks, totalConversions }) {
  const platforms = rows.map((row) => ({
    platform: row.platform,
    spend: parseSarString(row.spend),
    clicks: parseNumberString(row.clicks),
    conversions: row.conversions === 'N/A' ? 0 : parseNumberString(row.conversions)
  }))

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
      metric: metricLabel('Conversion share'),
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
        subtitle="How each platform contributes to spend, clicks, and conversions."
      />

      {platforms.length === 0 ? (
        <EmptyState text="No platform data available." />
      ) : (
        <div style={{ width: '100%', height: 280 }}>
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
              <th style={{ padding: '12px 8px' }}>{metricLabel('Conversions')}</th>
              <th style={{ padding: '12px 8px' }}>{metricLabel('CPA')}</th>
            </tr>
          </thead>
          <tbody>
            {platformPerformanceRows.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '18px 8px' }}>
                  <EmptyState text="No platform data available." />
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

    return `This period, ${spendText} was spent to generate ${impressionText} impressions and ${clicksText} clicks. The next positive step is to confirm conversion tracking and make the post-click path easier before scaling spend.`
  }

  return `This period, ${spendText} was spent to generate ${impressionText} impressions, ${clicksText} clicks, and ${totalConversions.toLocaleString()} conversions. Performance is producing measurable results, and the next step is to compare efficiency against target benchmarks before scaling.`
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

function ReportView({ data, platform, range, setView, insightsText }) {
  const campaignRows = Array.isArray(data?.campaignRows) ? data.campaignRows : []
  const summaryCards = Array.isArray(data?.summaryCards) ? data.summaryCards : []
  const totalSpend = parseSarString(summaryCards.find((c) => c.label === 'Total Spend')?.value)
  const totalImpressions = parseNumberString(summaryCards.find((c) => c.label === 'Impressions')?.value)
  const totalClicks = parseNumberString(summaryCards.find((c) => c.label === 'Clicks')?.value)
  const totalConversions = parseNumberString(summaryCards.find((c) => c.label === 'Conversions')?.value)
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
          <button onClick={() => setView('dashboard')} style={buttonStyle(false)}>
            Back to dashboard
          </button>
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
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [insightsText, setInsightsText] = useState('')

  useEffect(() => {
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
  }, [client, platform, range])

  useEffect(() => {
    setInsightsText(data?.insights?.suggested || '')
  }, [data?.insights?.suggested])

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
    return <ReportView data={data} platform={platform} range={range} setView={setView} insightsText={insightsText} />
  }

  const summaryCards = Array.isArray(data?.summaryCards) ? data.summaryCards : []
  const campaignRows = Array.isArray(data?.campaignRows) ? data.campaignRows : []
  const googleDiagnostics = data?.diagnostics?.google || null

  const totalSpend = parseSarString(summaryCards.find((c) => c.label === 'Total Spend')?.value)
  const totalImpressions = parseNumberString(summaryCards.find((c) => c.label === 'Impressions')?.value)
  const totalClicks = parseNumberString(summaryCards.find((c) => c.label === 'Clicks')?.value)
  const totalConversions = parseNumberString(summaryCards.find((c) => c.label === 'Conversions')?.value)

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

  return (
    <div style={{ minHeight: '100vh', background: COLORS.cream, color: COLORS.text }}>
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh' }}>
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
              <div style={{ fontSize: '12px', color: COLORS.green, fontWeight: 800, marginBottom: '8px' }}>
                CLIENT VIEW
              </div>
              <h1 style={{ margin: 0, fontSize: '34px', fontWeight: 900, color: COLORS.green }}>
                {data?.client?.name || 'Dashboard'}
              </h1>
              <p style={{ marginTop: '8px', color: COLORS.muted, fontSize: '14px' }}>
                A simple visual story of funnel performance, efficiency, and next action.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => setShowAdvanced((v) => !v)} style={buttonStyle(false)}>
                {showAdvanced ? 'Hide advanced view' : 'Show advanced view'}
              </button>

              <div style={{ ...cardStyle(), padding: '14px 18px', minWidth: '250px' }}>
                <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700 }}>Last updated</div>
                <div style={{ marginTop: '8px', fontWeight: 900, color: COLORS.green }}>
                  {data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'N/A'}
                </div>
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
                <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '8px', fontWeight: 700 }}>
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
                <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '8px', fontWeight: 700 }}>
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

            <div style={cardStyle()}>
              <div style={{ padding: '14px 16px 18px' }}>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '8px', fontWeight: 700 }}>
                  Date range
                </div>
                <select value={range} onChange={(e) => setRange(e.target.value)} style={selectStyle()}>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="this_month">This month</option>
                  <option value="max">Since onboarding</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '18px' }}>
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
            />

            <TrendCharts daily={dailyChartData} targetCPA={targetCPA} />

            <PlatformContribution
              rows={campaignRows}
              totalSpend={totalSpend}
              totalClicks={totalClicks}
              totalConversions={totalConversions}
            />

            {showAdvanced ? (
              <AdvancedTable rows={campaignRows} googleDiagnostics={googleDiagnostics} />
            ) : null}

            <StatusBanner text={nextActionText} />
          </div>
        </main>
      </div>
    </div>
  )
}
