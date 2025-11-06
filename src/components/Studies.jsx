import { API_BASE } from '../api'
import { useEffect, useMemo, useState } from 'react'
// Removed Table/TableHead etc. imports
import { Button } from "@/components/ui/button"

export function Studies ({ query }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [sortKey, setSortKey] = useState('year')
  const [sortDir, setSortDir] = useState('desc') // 'asc' | 'desc'
  const [page, setPage] = useState(1)
  const pageSize = 20

  useEffect(() => { setPage(1) }, [query])

  useEffect(() => {
    if (!query) {
      setRows([]) // Clear rows when query is empty
      return
    }
    let alive = true
    const ac = new AbortController()
    ;(async () => {
      setLoading(true)
      setErr('')
      try {
        const url = `${API_BASE}/query/${encodeURIComponent(query)}/studies`
        const res = await fetch(url, { signal: ac.signal })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
        if (!alive) return
        const list = Array.isArray(data?.results) ? data.results : []
        setRows(list)
      } catch (e) {
        if (!alive) return
        setErr(`Unable to fetch studies: ${e?.message || e}`)
        setRows([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false; ac.abort() }
  }, [query])

  const changeSort = (key) => {
    if (key === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    const arr = [...rows]
    const dir = sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      const A = a?.[sortKey]
      const B = b?.[sortKey]
      if (sortKey === 'year') return (Number(A || 0) - Number(B || 0)) * dir
      return String(A || '').localeCompare(String(B || ''), 'en') * dir
    })
    return arr
  }, [rows, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize)

  // --- NEW: Loading Spinner State ---
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-500"></div>
          <p className="text-slate-600 text-sm">Loading studies...</p>
        </div>
      </div>
    )
  }

  // --- NEW: Graphical Empty State (for no query OR no results) ---
  if (!loading && !err && sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-96">
        <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-slate-500 text-lg font-medium mb-2">
          {query ? "No studies found" : "No query"}
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

      {/* --- NEW: Styled HTML Table --- */}
      {!err && (
        <>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    { key: 'year', label: 'Year' },
                    { key: 'journal', label: 'Journal' },
                    { key: 'title', label: 'Title' },
                    { key: 'authors', label: 'Authors' }
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      className='px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider cursor-pointer'
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
              <tbody className="bg-white divide-y divide-slate-100">
                {pageRows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className='px-4 py-3 text-sm whitespace-nowrap align-top'>{r.year ?? ''}</td>
                    <td className='px-4 py-3 text-sm align-top'>{r.journal || ''}</td>
                    <td className='px-4 py-3 text-sm max-w-[340px] align-top'>
                      <div className='truncate' title={r.title}>{r.title || ''}</div>
                    </td>
                    <td className='px-4 py-3 text-sm align-top'>{r.authors || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className='flex items-center justify-between border-t border-slate-200 p-3 text-sm'>
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