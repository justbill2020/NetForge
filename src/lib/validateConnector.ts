import type { ConnectorData, Product } from '../types/connector'

function isProduct(x: unknown): x is Product {
  if (!x || typeof x !== 'object') return false
  const p = x as Record<string, unknown>
  return (
    typeof p.sku === 'string' &&
    typeof p.family === 'string' &&
    typeof p.model === 'string' &&
    typeof p.description === 'string' &&
    typeof p.licenseRequired === 'boolean' &&
    p.specs !== null &&
    typeof p.specs === 'object'
  )
}

/** Returns validated ConnectorData or throws with a readable message. */
export function validateConnectorData(data: ConnectorData): void {
  if (!data.manifest || typeof data.manifest !== 'object') {
    throw new Error('Connector is missing manifest')
  }
  const m = data.manifest
  if (m.schemaVersion !== '1.0') {
    throw new Error(`Unsupported connector schemaVersion: ${String(m.schemaVersion)}`)
  }
  if (!Array.isArray(data.products)) {
    throw new Error('Connector must include a products array')
  }
  for (let i = 0; i < data.products.length; i++) {
    if (!isProduct(data.products[i])) {
      throw new Error(`Invalid product at index ${i}`)
    }
  }
  if (!Array.isArray(data.designRules)) {
    throw new Error('Connector must include designRules array')
  }
  if (!Array.isArray(data.compatibility)) {
    throw new Error('Connector must include compatibility array')
  }
}
