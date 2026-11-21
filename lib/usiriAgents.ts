export interface UsiriAgent {
  name: string
  region: string
  office: string
}

export const USIRI_AGENTS: UsiriAgent[] = [
  { name: 'EMMA', region: 'ARUSHA', office: 'USIRI' },
  { name: 'FARAO', region: 'BABATI', office: 'MTEI' },
  { name: 'MAUSA', region: 'BARIADI', office: 'MAUSA OFFICE' },
  { name: 'ROBERT', region: 'BIHARAMULO', office: 'HAPPY NARION' },
  { name: 'MWAJUMA', region: 'BOMA', office: 'JAMAL' },
  { name: 'MWIKALO', region: 'BUKOBA', office: 'OSAKA' },
  { name: 'MWEMA', region: 'BUNDA', office: 'HAPPY NATION' },
  { name: 'SHABAN', region: 'CHALINZE', office: 'UPENDO' },
  { name: 'BENJA', region: 'CHUNYA', office: 'BANGO LA PEPSI' },
  { name: 'ADORE', region: 'DODOMA', office: 'USIRI OFFICE' },
  { name: 'JOHN', region: 'GAIRO', office: 'MAGAZETINI' },
  { name: 'CADIA', region: 'GEITA', office: 'USIRI' },
  { name: 'MWAJUMA', region: 'HANDENI', office: 'KSK' },
  { name: 'SALMA M', region: 'IFAKARA', office: 'KIDINILO' },
  { name: 'MARTIN', region: 'IGUNGA', office: 'KATARAMA' },
  { name: 'TWAHIL', region: 'IRINGA', office: 'UPENDO' },
  { name: 'PAUL', region: 'KAHAMA', office: 'USIRI' },
  { name: 'ELIAS', region: 'KALIUA', office: 'USIRI' },
  { name: 'JULIET', region: 'KARATU', office: 'DAR EXPRESS' },
  { name: 'ANTIDIUS', region: 'KAYANGA', office: 'ANTIDIUS SHOP' },
  { name: 'MR KAPALE', region: 'KASULU', office: 'ALHAMDULILLAH' },
  { name: 'ALLY', region: 'KIGOMA', office: 'STAND MPYA NO.6' },
  { name: 'KIDASI', region: 'KILOMBERO', office: 'KIDINILO' },
  { name: 'AMINA', region: 'KILOSA', office: 'KIDINILO' },
  { name: 'FREDY', region: 'KITETO', office: '' },
  { name: 'ALLY', region: 'KONDOA', office: 'BICHA' },
  { name: 'BINDU', region: 'KOROGWE', office: 'KILUWA' },
  { name: 'SUMA', region: 'KYELA', office: 'KYELA EXPRESS' },
  { name: 'ABDALLAH', region: 'LINDI', office: 'MWANANCHI' },
  { name: 'MAGLASS', region: 'LUSHOTO', office: 'KILUA' },
  { name: 'MASAI', region: 'MAFINGA', office: 'NJOMBE EXP.' },
  { name: 'YUSTER', region: 'MAKAMBAKO', office: 'KARIBU NA NJOMBE EXPRESS' },
  { name: 'JULIUAS', region: 'MANYONI', office: 'ISAMILO' },
  { name: 'HERI', region: 'MASASI', office: 'MANING NICE' },
  { name: 'FLORIAN', region: 'MBEYA', office: 'GOLDEN DEER' },
  { name: 'ROSE', region: 'MBINGA', office: 'SAJDA' },
  { name: 'HAMISI', region: 'MOROGORO', office: 'USIRI' },
  { name: 'ISAYA', region: 'MOSHI', office: 'USIRI' },
  { name: 'MTEULE', region: 'MPANDA', office: 'ABOOD NO 2' },
  { name: 'EMANUEL', region: 'MPWAPWA', office: '' },
  { name: 'ANAF', region: 'MTWARA', office: 'BUTI A ZUNGU' },
  { name: 'JAMAL', region: 'MUHEZA', office: 'NACHARO' },
  { name: 'GARMAA', region: 'MULEBA', office: 'CIVITO NO 4' },
  { name: 'MAUSA', region: 'MUSOMA', office: 'MAUSA OFFICE' },
  { name: 'OPIO', region: 'MWANZA', office: 'USIRI MLANGO MMOJA' },
  { name: 'MAJUKWAA', region: 'NACHIMGWEA', office: '' },
  { name: 'AYUBU', region: 'NJOMBE', office: 'USIRI' },
  { name: 'JAMES', region: 'NZEGA', office: 'NO 25 STAND' },
  { name: 'RAMA', region: 'SAME', office: '' },
  { name: 'MAUSA', region: 'SHINYANGA', office: 'MAUSA OFFICE' },
  { name: 'HUSSEIN DYD', region: 'SINGIDA', office: 'USIRI' },
  { name: 'CASSIAN', region: 'SONGEA', office: 'USIRI NO 80' },
  { name: 'LATIFA', region: 'SUMBAWANGA', office: 'USIRI' },
  { name: 'MOHAMED', region: 'TABORA', office: 'USIRI' },
  { name: 'ZUBERY', region: 'TANGA', office: 'RD 12 MSAWA OFICE' },
  { name: 'GRACE', region: 'TARIME', office: 'SIMIYU EXP.' },
  { name: 'HAPPY', region: 'TUKUYU', office: 'NEW SONGO' },
  { name: 'NAOMY MASSAWE', region: 'TUNDUMA', office: 'USIRI' },
  { name: 'NANDAO', region: 'TUNDURU', office: 'AGENT NANDAO' },
  { name: 'EDWARD', region: 'URAMBO', office: '' },
  { name: 'FATMA', region: 'ZANZIBAR', office: 'MALINDI ROAD, ZSTC BUILDING' },
]

const regionMap = new Map<string, UsiriAgent>()
USIRI_AGENTS.forEach(a => regionMap.set(a.region.toUpperCase(), a))

export const USIRI_REGIONS = USIRI_AGENTS.map(a => a.region).sort()

export function findUsiriAgent(cityOrRegion: string): UsiriAgent | null {
  if (!cityOrRegion) return null
  const upper = cityOrRegion.trim().toUpperCase()
  const exact = regionMap.get(upper)
  if (exact) return exact
  for (const [region, agent] of regionMap) {
    if (upper.includes(region) || region.includes(upper)) return agent
  }
  return null
}
