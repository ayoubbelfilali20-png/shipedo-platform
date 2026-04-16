export const KENYAN_CITIES: string[] = [
  'Athi River', 'Juja', 'Kiambu', 'Kikuyu', 'Kitengela', 'Nairobi', 'Ngong', 'Ongata Rongai', 'Ruiru',
  'Emali', 'Isinya', 'Kajiado', 'Kibwezi', 'Kitui', 'Machakos', 'Makindu', 'Wote', 'Matuu', 'Mwingi',
  'Ahero', 'Awasi', 'Awendo', 'Bahati', 'Bomet', 'Gilgil', 'Kericho', 'Keroka', 'Kisii', 'Kisumu',
  'Kabarak', 'Kijabe', 'Limuru', 'Lanet', 'Nyamira',
  'Oyugis', 'Rongo', 'Subukia', 'Salgaa', 'Sigalagala', 'Soy', 'Rongai (Salgaa)',
  'Naivasha', 'Nakuru', 'Narok', 'Nyahururu', 'Eldoret', 'Molo', 'Njoro', 'Olkalou',
  'Busia', 'Bungoma', 'Burnt Forest', 'Chewele', 'Eldama Ravine', 'Iten', 'Kabarnet', 'Kapsabet',
  'Kitale', 'Malaba', "Moi's Bridge", 'Mumias', 'Nambale', 'Nzoia',
  'Talek', 'Turbo', 'Webuye', 'Bondo', 'Homabay', 'Luanda', 'Maseno', 'Mbale', 'Migori', 'Siaya',
  'Ugunja', 'Yala', 'Malava', 'Kakamega',
  'Chuka', 'Embu', 'Kenol', 'Karatina', 'Kerugoya', 'Meru', "Murang'a", 'Mwea', 'Nanyuki', 'Nkubu',
  'Nyeri', 'Sabasaba', 'Thika',
  'Mariakani', 'Mombasa', 'Sultan Hamud', 'Voi', 'Mtito Andei',
  'Diani', 'Kilifi', 'Malindi', 'Mtwapa', 'Watamu',
]

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()

// Longest first so "Ongata Rongai" / "Rongai (Salgaa)" win over "Rongai"-style partials
const CITIES_SORTED = [...KENYAN_CITIES].sort(
  (a, b) => normalize(b).length - normalize(a).length,
)

export function resolveCity(
  customerCity?: string | null,
  customerAddress?: string | null,
): string | null {
  const haystack = ` ${normalize(`${customerCity || ''} ${customerAddress || ''}`)} `
  if (haystack.trim().length === 0) return null
  for (const city of CITIES_SORTED) {
    const nc = normalize(city)
    if (!nc) continue
    if (haystack.includes(` ${nc} `)) return city
  }
  return null
}
