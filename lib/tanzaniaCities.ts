// Canonical list of Tanzania region cities. Order creation must use one of
// these — exact client locations go in the address field, never as a new city.
export const TZ_CITIES = [
  'Dar es Salaam',
  'Dodoma',
  'Mwanza',
  'Arusha',
  'Mbeya',
  'Morogoro',
  'Tanga',
  'Moshi',
  'Zanzibar City',
  'Kigoma',
  'Tabora',
  'Iringa',
  'Shinyanga',
  'Bukoba',
  'Mtwara',
  'Songea',
  'Singida',
  'Babati',
  'Musoma',
  'Sumbawanga',
  'Geita',
  'Njombe',
  'Mpanda',
  'Bariadi',
  'Kibaha',
  'Vwawa',
  'Lindi',
  'Kahama',
  'Tunduma',
  'Ifakara',
  'Mafinga',
  'Bagamoyo',
  'Korogwe',
  'Kasulu',
  'Masasi',
  'Tukuyu',
]

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()

// Longest first so multi-word names win over single-word partials
const CITIES_SORTED = [...TZ_CITIES].sort(
  (a, b) => normalize(b).length - normalize(a).length,
)

// Aliases → canonical city (matched as whole words, longest first)
const ALIASES: [string, string][] = [
  ['dar es salaam', 'Dar es Salaam'],
  ['dsm', 'Dar es Salaam'],
  ['dar', 'Dar es Salaam'],
  ['zanzibar', 'Zanzibar City'],
  ['unguja', 'Zanzibar City'],
]

/**
 * Map a raw customer city (and optionally address) to one of the canonical
 * Tanzania region cities, e.g. "Arusha MJINI light blue" → "Arusha".
 * Returns null when nothing matches.
 */
export function resolveTzCity(
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
  for (const [alias, city] of ALIASES) {
    if (haystack.includes(` ${alias} `)) return city
  }
  return null
}
