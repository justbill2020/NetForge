// ============================================================================
// NetForge Connector Types
// All vendor connectors must conform to this schema (JSON)
// ============================================================================

export interface ConnectorManifest {
  schemaVersion: '1.0'
  vendor: string              // e.g. "cisco-meraki"
  displayName: string
  version: string
  description: string
  author: string
  license: string
  families: string[]          // e.g. ["MX", "MS", "MR"]
  entry: string               // path to connector JSON, relative to manifest
}

export interface Product {
  sku: string
  family: string              // MX | MS | MR | etc.
  model: string
  description: string
  specs: Record<string, string | number | boolean>
  licenseRequired: boolean
  skuPattern?: string         // e.g. "LIC-{{MODEL}}-ENT-{{TERM}}"
  licenseTiers?: string[]     // e.g. ["ENT"]
  terms?: number[]            // e.g. [1, 3, 5, 7, 10]
}

export interface DesignRule {
  id: string
  severity: 'error' | 'warning' | 'info'
  appliesTo: string[]         // family names
  description: string
  // Declarative rule fields — evaluated by NetForge core engine
  field?: string
  comparison?: string
  message: string
}

export interface CompatibilityRule {
  id: string
  device: string
  requires?: string
  incompatibleWith?: string[]
  description: string
}

export interface ConnectorData {
  manifest: ConnectorManifest
  products: Product[]
  designRules: DesignRule[]
  compatibility: CompatibilityRule[]
  accessories?: Product[]
}
