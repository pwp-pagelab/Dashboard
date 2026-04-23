export default async function handler(req, res) {
  res.status(200).json({
    ok: true,
    route: 'google-ads',
    message: 'Google Ads route is deployed'
  })
}
