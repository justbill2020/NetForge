import type { PluginSource } from '../plugins/loader'

export interface AppSettings {
  sources: PluginSource[]
  lastActiveProjectId: string | null
}

export interface ProjectRecord {
  id: string
  name: string
  /** JSON.stringify(DesignDoc) */
  designJson: string
  updatedAt: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  sources: [],
  lastActiveProjectId: null,
}
