export const clients = [
  {
    id: 'rimiya',
    name: 'Rimiya',
    reportingStartDate: '2026-02-11',
    tiktokAdvertiserId: '7605605483197759504',
    metaAccountId: '770445006102868',
    metaAccountName: 'Rimiya',
    metaBusinessKeys: ['PWP_SECOND_ACCOUNT', 'POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'Rimiya' },
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
    snapchatAdAccountId: '5a93c800-5e3c-42ef-98d6-f2dd47e90e72',
    snapchatAdAccountName: 'Calistra Ads',
    metaAccountId: '2908421886189204',
    metaAccountName: 'calistrafitness',
    metaBusinessKeys: ['PWP_SECOND_ACCOUNT', 'POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'calistra' },
    snapMatch: { type: 'includes', value: 'Calistra' },
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
    reportingStartDate: '2023-09-01',
    platformStartDates: {
      linkedin: '2026-01-01'
    },
    childClientIds: [
      'postwithpassion-portfolio',
      'pwp-1108',
      'pwp-11081115',
      'pwp-0416'
    ],
    linkedinAccountId: '512874914',
    metaAccountId: '362111563490796',
    metaAccountName: 'PWP',
    metaBusinessKeys: ['POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'PWP' },
    platforms: {
      meta: { enabled: true },
      google: { enabled: false },
      tiktok: { enabled: false },
      snapchat: { enabled: false },
      linkedin: { enabled: true }
    }
  },
  {
    id: 'bk-saudi',
    name: 'BK Saudi',
    reportingStartDate: '2026-01-01',
    linkedinAccountId: '516336109',
    tiktokAdvertiserId: '7524695081987915777',
    snapchatAdAccountId: '2b3f15f7-6cec-432e-9018-9b96aa83c635',
    snapchatAdAccountName: 'BK Saudi Self Service',
    metaAccountId: '1510169743742275',
    metaAccountName: 'BK.Saudi',
    metaBusinessKeys: ['POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'bk' },
    platforms: {
      meta: { enabled: true },
      google: { enabled: false },
      tiktok: { enabled: true },
      snapchat: { enabled: true },
      linkedin: { enabled: true }
    }
  },

  {
    id: 'postwithpassion-portfolio',
    name: 'postwithpassion',
    reportingStartDate: '2023-09-01',
    metaBusinessKeys: ['POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'postwithpassion' },
    platforms: {
      meta: { enabled: true },
      google: { enabled: false },
      tiktok: { enabled: false },
      snapchat: { enabled: false },
      linkedin: { enabled: false }
    }
  },
  {
    id: 'dar-alosrah',
    name: 'Dar Alosrah',
    reportingStartDate: '2026-01-01',
    linkedinAccountId: '518897967',
    metaAccountId: '1818955255489938',
    metaAccountName: 'Dar Alosrah',
    metaBusinessKeys: ['DAR_ALOSRAH', 'POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'dar alosrah' },
    platforms: {
      meta: { enabled: true },
      google: { enabled: false },
      tiktok: { enabled: false },
      snapchat: { enabled: false },
      linkedin: { enabled: true }
    }
  },
  {
    id: 'first-step',
    name: 'First Step',
    reportingStartDate: '2026-01-01',
    tiktokAdvertiserId: '7550613253618237458',
    snapchatAdAccountId: 'd80abcc3-a69d-47ed-9896-17ea892bd6e9',
    snapchatAdAccountName: 'First Step Self Service',
    metaAccountId: '1394616438187328',
    metaAccountName: 'First Step Sa',
    metaBusinessKeys: ['FIRST_STEP', 'POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'first step' },
    platforms: {
      meta: { enabled: true },
      google: { enabled: false },
      tiktok: { enabled: true },
      snapchat: { enabled: true },
      linkedin: { enabled: false }
    }
  },
  {
    id: 'kabab-shakers',
    name: 'Kabab Shakers',
    reportingStartDate: '2026-01-01',
    tiktokAdvertiserId: '7446000428392955905',
    metaAccountId: '950694223584536',
    metaAccountName: 'Kabab.Shakers',
    metaBusinessKeys: ['KABAB_SHAKERS', 'POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'kabab' },
    platforms: {
      meta: { enabled: true },
      google: { enabled: false },
      tiktok: { enabled: true },
      snapchat: { enabled: false },
      linkedin: { enabled: false }
    }
  },
  {
    id: 'pet-market',
    name: 'Pet Market',
    reportingStartDate: '2026-01-01',
    tiktokAdvertiserId: '7581033628394799121',
    metaAccountId: '1149101116646960',
    metaAccountName: 'Pet Market',
    metaBusinessKeys: ['PET_MARKET', 'POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'pet' },
    platforms: {
      meta: { enabled: true },
      google: { enabled: false },
      tiktok: { enabled: true },
      snapchat: { enabled: false },
      linkedin: { enabled: false }
    }
  },
  {
    id: 'sbsf',
    name: 'SBSF',
    reportingStartDate: '2023-09-01',
    platformStartDates: {
      meta: '2023-09-01',
      google: '2023-09-01',
      tiktok: '2023-09-01'
    },
    tiktokAdvertiserId: '7582169403874197512',
    googleCustomerId: '167-436-8080',
    metaAccountId: '1157883176455842',
    metaAccountName: 'SBSF Ads',
    metaBusinessKeys: ['SBSF', 'POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'sbsf' },
    platforms: {
      meta: { enabled: true },
      google: { enabled: true },
      tiktok: { enabled: true },
      snapchat: { enabled: false },
      linkedin: { enabled: false }
    }
  },
  {
    id: 'yamama-company',
    name: 'Yamama Company',
    reportingStartDate: '2023-09-01',
    childClientIds: [
      'yamama-red-bricks-tiktok',
      'yfc',
      'yfc-pwp',
      'test-yfc',
      'yamama-historical-meta',
      'nc-red-bricks'
    ],
    metaBusinessKeys: ['YAMAMA_COMPANY', 'POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'yamama' },
    platforms: {
      meta: { enabled: true },
      google: { enabled: false },
      tiktok: { enabled: false },
      snapchat: { enabled: false },
      linkedin: { enabled: false }
    }
  },
  {
    id: 'yamm',
    name: 'Yamm',
    reportingStartDate: '2023-09-01',
    platformStartDates: {
      meta: '2023-09-01',
      tiktok: '2023-09-01'
    },
    tiktokAdvertiserId: '7459712999889240080',
    metaAccountId: '1272102320454403',
    metaAccountName: 'Yamm AC#1',
    metaBusinessKeys: ['YAMM_SA', 'POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'yamm' },
    platforms: {
      meta: { enabled: true },
      google: { enabled: false },
      tiktok: { enabled: true },
      snapchat: { enabled: false },
      linkedin: { enabled: false }
    }
  },
  {
    id: 'no7',
    name: 'No7',
    reportingStartDate: '2026-01-01',
    tiktokAdvertiserId: '7392149260696961025',
    metaAccountId: '952181423363229',
    metaAccountName: 'No7 App',
    metaBusinessKeys: ['NO7', 'POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'no7' },
    platforms: {
      meta: { enabled: true },
      google: { enabled: false },
      tiktok: { enabled: true },
      snapchat: { enabled: false },
      linkedin: { enabled: false }
    }
  },

  {
    id: 'ygii',
    name: 'Ygii',
    reportingStartDate: '2026-01-01',
    tiktokAdvertiserId: '7132464754412634114',
    metaBusinessKeys: ['POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'ygii' },
    platforms: {
      meta: { enabled: false },
      google: { enabled: false },
      tiktok: { enabled: true },
      snapchat: { enabled: false },
      linkedin: { enabled: false }
    }
  },
  {
    id: 'pwp-11081115',
    name: 'شركة تواصل بشغف للتسويق11081115',
    reportingStartDate: '2023-09-01',
    tiktokAdvertiserId: '7265651862102130690',
    metaBusinessKeys: ['POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'تواصل' },
    platforms: {
      meta: { enabled: false },
      google: { enabled: false },
      tiktok: { enabled: true },
      snapchat: { enabled: false },
      linkedin: { enabled: false }
    }
  },
  {
    id: 'pwp-1108',
    name: 'شركة تواصل بشغف للتسويق1108',
    reportingStartDate: '2023-09-01',
    tiktokAdvertiserId: '7299080289240989697',
    metaBusinessKeys: ['POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'تواصل' },
    platforms: {
      meta: { enabled: false },
      google: { enabled: false },
      tiktok: { enabled: true },
      snapchat: { enabled: false },
      linkedin: { enabled: false }
    }
  },
  {
    id: 'pwp-0416',
    name: 'شركة تواصل بشغف للتسويق0416',
    reportingStartDate: '2023-09-01',
    tiktokAdvertiserId: '7493853887540150289',
    metaBusinessKeys: ['POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'تواصل' },
    platforms: {
      meta: { enabled: false },
      google: { enabled: false },
      tiktok: { enabled: true },
      snapchat: { enabled: false },
      linkedin: { enabled: false }
    }
  },
  {
    id: 'yamama-red-bricks-tiktok',
    name: 'شركة اليمامة للطوب الأحمر0522',
    reportingStartDate: '2023-09-01',
    tiktokAdvertiserId: '7371810298619248641',
    metaBusinessKeys: ['YAMAMA_COMPANY', 'POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'yamama' },
    platforms: {
      meta: { enabled: false },
      google: { enabled: false },
      tiktok: { enabled: true },
      snapchat: { enabled: false },
      linkedin: { enabled: false }
    }
  },
  {
    id: 'yfc',
    name: 'YFC',
    reportingStartDate: '2023-09-01',
    tiktokAdvertiserId: '7387700111398207504',
    metaAccountId: '453916119235390',
    metaAccountName: 'YFC',
    metaBusinessKeys: ['YAMAMA_COMPANY', 'POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'yfc' },
    platforms: {
      meta: { enabled: true },
      google: { enabled: false },
      tiktok: { enabled: true },
      snapchat: { enabled: false },
      linkedin: { enabled: false }
    }
  },
  {
    id: 'yamama-historical-meta',
    name: 'Yamama Company Historical Meta',
    reportingStartDate: '2020-01-01',
    platformStartDates: {
      meta: '2020-01-01'
    },
    metaAccountId: '255716858458735',
    metaAccountName: 'Munerah Al-Nasser',
    metaBusinessKeys: ['YAMAMA_COMPANY', 'POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'munerah' },
    platforms: {
      meta: { enabled: true },
      google: { enabled: false },
      tiktok: { enabled: false },
      snapchat: { enabled: false },
      linkedin: { enabled: false }
    }
  },
  {
    id: 'yfc-pwp',
    name: 'YFC -PWP',
    reportingStartDate: '2023-09-01',
    tiktokAdvertiserId: '7389216029110566928',
    metaBusinessKeys: ['POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'yfc' },
    platforms: {
      meta: { enabled: false },
      google: { enabled: false },
      tiktok: { enabled: true },
      snapchat: { enabled: false },
      linkedin: { enabled: false }
    }
  },
  {
    id: 'no7-new-ad-account',
    name: 'No7 New Ad Account',
    reportingStartDate: '2026-01-01',
    tiktokAdvertiserId: '7392149260696961025',
    metaBusinessKeys: ['NO7', 'POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'no7' },
    platforms: {
      meta: { enabled: false },
      google: { enabled: false },
      tiktok: { enabled: true },
      snapchat: { enabled: false },
      linkedin: { enabled: false }
    }
  },
  {
    id: 'test-yfc',
    name: 'Test YFC',
    reportingStartDate: '2023-09-01',
    tiktokAdvertiserId: '7432982394485178385',
    metaBusinessKeys: ['POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'yfc' },
    platforms: {
      meta: { enabled: false },
      google: { enabled: false },
      tiktok: { enabled: true },
      snapchat: { enabled: false },
      linkedin: { enabled: false }
    }
  },
  {
    id: 'lefane',
    name: 'Lefane',
    reportingStartDate: '2026-01-01',
    tiktokAdvertiserId: '7436708078663401488',
    metaBusinessKeys: ['POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'lefane' },
    platforms: {
      meta: { enabled: false },
      google: { enabled: false },
      tiktok: { enabled: true },
      snapchat: { enabled: false },
      linkedin: { enabled: false }
    }
  },
  {
    id: 'teddysa',
    name: 'TeddySa',
    reportingStartDate: '2026-01-01',
    tiktokAdvertiserId: '7506499554309849104',
    metaBusinessKeys: ['POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'teddy' },
    platforms: {
      meta: { enabled: false },
      google: { enabled: false },
      tiktok: { enabled: true },
      snapchat: { enabled: false },
      linkedin: { enabled: false }
    }
  },
  {
    id: 'il-ksa',
    name: 'il-ksa',
    reportingStartDate: '2026-01-01',
    tiktokAdvertiserId: '7526566002525487120',
    metaBusinessKeys: ['POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'il-ksa' },
    platforms: {
      meta: { enabled: false },
      google: { enabled: false },
      tiktok: { enabled: true },
      snapchat: { enabled: false },
      linkedin: { enabled: false }
    }
  },
  {
    id: 'nc-red-bricks',
    name: 'NcRedBricks',
    reportingStartDate: '2023-09-01',
    tiktokAdvertiserId: '7574421014181085200',
    metaAccountId: '1532754301086786',
    metaAccountName: 'NcRedBricks',
    metaBusinessKeys: ['YAMAMA_COMPANY', 'POSTWITHPASSION'],
    metaMatch: { type: 'includes', value: 'red bricks' },
    platforms: {
      meta: { enabled: true },
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
