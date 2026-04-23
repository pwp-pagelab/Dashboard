export const metaBusinesses = {
  PWP_MAIN: process.env.META_BUSINESS_ID_PWP_MAIN || null,
  PWP_SECOND: process.env.META_BUSINESS_ID_PWP_SECOND || null
}

export function getMetaBusinessId(businessKey) {
  return metaBusinesses[businessKey] || null
}
