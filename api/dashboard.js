export default function handler(req, res) {
  res.status(200).json({
    updatedAt: new Date().toISOString(),
    summaryCards: [
      { label: 'Total Spend', value: 'SAR 12,450' },
      { label: 'Impressions', value: '485,320' },
      { label: 'Clicks', value: '14,280' },
      { label: 'Conversions', value: '126' },
      { label: 'CTR', value: '2.94%' },
      { label: 'ROAS', value: '3.82x' }
    ],
    campaignRows: [
      { platform: 'Meta', campaign: 'Prospecting', spend: 'SAR 3,200', clicks: '4,120', conversions: '31' },
      { platform: 'Meta', campaign: 'Retargeting', spend: 'SAR 1,850', clicks: '2,010', conversions: '28' },
      { platform: 'Google Ads', campaign: 'Brand Search', spend: 'SAR 2,100', clicks: '3,430', conversions: '35' },
      { platform: 'Google Ads', campaign: 'Shopping', spend: 'SAR 5,300', clicks: '4,720', conversions: '32' }
    ],
    platformSplit: {
      meta: { spend: 'SAR 5,050', conversions: '59' },
      google: { spend: 'SAR 7,400', conversions: '67' }
    }
  })
}
