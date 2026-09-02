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
  Area
} from 'recharts'
import OnboardingHelper from './OnboardingHelper.jsx'
import {
  buildCustomRange,
  formatReportDate,
  parseCustomDateRange
} from '../lib/reportRange.js'
import {
  applyMetaImportToDashboard,
  parseMetaCsv
} from '../lib/metaCsvImport.js'

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

function ReportRangeControl({ value, onChange }) {
  const today = formatReportDate()
  const customRange = parseCustomDateRange(value)
  const customStartDate = customRange?.startDate || today
  const customEndDate = customRange?.endDate || today
  const isCustom = Boolean(customRange)

  function handleRangeChange(nextValue) {
    if (nextValue === 'custom') {
      onChange(buildCustomRange(customStartDate, customEndDate) || `custom:${today}:${today}`)
      return
    }

    onChange(nextValue)
  }

  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      <select
        value={isCustom ? 'custom' : value}
        onChange={(event) => handleRangeChange(event.target.value)}
        style={selectStyle()}
      >
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
        <option value="this_month">This month</option>
        <option value="max">Since promotion start</option>
        <option value="custom">Choose exact start and end dates</option>
      </select>

      {isCustom ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
          <label style={{ display: 'grid', gap: '5px' }}>
            <span style={{ color: COLORS.muted, fontSize: '12px', fontWeight: 700 }}>Start date</span>
            <input
              type="date"
              value={customStartDate}
              max={customEndDate}
              onChange={(event) => {
                const nextEndDate = event.target.value > customEndDate ? event.target.value : customEndDate
                const nextRange = buildCustomRange(event.target.value, nextEndDate)
                if (nextRange) onChange(nextRange)
              }}
              style={selectStyle()}
            />
          </label>
          <label style={{ display: 'grid', gap: '5px' }}>
            <span style={{ color: COLORS.muted, fontSize: '12px', fontWeight: 700 }}>End date</span>
            <input
              type="date"
              value={customEndDate}
              min={customStartDate}
              max={today}
              onChange={(event) => {
                const nextRange = buildCustomRange(customStartDate, event.target.value)
                if (nextRange) onChange(nextRange)
              }}
              style={selectStyle()}
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}

function shiftReportDate(dateString, days) {
  const date = new Date(`${dateString}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return formatReportDate(date)
}

function resolveReportRange(value) {
  const custom = parseCustomDateRange(value)
  if (custom) return custom

  const today = formatReportDate()
  if (value === '7d') return { startDate: shiftReportDate(today, -6), endDate: today }
  if (value === '30d') return { startDate: shiftReportDate(today, -29), endDate: today }
  if (value === 'this_month') return { startDate: `${today.slice(0, 8)}01`, endDate: today }
  return { startDate: shiftReportDate(today, -29), endDate: today }
}

function precedingReportRange(value) {
  const { startDate, endDate } = resolveReportRange(value)
  const start = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T00:00:00.000Z`)
  const dayCount = Math.round((end - start) / 86400000) + 1
  const comparisonEnd = shiftReportDate(startDate, -1)
  const comparisonStart = shiftReportDate(comparisonEnd, -(dayCount - 1))
  return buildCustomRange(comparisonStart, comparisonEnd) || `custom:${comparisonStart}:${comparisonEnd}`
}

function ExactDateRange({ value, onChange, heading }) {
  const today = formatReportDate()
  const resolved = resolveReportRange(value)

  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      {heading ? <div style={{ color: COLORS.green, fontSize: '13px', fontWeight: 900 }}>{heading}</div> : null}
      <div className="report-date-fields" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
        <label style={{ display: 'grid', gap: '5px' }}>
          <span style={{ color: COLORS.muted, fontSize: '11px', fontWeight: 800, letterSpacing: '.03em' }}>START DATE</span>
          <input
            aria-label={`${heading || 'Report'} start date`}
            type="date"
            value={resolved.startDate}
            max={resolved.endDate}
            onChange={(event) => {
              const nextEnd = event.target.value > resolved.endDate ? event.target.value : resolved.endDate
              const nextRange = buildCustomRange(event.target.value, nextEnd)
              if (nextRange) onChange(nextRange)
            }}
            style={selectStyle()}
          />
        </label>
        <label style={{ display: 'grid', gap: '5px' }}>
          <span style={{ color: COLORS.muted, fontSize: '11px', fontWeight: 800, letterSpacing: '.03em' }}>END DATE</span>
          <input
            aria-label={`${heading || 'Report'} end date`}
            type="date"
            value={resolved.endDate}
            min={resolved.startDate}
            max={today}
            onChange={(event) => {
              const nextRange = buildCustomRange(resolved.startDate, event.target.value)
              if (nextRange) onChange(nextRange)
            }}
            style={selectStyle()}
          />
        </label>
      </div>
    </div>
  )
}

function ReportingPeriodPanel({ range, onRangeChange, compareEnabled, onCompareEnabledChange, comparisonRange, onComparisonRangeChange }) {
  const presets = [
    ['7d', '7 days'],
    ['30d', '30 days'],
    ['this_month', 'This month']
  ]
  const activePreset = parseCustomDateRange(range) ? null : range

  function toggleComparison(nextEnabled) {
    onCompareEnabledChange(nextEnabled)
    if (nextEnabled) onComparisonRangeChange(precedingReportRange(range))
  }

  return (
    <div style={{ ...cardStyle(), padding: '16px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <div>
          <div style={{ color: COLORS.green, fontSize: '15px', fontWeight: 900 }}>Reporting period</div>
          <div style={{ color: COLORS.muted, fontSize: '12px', marginTop: '4px' }}>Choose exact dates, then optionally compare against another exact period.</div>
        </div>
        <div className="report-preset-group" style={{ display: 'flex', gap: '6px', padding: '4px', borderRadius: '10px', background: COLORS.cream }}>
          {presets.map(([preset, label]) => (
            <button
              key={preset}
              type="button"
              onClick={() => onRangeChange(preset)}
              style={{
                border: 0,
                borderRadius: '8px',
                padding: '8px 11px',
                cursor: 'pointer',
                background: activePreset === preset ? COLORS.green : 'transparent',
                color: activePreset === preset ? COLORS.white : COLORS.green,
                fontSize: '12px',
                fontWeight: 800
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: compareEnabled ? 'repeat(auto-fit, minmax(min(100%, 290px), 1fr))' : 'minmax(0, 560px)', gap: '16px' }}>
        <ExactDateRange value={range} onChange={onRangeChange} heading="Selected period" />
        {compareEnabled ? (
          <div className="comparison-period-column" style={{ paddingLeft: '16px', borderLeft: `1px solid ${COLORS.line}` }}>
            <ExactDateRange value={comparisonRange} onChange={onComparisonRangeChange} heading="Comparison period" />
          </div>
        ) : null}
      </div>

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', marginTop: '14px', color: COLORS.green, fontSize: '13px', fontWeight: 900, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={compareEnabled}
          onChange={(event) => toggleComparison(event.target.checked)}
          style={{ accentColor: COLORS.green, width: '16px', height: '16px' }}
        />
        Compare with another date range
      </label>
    </div>
  )
}

function reportRangeLabel(value) {
  const custom = parseCustomDateRange(value)
  if (custom) return `${custom.startDate} to ${custom.endDate}`
  return { '7d': 'Last 7 days', '30d': 'Last 30 days', this_month: 'This month', max: 'Since promotion start' }[value] || value
}

function parseMetricValue(value, type) {
  if (value == null || value === '' || value === 'N/A') return null
  if (type === 'rate') {
    const parsed = Number.parseFloat(String(value).replace('%', ''))
    return Number.isFinite(parsed) ? parsed : null
  }
  return type === 'currency' ? parseSarString(value) : parseNumberString(value)
}

function PeriodComparison({ primary, comparison, primaryRange, comparisonRange }) {
  if (!primary || !comparison) return null
  const primaryCards = Array.isArray(primary.summaryCards) ? primary.summaryCards : []
  const comparisonCards = Array.isArray(comparison.summaryCards) ? comparison.summaryCards : []
  const definitions = [
    ['Total Spend', 'currency'], ['Impressions', 'number'], ['Clicks', 'number'], ['Leads', 'number'],
    ['Cost per Lead', 'currency'], ['Converted Leads', 'number'], ['Lead Conversion Rate', 'rate'],
    ['Cost per Converted Lead', 'currency']
  ]
  const rows = definitions.flatMap(([label, type]) => {
    const currentDisplay = getSummaryCardValue(primaryCards, label)
    const previousDisplay = getSummaryCardValue(comparisonCards, label)
    if (!currentDisplay && !previousDisplay) return []
    const current = parseMetricValue(currentDisplay, type)
    const previous = parseMetricValue(previousDisplay, type)
    let delta = 'N/A'
    if (current != null && previous != null) {
      if (type === 'rate') delta = `${current - previous >= 0 ? '+' : ''}${(current - previous).toFixed(2)} pp`
      else if (previous !== 0) {
        const change = ((current - previous) / Math.abs(previous)) * 100
        delta = `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
      }
    }
    return [{ label, currentDisplay: currentDisplay || 'N/A', previousDisplay: previousDisplay || 'N/A', delta }]
  })

  const comparisonInsights = [
    ['Leads', 'Lead volume', false],
    ['Cost per Lead', 'Cost efficiency', true],
    ['Total Spend', 'Investment', false]
  ].flatMap(([label, title, lowerIsBetter]) => {
    const row = rows.find((item) => item.label === label)
    const current = parseMetricValue(row?.currentDisplay, label === 'Cost per Lead' || label === 'Total Spend' ? 'currency' : 'number')
    const previous = parseMetricValue(row?.previousDisplay, label === 'Cost per Lead' || label === 'Total Spend' ? 'currency' : 'number')
    if (!row || current == null || previous == null || previous === 0) return []
    const change = ((current - previous) / Math.abs(previous)) * 100
    const favorable = lowerIsBetter ? change < 0 : label === 'Leads' ? change > 0 : null
    const description = label === 'Cost per Lead'
      ? `${Math.abs(change).toFixed(1)}% ${change <= 0 ? 'more efficient' : 'less efficient'} than the comparison period.`
      : label === 'Leads'
        ? `${Math.abs(change).toFixed(1)}% ${change >= 0 ? 'more' : 'fewer'} leads than the comparison period.`
        : `Spend was ${Math.abs(change).toFixed(1)}% ${change >= 0 ? 'higher' : 'lower'} than the comparison period.`
    return [{ title, description, favorable }]
  })

  return (
    <div style={{ ...cardStyle(), padding: '15px', marginBottom: '14px' }}>
      <SectionTitle title="Period comparison" subtitle={`${reportRangeLabel(primaryRange)} compared with ${reportRangeLabel(comparisonRange)}`} />
      {comparisonInsights.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '9px', marginBottom: '14px' }}>
          {comparisonInsights.map((insight) => (
            <div key={insight.title} style={{ padding: '11px 12px', borderRadius: '10px', background: insight.favorable == null ? COLORS.cream : insight.favorable ? COLORS.softGreen : COLORS.softAmber }}>
              <div style={{ color: COLORS.green, fontSize: '12px', fontWeight: 900 }}>{insight.title}</div>
              <div style={{ color: COLORS.text, fontSize: '12px', lineHeight: 1.45, marginTop: '4px' }}>{insight.description}</div>
            </div>
          ))}
        </div>
      ) : null}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '620px', fontSize: '13px' }}>
          <thead><tr style={{ color: COLORS.muted, textAlign: 'left' }}>
            {['Metric', 'Selected period', 'Comparison period', 'Change'].map((heading) => (
              <th key={heading} style={{ padding: '9px 8px', borderBottom: `1px solid ${COLORS.line}` }}>{heading}</th>
            ))}
          </tr></thead>
          <tbody>{rows.map((row) => (
            <tr key={row.label}>
              <td style={{ padding: '10px 8px', borderBottom: `1px solid ${COLORS.line}`, fontWeight: 800 }}>{metricLabel(row.label)}</td>
              <td style={{ padding: '10px 8px', borderBottom: `1px solid ${COLORS.line}` }}>{row.currentDisplay}</td>
              <td style={{ padding: '10px 8px', borderBottom: `1px solid ${COLORS.line}` }}>{row.previousDisplay}</td>
              <td style={{ padding: '10px 8px', borderBottom: `1px solid ${COLORS.line}`, fontWeight: 900 }}>{row.delta}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

const CLOUD_CHEFS_META_STORAGE_KEY = 'pwp:meta-import:cloud-chefs'

function loadStoredCloudChefsMetaImport() {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(CLOUD_CHEFS_META_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function storeCloudChefsMetaImport(value) {
  if (typeof window === 'undefined') return

  if (value) {
    window.localStorage.setItem(CLOUD_CHEFS_META_STORAGE_KEY, JSON.stringify(value))
  } else {
    window.localStorage.removeItem(CLOUD_CHEFS_META_STORAGE_KEY)
  }
}

function MetaCsvUploadPanel({ importedReport, status, onUpload, onClear }) {
  return (
    <div style={{ ...cardStyle(), padding: '15px 16px', marginBottom: '12px', borderLeft: '4px solid #244F7A' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '14px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ maxWidth: '670px' }}>
          <div style={{ color: COLORS.green, fontSize: '14px', fontWeight: 900 }}>
            Cloud Chefs Meta report
          </div>
          <div style={{ color: COLORS.muted, fontSize: '12px', lineHeight: 1.55, marginTop: '5px' }}>
            Export a CSV from Meta Ads Manager and upload it here. Include Reporting starts or Day,
            Amount spent, Reach, Impressions, Link clicks, Leads, and Messaging conversations started
            where available. Add breakdown columns such as Age, Gender, Country, Region, City, Device platform,
            Publisher platform, or Placement to generate audience insights. Uploaded figures are used in the
            dashboard cards, charts, PDF report, and Excel reports.
          </div>
          <div style={{ color: COLORS.amberDeep, fontSize: '12px', lineHeight: 1.45, marginTop: '6px' }}>
            The file stays in this browser and is not sent to a separate storage service.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ ...buttonStyle(true), display: 'inline-flex', alignItems: 'center' }}>
            Upload Meta CSV
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={onUpload}
              style={{ display: 'none' }}
            />
          </label>
          {importedReport ? (
            <button type="button" onClick={onClear} style={buttonStyle(false)}>
              Remove upload
            </button>
          ) : null}
        </div>
      </div>

      {importedReport ? (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 12px',
            borderRadius: '10px',
            background: COLORS.softGreen,
            color: COLORS.green,
            fontSize: '12px',
            fontWeight: 800,
            lineHeight: 1.5
          }}
        >
          Using {importedReport.fileName} · {importedReport.rowCount} rows · uploaded{' '}
          {new Date(importedReport.uploadedAt).toLocaleString()}
        </div>
      ) : null}

      {status ? (
        <div
          style={{
            marginTop: '10px',
            color: status.startsWith('Could not') ? COLORS.red : COLORS.green,
            fontSize: '12px',
            fontWeight: 800
          }}
        >
          {status}
        </div>
      ) : null}
    </div>
  )
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
  Reach: 'Reach (الوصول)',
  Impressions: 'Impressions (الظهور)',
  Clicks: 'Clicks (النقرات)',
  CTR: 'CTR (معدل النقر)',
  Results: 'Leads (العملاء المحتملون)',
  Conversions: 'Leads (العملاء المحتملون)',
  Leads: 'Leads (العملاء المحتملون)',
  'Form Submissions': 'Form submissions (إرسال النماذج)',
  'Direct Messages': 'Direct messages (الرسائل المباشرة)',
  'Website Leads': 'Website leads (عملاء الموقع)',
  'WhatsApp Leads': 'WhatsApp leads (عملاء واتساب)',
  'Cost per Lead': 'Cost per lead (تكلفة العميل المحتمل)',
  'Lead Rate': 'Lead rate (معدل العملاء المحتملين)',
  Frequency: 'Frequency (التكرار)',
  'Platforms Active': 'Platforms active (المنصات النشطة)',
  Spend: 'Spend (الإنفاق)',
  CPA: 'Cost per lead (تكلفة العميل المحتمل)',
  CPC: 'CPC (تكلفة النقرة)',
  Platform: 'Platform',
  Campaign: 'Campaign',
  'Spend share': 'Spend share (حصة الإنفاق)',
  'Click share': 'Click share (حصة النقرات)',
  'Conversion share': 'Lead share (حصة العملاء المحتملين)',
  'Result share': 'Lead share (حصة العملاء المحتملين)'
}

function metricLabel(label) {
  return METRIC_LABELS[label] || label
}

function StatusBanner({ text }) {
  return (
    <div style={panelStyle()}>
      <SectionTitle
        title="Next action"
        subtitle="Recommended focus based on confirmed form submissions and direct messages."
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
    ['leads', 'Form submissions'],
    ['messagingConversations', 'Direct messages'],
    ['purchases', 'Purchases'],
    ['registrations', 'Registrations']
  ]

  return labels
    .map(([key, label]) => [label, Number(breakdown[key] || 0)])
    .filter(([, value]) => value > 0)
    .map(([label, value]) => `${label}: ${value.toLocaleString()}`)
    .join(' · ')
}

function objectEntries(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value)
}

function stringifyDetail(value) {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  return JSON.stringify(value)
}

function getSummaryCardValue(summaryCards, label) {
  const cards = Array.isArray(summaryCards) ? summaryCards : []
  const direct = cards.find((card) => card.label === label)?.value
  if (direct != null) return direct
  if (label === 'Results') {
    return cards.find((card) => card.label === 'Conversions')?.value ||
      cards.find((card) => card.label === 'Leads')?.value ||
      ''
  }
  if (label === 'Conversions') {
    return cards.find((card) => card.label === 'Results')?.value ||
      cards.find((card) => card.label === 'Leads')?.value ||
      ''
  }
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

      {quality.currencyWarning || quality.conversionWarning || quality.currencyConversionNotes?.length ? (
        <div style={{ display: 'grid', gap: '6px', marginTop: '10px' }}>
          {quality.currencyWarning ? (
            <div style={{ color: COLORS.amberDeep, fontSize: '12px', lineHeight: 1.45 }}>{quality.currencyWarning}</div>
          ) : null}
          {Array.isArray(quality.currencyConversionNotes) && quality.currencyConversionNotes.length ? (
            <div style={{ color: COLORS.muted, fontSize: '12px', lineHeight: 1.45 }}>
              {quality.currencyConversionNotes.slice(0, 4).join(' ')}
              {quality.currencyConversionNotes.length > 4 ? ' More conversion notes are included in the Excel export.' : ''}
            </div>
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
                {account.spendNote ? (
                  <div style={{ color: COLORS.amberDeep, fontSize: '12px', marginTop: '6px', lineHeight: 1.45 }}>
                    {account.spendNote}
                  </div>
                ) : null}
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

function FunnelHero({ reach, clicks, conversions, convertedCount, compact = false }) {
  const clickOfReach = reach > 0 ? (clicks / reach) * 100 : 0
  const resultOfReach = reach > 0 ? (conversions / reach) * 100 : 0
  const resultOfClicks = clicks > 0 ? (conversions / clicks) * 100 : 0
  const hasConvertedStage = convertedCount != null
  const converted = Number(convertedCount || 0)
  const convertedOfLeads = conversions > 0 ? (converted / conversions) * 100 : 0

  const rows = [
    {
      label: metricLabel('Reach'),
      value: reach.toLocaleString(),
      width: 100,
      color: COLORS.green,
      topRight: '100%',
      showInsidePercent: true
    },
    {
      label: metricLabel('Clicks'),
      value: clicks.toLocaleString(),
      width: Math.max(clickOfReach, clicks > 0 ? 6 : 0),
      color: COLORS.greenMid,
      topRight: `Click-to-reach ${percent(clickOfReach)}`
    },
    {
      label: metricLabel('Results'),
      value: conversions.toLocaleString(),
      width: Math.max(resultOfClicks, conversions > 0 ? 4 : 0),
      color: COLORS.greenLight,
      topRight: `${percent(resultOfReach)} of reach · Click-to-lead ${percent(resultOfClicks)}`
    },
    ...(hasConvertedStage
      ? [{
          label: 'Converted leads',
          value: converted.toLocaleString(),
          width: Math.max(convertedOfLeads, converted > 0 ? 4 : 0),
          color: COLORS.amber,
          topRight: `${percent(convertedOfLeads)} of leads converted`
        }]
      : [])
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

async function downloadValueReport(data) {
  const response = await fetch('/api/value-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error || 'Unable to generate the value report.')
  }

  const blob = await response.blob()
  const disposition = response.headers.get('content-disposition') || ''
  const matchedName = disposition.match(/filename="([^"]+)"/i)
  const fallbackClient = String(data?.client?.name || 'client').replace(/[^\w.-]+/g, '-')
  const fileName = matchedName?.[1] || `value-report-${fallbackClient}.docx`
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function SummaryBlock({
  text,
  onChange,
  onReset,
  onExport,
  onValueReport = null,
  valueReportLoading = false
}) {
  return (
    <div style={panelStyle()}>
      <SectionTitle
        title="Suggested insight"
        subtitle="Positive client-ready wording you can edit before sharing."
        right={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={onReset} style={buttonStyle(false)}>Reset insight</button>
            <button onClick={onExport} style={buttonStyle(true)}>Share as PDF</button>
            {onValueReport ? (
              <button onClick={onValueReport} disabled={valueReportLoading} style={buttonStyle(false)}>
                {valueReportLoading ? 'Preparing Word...' : 'Value report (Word)'}
              </button>
            ) : null}
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
          {item.name.toLowerCase().includes('conversion rate')
            ? `${Number(item.value).toFixed(2)}%`
            : item.name.toLowerCase().includes('spend') || item.name.toLowerCase().includes('cpa')
            ? formatSar(item.value)
            : Number(item.value).toLocaleString()}
        </div>
      ))}
    </div>
  )
}

function TrendCharts({ daily, targetCPA, compact = false }) {
  const hasDaily = Array.isArray(daily) && daily.length > 0
  const hasConversionRate = hasDaily && daily.some((row) => row.conversionRate != null)
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
          title="Spend vs. leads over time"
          subtitle="Green bars for spend, amber line for completed forms and new conversations."
        />
        {!hasDaily ? (
          <EmptyState
            title="Daily trend will appear once reporting returns dates"
            text="The dashboard still shows the period totals above. When the platform sends daily lead data, this chart will show how spend and leads moved over time."
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
          title="Cost per lead trend"
          subtitle="Trending down is good."
        />
        {!hasDaily ? (
          <EmptyState
            title="Lead-cost trend will appear with daily reporting"
            text="Once daily lead data is available, this chart will show whether form and messaging efficiency is improving."
          />
        ) : !daily.some((row) => row.cpa != null) ? (
          <EmptyState
            title="Cost per lead will appear after the first lead"
            text="Current activity is creating reach and clicks. Once a completed form or new conversation is recorded, this chart will show lead-cost trends."
          />
        ) : (
          <div style={{ width: '100%', height: compact ? 220 : 300 }}>
            <ResponsiveContainer>
              <ComposedChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEE4D4" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: COLORS.muted }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: COLORS.muted }} />
                {hasConversionRate ? (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12, fill: COLORS.muted }}
                    tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
                  />
                ) : null}
                <Tooltip content={<SimpleTooltipValue />} />
                <Legend />
                <defs>
                  <linearGradient id="cpaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={COLORS.green} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="cpa"
                  name={metricLabel('CPA')}
                  stroke={COLORS.green}
                  fill="url(#cpaFill)"
                  strokeWidth={3}
                />
                {hasConversionRate ? (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="conversionRate"
                    name="Conversion rate"
                    stroke={COLORS.amberDeep}
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                  />
                ) : null}
                {actualTargetCPA ? (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey={() => actualTargetCPA}
                    name="Target CPA (هدف تكلفة التحويل)"
                    stroke={COLORS.amber}
                    strokeDasharray="8 6"
                    dot={false}
                    strokeWidth={2}
                  />
                ) : null}
              </ComposedChart>
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
        subtitle="How each platform contributes to spend, clicks, and form or message leads."
      />

      {platforms.length === 0 ? (
        <EmptyState
          title="Platform contribution will appear when lead data is available"
          text="This section will show how spend, clicks, and leads are split across each channel."
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
  const hasConversionData = rows.some((row) => row.convertedCount != null)
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
              {hasConversionData ? <th style={{ padding: '12px 8px' }}>Converted</th> : null}
              {hasConversionData ? <th style={{ padding: '12px 8px' }}>Cost per converted lead</th> : null}
            </tr>
          </thead>
          <tbody>
            {platformPerformanceRows.length === 0 ? (
              <tr>
                <td colSpan={hasConversionData ? 9 : 7} style={{ padding: '18px 8px' }}>
                  <EmptyState
                    title="Advanced table will appear when platform rows are available"
                    text="Once lead data is returned, this optional view will list spend, clicks, CTR, CPC, leads, and cost per lead in one place."
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
                  {hasConversionData ? (
                    <td style={{ padding: '14px 8px' }}>
                      {row.convertedCount != null ? Number(row.convertedCount).toLocaleString() : 'N/A'}
                    </td>
                  ) : null}
                  {hasConversionData ? (
                    <td style={{ padding: '14px 8px' }}>
                      {row.costPerConvertedLead != null ? formatSar(row.costPerConvertedLead) : 'N/A'}
                    </td>
                  ) : null}
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
                  <strong style={{ color: COLORS.green }}>{row.platform} lead breakdown:</strong>{' '}
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

    return `This period, ${spendText} was spent to generate ${impressionText} impressions and ${clicksText} clicks, but no completed forms or new direct messages were recorded. Confirm lead tracking before scaling spend.`
  }

  return `This period, ${spendText} was spent to generate ${impressionText} impressions, ${clicksText} clicks, and ${totalConversions.toLocaleString()} leads from completed forms or new direct messages. Compare cost per lead against the target before scaling.`
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
      targetCPA: Number(row.targetCPA || 0),
      ...(row.convertedCount != null
        ? {
            convertedCount: Number(row.convertedCount || 0),
            conversionRate: row.conversionRate == null ? null : Number(row.conversionRate)
          }
        : {})
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
      ['Platform', 'Campaign or account', 'Spend SAR', 'Original spend', 'Original currency', 'Conversion rate to SAR', 'Spend note', 'Clicks', 'Leads', 'Form submissions', 'Direct messages'],
      ...campaignRows.map((row) => [
        row.platform,
        row.campaign,
        parseSarString(row.spend),
        row.originalSpend || '',
        row.originalCurrencyCode || 'SAR',
        row.spendConversionRate || '',
        row.spendNote || '',
        parseNumberString(row.clicks),
        row.conversions === 'N/A' ? '' : parseNumberString(row.conversions),
        Number(row.formSubmissions || 0),
        Number(row.directMessages || 0)
      ])
    ]),
    excelSheet('Platform totals', [
      ['Platform', 'Spend SAR', 'Leads', 'Form submissions', 'Direct messages'],
      ...Object.entries(platformSplit).map(([platformKey, value]) => [
        platformKey.replace(/_/g, ' '),
        parseSarString(value?.spend),
        value?.conversions === 'N/A' ? '' : parseNumberString(value?.conversions),
        Number(value?.formSubmissions || 0),
        Number(value?.directMessages || 0)
      ])
    ]),
    excelSheet('Daily trend', [
      ['Date', 'Spend SAR', 'Leads', 'Cost per lead SAR'],
      ...dailyChartData.map((row) => [
        row.date,
        row.spend,
        row.conversions,
        row.cpa == null ? '' : row.cpa
      ])
    ]),
    excelSheet('Audience insights', [
      ['Platform', 'Account or campaign', 'Dimension', 'Segment', 'Spend SAR', 'Reach', 'Impressions', 'Clicks', 'Leads'],
      ...collectAudienceBreakdowns(data).map((row) => [
        row.platform,
        row.accountName,
        row.dimension,
        row.segment,
        row.spend,
        row.reach,
        row.impressions,
        row.clicks,
        row.leads
      ])
    ])
  ]

  saveExcelWorkbook(title, sheets)
}

function downloadAgencyExcelWorkbook({ title, clientReports, range }) {
  const generatedAt = new Date().toLocaleString()
  const overviewRows = [
    ['Client account workbook', title],
    ['Date range', range],
    ['Generated at', generatedAt],
    ['Clients included', clientReports.length],
    [],
    ['Client', 'Spend SAR', 'Reach', 'Impressions', 'Clicks', 'Leads', 'Platforms active']
  ]

  const accountRows = [['Client', 'Platform', 'Account name', 'Account ID', 'Account group', 'Status', 'Message', 'Spend SAR', 'Original spend', 'Original currency', 'Conversion rate to SAR', 'Spend note', 'Reach', 'Impressions', 'Clicks', 'Engagements', 'Video views', 'Leads', 'Lead type', 'Lead breakdown']]
  const platformRows = [['Client', 'Platform', 'Campaign or account', 'Spend SAR', 'Original spend', 'Original currency', 'Conversion rate to SAR', 'Spend note', 'Reach', 'Clicks', 'Engagements', 'Video views', 'Leads', 'Lead type', 'Lead breakdown']]
  const platformTotals = [['Client', 'Platform', 'Spend SAR', 'Leads']]
  const dailyRows = [['Client', 'Date', 'Spend SAR', 'Leads', 'Cost per lead SAR']]
  const insightRows = [['Client', 'Insight', 'Next action']]
  const currencyRows = [['Client', 'Account or row', 'Spend SAR', 'Original spend', 'Original currency', 'Conversion rate to SAR', 'Spend note']]
  const detailRows = [['Client', 'Platform', 'Account or campaign', 'Spend SAR', 'Reach', 'Impressions', 'Clicks', 'Engagements', 'Video views', 'CTR', 'CPC SAR', 'Leads', 'Lead type', 'Original currency']]
  const actionRows = [['Client', 'Platform', 'Account or campaign', 'Action', 'Value']]
  const engagementRows = [['Client', 'Platform', 'Account or campaign', 'Engagement metric', 'Value']]
  const rawMetricRows = [['Client', 'Platform', 'Account or campaign', 'Metric', 'Value']]
  const accountDailyRows = [['Client', 'Platform', 'Account or campaign', 'Date', 'Spend SAR', 'Leads', 'Cost per lead SAR']]
  const tiktokChunkRows = [['Client', 'Account or campaign', 'Start date', 'End date', 'Spend SAR', 'Reach', 'Impressions', 'Clicks', 'Engagements', 'Video views', 'CTR', 'CPC SAR', 'Leads']]
  const googleKeywordRows = [['Client', 'Account or campaign', 'Keyword', 'Spend SAR', 'Impressions', 'Clicks', 'CTR', 'Average CPC SAR', 'Results', 'Cost per result SAR', 'Quality score']]
  const googleSearchTermRows = [['Client', 'Account or campaign', 'Search term', 'Spend SAR', 'Impressions', 'Clicks', 'CTR', 'Average CPC SAR', 'Results', 'Cost per result SAR']]
  const googleVisibilityRows = [['Client', 'Account or campaign', 'Metric', 'Value']]
  const audienceRows = [['Client', 'Platform', 'Account or campaign', 'Audience breakdown', 'Value', 'Note']]
  const diagnosticRows = [['Client', 'Area', 'Detail']]

  clientReports.forEach(({ client, payload }) => {
    const summaryCards = Array.isArray(payload.summaryCards) ? payload.summaryCards : []
    const campaigns = Array.isArray(payload.campaignRows) ? payload.campaignRows : []
    const daily = buildDailyChartData(payload)
    const platformSplit = payload.platformSplit || {}
    const exportRows = Array.isArray(payload.exportRows) ? payload.exportRows : []
    const accounts = Array.isArray(payload.accountOptions) ? payload.accountOptions : []
    const statuses = Array.isArray(payload.accountStatuses) ? payload.accountStatuses : []
    const statusById = new Map(statuses.map((status) => [status.id, status]))
    const accountExportRows = statuses.length
      ? statuses
      : accounts.map((account) => ({ ...account, ...(statusById.get(account.id) || {}) }))
    const clientName = payload.client?.name || client.name

    overviewRows.push([
      clientName,
      parseSarString(summaryCards.find((card) => card.label === 'Total Spend')?.value),
      parseNumberString(getSummaryCardValue(summaryCards, 'Reach')),
      parseNumberString(summaryCards.find((card) => card.label === 'Impressions')?.value),
      parseNumberString(summaryCards.find((card) => card.label === 'Clicks')?.value),
      parseNumberString(getSummaryCardValue(summaryCards, 'Results')),
      parseNumberString(summaryCards.find((card) => card.label === 'Platforms Active')?.value)
    ])

    accountExportRows.forEach((account) => {
      const status = statusById.get(account.id) || account
      accountRows.push([
        clientName,
        account.platformLabel || status.platformLabel || '',
        account.accountName || status.accountName || '',
        account.accountId || status.accountId || '',
        account.clientName || status.clientName || '',
        status.status || '',
        status.message || '',
        Number(status.spend || 0),
        Number(status.originalSpend || 0),
        status.originalCurrencyCode || status.currencyCode || '',
        status.spendConversionRate || '',
        status.spendNote || '',
        Number(status.reach || 0),
        Number(status.impressions || 0),
        Number(status.clicks || 0),
        Number(status.engagements || 0),
        Number(status.videoViews || 0),
        Number(status.conversions || 0),
        status.conversionLabel || '',
        formatConversionBreakdown(status.conversionBreakdown)
      ])

      if (status.spendNote) {
        currencyRows.push([
          clientName,
          account.accountName || status.accountName || account.accountId || status.accountId || '',
          Number(status.spend || 0),
          Number(status.originalSpend || 0),
          status.originalCurrencyCode || status.currencyCode || '',
          status.spendConversionRate || '',
          status.spendNote
        ])
      }
    })

    campaigns.forEach((row) => {
      platformRows.push([
        clientName,
        row.platform,
        row.campaign,
        parseSarString(row.spend),
        row.originalSpend || '',
        row.originalCurrencyCode || 'SAR',
        row.spendConversionRate || '',
        row.spendNote || '',
        row.reach === 'N/A' ? '' : parseNumberString(row.reach),
        parseNumberString(row.clicks),
        parseNumberString(row.engagements),
        parseNumberString(row.videoViews),
        row.conversions === 'N/A' ? '' : parseNumberString(row.conversions),
        row.conversionLabel || '',
        formatConversionBreakdown(row.conversionBreakdown)
      ])

      if (row.spendNote) {
        currencyRows.push([
          clientName,
          row.campaign,
          parseSarString(row.spend),
          row.originalSpend || '',
          row.originalCurrencyCode || 'SAR',
          row.spendConversionRate || '',
          row.spendNote
        ])
      }
    })

    exportRows.forEach((row) => {
      detailRows.push([
        clientName,
        row.platform,
        row.accountName,
        Number(row.spendSar || 0),
        row.reach == null ? '' : Number(row.reach || 0),
        Number(row.impressions || 0),
        Number(row.clicks || 0),
        Number(row.engagements || 0),
        Number(row.videoViews || 0),
        Number(row.ctr || 0),
        Number(row.cpcSar || 0),
        Number(row.results || 0),
        row.resultType || '',
        row.originalCurrencyCode || 'SAR'
      ])

      objectEntries(row.resultBreakdown).forEach(([action, value]) => {
        actionRows.push([
          clientName,
          row.platform,
          row.accountName,
          action,
          Number(value || 0)
        ])
      })

      objectEntries(row.engagementBreakdown).forEach(([metric, value]) => {
        engagementRows.push([
          clientName,
          row.platform,
          row.accountName,
          metric,
          Number(value || 0)
        ])
      })

      if (Number(row.engagements || 0) > 0 && !objectEntries(row.engagementBreakdown).length) {
        engagementRows.push([
          clientName,
          row.platform,
          row.accountName,
          'engagements',
          Number(row.engagements || 0)
        ])
      }

      if (Number(row.videoViews || 0) > 0 && !objectEntries(row.engagementBreakdown).some(([metric]) => metric === 'videoViews')) {
        engagementRows.push([
          clientName,
          row.platform,
          row.accountName,
          'videoViews',
          Number(row.videoViews || 0)
        ])
      }

      objectEntries(row.rawMetrics).forEach(([metric, value]) => {
        if (metric === 'actions' && Array.isArray(value)) {
          value.forEach((action) => {
            actionRows.push([
              clientName,
              row.platform,
              row.accountName,
              action.action_type || '',
              Number(action.value || 0)
            ])
          })
          return
        }

        rawMetricRows.push([
          clientName,
          row.platform,
          row.accountName,
          metric,
          stringifyDetail(value)
        ])
      })

      const spendRate = Number(row.spendConversionRate || 1)
      ;(row.daily || []).forEach((day) => {
        const spendSar = Number(day.spend || 0) * spendRate
        const results = Number(day.conversions || 0)
        accountDailyRows.push([
          clientName,
          row.platform,
          row.accountName,
          day.date || '',
          spendSar,
          results,
          results > 0 ? spendSar / results : ''
        ])
      })

      ;(row.tiktok?.chunks || []).forEach((chunk) => {
        const metrics = chunk.metrics || {}
        tiktokChunkRows.push([
          clientName,
          row.accountName,
          chunk.start_date || '',
          chunk.end_date || '',
          Number(metrics.spend || 0) * spendRate,
          Number(metrics.reach || 0),
          Number(metrics.impressions || 0),
          Number(metrics.clicks || 0),
          Number(metrics.engagements || 0),
          Number(metrics.video_play_actions || 0),
          Number(metrics.ctr || 0),
          Number(metrics.cpc || 0) * spendRate,
          Number(metrics.formSubmissions || 0) + Number(metrics.directMessages || 0)
        ])
      })

      ;(row.google?.tables?.keywords || []).forEach((keyword) => {
        googleKeywordRows.push([
          clientName,
          row.accountName,
          keyword.keyword || keyword.text || '',
          Number(keyword.spend || keyword.cost || 0),
          Number(keyword.impressions || 0),
          Number(keyword.clicks || 0),
          Number(keyword.ctr || 0),
          Number(keyword.avgCpc || keyword.averageCpc || 0),
          Number(keyword.conversions || 0),
          Number(keyword.cpa || keyword.costPerConversion || 0),
          keyword.qualityScore ?? ''
        ])
      })

      ;(row.google?.tables?.searchTerms || []).forEach((term) => {
        googleSearchTermRows.push([
          clientName,
          row.accountName,
          term.searchTerm || term.search_term || '',
          Number(term.spend || term.cost || 0),
          Number(term.impressions || 0),
          Number(term.clicks || 0),
          Number(term.ctr || 0),
          Number(term.avgCpc || term.averageCpc || (Number(term.clicks || 0) > 0 ? Number(term.cost || 0) / Number(term.clicks || 0) : 0)),
          Number(term.conversions || 0),
          Number(term.cpa || term.costPerConversion || 0)
        ])
      })

      objectEntries(row.google?.visibility).forEach(([metric, value]) => {
        googleVisibilityRows.push([
          clientName,
          row.accountName,
          metric,
          value == null ? '' : value
        ])
      })
    })

    const clientAudienceRows = collectAudienceBreakdowns(payload)
    clientAudienceRows.forEach((row) => {
      audienceRows.push([
        clientName,
        row.platform,
        row.accountName,
        `${row.dimension}: ${row.segment}`,
        row.impressions || row.reach || row.clicks || row.leads || 0,
        `Spend SAR ${row.spend.toFixed(2)} · Reach ${row.reach} · Impressions ${row.impressions} · Clicks ${row.clicks} · Leads ${row.leads}`
      ])
    })

    if (!clientAudienceRows.length) {
      audienceRows.push([
        clientName,
        'All',
        payload.client?.name || client.name,
        '',
        '',
        'Audience age, gender, location, placement, and interest breakdowns are not returned by the current platform reporting calls yet.'
      ])
    }

    Object.entries(platformSplit).forEach(([platformKey, value]) => {
      platformTotals.push([
        clientName,
        platformKey.replace(/_/g, ' '),
        parseSarString(value?.spend),
        value?.conversions === 'N/A' ? '' : parseNumberString(value?.conversions)
      ])
    })

    daily.forEach((row) => {
      dailyRows.push([
        clientName,
        row.date,
        row.spend,
        row.conversions,
        row.cpa == null ? '' : row.cpa
      ])
    })

    insightRows.push([
      clientName,
      payload.insights?.suggested || '',
      payload.insights?.nextAction || ''
    ])

    Object.entries(payload.diagnostics || {}).forEach(([area, detail]) => {
      diagnosticRows.push([
        clientName,
        area,
        detail == null ? '' : JSON.stringify(detail)
      ])
    })
  })

  saveExcelWorkbook(title, [
    excelSheet('Agency overview', overviewRows),
    excelSheet('All accounts', accountRows),
    excelSheet('Platform rows', platformRows),
    excelSheet('Platform totals', platformTotals),
    excelSheet('Daily trends', dailyRows),
    excelSheet('Account daily details', accountDailyRows),
    excelSheet('Detailed metrics', detailRows),
    excelSheet('Action breakdown', actionRows),
    excelSheet('Engagement and video', engagementRows),
    excelSheet('Raw metrics', rawMetricRows),
    excelSheet('TikTok chunks', tiktokChunkRows),
    excelSheet('Google keywords', googleKeywordRows),
    excelSheet('Google search terms', googleSearchTermRows),
    excelSheet('Google visibility', googleVisibilityRows),
    excelSheet('Audience breakdown', audienceRows),
    excelSheet('Currency notes', currencyRows),
    excelSheet('Insights', insightRows),
    excelSheet('Diagnostics', diagnosticRows)
  ])
}

const CUSTOM_REPORT_METRICS = [
  { id: 'spend', label: 'Spend', summaryLabel: 'Total Spend' },
  { id: 'reach', label: 'Reach', summaryLabel: 'Reach' },
  { id: 'impressions', label: 'Impressions', summaryLabel: 'Impressions' },
  { id: 'clicks', label: 'Clicks', summaryLabel: 'Clicks' },
  { id: 'engagements', label: 'Engagements' },
  { id: 'videoViews', label: 'Video views' },
  { id: 'ctr', label: 'CTR', summaryLabel: 'CTR' },
  { id: 'conversions', label: 'Leads', summaryLabel: 'Leads' },
  { id: 'cpc', label: 'Cost per click' },
  { id: 'cpa', label: 'Cost per lead' }
]

const CUSTOM_RESULT_DEFINITIONS = [
  { id: 'all', label: 'All leads' },
  { id: 'forms', label: 'Form submissions' },
  { id: 'messages', label: 'Direct messages' }
]

function getRowResultValue(row, resultDefinition = 'all') {
  if (resultDefinition === 'forms') return Number(row?.formSubmissions || 0)
  if (resultDefinition === 'messages') return Number(row?.directMessages || 0)

  return row?.conversions === 'N/A' ? 0 : parseNumberString(row?.conversions)
}

function getResultDefinitionLabel(resultDefinition) {
  return CUSTOM_RESULT_DEFINITIONS.find((item) => item.id === resultDefinition)?.label || 'All leads'
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
    if (card.label === 'Leads' || card.label === 'Results' || card.label === 'Conversions') {
      return { ...card, label: 'Leads', value: totalResults.toLocaleString() }
    }
    return card
  })

  if (!summaryCards.some((card) => card.label === 'Leads')) {
    summaryCards.push({ label: 'Leads', value: totalResults.toLocaleString() })
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
  if (metricId === 'engagements') {
    return (data?.exportRows || []).reduce((sum, row) => sum + Number(row.engagements || 0), 0).toLocaleString()
  }
  if (metricId === 'videoViews') {
    return (data?.exportRows || []).reduce((sum, row) => sum + Number(row.videoViews || 0), 0).toLocaleString()
  }

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
      label: 'Lead rate over target',
      value: `${resultRate.toFixed(2)}%`,
      target: 'Target 3.00%+',
      note: 'Clicks are turning into completed forms or direct messages at a healthy rate.'
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
      label: 'Cost per lead under target',
      value: formatSar(cpa),
      target: 'Target SAR 50.00 or lower',
      note: 'Leads are being generated at an efficient cost level.'
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

function collectAudienceBreakdowns(data) {
  return (Array.isArray(data?.exportRows) ? data.exportRows : []).flatMap((row) => (
    (Array.isArray(row.audienceBreakdown) ? row.audienceBreakdown : [])
      .filter((item) => item?.dimension && item?.segment)
      .map((item) => ({
        platform: row.platform || 'Platform',
        accountName: row.accountName || 'Account',
        dimension: String(item.dimension),
        segment: String(item.segment),
        spend: Number(item.spend || 0),
        reach: Number(item.reach || 0),
        impressions: Number(item.impressions || 0),
        clicks: Number(item.clicks || 0),
        leads: Number(item.leads || 0),
        formSubmissions: Number(item.formSubmissions || 0),
        directMessages: Number(item.directMessages || 0)
      }))
  ))
}

function summarizeAudienceBreakdowns(data) {
  const grouped = new Map()
  collectAudienceBreakdowns(data).forEach((row) => {
    const key = `${row.dimension}\u0000${row.segment}`
    const current = grouped.get(key) || {
      dimension: row.dimension,
      segment: row.segment,
      spend: 0,
      reach: 0,
      impressions: 0,
      clicks: 0,
      leads: 0
    }
    current.spend += row.spend
    current.reach += row.reach
    current.impressions += row.impressions
    current.clicks += row.clicks
    current.leads += row.leads
    grouped.set(key, current)
  })
  return Array.from(grouped.values())
}

function AudienceActionInsights({ data }) {
  const rows = Array.isArray(data?.campaignRows) ? data.campaignRows : []
  const statuses = Array.isArray(data?.accountStatuses) ? data.accountStatuses : []
  const audienceRows = summarizeAudienceBreakdowns(data)
  const hasConversionData = rows.some((row) => row.convertedCount != null)
  const bestByResults = hasConversionData
    ? [...rows]
        .filter((row) => row.conversionRate != null)
        .sort((a, b) => (
          Number(b.conversionRate || 0) - Number(a.conversionRate || 0) ||
          Number(a.costPerConvertedLead ?? Number.POSITIVE_INFINITY) - Number(b.costPerConvertedLead ?? Number.POSITIVE_INFINITY)
        ))[0]
    : [...rows]
        .filter((row) => row.conversions !== 'N/A')
        .sort((a, b) => parseNumberString(b.conversions) - parseNumberString(a.conversions))[0]
  const bestByClicks = [...rows]
    .sort((a, b) => parseNumberString(b.clicks) - parseNumberString(a.clicks))[0]
  const actionBreakdowns = statuses
    .map((account) => ({
      account,
      text: formatConversionBreakdown(account.conversionBreakdown)
    }))
    .filter((item) => item.text)
  const audienceGroups = audienceRows.reduce((groups, row) => {
    if (!groups[row.dimension]) groups[row.dimension] = []
    groups[row.dimension].push(row)
    return groups
  }, {})
  const strongestAudience = [...audienceRows].sort((a, b) => (
    b.leads - a.leads ||
    b.clicks - a.clicks ||
    b.impressions - a.impressions ||
    b.reach - a.reach
  ))[0]

  return (
    <div style={panelStyle()}>
      <SectionTitle
        title="Audience and action insights"
        subtitle="Signals from the selected accounts and available platform action data."
      />

      <div style={{ display: 'grid', gap: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '10px' }}>
          <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: '10px', padding: '12px', background: '#FBFAF7' }}>
            <div style={{ color: COLORS.muted, fontSize: '12px', fontWeight: 800 }}>
              {hasConversionData ? 'Strongest converting source' : 'Strongest lead source'}
            </div>
            <div style={{ color: COLORS.green, fontWeight: 900, marginTop: '5px' }}>
              {bestByResults
                ? `${bestByResults.platform} · ${bestByResults.campaign}`
                : hasConversionData
                  ? 'Not enough converted-lead data yet'
                  : 'Not enough lead data yet'}
            </div>
          </div>
          <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: '10px', padding: '12px', background: '#FBFAF7' }}>
            <div style={{ color: COLORS.muted, fontSize: '12px', fontWeight: 800 }}>Strongest traffic source</div>
            <div style={{ color: COLORS.green, fontWeight: 900, marginTop: '5px' }}>
              {bestByClicks ? `${bestByClicks.platform} · ${bestByClicks.campaign}` : 'Not enough click data yet'}
            </div>
          </div>
          <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: '10px', padding: '12px', background: '#FBFAF7' }}>
            <div style={{ color: COLORS.muted, fontSize: '12px', fontWeight: 800 }}>Strongest audience segment</div>
            <div style={{ color: COLORS.green, fontWeight: 900, marginTop: '5px' }}>
              {strongestAudience
                ? `${strongestAudience.dimension} · ${strongestAudience.segment}`
                : 'Upload a report with audience breakdown columns'}
            </div>
          </div>
        </div>

        {audienceRows.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '10px' }}>
            {Object.entries(audienceGroups).map(([dimension, dimensionRows]) => {
              const sortedRows = [...dimensionRows]
                .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks || b.leads - a.leads)
                .slice(0, 6)
              const totalImpressions = dimensionRows.reduce((sum, row) => sum + row.impressions, 0)
              const totalReach = dimensionRows.reduce((sum, row) => sum + row.reach, 0)
              const totalClicks = dimensionRows.reduce((sum, row) => sum + row.clicks, 0)
              const shareBase = totalImpressions || totalReach || totalClicks || 1

              return (
                <div key={dimension} style={{ border: `1px solid ${COLORS.line}`, borderRadius: '12px', padding: '12px', background: '#FBFAF7' }}>
                  <div style={{ color: COLORS.green, fontWeight: 900, fontSize: '14px', marginBottom: '10px' }}>{dimension}</div>
                  <div style={{ display: 'grid', gap: '9px' }}>
                    {sortedRows.map((row) => {
                      const shareValue = row.impressions || row.reach || row.clicks
                      const share = Math.min(100, (shareValue / shareBase) * 100)
                      return (
                        <div key={`${dimension}-${row.segment}`}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '12px' }}>
                            <span style={{ color: COLORS.text, fontWeight: 800 }}>{row.segment}</span>
                            <span style={{ color: COLORS.muted }}>
                              {share.toFixed(1)}% · {row.clicks.toLocaleString()} clicks · {row.leads.toLocaleString()} leads
                            </span>
                          </div>
                          <div style={{ height: '7px', borderRadius: '999px', background: '#E9E3D6', overflow: 'hidden', marginTop: '5px' }}>
                            <div style={{ width: `${share}%`, height: '100%', background: COLORS.greenMid, borderRadius: '999px' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            title="Audience breakdowns are ready for import"
            text="Upload a Meta CSV containing Age, Gender, Country, Region, City, Device platform, Publisher platform, or Placement columns. The dashboard will chart the available segments automatically."
          />
        )}

        {actionBreakdowns.length ? (
          <div style={{ display: 'grid', gap: '8px' }}>
            {actionBreakdowns.map(({ account, text }) => (
              <div key={account.id} style={{ color: COLORS.text, fontSize: '13px', lineHeight: 1.5, padding: '10px', border: `1px solid ${COLORS.line}`, borderRadius: '10px' }}>
                <strong style={{ color: COLORS.green }}>{account.accountName}:</strong> {text}
              </div>
            ))}
          </div>
        ) : null}
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
      ['Platform', 'Campaign or account', 'Spend SAR', 'Original spend', 'Original currency', 'Conversion rate to SAR', 'Spend note', 'Reach', 'Clicks', 'Leads', 'Form submissions', 'Direct messages'],
      ...campaignRows.map((row) => [
        row.platform,
        row.campaign,
        parseSarString(row.spend),
        row.originalSpend || '',
        row.originalCurrencyCode || 'SAR',
        row.spendConversionRate || '',
        row.spendNote || '',
        row.reach === 'N/A' ? '' : parseNumberString(row.reach),
        parseNumberString(row.clicks),
        row.conversions === 'N/A' ? '' : parseNumberString(row.conversions),
        Number(row.formSubmissions || 0),
        Number(row.directMessages || 0)
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
    selectedSections.includes('audience')
      ? excelSheet('Audience insights', [
          ['Platform', 'Account or campaign', 'Dimension', 'Segment', 'Spend SAR', 'Reach', 'Impressions', 'Clicks', 'Leads'],
          ...collectAudienceBreakdowns(data).map((row) => [
            row.platform,
            row.accountName,
            row.dimension,
            row.segment,
            row.spend,
            row.reach,
            row.impressions,
            row.clicks,
            row.leads
          ])
        ])
      : null,
    excelSheet('Daily trends', [
      ['Date', 'Spend SAR', 'Leads', 'Cost per lead SAR'],
      ...daily.map((row) => [
        row.date,
        row.spend,
        row.conversions,
        row.cpa == null ? '' : row.cpa
      ])
    ]),
    excelSheet('Data confidence', [
      ['Account', 'Platform', 'Account ID', 'Status', 'Message', 'Spend note'],
      ...(data?.accountStatuses || []).map((account) => [
        account.accountName,
        account.platformLabel,
        account.accountId,
        account.status,
        account.message,
        account.spendNote || ''
      ])
    ])
  ].filter(Boolean))
}

function ReportView({ data, platform, range, setView, insightsText, isSharedView = false, comparisonData = null, comparisonRange = '30d' }) {
  const [valueReportLoading, setValueReportLoading] = useState(false)
  const [valueReportError, setValueReportError] = useState('')
  const campaignRows = Array.isArray(data?.campaignRows) ? data.campaignRows : []
  const summaryCards = Array.isArray(data?.summaryCards) ? data.summaryCards : []
  const googleDiagnostics = data?.diagnostics?.google || null
  const totalSpend = parseSarString(summaryCards.find((c) => c.label === 'Total Spend')?.value)
  const totalReach = parseNumberString(summaryCards.find((c) => c.label === 'Reach')?.value) || 0
  const totalClicks = parseNumberString(summaryCards.find((c) => c.label === 'Clicks')?.value)
  const totalConversions = parseNumberString(getSummaryCardValue(summaryCards, 'Results'))
  const dailyChartData = buildDailyChartData(data)
  const targetCPA = dailyChartData.length > 0 ? Number(dailyChartData[0]?.targetCPA || 0) : null
  const nextActionText = data?.insights?.nextAction || 'Healthy momentum. Next step: keep optimizing efficiency.'

  async function exportValueReport() {
    try {
      setValueReportLoading(true)
      setValueReportError('')
      await downloadValueReport(data)
    } catch (reportError) {
      setValueReportError(reportError.message || 'Unable to generate the value report.')
    } finally {
      setValueReportLoading(false)
    }
  }

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
          <button onClick={exportValueReport} disabled={valueReportLoading} style={buttonStyle(false)}>
            {valueReportLoading ? 'Preparing Word...' : 'Value report (Word)'}
          </button>
        </div>

        {valueReportError ? (
          <div className="no-print" style={{ ...cardStyle(), padding: '12px 14px', marginBottom: '14px', color: COLORS.red, fontWeight: 800 }}>
            {valueReportError}
          </div>
        ) : null}

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
          <PeriodComparison primary={data} comparison={comparisonData} primaryRange={range} comparisonRange={comparisonRange} />
          <FunnelHero
            reach={totalReach}
            clicks={totalClicks}
            conversions={totalConversions}
            convertedCount={data?.conversionMetrics?.convertedCount}
          />
          <TrendCharts daily={dailyChartData} targetCPA={targetCPA} />
          <PlatformContribution
            rows={campaignRows}
            totalSpend={totalSpend}
            totalClicks={totalClicks}
            totalConversions={totalConversions}
          />
          <AudienceActionInsights data={data} />
          <StatusBanner text={nextActionText} />
          <AdvancedTable rows={campaignRows} googleDiagnostics={googleDiagnostics} />
        </div>
        <DashboardFooter />
      </div>
    </div>
  )
}

function AgencyExportView({ availableClients, setView, cloudChefsMetaImport = null }) {
  const [exportRange, setExportRange] = useState('max')
  const [clientPayloads, setClientPayloads] = useState([])
  const [selectedAccountIds, setSelectedAccountIds] = useState([])
  const [resolvedClients, setResolvedClients] = useState(availableClients || [])
  const [selectedClientId, setSelectedClientId] = useState(availableClients?.[0]?.id || 'rimiya')
  const [exportName, setExportName] = useState('Agency performance')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadClients() {
      try {
        setError('')
        let clientsToLoad = Array.isArray(availableClients) ? availableClients : []

        if (!clientsToLoad.length) {
          const fallbackResponse = await fetch('/api/dashboard?client=rimiya&platform=all&range=30d')
          const fallbackPayload = await fallbackResponse.json()
          clientsToLoad = Array.isArray(fallbackPayload?.availableClients) ? fallbackPayload.availableClients : []
        }

        setResolvedClients(clientsToLoad)
        if (!selectedClientId && clientsToLoad[0]?.id) {
          setSelectedClientId(clientsToLoad[0].id)
        }

        if (!clientsToLoad.length) {
          setError('No client list is available yet. Go back to the dashboard, wait for it to load, then open Agency Excel again.')
        }
      } catch (err) {
        setError(err.message || 'Unable to load clients.')
      }
    }

    loadClients()
  }, [availableClients, selectedClientId])

  useEffect(() => {
    setClientPayloads([])
    setSelectedAccountIds([])
  }, [selectedClientId, exportRange])

  async function loadSelectedClientAccounts() {
    try {
      setLoading(true)
      setError('')
      const selectedClient = resolvedClients.find((client) => client.id === selectedClientId) || resolvedClients[0]

      if (!selectedClient) {
        setError('Select a client first, then load the export file.')
        return
      }

      const params = new URLSearchParams({
        client: selectedClient.id,
        platform: 'all',
        range: exportRange
      })
      const response = await fetch(`/api/dashboard?${params.toString()}`)
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to load client account details.')
      }

      const resolvedPayload = applyMetaImportToDashboard(payload, cloudChefsMetaImport, {
        range: exportRange,
        platform: 'all'
      })
      const loaded = [{ client: selectedClient, payload: resolvedPayload }]
      setClientPayloads(loaded)
      setSelectedAccountIds((resolvedPayload.accountOptions || []).map((account) => account.id))
      setExportName(`${resolvedPayload.client?.name || selectedClient.name} performance export`)
    } catch (err) {
      setClientPayloads([])
      setSelectedAccountIds([])
      setError(err.message || 'Unable to load client account details.')
    } finally {
      setLoading(false)
    }
  }

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
          const resolvedPayload = applyMetaImportToDashboard(payload, cloudChefsMetaImport, {
            range: exportRange,
            platform: 'all'
          })
          clientReports.push({
            client: selectedClient.client,
            payload: resolvedPayload
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
              Client account workbook
            </h1>
            <p style={{ marginTop: '6px', color: COLORS.muted, fontSize: '13px' }}>
              Select one client, load the connected ad accounts, then download all available details.
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
                Client
              </div>
              <select
                value={selectedClientId}
                onChange={(event) => setSelectedClientId(event.target.value)}
                style={selectStyle()}
              >
                {resolvedClients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
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
              <ReportRangeControl value={exportRange} onChange={setExportRange} />
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={loadSelectedClientAccounts} disabled={loading || !selectedClientId} style={buttonStyle(true)}>
                {loading ? 'Loading...' : 'Load file'}
              </button>
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
            {clientPayloads.length
              ? `${selectedAccountIds.length} of ${accountOptions.length} accounts selected for ${clientPayloads[0]?.payload?.client?.name || clientPayloads[0]?.client?.name || 'the selected client'}.`
              : 'Choose a client and click Load file before downloading.'}
          </div>
        </div>

        {error ? (
          <div style={{ ...cardStyle(), padding: '12px 14px', marginBottom: '14px', color: COLORS.red, fontWeight: 700 }}>
            {error}
          </div>
        ) : null}

        {loading ? (
          <div style={{ ...cardStyle(), padding: '18px', color: COLORS.muted }}>
            Loading account details...
          </div>
        ) : clientPayloads.length === 0 ? (
          <EmptyState
            title="No client loaded yet"
            text="Select a client and date range, then click Load file to prepare the export."
          />
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

function CustomReportBuilder({ availableClients, setView, cloudChefsMetaImport = null }) {
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
  const [valueReportLoading, setValueReportLoading] = useState(false)
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

        const resolvedPayload = applyMetaImportToDashboard(payload, cloudChefsMetaImport, {
          range: reportRange,
          platform: 'all'
        })
        setReportData(resolvedPayload)
        setInsightText(resolvedPayload?.insights?.suggested || '')
        if (selectedAccountIds === null) {
          setSelectedAccountIds((resolvedPayload.accountOptions || []).map((account) => account.id))
        }
      } catch (err) {
        setError(err.message || 'Unable to load custom report.')
      } finally {
        setLoading(false)
      }
    }

    if (selectedClientId) loadReportData()
  }, [selectedClientId, reportRange, selectedAccountIds, cloudChefsMetaImport])

  const displayReportData = applyResultDefinition(reportData, resultDefinition)
  const accountOptions = Array.isArray(displayReportData?.accountOptions) ? displayReportData.accountOptions : []
  const selectedAccountSet = new Set(Array.isArray(selectedAccountIds) ? selectedAccountIds : accountOptions.map((account) => account.id))
  const summaryCards = Array.isArray(displayReportData?.summaryCards) ? displayReportData.summaryCards : []
  const campaignRows = Array.isArray(displayReportData?.campaignRows) ? displayReportData.campaignRows : []
  const totalSpend = parseSarString(getSummaryCardValue(summaryCards, 'Total Spend'))
  const totalReach = parseNumberString(getSummaryCardValue(summaryCards, 'Reach')) || 0
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

  async function exportValueReport() {
    if (!displayReportData) return
    try {
      setValueReportLoading(true)
      setError('')
      await downloadValueReport(displayReportData)
    } catch (reportError) {
      setError(reportError.message || 'Unable to generate the value report.')
    } finally {
      setValueReportLoading(false)
    }
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
                <ReportRangeControl value={reportRange} onChange={setReportRange} />
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
                <button onClick={exportValueReport} disabled={valueReportLoading} style={buttonStyle(false)}>
                  {valueReportLoading ? 'Preparing Word...' : 'Value report (Word)'}
                </button>
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
                onValueReport={exportValueReport}
                valueReportLoading={valueReportLoading}
              />
            ) : null}

            {showFunnel ? (
              <FunnelHero
                reach={totalReach}
                clicks={totalClicks}
                conversions={totalConversions}
                convertedCount={displayReportData?.conversionMetrics?.convertedCount}
              />
            ) : null}
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
  const [range, setRange] = useState(() => {
    const initialRange = getInitialQueryParam('range', '30d')
    return initialRange === 'max' ? '30d' : initialRange
  })
  const [compareEnabled, setCompareEnabled] = useState(false)
  const [compareRange, setCompareRange] = useState('30d')
  const [comparisonData, setComparisonData] = useState(null)
  const [view, setView] = useState('dashboard')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [insightsText, setInsightsText] = useState('')
  const [shareStatus, setShareStatus] = useState('')
  const [selectedAccountIds, setSelectedAccountIds] = useState(null)
  const [selectedAccountsClient, setSelectedAccountsClient] = useState(null)
  const [caseStudyName, setCaseStudyName] = useState('')
  const [cloudChefsMetaImport, setCloudChefsMetaImport] = useState(loadStoredCloudChefsMetaImport)
  const [metaImportStatus, setMetaImportStatus] = useState('')
  const [valueReportLoading, setValueReportLoading] = useState(false)
  const [valueReportStatus, setValueReportStatus] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true)
        setError('')

        const endpoint = isSharedView ? '/api/public-dashboard' : '/api/dashboard'
        async function fetchRange(requestRange) {
          const params = isSharedView
            ? new URLSearchParams({ token: shareToken, range: requestRange })
            : new URLSearchParams({ client, platform, range: requestRange })
          if (!isSharedView && selectedAccountsClient === client && Array.isArray(selectedAccountIds) && selectedAccountIds.length > 0) {
            params.set('accounts', selectedAccountIds.join(','))
          }
          const res = await fetch(`${endpoint}?${params.toString()}`)
          const text = await res.text()
          let json
          try { json = JSON.parse(text) } catch { throw new Error(text.slice(0, 300) || 'Server returned non-JSON response') }
          if (!res.ok) throw new Error(json.error || 'Failed to load dashboard data')
          return applyMetaImportToDashboard(json, cloudChefsMetaImport, { range: requestRange, platform })
        }

        const [primary, comparison] = await Promise.all([
          fetchRange(range),
          compareEnabled ? fetchRange(compareRange) : Promise.resolve(null)
        ])
        setData(primary)
        setComparisonData(comparison)
      } catch (err) {
        setData(null)
        setComparisonData(null)
        setError(err.message || 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [client, platform, range, compareEnabled, compareRange, isSharedView, shareToken, selectedAccountIds, selectedAccountsClient, cloudChefsMetaImport])

  useEffect(() => {
    setInsightsText(data?.insights?.suggested || '')
  }, [data?.insights?.suggested])

  useEffect(() => {
    if (!isSharedView) {
      setPlatform('all')
      setSelectedAccountIds(null)
      setSelectedAccountsClient(null)
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
    if (isSharedView || data?.client?.id !== client || !accountOptions.length || selectedAccountIds !== null) return
    setSelectedAccountIds(accountOptions.map((account) => account.id))
    setSelectedAccountsClient(client)
  }, [accountOptions, client, data?.client?.id, isSharedView, selectedAccountIds])

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
        comparisonData={comparisonData}
        comparisonRange={compareRange}
      />
    )
  }

  if (view === 'agency-export') {
    return (
      <AgencyExportView
        key="agency-export"
        availableClients={availableClients}
        setView={setView}
        cloudChefsMetaImport={cloudChefsMetaImport}
      />
    )
  }

  if (view === 'custom-report') {
    return (
      <CustomReportBuilder
        key="custom-report"
        availableClients={availableClients}
        setView={setView}
        cloudChefsMetaImport={cloudChefsMetaImport}
      />
    )
  }

  const summaryCards = Array.isArray(data?.summaryCards) ? data.summaryCards : []
  const campaignRows = Array.isArray(data?.campaignRows) ? data.campaignRows : []
  const googleDiagnostics = data?.diagnostics?.google || null

  const totalSpend = parseSarString(summaryCards.find((c) => c.label === 'Total Spend')?.value)
  const totalReach = parseNumberString(summaryCards.find((c) => c.label === 'Reach')?.value) || 0
  const totalImpressions = parseNumberString(summaryCards.find((c) => c.label === 'Impressions')?.value)
  const totalClicks = parseNumberString(summaryCards.find((c) => c.label === 'Clicks')?.value)
  const totalConversions = parseNumberString(getSummaryCardValue(summaryCards, 'Results'))
  const executiveMetricLabels = ['Total Spend', 'Reach', 'Clicks', 'Leads', 'Cost per Lead', 'Converted Leads', 'Cost per Converted Lead']
  const executiveSummaryCards = summaryCards.filter((card) => executiveMetricLabels.includes(card.label))
  const frequency = totalReach > 0 ? totalImpressions / totalReach : null
  const supportingSummaryCards = [
    ...summaryCards.filter((card) => ['Impressions', 'CTR', 'Lead Rate', 'Lead Conversion Rate', 'Form Submissions', 'Direct Messages', 'Website Leads', 'WhatsApp Leads'].includes(card.label)),
    ...(frequency == null ? [] : [{ label: 'Frequency', value: frequency.toFixed(2) }])
  ]

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
  const availableAccountIds = new Set(accountOptions.map((account) => account.id))
  const selectedAccountSet = new Set(
    (Array.isArray(selectedAccountIds) ? selectedAccountIds : accountOptions.map((account) => account.id))
      .filter((accountId) => availableAccountIds.has(accountId))
  )

  function toggleAccountSelection(accountId) {
    setSelectedAccountsClient(client)
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
    setSelectedAccountsClient(client)
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

  async function exportValueReport() {
    try {
      setValueReportLoading(true)
      setValueReportStatus('')
      await downloadValueReport(data)
    } catch (reportError) {
      setValueReportStatus(reportError.message || 'Unable to generate the value report.')
    } finally {
      setValueReportLoading(false)
    }
  }

  async function uploadCloudChefsMetaCsv(event) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return

    try {
      setMetaImportStatus('Reading Meta report...')
      const imported = parseMetaCsv(await file.text(), {
        accountId: '640964945046086',
        accountName: 'Cloud Chefs',
        fileName: file.name
      })
      storeCloudChefsMetaImport(imported)
      setCloudChefsMetaImport(imported)
      setMetaImportStatus(`Meta report imported successfully: ${imported.rows.length} usable rows.`)
    } catch (importError) {
      setMetaImportStatus(`Could not import this file: ${importError.message}`)
    } finally {
      input.value = ''
    }
  }

  function clearCloudChefsMetaImport() {
    storeCloudChefsMetaImport(null)
    setCloudChefsMetaImport(null)
    setMetaImportStatus('The uploaded Meta report was removed.')
  }

  async function createShareLink() {
    try {
      setShareStatus('Creating client link...')
      const params = new URLSearchParams({
        client,
        platform,
        range
      })
      if (selectedAccountSet.size > 0) {
        params.set('accounts', Array.from(selectedAccountSet).join(','))
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
      <style>{`
        @media (max-width: 800px) {
          .client-dashboard-shell { grid-template-columns: 1fr !important; }
          .client-dashboard-sidebar { display: none !important; }
          .client-dashboard-main { padding: 14px 12px 24px !important; min-width: 0; }
          .comparison-period-column { padding-left: 0 !important; border-left: 0 !important; padding-top: 14px; border-top: 1px solid ${COLORS.line}; }
        }
        @media (max-width: 480px) {
          .report-date-fields { grid-template-columns: 1fr !important; }
          .report-preset-group { width: 100%; display: grid !important; grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>
      <div className="client-dashboard-shell" style={{ display: 'grid', gridTemplateColumns: isSharedView ? '1fr' : '260px 1fr', minHeight: '100vh' }}>
        {!isSharedView ? (
          <aside
            className="client-dashboard-sidebar"
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

        <main className="client-dashboard-main" style={{ padding: '20px 22px 30px', minWidth: 0 }}>
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
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

            </div>

            <ReportingPeriodPanel
              range={range}
              onRangeChange={setRange}
              compareEnabled={compareEnabled}
              onCompareEnabledChange={setCompareEnabled}
              comparisonRange={compareRange}
              onComparisonRangeChange={setCompareRange}
            />

            <div style={{ ...cardStyle(), padding: '16px', marginBottom: '12px' }}>
              <SectionTitle
                title="Performance overview"
                subtitle={`${reportRangeLabel(range)} · ${platform === 'all' ? 'All active platforms' : platform}`}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 155px), 1fr))', gap: '9px' }}>
                {executiveSummaryCards.map((card) => (
                  <div key={card.label} style={{ padding: '13px', borderRadius: '10px', background: card.label === 'Leads' || card.label === 'Converted Leads' ? COLORS.softGreen : '#FBFAF7', border: `1px solid ${COLORS.line}` }}>
                    <div style={{ color: COLORS.muted, fontSize: '11px', fontWeight: 800 }}>{metricLabel(card.label)}</div>
                    <div style={{ color: COLORS.green, fontSize: '23px', fontWeight: 900, marginTop: '7px' }}>{card.value}</div>
                  </div>
                ))}
              </div>
              {supportingSummaryCards.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', marginTop: '13px', paddingTop: '12px', borderTop: `1px solid ${COLORS.line}` }}>
                  {supportingSummaryCards.map((card) => (
                    <div key={card.label} style={{ fontSize: '12px', color: COLORS.muted }}>
                      <span style={{ fontWeight: 800 }}>{metricLabel(card.label)}:</span>{' '}
                      <span style={{ color: COLORS.green, fontWeight: 900 }}>{card.value}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {data?.dataQuality?.sheetConversionsConfigured ? (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px 12px',
                    borderRadius: '9px',
                    background: data?.dataQuality?.sheetConversionsStatus === 'loaded' ? COLORS.softGreen : COLORS.softAmber,
                    color: data?.dataQuality?.sheetConversionsStatus === 'loaded' ? COLORS.green : COLORS.amberDeep,
                    fontSize: '12px',
                    fontWeight: 800
                  }}
                >
                  {data?.dataQuality?.sheetConversionsStatus === 'loaded'
                    ? (
                        <>
                          <div>Google Sheet synced · {Number(data?.dataQuality?.sheetLeadRows || 0).toLocaleString()} lead records in this period</div>
                          {(data?.dataQuality?.sheetSourceTotals?.website || data?.dataQuality?.sheetSourceTotals?.whatsapp) ? (
                            <div style={{ marginTop: '4px', fontWeight: 700 }}>
                              Website: {Number(data?.dataQuality?.sheetSourcePeriodCounts?.website || 0).toLocaleString()} in period / {Number(data?.dataQuality?.sheetSourceTotals?.website || 0).toLocaleString()} total Sheet rows
                              {' · '}
                              WhatsApp: {Number(data?.dataQuality?.sheetSourcePeriodCounts?.whatsapp || 0).toLocaleString()} in period / {Number(data?.dataQuality?.sheetSourceTotals?.whatsapp || 0).toLocaleString()} total Sheet rows
                            </div>
                          ) : null}
                        </>
                      )
                    : data?.dataQuality?.sheetConnectionMessage || 'Google Sheet conversion data is currently unavailable.'}
                </div>
              ) : null}
            </div>

            <PeriodComparison primary={data} comparison={comparisonData} primaryRange={range} comparisonRange={compareRange} />

            {!isSharedView ? (
              <details style={{ ...cardStyle(), padding: '13px 14px', marginBottom: '12px' }}>
                <summary style={{ cursor: 'pointer', color: COLORS.green, fontWeight: 900, fontSize: '13px' }}>
                  Data settings &amp; exports
                </summary>
                <div style={{ color: COLORS.muted, fontSize: '12px', margin: '5px 0 12px' }}>
                  Account selection, data-health details, manual imports, and report exports.
                </div>

            {client === 'cloud-chefs' ? (
              <MetaCsvUploadPanel
                importedReport={data?.manualImports?.meta || null}
                status={metaImportStatus}
                onUpload={uploadCloudChefsMetaCsv}
                onClear={clearCloudChefsMetaImport}
              />
            ) : null}

            <DataConfidencePanel data={data} />

            {accountOptions.length > 0 ? (
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
              </details>
            ) : (
              <DataConfidencePanel data={data} />
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '14px', alignItems: 'stretch' }}>
              <SummaryBlock
                text={summaryText}
                onChange={setInsightsText}
                onReset={() => setInsightsText(data?.insights?.suggested || '')}
                onExport={() => setView('report')}
                onValueReport={exportValueReport}
                valueReportLoading={valueReportLoading}
              />

              <FunnelHero
                reach={totalReach}
                clicks={totalClicks}
                conversions={totalConversions}
                convertedCount={data?.conversionMetrics?.convertedCount}
                compact={true}
              />
            </div>

            {valueReportStatus ? (
              <div style={{ ...cardStyle(), padding: '12px 14px', marginTop: '12px', color: COLORS.red, fontWeight: 800 }}>
                {valueReportStatus}
              </div>
            ) : null}

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

              <AudienceActionInsights data={data} />

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
