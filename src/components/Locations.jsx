import { API_BASE } from '../api'
import { useEffect, useMemo, useState } from 'react'
import { Button } from "@/components/ui/button" 
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// --- ADD 'onCoordinateClick' to props ---
export function Locations ({ query, onCoordinateClick }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [r, setR] = useState(6.0)
  const [limit, setLimit] = useState(200)
  const [offset, setOffset] = useState(0)

  const [sortKey, setSortKey] = useState('study_id')
  const [sortDir, setSortDir] = useState('asc')
  const pageSize = 30
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1); setOffset(0) }, [query])

  useEffect(() => {
    if (!query) {
      setRows([]) 
      return
    }
    let alive = true
    const ac = new AbortController()
    ;(async () => {
      setLoading(true); setErr('')
      try {
        const u = new URL(`${API_BASE}/query/${encodeURIComponent(query)}/locations`)
        u.searchParams.set('r', String(r))
        if (limit != null) u.searchParams.set('limit', String(limit))
        if (offset) u.searchParams.set('offset', String(offset))
        const res = await fetch(u.toString(), { signal: ac.signal })
        const data = await res.json().catch(()=>({}))
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
        if (!alive) return
        setRows(Array.isArray(data?.results) ? data.results : [])
      } catch (e) {
        if (!alive) return
        setErr(e?.message || String(e))
        setRows([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false; ac.abort() }
  }, [query, r, limit, offset])

  const sorted = useMemo(() => {
    // ... (sorting logic unchanged) ...
    const arr = [...rows]
    const dir = sortDir === 'asc' ? 1 : -1
    arr.sort((a,b) => {
      const A = a?.[sortKey], B = b?.[sortKey]
      if (sortKey === 'study_id' || sortKey === 'x' || sortKey === 'y' || sortKey === 'z') {
        return ((Number(A)||0) - (Number(B)||0)) * dir
      }
      return String(A||'').localeCompare(String(B||'')) * dir
    })
    return arr
  }, [rows, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize)

  const changeSort = (k) => {
    if (k === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
  }

  if (loading) {
    // ... (loading spinner unchanged) ...
    return (
      <div className="flex items-center justify-center p-8 h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-500"></div>
          <p className="text-slate-600 text-sm">Loading locations...</p>
        </div>
      </div>
    )
  }

  if (!loading && !err && sorted.length === 0) {
    // ... (empty state unchanged) ...
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-96">
        <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-slate-500 text-lg font-medium mb-2">
          {query ? "No locations found" : "No query"}
        </p>
        <p className="text-slate-400 text-sm">
          {query ? "Try a different search term" : "Enter a term in the query builder to begin"}
        </p>
      </div>
    )
  }

  return (
    <div className='flex flex-col'>
      {err && (
        <div className='m-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive'>
          {err}
        </div>
      )}

      {/* --- Controls (unchanged) --- */}
      <div className='flex flex-wrap items-end gap-3 px-3 pb-2 text-sm'>
        <div>
          <Label htmlFor="loc-r" className="text-xs">r (mm)</Label>
          <Input id="loc-r" type='number' step='0.5' value={r} onChange={e=>setR(Number(e.target.value)||6)} className='w-24 h-8' />
        </div>
        <div>
          <Label htmlFor="loc-limit" className="text-xs">Limit</Label>
          <Input id="loc-limit" type='number' step='10' value={limit} onChange={e=>setLimit(Math.max(0, Number(e.target.value)||0))} className='w-24 h-8' />
        </div>
        <div>
          <Label htmlFor="loc-offset" className="text-xs">Offset</Label>
          <Input id="loc-offset" type='number' step='10' value={offset} onChange={e=>setOffset(Math.max(0, Number(e.target.value)||0))} className='w-24 h-8' />
        </div>
      </div>

      {!err && (
        <>
          <div className="rounded-lg border border-slate-200 overflow-hidden dark:border-slate-700">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  {[
                    { key: 'study_id', label: 'Study ID' },
                    { key: 'x', label: 'X' },
                    { key: 'y', label: 'Y' },
                    { key: 'z', label: 'Z' }
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      className='px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer'
                      onClick={() => changeSort(key)}
                    >
                      <span className='inline-flex items-center gap-2'>
                        {label}
                        <span className='text-xs text-muted-foreground'>{sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100 dark:bg-slate-950 dark:divide-slate-800">
                {pageRows.map((r, i) => (
                  // --- CLICK HANDLER ADDED ---
                  <tr 
                    key={i} 
                    className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                    onClick={() => onCoordinateClick({ x: r.x, y: r.y, z: r.z })}
                  >
                    <td className='px-4 py-3 text-sm align-top'>{r.study_id}</td>
                    <td className='px-4 py-3 text-sm align-top'>{r.x}</td>
                    <td className='px-4 py-3 text-sm align-top'>{r.y}</td>
                    <td className='px-4 py-3 text-sm align-top'>{r.z}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* --- Pagination (unchanged) --- */}
          <div className='flex items-center justify-between border-t border-slate-200 dark:border-slate-700 p-3 text-sm'>
            <div className='text-muted-foreground'>
              Total <b>{sorted.length}</b> records, page <b>{page}</b>/<b>{totalPages}</b>
            </div>
            <div className='flex items-center gap-2'>
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(1)}>⏮</Button>
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>⏭</Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}