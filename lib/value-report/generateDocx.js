import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
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

const GREEN = '1E4A3D'
const DARK_GREEN = '123C32'
const BEIGE = 'F2EEE4'
const AMBER = 'D7A83F'
const WHITE = 'FFFFFF'
const INK = '26352F'
const MUTED = '66736E'
const BORDER = 'D6DDD8'
const PAGE_WIDTH_DXA = 9026
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

function rtlParagraph(text, {
  heading,
  bold = false,
  color = INK,
  size = 22,
  after = 120,
  before = 0,
  bullet = false,
  numbering = false,
  alignment = AlignmentType.RIGHT,
  keepNext = false,
  pageBreakBefore = false
} = {}) {
  return new Paragraph({
    heading,
    bidirectional: true,
    alignment,
    keepNext,
    pageBreakBefore,
    spacing: { before, after, line: 280, lineRule: 'auto' },
    bullet: bullet ? { level: 0 } : undefined,
    numbering: numbering ? { reference: 'pwp-numbering', level: 0 } : undefined,
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

function borders(color = BORDER) {
  return {
    top: { style: BorderStyle.SINGLE, size: 4, color },
    bottom: { style: BorderStyle.SINGLE, size: 4, color },
    left: { style: BorderStyle.SINGLE, size: 4, color },
    right: { style: BorderStyle.SINGLE, size: 4, color }
  }
}

function tableCell(text, {
  bold = false,
  fill = WHITE,
  color = INK,
  width,
  alignment = AlignmentType.RIGHT,
  size = 19,
  children = null,
  cellBorders = borders()
} = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    margins: CELL_MARGINS,
    verticalAlign: VerticalAlign.CENTER,
    shading: { fill, type: ShadingType.CLEAR },
    borders: cellBorders,
    children: children || [
      rtlParagraph(text, { bold, color, size, after: 0, alignment })
    ]
  })
}

function dataTable(headers, rows, widths, { firstColumnRight = true } = {}) {
  return new Table({
    width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: widths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((header, index) => tableCell(header, {
          bold: true,
          fill: GREEN,
          color: WHITE,
          width: widths[index],
          alignment: AlignmentType.CENTER
        }))
      }),
      ...rows.map((row, rowIndex) => new TableRow({
        children: row.map((value, columnIndex) => tableCell(value, {
          fill: rowIndex % 2 ? 'FBFAF7' : WHITE,
          width: widths[columnIndex],
          alignment: firstColumnRight && columnIndex === 0
            ? AlignmentType.RIGHT
            : AlignmentType.CENTER
        }))
      }))
    ]
  })
}

function sectionHeading(text, { pageBreakBefore = false } = {}) {
  return rtlParagraph(text, {
    heading: HeadingLevel.HEADING_1,
    bold: true,
    color: GREEN,
    size: 30,
    before: 280,
    after: 120,
    keepNext: true,
    pageBreakBefore
  })
}

function subheading(text) {
  return rtlParagraph(text, {
    heading: HeadingLevel.HEADING_2,
    bold: true,
    color: DARK_GREEN,
    size: 24,
    before: 180,
    after: 80,
    keepNext: true
  })
}

function spacer(after = 100) {
  return new Paragraph({ spacing: { after }, children: [] })
}

function callout(title, body, { strong = false } = {}) {
  const paragraphs = []
  if (title) paragraphs.push(rtlParagraph(title, { bold: true, color: GREEN, size: 21, after: 70 }))
  paragraphs.push(rtlParagraph(body, { bold: strong, size: 21, after: 0 }))

  return new Table({
    width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [PAGE_WIDTH_DXA],
    rows: [
      new TableRow({
        children: [
          tableCell('', {
            width: PAGE_WIDTH_DXA,
            fill: BEIGE,
            children: paragraphs,
            cellBorders: borders('E4DAC3')
          })
        ]
      })
    ]
  })
}

function summaryTable(metrics) {
  const width = Math.floor(PAGE_WIDTH_DXA / 3)
  const summaryCell = (title, value, detail) => tableCell('', {
    width,
    fill: BEIGE,
    alignment: AlignmentType.CENTER,
    children: [
      rtlParagraph(title, { bold: true, color: MUTED, size: 19, after: 70, alignment: AlignmentType.CENTER }),
      rtlParagraph(value, { bold: true, color: GREEN, size: 27, after: 60, alignment: AlignmentType.CENTER }),
      rtlParagraph(detail, { color: INK, size: 18, after: 0, alignment: AlignmentType.CENTER })
    ],
    cellBorders: borders('E4DAC3')
  })

  return new Table({
    width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [width, width, PAGE_WIDTH_DXA - (width * 2)],
    rows: [
      new TableRow({
        children: [
          summaryCell('ما صُرف', formatSar(metrics.spend), `${formatNumber(metrics.spendPerDay)} ر.س يومياً`),
          summaryCell('ما تحقق', `${formatNumber(metrics.leads)} عميلاً محتملاً`, 'نماذج مكتملة أو محادثات جديدة'),
          summaryCell('التكلفة الفعلية', formatSar(metrics.costPerLead), 'لكل عميل محتمل مسجل')
        ]
      })
    ]
  })
}

function funnelTable(metrics, narrative) {
  return dataTable(
    ['المرحلة', 'الرقم', 'ماذا تعني بلغة مباشرة'],
    [
      ['وصل الإعلان إلى', `${formatNumber(metrics.reach)} شخصاً`, narrative.funnelNarrative.reachLine],
      ['ظهر أمامهم', `${formatNumber(metrics.impressions)} مرة`, narrative.funnelNarrative.impressionsLine],
      ['تفاعلوا وضغطوا', `${formatNumber(metrics.clicks)} نقرة`, narrative.funnelNarrative.clicksLine],
      ['تواصلوا معكم', `${formatNumber(metrics.leads)} شخصاً`, narrative.funnelNarrative.leadsLine]
    ],
    [2100, 1800, PAGE_WIDTH_DXA - 3900]
  )
}

function platformTable(metrics) {
  const rows = metrics.platformRows.length
    ? metrics.platformRows.map((platform, index) => [
        platform.name,
        formatNumber(platform.leads),
        `${formatNumber(platform.sharePct)}%`,
        index === 0 ? 'القناة الأكبر مساهمة' : index === 1 ? 'مساهمة مساندة' : 'مساهمة إضافية'
      ])
    : [['لا توجد نتائج منصات مسجلة', '—', '—', '—']]

  return dataTable(
    ['المصدر', 'العملاء المحتملون', 'الحصة', 'الدلالة'],
    rows,
    [2100, 2100, 1600, PAGE_WIDTH_DXA - 5800]
  )
}

function breakevenTable(metrics) {
  return dataTable(
    ['قيمة العميل الفعلي', 'العملاء المطلوبون لتغطية الإنفاق', `النسبة من أصل ${formatNumber(metrics.leads)}`],
    metrics.breakeven.map((scenario) => [
      formatSar(scenario.customerValue),
      formatNumber(scenario.customersNeeded),
      `${formatNumber(scenario.pctOfLeads, 1)}%`
    ]),
    [2600, 3300, PAGE_WIDTH_DXA - 5900]
  )
}

export async function buildValueReportDocx(metrics, narrative) {
  const children = [
    new Table({
      width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: [PAGE_WIDTH_DXA],
      rows: [
        new TableRow({
          children: [
            tableCell('', {
              width: PAGE_WIDTH_DXA,
              fill: DARK_GREEN,
              children: [
                rtlParagraph('PWP | تقرير أداء الحملات', {
                  bold: true,
                  color: AMBER,
                  size: 21,
                  after: 120,
                  alignment: AlignmentType.CENTER
                }),
                rtlParagraph('تقرير القيمة الإعلانية', {
                  bold: true,
                  color: WHITE,
                  size: 46,
                  after: 100,
                  alignment: AlignmentType.CENTER
                }),
                rtlParagraph(metrics.clientName, {
                  bold: true,
                  color: WHITE,
                  size: 31,
                  after: 80,
                  alignment: AlignmentType.CENTER
                }),
                rtlParagraph(`الفترة: من \u200E${metrics.periodStart}\u200E إلى \u200E${metrics.periodEnd}\u200E · إعداد فريق PWP`, {
                  color: WHITE,
                  size: 19,
                  after: 0,
                  alignment: AlignmentType.CENTER
                })
              ],
              cellBorders: {
                top: { style: BorderStyle.SINGLE, size: 0, color: DARK_GREEN },
                bottom: { style: BorderStyle.SINGLE, size: 16, color: AMBER },
                left: { style: BorderStyle.SINGLE, size: 0, color: DARK_GREEN },
                right: { style: BorderStyle.SINGLE, size: 0, color: DARK_GREEN }
              }
            })
          ]
        })
      ]
    }),
    spacer(180),
    rtlParagraph(narrative.openingHook, { bold: true, size: 23, after: 220 }),

    sectionHeading('أولاً: الخلاصة في ثلاثة أرقام'),
    summaryTable(metrics),
    spacer(120),
    callout('لماذا يستحق رقم العملاء المحتملين الثقة؟', narrative.whyTrustLeadsNumber),

    sectionHeading(`ثانياً: كيف تحوّل الإعلان إلى ${formatNumber(metrics.leads)} طلب تواصل؟`),
    funnelTable(metrics, narrative),
    spacer(100),
    rtlParagraph(narrative.funnelNarrative.closingNote, { size: 21, after: 180 }),

    sectionHeading('ثالثاً: أين يظهر الإنجاز الحقيقي؟', { pageBreakBefore: true }),
    subheading('معدل التفاعل'),
    rtlParagraph(narrative.targetingSignals.engagementRateNote, { size: 21, after: 150 }),
    subheading('مساهمة المنصات'),
    platformTable(metrics),
    spacer(90),
    rtlParagraph(narrative.targetingSignals.budgetConcentrationNote, { size: 21, after: 150 }),
    subheading('تفضيل قناة التواصل'),
    rtlParagraph(narrative.targetingSignals.channelPreferenceNote, { size: 21, after: 150 }),
    subheading('اتجاه تكلفة العميل المحتمل'),
    rtlParagraph(narrative.targetingSignals.costTrendNote, { size: 21, after: 180 }),

    sectionHeading('رابعاً: ما الذي بقي بعد انتهاء الصرف؟'),
    ...narrative.remainingValueBullets.map((item) => rtlParagraph(item, {
      size: 21,
      after: 90,
      bullet: true
    })),
    spacer(60),
    callout('', narrative.remainingValueQuote, { strong: true }),

    sectionHeading('خامساً: متى تسدّد الحملة تكلفتها؟'),
    rtlParagraph(narrative.payoffIntro, { size: 21, after: 150 }),
    breakevenTable(metrics),
    spacer(60),
    callout('قراءة السيناريوهات', narrative.payoffClosing),

    sectionHeading('سادساً: المرحلة التي لم تُقَس بعد'),
    rtlParagraph(narrative.unmeasuredPhaseIntro, { size: 21, after: 130 }),
    ...[
      'كم عميلاً محتملاً تم الرد عليه؟',
      'ما متوسط زمن الرد؟',
      'كم طلب تواصل تحوّل إلى عميل فعلي؟',
      'ما أسباب فقدان الطلبات غير المكتملة؟'
    ].map((item) => rtlParagraph(item, { size: 21, after: 80, bullet: true })),

    sectionHeading('سابعاً: التوصيات'),
    ...narrative.recommendations.map((item) => rtlParagraph(item, {
      size: 21,
      after: 100,
      numbering: true
    })),

    sectionHeading('ثامناً: الحصيلة'),
    callout(narrative.conclusionSummaryLine, narrative.conclusionParagraph, { strong: false }),
    spacer(180),
    rtlParagraph(
      `جميع الأرقام في هذه الوثيقة محسوبة من تقرير الأداء للفترة من \u200E${metrics.periodStart}\u200E إلى \u200E${metrics.periodEnd}\u200E ومن بيانات المنصات الإعلانية. جدول التعادل سيناريو تخطيطي وليس إثباتاً لمبيعات محققة.`,
      { color: MUTED, size: 17, after: 0 }
    )
  ]

  const document = new Document({
    creator: 'PWP',
    title: `تقرير القيمة الإعلانية — ${metrics.clientName}`,
    description: 'تقرير قيمة مبني على بيانات لوحة أداء PWP',
    numbering: {
      config: [{
        reference: 'pwp-numbering',
        levels: [{
          level: 0,
          format: LevelFormat.DECIMAL,
          text: '%1.',
          alignment: AlignmentType.RIGHT,
          style: {
            paragraph: {
              indent: { left: 720, hanging: 360 }
            }
          }
        }]
      }]
    },
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 22, color: INK },
          paragraph: { spacing: { after: 120, line: 280, lineRule: 'auto' } }
        },
        heading1: {
          run: { font: 'Arial', size: 30, bold: true, color: GREEN },
          paragraph: { spacing: { before: 280, after: 120 }, bidirectional: true }
        },
        heading2: {
          run: { font: 'Arial', size: 24, bold: true, color: DARK_GREEN },
          paragraph: { spacing: { before: 180, after: 80 }, bidirectional: true }
        }
      }
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1080, right: 1440, bottom: 1080, left: 1440, header: 708, footer: 708 }
        }
      },
      headers: {
        default: new Header({
          children: [
            rtlParagraph('PWP | تقرير القيمة', {
              color: MUTED,
              size: 17,
              after: 30
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
      children
    }]
  })

  return Packer.toBuffer(document)
}
