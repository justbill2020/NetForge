import { useCallback, useMemo, useRef, useState } from 'react'
import type { Product } from '../types/connector'
import { useNetForgeStore } from '../state/useNetForgeStore'
import type { DesignDoc, DesignLink, LinkType, PlacedDevice, Site } from './types'

const NODE_W = 140
const NODE_H = 52

function uniqueProducts(products: Product[]): Product[] {
  const seen = new Set<string>()
  const out: Product[] = []
  for (const p of products) {
    if (seen.has(p.sku)) continue
    seen.add(p.sku)
    out.push(p)
  }
  return out.sort((a, b) => a.description.localeCompare(b.description))
}

export function DesignCanvas() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const loadedConnector = useNetForgeStore((s) => s.loadedConnector)
  const design = useNetForgeStore((s) => s.design)
  const commitDesign = useNetForgeStore((s) => s.commitDesign)

  const [pan, setPan] = useState({ x: 80, y: 60 })
  const [zoom, setZoom] = useState(1)
  const [mode, setMode] = useState<'select' | 'place' | 'link' | 'pan'>('select')
  const [linkType, setLinkType] = useState<LinkType>('lan')
  const [paletteSku, setPaletteSku] = useState<string | null>(null)
  const [linkFromId, setLinkFromId] = useState<string | null>(null)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null)
  const panDrag = useRef<{ x: number; y: number; startPan: { x: number; y: number } } | null>(null)

  const palette = useMemo(
    () => (loadedConnector ? uniqueProducts(loadedConnector.products) : []),
    [loadedConnector]
  )

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current
      if (!svg) return { x: 0, y: 0 }
      const p = svg.createSVGPoint()
      p.x = clientX
      p.y = clientY
      const ctm = svg.getScreenCTM()
      if (!ctm) return { x: 0, y: 0 }
      const sp = p.matrixTransform(ctm.inverse())
      return { x: (sp.x - pan.x) / zoom, y: (sp.y - pan.y) / zoom }
    },
    [pan.x, pan.y, zoom]
  )

  const updateDesign = useCallback(
    (fn: (d: DesignDoc) => void) => {
      const next: DesignDoc = JSON.parse(JSON.stringify(design))
      fn(next)
      commitDesign(next)
    },
    [design, commitDesign]
  )

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const z = Math.min(2.5, Math.max(0.35, zoom * (e.deltaY > 0 ? 0.92 : 1.08)))
    setZoom(z)
  }

  const onPointerDownBg = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType !== 'touch') return
    if (mode === 'pan' || (mode === 'select' && e.shiftKey)) {
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
      panDrag.current = { x: e.clientX, y: e.clientY, startPan: { ...pan } }
    } else if (mode === 'place' && paletteSku && loadedConnector) {
      const { x, y } = toWorld(e.clientX, e.clientY)
      const p = loadedConnector.products.find((pr) => pr.sku === paletteSku)
      if (!p) return
      const device: PlacedDevice = {
        id: crypto.randomUUID(),
        productSku: p.sku,
        x: x - NODE_W / 2,
        y: y - NODE_H / 2,
      }
      updateDesign((d) => {
        d.devices.push(device)
      })
    } else {
      setSelectedDeviceId(null)
      setLinkFromId(null)
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (drag) {
      const { x, y } = toWorld(e.clientX, e.clientY)
      updateDesign((d) => {
        const dev = d.devices.find((dd) => dd.id === drag.id)
        if (!dev) return
        dev.x = x - drag.dx
        dev.y = y - drag.dy
      })
      return
    }
    if (panDrag.current) {
      const dx = e.clientX - panDrag.current.x
      const dy = e.clientY - panDrag.current.y
      setPan({ x: panDrag.current.startPan.x + dx, y: panDrag.current.startPan.y + dy })
    }
  }

  const endPan = (e: React.PointerEvent) => {
    panDrag.current = null
    if (drag) setDrag(null)
    try {
      ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    } catch {
      /* noop */
    }
  }

  const onDevicePointerDown = (e: React.PointerEvent, device: PlacedDevice) => {
    e.stopPropagation()
    setSelectedDeviceId(device.id)
    if (mode === 'link') {
      if (!linkFromId) {
        setLinkFromId(device.id)
      } else if (linkFromId !== device.id) {
        const from = linkFromId
        const to = device.id
        updateDesign((d) => {
          d.links.push({
            id: crypto.randomUUID(),
            fromDeviceId: from,
            toDeviceId: to,
            linkType,
          })
        })
        setLinkFromId(null)
      }
      return
    }
    if (mode === 'select') {
      const { x, y } = toWorld(e.clientX, e.clientY)
      setDrag({
        id: device.id,
        dx: x - device.x,
        dy: y - device.y,
      })
      ;(e.target as Element).setPointerCapture(e.pointerId)
    }
  }

  const addSite = (name: string) => {
    const n = name.trim()
    if (!n) return
    updateDesign((d) => {
      d.sites.push({ id: crypto.randomUUID(), name: n })
    })
  }

  const assignSite = (deviceId: string, siteId: string | '') => {
    updateDesign((d) => {
      const dev = d.devices.find((x) => x.id === deviceId)
      if (!dev) return
      dev.siteId = siteId || undefined
    })
  }

  const setDeviceLabel = (deviceId: string, label: string) => {
    updateDesign((d) => {
      const dev = d.devices.find((x) => x.id === deviceId)
      if (!dev) return
      dev.label = label || undefined
    })
  }

  const selected = design.devices.find((d) => d.id === selectedDeviceId)

  const linkPaths = useMemo(() => {
    const byId = new Map(design.devices.map((d) => [d.id, d]))
    return design.links
      .map((L: DesignLink) => {
        const a = byId.get(L.fromDeviceId)
        const b = byId.get(L.toDeviceId)
        if (!a || !b) return null
        const x1 = a.x + NODE_W / 2
        const y1 = a.y + NODE_H / 2
        const x2 = b.x + NODE_W / 2
        const y2 = b.y + NODE_H / 2
        return { ...L, x1, y1, x2, y2 }
      })
      .filter(Boolean) as (DesignLink & { x1: number; y1: number; x2: number; y2: number })[]
  }, [design.devices, design.links])

  if (!loadedConnector) {
    return (
      <p style={{ color: '#666', padding: 16 }}>Load a connector to use the design canvas.</p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem' }}>Mode:</span>
        {(['select', 'place', 'link', 'pan'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m)
              setLinkFromId(null)
            }}
            style={{ fontWeight: mode === m ? 'bold' : 'normal' }}
          >
            {m}
          </button>
        ))}
        <label style={{ fontSize: '0.85rem' }}>
          Link type{' '}
          <select value={linkType} onChange={(e) => setLinkType(e.target.value as LinkType)}>
            <option value="wan">WAN</option>
            <option value="lan">LAN</option>
            <option value="wireless">Wireless</option>
            <option value="uplink">Uplink</option>
          </select>
        </label>
        <NewSiteInput onAdd={addSite} />
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div
          style={{
            width: 220,
            maxHeight: 420,
            overflowY: 'auto',
            border: '1px solid #ccc',
            borderRadius: 6,
            padding: 8,
            fontSize: '0.8rem',
          }}
        >
          <strong>Palette</strong>
          <p style={{ margin: '4px 0', color: '#555' }}>
            {mode === 'place' ? 'Click canvas to place selected SKU.' : 'Choose Place mode, then pick a product.'}
          </p>
          {palette.map((p) => (
            <button
              key={p.sku}
              type="button"
              onClick={() => {
                setPaletteSku(p.sku)
                setMode('place')
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                marginBottom: 4,
                background: paletteSku === p.sku ? '#e3f2fd' : '#fff',
              }}
            >
              {p.model} — {p.sku}
            </button>
          ))}
        </div>

        <svg
          ref={svgRef}
          width="100%"
          height={480}
          style={{ border: '1px solid #999', borderRadius: 6, touchAction: 'none', flex: 1, minWidth: 280 }}
          onWheel={onWheel}
          onPointerDown={onPointerDownBg}
          onPointerMove={onPointerMove}
          onPointerUp={endPan}
          onPointerCancel={endPan}
        >
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {linkPaths.map((L) => (
              <line
                key={L.id}
                x1={L.x1}
                y1={L.y1}
                x2={L.x2}
                y2={L.y2}
                stroke="#333"
                strokeWidth={2 / zoom}
                strokeDasharray={L.linkType === 'wireless' ? '6 4' : undefined}
              />
            ))}
            {design.devices.map((d) => {
              const p = loadedConnector.products.find((pr) => pr.sku === d.productSku)
              const site = d.siteId ? design.sites.find((s: Site) => s.id === d.siteId) : null
              const sel = d.id === selectedDeviceId
              return (
                <g key={d.id} transform={`translate(${d.x},${d.y})`}>
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={6}
                    fill={sel ? '#fff9c4' : '#fff'}
                    stroke={sel ? '#f57f17' : '#555'}
                    strokeWidth={2 / zoom}
                    onPointerDown={(e) => onDevicePointerDown(e, d)}
                  />
                  <text x={8} y={22} fontSize={12 / zoom} style={{ pointerEvents: 'none' }}>
                    {p?.model ?? d.productSku}
                  </text>
                  <text x={8} y={40} fontSize={10 / zoom} fill="#666" style={{ pointerEvents: 'none' }}>
                    {site?.name ?? ''}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
      </div>

      {selected && (
        <DeviceInspector
          key={selected.id}
          device={selected}
          sites={design.sites}
          onSiteChange={(sid) => assignSite(selected.id, sid)}
          onLabelChange={(lbl) => setDeviceLabel(selected.id, lbl)}
        />
      )}
    </div>
  )
}

function NewSiteInput({ onAdd }: { onAdd: (name: string) => void }) {
  const [v, setV] = useState('')
  return (
    <span style={{ fontSize: '0.85rem' }}>
      New site{' '}
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder="name" />
      <button type="button" onClick={() => { onAdd(v); setV('') }}>
        Add
      </button>
    </span>
  )
}

function DeviceInspector({
  device,
  sites,
  onSiteChange,
  onLabelChange,
}: {
  device: PlacedDevice
  sites: Site[]
  onSiteChange: (siteId: string) => void
  onLabelChange: (label: string) => void
}) {
  const [label, setLabel] = useState(device.label ?? '')
  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 6, padding: 12, fontSize: '0.9rem' }}>
      <strong>Selected device</strong> ({device.productSku})
      <div style={{ marginTop: 8 }}>
        <label>
          Label{' '}
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => onLabelChange(label)}
          />
        </label>
      </div>
      <div style={{ marginTop: 8 }}>
        <label>
          Site{' '}
          <select
            value={device.siteId ?? ''}
            onChange={(e) => onSiteChange(e.target.value)}
          >
            <option value="">—</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
