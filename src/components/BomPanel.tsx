import { useMemo } from 'react'
import { useNetForgeStore } from '../state/useNetForgeStore'
import { aggregateBomLines, placedDevicesToProducts } from '../engine/bom'

export function BomPanel() {
  const design = useNetForgeStore((s) => s.design)
  const connector = useNetForgeStore((s) => s.loadedConnector)

  const { lines, missing } = useMemo(() => {
    if (!connector) {
      return { lines: [], missing: [] as { sku: string }[] }
    }
    const resolved = placedDevicesToProducts(design.devices, connector.products)
    const miss = resolved.filter((r) => !r.product).map((r) => ({ sku: r.placed.productSku }))
    const lines = aggregateBomLines(resolved, design.defaultOpportunityTerms)
    return { lines, missing: miss }
  }, [connector, design.devices, design.defaultOpportunityTerms])

  if (!connector) {
    return (
      <section style={{ padding: 12, color: '#666' }}>
        Load a connector to see the live BOM.
      </section>
    )
  }

  return (
    <section style={{ border: '1px solid #ccc', borderRadius: 8, overflow: 'hidden' }}>
      <h2 style={{ margin: 0, padding: '10px 12px', background: '#f0f0f0', fontSize: '1rem' }}>
        Bill of materials ({lines.length} lines)
      </h2>
      {missing.length > 0 && (
        <div style={{ padding: '8px 12px', background: '#fff3e0', fontSize: '0.85rem' }}>
          Unknown SKUs in design (not in catalog): {missing.map((m) => m.sku).join(', ')}
        </div>
      )}
      <div style={{ maxHeight: 320, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: 8 }}>SKU</th>
              <th style={{ padding: 8 }}>Description</th>
              <th style={{ padding: 8 }}>Qty</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((row) => (
              <tr key={row.sku} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 8, fontFamily: 'monospace' }}>{row.sku}</td>
                <td style={{ padding: 8 }}>{row.description}</td>
                <td style={{ padding: 8 }}>{row.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
