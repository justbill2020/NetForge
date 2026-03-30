import { useEffect, useRef } from 'react'
import { SettingsPanel } from './components/SettingsPanel'
import { BomPanel } from './components/BomPanel'
import { DesignCanvas } from './canvas/DesignCanvas'
import { useNetForgeStore } from './state/useNetForgeStore'

const SAVE_DEBOUNCE_MS = 400

export default function App() {
  const hydrated = useNetForgeStore((s) => s.hydrated)
  const hydrate = useNetForgeStore((s) => s.hydrate)
  const design = useNetForgeStore((s) => s.design)
  const flushSaveProject = useNetForgeStore((s) => s.flushSaveProject)
  const undo = useNetForgeStore((s) => s.undo)
  const redo = useNetForgeStore((s) => s.redo)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  useEffect(() => {
    if (!hydrated) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void flushSaveProject()
    }, SAVE_DEBOUNCE_MS)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [design, hydrated, flushSaveProject])

  if (!hydrated) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <p>Loading…</p>
      </div>
    )
  }

  return (
    <div
      style={{
        padding: '1rem',
        maxWidth: 1400,
        margin: '0 auto',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: '0 0 4px' }}>NetForge</h1>
        <p style={{ margin: 0, color: '#555', fontSize: '0.95rem' }}>
          Local-first network design — no NetForge backend. Connectors from jsDelivr; data in IndexedDB.
        </p>
      </header>

      <SettingsPanel />

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button type="button" onClick={() => undo()}>
          Undo
        </button>
        <button type="button" onClick={() => redo()}>
          Redo
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
        <DesignCanvas />
        <BomPanel />
      </div>
    </div>
  )
}
