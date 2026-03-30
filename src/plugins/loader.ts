// ============================================================================
// NetForge Plugin Loader
// Prod: loads connector JSON from jsDelivr (GitHub CDN)
// Dev:  VITE_DEV_* env points at local connector.json or base URL
// ============================================================================

import type { ConnectorData, ConnectorManifest } from '../types/connector'

export interface PluginSource {
  owner: string
  repo: string
  branch: string
}

const JSDELIVR = 'https://cdn.jsdelivr.net/gh'

function devOverridePath(repo: string): string | null {
  const key = `VITE_DEV_${repo.replace(/-/g, '_').toUpperCase()}`
  return (import.meta.env as Record<string, string>)[key] ?? null
}

function assembleConnectorData(manifest: ConnectorManifest, body: Record<string, unknown>): ConnectorData {
  return {
    manifest,
    products: Array.isArray(body.products) ? (body.products as ConnectorData['products']) : [],
    designRules: Array.isArray(body.designRules) ? (body.designRules as ConnectorData['designRules']) : [],
    compatibility: Array.isArray(body.compatibility)
      ? (body.compatibility as ConnectorData['compatibility'])
      : [],
    accessories: Array.isArray(body.accessories) ? (body.accessories as ConnectorData['accessories']) : undefined,
  }
}

export async function loadConnector(source: PluginSource): Promise<ConnectorData> {
  const devPath = devOverridePath(source.repo)

  if (devPath?.endsWith('.json')) {
    const bodyRes = await fetch(devPath)
    if (!bodyRes.ok) throw new Error(`Failed to load local connector: ${devPath}`)
    const body = (await bodyRes.json()) as Record<string, unknown>
    const manifestUrl = devPath.replace(/[^/]+$/, 'netforge-plugin.json')
    const manRes = await fetch(manifestUrl)
    if (!manRes.ok) {
      throw new Error(`Failed to load local manifest next to connector: ${manifestUrl}`)
    }
    const manifest = (await manRes.json()) as ConnectorManifest
    return assembleConnectorData(manifest, body)
  }

  const baseUrl = devPath
    ? devPath.replace(/\/$/, '')
    : `${JSDELIVR}/${source.owner}/${source.repo}@${source.branch}`

  const manifest: ConnectorManifest = await fetch(`${baseUrl}/netforge-plugin.json`).then((r) => {
    if (!r.ok) throw new Error(`Failed to load manifest from ${baseUrl}`)
    return r.json()
  })

  const dataRes = await fetch(`${baseUrl}/${manifest.entry}`)
  if (!dataRes.ok) throw new Error(`Failed to load connector data from ${baseUrl}`)
  const body = (await dataRes.json()) as Record<string, unknown>

  return assembleConnectorData(manifest, body)
}

export async function loadConnectors(sources: PluginSource[]): Promise<ConnectorData[]> {
  return Promise.all(sources.map(loadConnector))
}
