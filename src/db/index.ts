import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { ConnectorData } from '../types/connector'
import type { AppSettings, ProjectRecord } from './schema'
import { DEFAULT_SETTINGS } from './schema'

const DB_NAME = 'netforge'
const DB_VERSION = 1

interface NetForgeDB extends DBSchema {
  meta: {
    key: string
    value: AppSettings
  }
  projects: {
    key: string
    value: ProjectRecord
  }
  connectorCache: {
    key: string
    value: { fetchedAt: number; data: ConnectorData }
  }
}

let dbPromise: Promise<IDBPDatabase<NetForgeDB>> | null = null

export function getDb(): Promise<IDBPDatabase<NetForgeDB>> {
  if (!dbPromise) {
    dbPromise = openDB<NetForgeDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
        if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects')
        if (!db.objectStoreNames.contains('connectorCache')) {
          db.createObjectStore('connectorCache')
        }
      },
    })
  }
  return dbPromise
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDb()
  const row = await db.get('meta', 'settings')
  if (!row) {
    await db.put('meta', { ...DEFAULT_SETTINGS }, 'settings')
    return { ...DEFAULT_SETTINGS }
  }
  return row
}

export async function saveSettings(partial: Partial<AppSettings>): Promise<void> {
  const db = await getDb()
  const cur = await getSettings()
  const next: AppSettings = { ...cur, ...partial }
  await db.put('meta', next, 'settings')
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const db = await getDb()
  return db.getAll('projects')
}

export async function getProject(id: string): Promise<ProjectRecord | undefined> {
  const db = await getDb()
  return db.get('projects', id)
}

export async function saveProject(record: ProjectRecord): Promise<void> {
  const db = await getDb()
  await db.put('projects', { ...record, updatedAt: Date.now() })
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('projects', id)
}

export async function getCachedConnector(key: string): Promise<ConnectorData | null> {
  const db = await getDb()
  const row = await db.get('connectorCache', key)
  return row?.data ?? null
}

export async function setCachedConnector(key: string, data: ConnectorData): Promise<void> {
  const db = await getDb()
  await db.put('connectorCache', { fetchedAt: Date.now(), data }, key)
}

export function connectorCacheKey(source: { owner: string; repo: string; branch: string }): string {
  return `${source.owner}/${source.repo}@${source.branch}`
}
