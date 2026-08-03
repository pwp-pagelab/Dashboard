import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType
} from 'docx'

const GREEN = '0B4F3C'
const DARK_GREEN = '073B2D'
const AMBER = 'E1A94B'
const INK = '26352F'
const MUTED = '66736E'
const WHITE = 'FFFFFF'
const BORDER = 'D9DED9'
const CONTENT_WIDTH = 9360
const TABLE_INDENT = 120
const CELL_MARGINS = { top: 100, bottom: 100, left: 140, right: 140 }

function formatNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })
}

function formatSar(value) {
  return `${formatNumber(value, 2)} ر.س`
}

function formatPercent(value) {
  return `${formatNumber(value, 2)}%`
}

function rtlParagraph(text, {
  heading,
  bold = false,
  color = INK,
  size = 22,
  after = 120,
  before = 0,
  bullet = false,
  alignment = AlignmentType.RIGHT
} = {}) {
  return new Paragraph({
    heading,
    bidirectional: true,
    alignment,
    spacing: { before, after, line: 280, lineRule: 'auto' },
    bullet: bullet ? { level: 0 } : undefined,
    children: [
      new TextRun({
        text: String(text || ''),
        bold,
        color,
        size,
        font: 'Arial'
      })
    ]
  })
}

function cell(text, {
  bold = false,
  fill = WHITE,
  color = INK,
  width,
  alignment = AlignmentType.RIGHT
} = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    margins: CELL_MARGINS,
    verticalAlign: VerticalAlign.CENTER,
    shading: { fill, type: ShadingType.CLEAR },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
      left: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
      right: { style: BorderStyle.SINGLE, size: 4, color: BORDER }
    },
    children: [rtlParagraph(text, { bold, color, size: 19, after: 0, alignment })]
  })
}

function dataTable(headers, rows, widths) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    indent: { size: TABLE_INDENT, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: widths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((header, index) => cell(header, {
          bold: true,
          fill: GREEN,
          color: WHITE,
          width: widths[index],
          alignment: AlignmentType.CENTER
        }))
      }),
      ...rows.map((row) => new TableRow({
        children: row.map((value, index) => cell(value, {
          fill: rows.indexOf(row) % 2 ? 'FBFAF7' : WHITE,
          width: widths[index],
          alignment: index === 0 ? AlignmentType.RIGHT : AlignmentType.CENTER
        }))
      }))
    ]
  })
}

function sectionHeading(text) {
  return rtlParagraph(text, {
    heading: HeadingLevel.HEADING_1,
    bold: true,
    color: GREEN,
    size: 30,
    before: 280,
    after: 120
  })
}

function spacer(after = 80) {
  return new Paragraph({ spacing: { after }, children: [] })
}

export async function buildValueReportDocx(metrics, narrative) {
  const totalRows = [
    ['إجمالي الإنفاق', formatSar(metrics.totals.spend)],
    ['الوصول', formatNumber(metrics.totals.reach)],
    ['مرات الظهور', formatNumber(metrics.totals.impressions)],
    ['النقرات', formatNumber(metrics.totals.clicks)],
    ['العملاء المحتملون', formatNumber(metrics.totals.leads)],
    ['إرسال النماذج', formatNumber(metrics.totals.formSubmissions)],
    ['الرسائل المباشرة', formatNumber(metrics.totals.directMessages)]
  ]
  const efficiencyRows = [
    ['نسبة النقر إلى الظهور', formatPercent(metrics.efficiency.ctrPercent)],
    ['نسبة التحول من نقرة إلى عميل محتمل', formatPercent(metrics.efficiency.clickToLeadPercent)],
    ['تكلفة النقرة', formatSar(metrics.efficiency.costPerClick)],
    ['تكلفة العميل المحتمل', formatSar(metrics.efficiency.costPerLead)],
    ['متوسط التكرار', formatNumber(metrics.efficiency.frequency, 2)],
    ['الوصول لكل ريال', formatNumber(metrics.efficiency.reachPerSar, 2)]
  ]
  const platformRows = metrics.platforms.length
    ? metrics.platforms.map((row) => [
        row.platform,
        formatSar(row.spend),
        formatNumber(row.clicks),
        formatNumber(row.leads),
        formatPercent(row.spendSharePercent),
        formatPercent(row.leadSharePercent)
      ])
    : [['لا توجد بيانات منصات', '—', '—', '—', '—', '—']]
  const breakEvenRows = [[
    'الحد الأدنى لقيمة العميل المحتمل',
    metrics.breakEven.minimumValuePerLead == null ? 'غير متاح' : formatSar(metrics.breakEven.minimumValuePerLead),
    metrics.totals.leads > 0 ? 'متاح بناءً على العملاء المحتملين المسجلين' : 'يلزم تسجيل عميل محتمل واحد على الأقل'
  ]]

  const children = [
    rtlParagraph('تقرير القيمة الإعلانية', {
      bold: true,
      color: WHITE,
      size: 48,
      after: 100,
      alignment: AlignmentType.CENTER
    }),
    rtlParagraph(metrics.clientName, {
      bold: true,
      color: WHITE,
      size: 30,
      after: 80,
      alignment: AlignmentType.CENTER
    }),
    rtlParagraph(`الفترة: ${metrics.range || 'الفترة المحددة في الداشبورد'}`, {
      color: WHITE,
      size: 20,
      after: 240,
      alignment: AlignmentType.CENTER
    }),
    sectionHeading('الملخص التنفيذي'),
    rtlParagraph(narrative.executiveSummary, { size: 22, after: 180 }),
    dataTable(['المؤشر', 'القيمة'], totalRows, [6000, 3360]),
    sectionHeading('قيمة الأداء وكفاءته'),
    rtlParagraph(narrative.performanceNarrative, { size: 22, after: 180 }),
    dataTable(['مؤشر الكفاءة', 'القيمة'], efficiencyRows, [6000, 3360]),
    sectionHeading('قمع التحويل'),
    dataTable(
      ['المرحلة', 'الحجم', 'معدل الانتقال'],
      metrics.funnel.map((row) => [
        row.stage === 'Impressions' ? 'مرات الظهور' : row.stage === 'Clicks' ? 'النقرات' : 'العملاء المحتملون',
        formatNumber(row.value),
        formatPercent(row.rateFromPreviousPercent)
      ]),
      [4200, 2580, 2580]
    ),
    sectionHeading('مساهمة المنصات'),
    dataTable(
      ['المنصة', 'الإنفاق', 'النقرات', 'العملاء', 'حصة الإنفاق', 'حصة العملاء'],
      platformRows,
      [1860, 1560, 1380, 1380, 1590, 1590]
    ),
    sectionHeading('نقطة التعادل'),
    rtlParagraph(narrative.breakEvenNarrative, { size: 22, after: 180 }),
    dataTable(['المؤشر', 'القيمة', 'القراءة'], breakEvenRows, [3300, 2160, 3900]),
    sectionHeading('التوصيات'),
    ...narrative.recommendations.map((item) => rtlParagraph(item, {
      size: 22,
      after: 100,
      bullet: true
    })),
    sectionHeading('الخلاصة'),
    rtlParagraph(narrative.conclusion, { size: 22, after: 180 }),
    spacer(100),
    rtlParagraph('ملاحظة منهجية: جميع الأرقام محسوبة آلياً من بيانات الداشبورد. الصياغة النصية لا تنشئ أرقاماً جديدة.', {
      color: MUTED,
      size: 18,
      after: 80
    })
  ]

  const document = new Document({
    creator: 'PWP',
    title: `تقرير القيمة الإعلانية — ${metrics.clientName}`,
    description: 'تقرير قيمة مبني على بيانات لوحة أداء PWP',
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 22, color: INK },
          paragraph: { spacing: { after: 120, line: 280, lineRule: 'auto' } }
        },
        heading1: {
          run: { font: 'Arial', size: 30, bold: true, color: GREEN },
          paragraph: { spacing: { before: 280, after: 120 }, bidirectional: true }
        }
      }
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080, header: 708, footer: 708 },
          size: { width: 12240, height: 15840 }
        }
      },
      headers: {
        default: new Header({
          children: [
            rtlParagraph('PWP | تقرير القيمة', {
              color: MUTED,
              size: 17,
              after: 30,
              alignment: AlignmentType.RIGHT
            })
          ]
        })
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'PWP  •  ', color: MUTED, size: 17, font: 'Arial' }),
                new TextRun({ children: [PageNumber.CURRENT], color: MUTED, size: 17, font: 'Arial' })
              ]
            })
          ]
        })
      },
      children: [
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          indent: { size: TABLE_INDENT, type: WidthType.DXA },
          columnWidths: [CONTENT_WIDTH],
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
                  margins: { top: 420, bottom: 420, left: 240, right: 240 },
                  shading: { fill: DARK_GREEN, type: ShadingType.CLEAR },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 0, color: DARK_GREEN },
                    bottom: { style: BorderStyle.SINGLE, size: 16, color: AMBER },
                    left: { style: BorderStyle.SINGLE, size: 0, color: DARK_GREEN },
                    right: { style: BorderStyle.SINGLE, size: 0, color: DARK_GREEN }
                  },
                  children: children.slice(0, 3)
                })
              ]
            })
          ]
        }),
        ...children.slice(3)
      ]
    }]
  })

  return Packer.toBuffer(document)
}
