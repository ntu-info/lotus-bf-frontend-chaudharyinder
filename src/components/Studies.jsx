import { API_BASE } from '../api'
import { useEffect, useMemo, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
    if (!query) return
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

  return (
    <div className='flex flex-col'>
      {/* This component's parent <TabsContent> handles the border/rounding */}
      {/* We removed the title as it's now in the TabTrigger */}
      
      {query && loading && (
        <div className='grid gap-3 p-3'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className='h-10 animate-pulse rounded-lg bg-muted' />
          ))}
        </div>
      )}

      {query && err && (
        <div className='m-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive'>
          {err}
        </div>
      )}

      {query && !loading && !err && (
        <>
          <div className='overflow-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    { key: 'year', label: 'Year' },
                    { key: 'journal', label: 'Journal' },
                    { key: 'title', label: 'Title' },
                    { key: 'authors', label: 'Authors' }
                  ].map(({ key, label }) => (
                    <TableHead key={key} className='cursor-pointer' onClick={() => changeSort(key)}>
                      <span className='inline-flex items-center gap-2'>
                        {label}
                        <span className='text-xs text-muted-foreground'>{sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className='h-24 text-center text-muted-foreground'>
                      No data
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className='whitespace-nowrap align-top'>{r.year ?? ''}</TableCell>
                      <TableCell className='align-top'>{r.journal || ''}</TableCell>
                      <TableCell className='max-w-[340px] align-top'>
                        <div className='truncate' title={r.title}>{r.title || ''}</div>
                      </TableCell>
                      <TableCell className='align-top'>{r.authors || ''}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className='flex items-center justify-between border-t p-3 text-sm'>
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