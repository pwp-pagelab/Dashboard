export const clients = [
  {
    id: 'rimiya',
    name: 'Rimiya',
    reportingStartDate: '2026-02-11',
    metaBusinessKey: 'PWP_SECOND',
    metaMatch: {
      type: 'includes',
      value: 'Rimiya'
    },
    snapMatch: null,
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
    snapMatch: {
      type: 'includes',
      value: 'Calistra'
    },
    platforms: {
      meta: { enabled: true },
      google: { enabled: false },
      tiktok: { enabled: false },
      snapchat: { enabled: true }
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
    snapMatch: null,
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
