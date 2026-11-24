// Date-range presets computed in East Africa Time (UTC+3, no DST — Kenya and
// Tanzania). Day boundaries must NOT depend on the laptop's local clock or
// timezone, otherwise two users see different "Today" numbers for the same data.

export type DatePreset = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'custom'

const EAT_OFFSET_MS = 3 * 60 * 60 * 1000

// Current date parts as seen in EAT
function eatNowParts() {
  const t = new Date(Date.now() + EAT_OFFSET_MS)
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), dow: t.getUTCDay() }
}

// Midnight (start of day) of the given EAT calendar date, as a real instant
function eatDate(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d) - EAT_OFFSET_MS)
}

export function getDateRange(preset: DatePreset, customFrom?: string, customTo?: string): { from: Date | null; to: Date | null } {
  const { y, m, d, dow } = eatNowParts()
  const endOf = (start: Date, days: number) => new Date(start.getTime() + days * 86400000 - 1)
  switch (preset) {
    case 'today': {
      const from = eatDate(y, m, d)
      return { from, to: endOf(from, 1) }
    }
    case 'yesterday': {
      const from = eatDate(y, m, d - 1)
      return { from, to: endOf(from, 1) }
    }
    case 'this_week': {
      const from = eatDate(y, m, d - dow)
      return { from, to: endOf(eatDate(y, m, d), 1) }
    }
    case 'this_month': {
      return { from: eatDate(y, m, 1), to: endOf(eatDate(y, m, d), 1) }
    }
    case 'last_month': {
      const from = eatDate(y, m - 1, 1)
      return { from, to: new Date(eatDate(y, m, 1).getTime() - 1) }
    }
    case 'custom': {
      // customFrom/customTo are yyyy-mm-dd strings from <input type="date">
      const parse = (s: string) => { const [yy, mm, dd] = s.split('-').map(Number); return eatDate(yy, mm - 1, dd) }
      const f = customFrom ? parse(customFrom) : null
      const t = customTo ? endOf(parse(customTo), 1) : null
      return { from: f, to: t }
    }
    default: return { from: null, to: null }
  }
}
