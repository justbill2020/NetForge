// ============================================================================
// NetForge BOM Engine
// Resolves design devices + opportunity terms → BOM line items
// Evaluates design rules from loaded connectors
// ============================================================================

import type { ConnectorData, Product } from '../types/connector'
import type { PlacedDevice, OpportunityTerms } from '../canvas/types'

export type { OpportunityTerms } from '../canvas/types'

export interface BomLineItem {
  sku: string
  description: string
  quantity: number
  unitListPrice?: number     // populated after price list CSV is loaded
  extListPrice?: number
}

export interface DesignViolation {
  ruleId: string
  severity: 'error' | 'warning' | 'info'
  message: string
  deviceId?: string
}

// Interpolate SKU pattern: "LIC-{{MODEL}}-ENT-{{TERM}}" → "LIC-MX75-ENT-3Y"
function resolveSkuPattern(pattern: string, model: string, terms: OpportunityTerms): string {
  return pattern
    .replace('{{MODEL}}', model)
    .replace('{{TIER}}', terms.licenseTier)
    .replace('{{TERM}}', `${terms.termYears}Y`)
}

export interface ResolvedPlacement {
  placed: PlacedDevice
  product: Product | null
}

export function placedDevicesToProducts(placed: PlacedDevice[], catalog: Product[]): ResolvedPlacement[] {
  const bySku = new Map(catalog.map((p) => [p.sku, p]))
  return placed.map((d) => ({
    placed: d,
    product: bySku.get(d.productSku) ?? null,
  }))
}

export function aggregateBomLines(resolved: ResolvedPlacement[], terms: OpportunityTerms): BomLineItem[] {
  const map = new Map<string, BomLineItem>()
  for (const { product } of resolved) {
    if (!product) continue
    for (const line of resolveProductSku(product, terms)) {
      const prev = map.get(line.sku)
      if (prev) {
        prev.quantity += line.quantity
        prev.extListPrice = undefined
      } else {
        map.set(line.sku, { ...line })
      }
    }
  }
  return [...map.values()]
}

export function resolveProductSku(product: Product, terms: OpportunityTerms): BomLineItem[] {
  const items: BomLineItem[] = [
    { sku: product.sku, description: product.description, quantity: 1 }
  ]

  if (product.licenseRequired && product.skuPattern) {
    const licSku = resolveSkuPattern(product.skuPattern, product.model, terms)
    items.push({
      sku: licSku,
      description: `${product.model} ${terms.licenseTier} License ${terms.termYears}Y`,
      quantity: 1
    })
  }

  return items
}

// TODO: wire to canvas device placements
export function evaluateDesignRules(
  _connectors: ConnectorData[],
  _placedDevices: Product[]
): DesignViolation[] {
  // Stub — constraint engine wired in next session
  return []
}
