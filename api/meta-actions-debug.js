export default function handler(req, res) {
  const accessToken = process.env.META_ACCESS_TOKEN

  res.status(200).json({
    ok: true,
    hasToken: Boolean(accessToken),
    tokenLength: accessToken ? String(accessToken).length : 0
  })
}
