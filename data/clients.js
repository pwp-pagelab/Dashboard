export const clients = [
  {
    id: 'rimiya',
    name: 'Rimiya',
    reportingStartDate: '2026-02-11',
    tiktokAdvertiserId: '7605605483197759504',
    metaBusinessKeys: ['PWP_SECOND', 'PWP_MAIN'],
    metaMatch: {
      type: 'includes',
      value: 'Rimiya'
    },
    platforms: {
      meta: { enabled: true },
      google: { enabled: true },
      tiktok: { enabled: true },
      snapchat: { enabled: false },
      linkedin: { enabled: false }
    }
  },
  {
    id: 'calistrafitness',
    name: 'Calistra',
    reportingStartDate: '2026-04-04',
    tiktokAdvertiserId: '7626676131768369172',
    metaBusinessKeys: ['PWP_SECOND', 'PWP_MAIN'],
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
      tiktok: { enabled: true },
      snapchat: { enabled: true },
      linkedin: { enabled: false }
    }
  },
  {
    id: 'pwp',
    name: 'PWP',
    reportingStartDate: '2026-01-01',
    metaBusinessKeys: ['PWP_MAIN', 'PWP_SECOND'],
    metaMatch: {
      type: 'includes',
      value: 'PWP'
    },
    platforms: {
      meta: { enabled: true },
      google: { enabled: false },
      tiktok: { enabled: false },
      snapchat: { enabled: false },
      linkedin: { enabled: false }
    }
  },
  {
    id: 'ygii',
    name: 'Ygii',
    reportingStartDate: '2026-01-01',
    tiktokAdvertiserId: '7132464754412634114',
    metaBusinessKeys: ['PWP_MAIN', 'PWP_SECOND'],
    metaMatch: {
      type: 'includes',
      value: 'ygii'
    },
    platforms: {
      meta: { enabled: false },
      google: { enabled: false },
      tiktok: { enabled: true },
      snapchat: { enabled: false },
      linkedin: { enabled: false }
    }
  },
  {
    id: 'yamm',
    name: 'Yamm',
    reportingStartDate: '2026-01-01',
    tiktokAdvertiserId: '7459712999889240080',
    metaBusinessKeys: ['PWP_MAIN', 'PWP_SECOND'],
    metaMatch: {
      type: 'includes',
      value: 'yamm'
    },
    platforms: {
      meta: { enabled: false },
      google: { enabled: false },
      tiktok: { enabled: true },
      snapchat: { enabled: false },
      linkedin: { enabled: false }
    }
  },
  {
    id: 'bk-saudi',
    name: 'Bk.Saudi',
    reportingStartDate: '2026-01-01',
    tiktokAdvertiserId: '7524695081987915777',
    metaBusinessKeys: ['PWP_MAIN', 'PWP_SECOND'],
    metaMatch: {
      type: 'includes',
      value: 'bk'
    },
    platforms: {
      meta: { enabled: false },
      google: { enabled: false },
      tiktok: { enabled: true },
      snapchat: { enabled: false },
      linkedin: { enabled: false }
    }
  }
]

export function getClientById(clientId) {
  return clients.find((client) => client.id === clientId) || null
}
