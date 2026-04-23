export const metaBusinesses = {
  PWP_MAIN: process.env.META_BUSINESS_ID_PWP_MAIN,
  PWP_SECOND: process.env.META_BUSINESS_ID_PWP_SECOND
}

export function getMetaBusinessId(businessKey) {
  return metaBusinesses[businessKey] || null
}
