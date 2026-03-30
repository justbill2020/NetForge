// ============================================================================
// NetForge Price List Parser
// Handles Meraki / Cisco partner portal CSV exports
// Returns Record<sku, listPrice> — merged into org CRDT store
// ============================================================================

const SKU_COLS   = ['sku', 'part number', 'part#', 'item number']
const PRICE_COLS = ['list price', 'msrp', 'partner price', 'unit price', 'price']

function findCol(headers: string[], candidates: string[]): number {
  const normalized = headers.map(h => h.toLowerCase().trim())
  for (const c of candidates) {
    const idx = normalized.indexOf(c)
    if (idx !== -1) return idx
  }
  return -1
}

export function parsePriceListCsv(csv: string): Record<string, number> {
  const lines = csv.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return {}

  const headers = lines[0].split(',')
  const skuIdx   = findCol(headers, SKU_COLS)
  const priceIdx = findCol(headers, PRICE_COLS)

  if (skuIdx === -1 || priceIdx === -1) {
    console.warn('[NetForge] Could not identify SKU or Price columns in CSV')
    return {}
  }

  const result: Record<string, number> = {}

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const sku   = cols[skuIdx]?.trim().toUpperCase()
    const price = parseFloat(cols[priceIdx]?.replace(/[$,]/g, ''))

    if (sku && !isNaN(price)) {
      result[sku] = price
    }
  }

  return result
}
