export interface UsiriAgent {
  name: string
  region: string
  phone: string
  office: string
}

export const USIRI_AGENTS: UsiriAgent[] = [
  { name: 'EMMA', region: 'ARUSHA', phone: '0787-149-016', office: 'USIRI' },
  { name: 'FARAO', region: 'BABATI', phone: '0784-927-387', office: 'MTEI' },
  { name: 'MAUSA', region: 'BARIADI', phone: '0678-777-776', office: 'MAUSA OFFICE' },
  { name: 'ROBERT', region: 'BIHARAMULO', phone: '0714-636-513', office: 'HAPPY NARION' },
  { name: 'MWAJUMA', region: 'BOMA', phone: '0764-760-091', office: 'JAMAL' },
  { name: 'MWIKALO', region: 'BUKOBA', phone: '0767-418-855', office: 'OSAKA' },
  { name: 'MWEMA', region: 'BUNDA', phone: '0753-258-350', office: 'HAPPY NATION' },
  { name: 'SHABAN', region: 'CHALINZE', phone: '0658-678-164', office: 'UPENDO' },
  { name: 'BENJA', region: 'CHUNYA', phone: '0765-357-214', office: 'BANGO LA PEPSI' },
  { name: 'ADORE', region: 'DODOMA', phone: '0745-056-390', office: 'USIRI OFFICE' },
  { name: 'JOHN', region: 'GAIRO', phone: '0712-583-853', office: 'MAGAZETINI' },
  { name: 'CADIA', region: 'GEITA', phone: '0758-588-434', office: 'USIRI' },
  { name: 'MWAJUMA', region: 'HANDENI', phone: '0717-435-758', office: 'KSK' },
  { name: 'SALMA M', region: 'IFAKARA', phone: '0717-163-305', office: 'KIDINILO' },
  { name: 'MARTIN', region: 'IGUNGA', phone: '0629-833-171', office: 'KATARAMA' },
  { name: 'TWAHIL', region: 'IRINGA', phone: '0653-472-745', office: 'UPENDO' },
  { name: 'PAUL', region: 'KAHAMA', phone: '0757-544-778', office: 'USIRI' },
  { name: 'ELIAS', region: 'KALIUA', phone: '0783-727-008', office: 'USIRI' },
  { name: 'JULIET', region: 'KARATU', phone: '0759-999-837', office: 'DAR EXPRESS' },
  { name: 'ANTIDIUS', region: 'KAYANGA', phone: '0718-659-239', office: 'ANTIDIUS SHOP' },
  { name: 'MR KAPALE', region: 'KASULU', phone: '0621-320-162', office: 'ALHAMDULILLAH' },
  { name: 'ALLY', region: 'KIGOMA', phone: '0629-439-109', office: 'STAND MPYA NO.6' },
  { name: 'KIDASI', region: 'KILOMBERO', phone: '0692-115-814', office: 'KIDINILO' },
  { name: 'AMINA', region: 'KILOSA', phone: '0714-301-715', office: 'KIDINILO' },
  { name: 'FREDY', region: 'KITETO', phone: '0719-974-777', office: '' },
  { name: 'ALLY', region: 'KONDOA', phone: '0678-303-048', office: 'BICHA' },
  { name: 'BINDU', region: 'KOROGWE', phone: '0693-817-570', office: 'KILUWA' },
  { name: 'SUMA', region: 'KYELA', phone: '0685-907-137', office: 'KYELA EXPRESS' },
  { name: 'ABDALLAH', region: 'LINDI', phone: '0714-582-248', office: 'MWANANCHI' },
  { name: 'MAGLASS', region: 'LUSHOTO', phone: '0784-460-631', office: 'KILUA' },
  { name: 'MASAI', region: 'MAFINGA', phone: '0768-142-673', office: 'NJOMBE EXP.' },
  { name: 'YUSTER', region: 'MAKAMBAKO', phone: '0755-264-976', office: 'KARIBU NA NJOMBE EXPRESS' },
  { name: 'JULIUAS', region: 'MANYONI', phone: '0764-713-800', office: 'ISAMILO' },
  { name: 'HERI', region: 'MASASI', phone: '0743-118-584', office: 'MANING NICE' },
  { name: 'FLORIAN', region: 'MBEYA', phone: '0756-381-667', office: 'GOLDEN DEER' },
  { name: 'ROSE', region: 'MBINGA', phone: '0622-858-254', office: 'SAJDA' },
  { name: 'HAMISI', region: 'MOROGORO', phone: '0717-756-998', office: 'USIRI' },
  { name: 'ISAYA', region: 'MOSHI', phone: '0719-813-080', office: 'USIRI' },
  { name: 'MTEULE', region: 'MPANDA', phone: '0687-437-261', office: 'ABOOD NO 2' },
  { name: 'EMANUEL', region: 'MPWAPWA', phone: '0711-592-003', office: '' },
  { name: 'ANAF', region: 'MTWARA', phone: '0716-381818', office: 'BUTI A ZUNGU' },
  { name: 'JAMAL', region: 'MUHEZA', phone: '0713-146-777', office: 'NACHARO' },
  { name: 'GARMAA', region: 'MULEBA', phone: '0762-069-988', office: 'CIVITO NO 4' },
  { name: 'MAUSA', region: 'MUSOMA', phone: '0754-742-899', office: 'MAUSA OFFICE' },
  { name: 'OPIO', region: 'MWANZA', phone: '0763-811801', office: 'USIRI MLANGO MMOJA' },
  { name: 'MAJUKWAA', region: 'NACHIMGWEA', phone: '0719-353-505', office: '' },
  { name: 'AYUBU', region: 'NJOMBE', phone: '0768-861-101', office: 'USIRI' },
  { name: 'JAMES', region: 'NZEGA', phone: '0767-854-525', office: 'NO 25 STAND' },
  { name: 'RAMA', region: 'SAME', phone: '0763-667-623', office: '' },
  { name: 'MAUSA', region: 'SHINYANGA', phone: '0676-164-456', office: 'MAUSA OFFICE' },
  { name: 'HUSSEIN DYD', region: 'SINGIDA', phone: '0624-511-733', office: 'USIRI' },
  { name: 'CASSIAN', region: 'SONGEA', phone: '0629-120-376', office: 'USIRI NO 80' },
  { name: 'LATIFA', region: 'SUMBAWANGA', phone: '0623-172-477', office: 'USIRI' },
  { name: 'MOHAMED', region: 'TABORA', phone: '0654-303-559', office: 'USIRI' },
  { name: 'ZUBERY', region: 'TANGA', phone: '0714-453-237', office: 'RD 12 MSAWA OFICE' },
  { name: 'GRACE', region: 'TARIME', phone: '0623-319-746', office: 'SIMIYU EXP.' },
  { name: 'HAPPY', region: 'TUKUYU', phone: '0784-939-085', office: 'NEW SONGO' },
  { name: 'NAOMY MASSAWE', region: 'TUNDUMA', phone: '0746-465-036', office: 'USIRI' },
  { name: 'NANDAO', region: 'TUNDURU', phone: '0788-574-050', office: 'AGENT NANDAO' },
  { name: 'EDWARD', region: 'URAMBO', phone: '0624-741-735', office: '' },
  { name: 'FATMA', region: 'ZANZIBAR', phone: '0750-264-462', office: 'MALINDI ROAD, ZSTC BUILDING' },
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
