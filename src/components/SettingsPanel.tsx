import { useState } from 'react'
import { useNetForgeStore } from '../state/useNetForgeStore'

export function SettingsPanel() {
  const hydrated = useNetForgeStore((s) => s.hydrated)
  const loadError = useNetForgeStore((s) => s.loadError)
  const usingCached = useNetForgeStore((s) => s.usingCachedConnector)
  const loaded = useNetForgeStore((s) => s.loadedConnector)
  const loadConnectorForSource = useNetForgeStore((s) => s.loadConnectorForSource)

  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('netforge-connector-meraki')
  const [branch, setBranch] = useState('main')
  const [busy, setBusy] = useState(false)

  const onLoad = async () => {
    const o = owner.trim()
    const r = repo.trim()
    const b = branch.trim()
    if (!o || !r || !b) {
      useNetForgeStore.getState().setLoadError('Owner, repo, and branch are required')
      return
    }
    setBusy(true)
    try {
      await loadConnectorForSource({ owner: o, repo: r, branch: b })
    } finally {
      setBusy(false)
    }
  }

  if (!hydrated) return null

  return (
    <section
      style={{
        border: '1px solid #ccc',
        borderRadius: 8,
        padding: '12px 16px',
        marginBottom: 12,
        background: '#fafafa',
      }}
    >
      <h2 style={{ margin: '0 0 8px', fontSize: '1rem' }}>Connector</h2>
      <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#444' }}>
        Load from jsDelivr: <code>cdn.jsdelivr.net/gh/[owner]/[repo]@[branch]</code>
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: '0.75rem' }}>Owner</span>
          <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="GitHub user or org" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: '0.75rem' }}>Repo</span>
          <input value={repo} onChange={(e) => setRepo(e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: '0.75rem' }}>Branch</span>
          <input value={branch} onChange={(e) => setBranch(e.target.value)} />
        </label>
        <button type="button" onClick={() => void onLoad()} disabled={busy}>
          {busy ? 'Loading…' : 'Load connector'}
        </button>
      </div>
      {loadError && (
        <p style={{ color: '#b00020', margin: '8px 0 0', fontSize: '0.9rem' }} role="alert">
          {loadError}
        </p>
      )}
      {usingCached && !loadError && loaded && (
        <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: '#555' }}>
          Using cached connector (offline or last good fetch).
        </p>
      )}
      {loaded && !loadError && (
        <p style={{ margin: '8px 0 0', fontSize: '0.9rem' }}>
          Loaded: <strong>{loaded.manifest.displayName}</strong> — {loaded.products.length} products
        </p>
      )}
    </section>
  )
}
