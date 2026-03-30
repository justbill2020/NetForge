import { create } from 'zustand'
import type { ConnectorData } from '../types/connector'
import {
  connectorCacheKey,
  getCachedConnector,
  getSettings,
  listProjects,
  saveProject as dbSaveProject,
  saveSettings,
  setCachedConnector,
} from '../db'
import { loadConnector, type PluginSource } from '../plugins/loader'
import { validateConnectorData } from '../lib/validateConnector'
import { emptyDesignDoc, type DesignDoc } from '../canvas/types'
import type { ProjectRecord } from '../db/schema'

function cloneDesign(d: DesignDoc): DesignDoc {
  return JSON.parse(JSON.stringify(d)) as DesignDoc
}

const HISTORY_CAP = 80

interface NetForgeState {
  hydrated: boolean
  settings: import('../db/schema').AppSettings
  activeProjectId: string | null
  projectName: string
  design: DesignDoc
  historyPast: DesignDoc[]
  historyFuture: DesignDoc[]
  loadedConnector: ConnectorData | null
  connectorSource: PluginSource | null
  loadError: string | null
  usingCachedConnector: boolean
}

interface NetForgeActions {
  hydrate: () => Promise<void>
  /** Replace design without affecting undo (e.g. load from DB). */
  replaceDesign: (d: DesignDoc) => void
  commitDesign: (next: DesignDoc) => void
  undo: () => void
  redo: () => void
  setLoadError: (msg: string | null) => void
  loadConnectorForSource: (source: PluginSource) => Promise<void>
  updateSettingsSources: (sources: PluginSource[]) => Promise<void>
  flushSaveProject: () => Promise<void>
}

type Store = NetForgeState & NetForgeActions

const initialDesign = emptyDesignDoc()

export const useNetForgeStore = create<Store>((set, get) => ({
  hydrated: false,
  settings: { sources: [], lastActiveProjectId: null },
  activeProjectId: null,
  projectName: 'My design',
  design: initialDesign,
  historyPast: [],
  historyFuture: [],
  loadedConnector: null,
  connectorSource: null,
  loadError: null,
  usingCachedConnector: false,

  hydrate: async () => {
    const settings = await getSettings()
    let activeId = settings.lastActiveProjectId
    let projects = await listProjects()
    if (projects.length === 0) {
      const id = crypto.randomUUID()
      const rec: ProjectRecord = {
        id,
        name: 'My design',
        designJson: JSON.stringify(emptyDesignDoc()),
        updatedAt: Date.now(),
      }
      await dbSaveProject(rec)
      await saveSettings({ ...settings, lastActiveProjectId: id })
      projects = [rec]
      activeId = id
    }
    const active = projects.find((p) => p.id === activeId) ?? projects[0]!
    let design = emptyDesignDoc()
    try {
      design = JSON.parse(active.designJson) as DesignDoc
      if (!design.devices || !design.links || !design.sites) throw new Error('bad shape')
    } catch {
      design = emptyDesignDoc()
    }
    set({
      hydrated: true,
      settings: await getSettings(),
      activeProjectId: active.id,
      projectName: active.name,
      design,
      historyPast: [],
      historyFuture: [],
    })
  },

  replaceDesign: (d) => {
    set({ design: cloneDesign(d), historyPast: [], historyFuture: [] })
  },

  commitDesign: (next) => {
    const cur = get().design
    set((s) => ({
      design: cloneDesign(next),
      historyPast: [...s.historyPast, cloneDesign(cur)].slice(-HISTORY_CAP),
      historyFuture: [],
    }))
  },

  undo: () => {
    const { historyPast, design, historyFuture } = get()
    if (historyPast.length === 0) return
    const prev = historyPast[historyPast.length - 1]!
    set({
      design: cloneDesign(prev),
      historyPast: historyPast.slice(0, -1),
      historyFuture: [cloneDesign(design), ...historyFuture],
    })
  },

  redo: () => {
    const { historyFuture, design, historyPast } = get()
    if (historyFuture.length === 0) return
    const nxt = historyFuture[0]!
    set({
      design: cloneDesign(nxt),
      historyFuture: historyFuture.slice(1),
      historyPast: [...historyPast, cloneDesign(design)].slice(-HISTORY_CAP),
    })
  },

  setLoadError: (loadError) => set({ loadError }),

  updateSettingsSources: async (sources) => {
    await saveSettings({ sources })
    set({ settings: { ...get().settings, sources } })
  },

  loadConnectorForSource: async (source) => {
    set({ loadError: null, usingCachedConnector: false })
    const key = connectorCacheKey(source)
    try {
      const data = await loadConnector(source)
      validateConnectorData(data)
      await setCachedConnector(key, data)
      set({
        loadedConnector: data,
        connectorSource: source,
        usingCachedConnector: false,
      })
      await saveSettings({
        sources: [source],
        lastActiveProjectId: get().activeProjectId,
      })
      set({ settings: { ...get().settings, sources: [source] } })
    } catch (e) {
      const cached = await getCachedConnector(key)
      if (cached) {
        try {
          validateConnectorData(cached)
          set({
            loadedConnector: cached,
            connectorSource: source,
            usingCachedConnector: true,
            loadError: null,
          })
          return
        } catch {
          /* fall through */
        }
      }
      const msg = e instanceof Error ? e.message : 'Failed to load connector'
      set({
        loadedConnector: null,
        connectorSource: source,
        loadError: msg,
        usingCachedConnector: false,
      })
    }
  },

  flushSaveProject: async () => {
    const { activeProjectId, projectName, design } = get()
    if (!activeProjectId) return
    await dbSaveProject({
      id: activeProjectId,
      name: projectName,
      designJson: JSON.stringify(design),
      updatedAt: Date.now(),
    })
  },
}))
