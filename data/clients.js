export const clients = [
  {
    id: 'rimiya',
    name: 'Rimiya',
    metaBusinessKey: 'PWP_SECOND',
    metaMatch: {
      type: 'includes',
      value: 'Rimiya'
    },
    platforms: {
      meta: { enabled: true },
      google: { enabled: true },
      tiktok: { enabled: false },
      snapchat: { enabled: false }
    }
  },
  {
    id: 'calistrafitness',
    name: 'Calistra',
    metaBusinessKey: 'PWP_SECOND',
    metaMatch: {
      type: 'includes',
      value: 'calistra'
    },
    platforms: {
      meta: { enabled: true },
      google: { enabled: false },
      tiktok: { enabled: false },
      snapchat: { enabled: false }
    }
  },
  {
    id: 'pwp',
    name: 'PWP',
    metaBusinessKey: 'PWP_MAIN',
    metaMatch: {
      type: 'includes',
      value: 'PWP'
    },
    platforms: {
      meta: { enabled: true },
      google: { enabled: false },
      tiktok: { enabled: false },
      snapchat: { enabled: false }
    }
  }
]

export function getClientById(clientId) {
  return clients.find((client) => client.id === clientId) || null
}
