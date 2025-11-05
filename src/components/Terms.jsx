import { API_BASE } from '../api'
import { useEffect, useMemo, useState } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function Terms ({ onPickTerm }) {
  const [terms, setTerms] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    const ac = new AbortController()
    const load = async () => {
      setLoading(true)
      setErr('')
      try {
        const res = await fetch(`${API_BASE}/terms`, { signal: ac.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!alive) return
        setTerms(Array.isArray(data?.terms) ? data.terms : [])
      } catch (e) {
        if (!alive) return
        setErr(`Failed to fetch terms: ${e?.message || e}`)
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false; ac.abort() }
  }, [])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return terms
    return terms.filter(t => t.toLowerCase().includes(s))
  }, [terms, search])

  return (
    <div className='flex flex-col h-full gap-3'>
      <div className='flex w-full items-center gap-2'>
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search terms…'
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSearch('')}
        >
          Clear
        </Button>
      </div>

      {loading && (
        <div className='space-y-2 p-2'>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className='h-5 animate-pulse rounded-md bg-muted' />
          ))}
        </div>
      )}

      {err && (
        <div className='p-2 text-sm text-destructive'>
          {err}
        </div>
      )}

      {!loading && !err && (
        <div className='flex-grow overflow-auto'>
          {filtered.length === 0 ? (
            <div className='p-2 text-sm text-muted-foreground'>No terms found</div>
          ) : (
            <ul>
              {filtered.slice(0, 500).map((t, idx) => (
                <li key={`${t}-${idx}`}>
                  <a
                    href="#"
                    className='block w-full text-left p-1.5 rounded text-sm hover:bg-muted'
                    title={t}
                    aria-label={`Add term ${t}`}
                    onClick={(e) => { e.preventDefault(); onPickTerm?.(t); }}
                  >
                    {t}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}