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

      {/* --- NEW: Loading Spinner State --- */}
      {loading && (
        <div className="flex items-center justify-center p-8 flex-grow">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-500"></div>
            <p className="text-slate-600 text-sm">Loading terms...</p>
          </div>
        </div>
      )}

      {err && (
        <div className='p-2 text-sm text-destructive'>
          {err}
        </div>
      )}

      {/* --- NEW: Graphical Empty State --- */}
      {!loading && !err && filtered.length === 0 && (
         <div className="flex flex-col items-center justify-center p-12 text-center flex-grow">
          <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-slate-500 text-lg font-medium mb-2">No terms found</p>
          <p className="text-slate-400 text-sm">
            {search ? "Try a different search" : "Terms list is empty"}
          </p>
        </div>
      )}

      {!loading && !err && filtered.length > 0 && (
        <div className='flex-grow overflow-auto'>
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
        </div>
      )}
    </div>
  )
}