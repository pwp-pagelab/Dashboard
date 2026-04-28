export const clients = [
  {
    id: 'rimiya',
    name: 'Rimiya',
    reportingStartDate: '2026-02-11',
    tiktokAdvertiserId: '7605605483197759504',
    metaBusinessKey: 'PWP_SECOND',
    metaMatch: {
      type: 'includes',
      value: 'Rimiya'
    },
    platforms: {
      meta: { enabled: true },
      google: { enabled: true },
      tiktok: { enabled: true },
      snapchat: { enabled: false }
    }
  },
  {
    {
  id: 'clientslug',
  name: 'Client Name',
  metaBusinessKey: 'PWP_MAIN',
  metaMatch: {
    type: 'includes',
    value: 'match_value'
  },
  snapMatch: {
    type: 'includes',
    value: 'Client Name'
  },
  platforms: {
    meta: { enabled: true },
    google: { enabled: true },
    tiktok: { enabled: false },
    snapchat: { enabled: true }
  }
},
  {
    id: 'pwp',
    name: 'PWP',
    reportingStartDate: '2026-01-01',
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
