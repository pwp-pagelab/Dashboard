export const clients = [
  {
    id: 'rimiya',
    name: 'Rimiya',
    platforms: {
      meta: {
        enabled: true,
        adAccountEnv: 'META_AD_ACCOUNT_ID'
      },
      google: {
        enabled: true,
        customerIdEnv: 'GOOGLE_ADS_CUSTOMER_ID',
        loginCustomerIdEnv: 'GOOGLE_ADS_LOGIN_CUSTOMER_ID'
      },
      tiktok: {
        enabled: false
      },
      snapchat: {
        enabled: false
      }
    }
  }
]

export function getClientById(clientId) {
  return clients.find((client) => client.id === clientId)
}
