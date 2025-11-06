import { useCallback, useRef, useState } from 'react'
import { Terms } from './components/Terms'
import { QueryBuilder } from './components/QueryBuilder'
import { Studies } from './components/Studies'
import { NiiViewer } from './components/NiiViewer'
import { Locations } from './components/Locations'
import { useUrlQueryState } from './hooks/useUrlQueryState'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// --- NEW IMPORTS ---
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
// ---------------------

import './App.css'

export default function App () {
  const [query, setQuery] = useUrlQueryState('q')

  const handlePickTerm = useCallback((t) => {
    setQuery((q) => (q ? `${q} ${t}` : t))
  }, [setQuery])

  // --- resizable panes state ---
  const gridRef = useRef(null)
  const [sizes, setSizes] = useState([28, 44, 28]) // [left, middle, right]
  const MIN_PX = 240

  const startDrag = (which, e) => {
    // ... (This entire function is unchanged)
    e.preventDefault()
    const startX = e.clientX
    const rect = gridRef.current.getBoundingClientRect()
    const total = rect.width
    const curPx = sizes.map(p => (p / 100) * total)

    const onMouseMove = (ev) => {
      const dx = ev.clientX - startX
      if (which === 0) {
        let newLeft = curPx[0] + dx
        let newMid = curPx[1] - dx
        if (newLeft < MIN_PX) { newMid -= (MIN_PX - newLeft); newLeft = MIN_PX }
        if (newMid < MIN_PX) { newLeft -= (MIN_PX - newMid); newMid = MIN_PX }
        const s0 = (newLeft / total) * 100
        const s1 = (newMid / total) * 100
        const s2 = 100 - s0 - s1
        setSizes([s0, s1, Math.max(s2, 0)])
      } else {
        let newMid = curPx[1] + dx
        let newRight = curPx[2] - dx
        if (newMid < MIN_PX) { newRight -= (MIN_PX - newMid); newMid = MIN_PX }
        if (newRight < MIN_PX) { newMid -= (MIN_PX - newRight); newRight = MIN_PX }
        const s1 = (newMid / total) * 100
        const s2 = (newRight / total) * 100
        const s0 = (curPx[0] / total) * 100
        setSizes([s0, s1, Math.max(s2, 0)])
      }
    }
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return (
    // Added flex flex-col to make the app fill the screen height
    <div className="app flex flex-col h-screen">
      {/* The <style> block is gone */}

      <header className="app__header bg-gradient-to-r from-slate-800 to-slate-700 shadow-lg">
        <div className="flex items-center gap-3">
          {/* Add an icon/logo */}
          <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <div>
            <h1 className="app__title text-2xl font-bold text-white">LoTUS-BF</h1>
            <div className="app__subtitle text-slate-300 text-sm">Location-or-Term Unified Search for Brain Functions</div>
          </div>
        </div>
      </header>

      <main
        className="app__grid bg-muted/40" // <-- Adds a light gray background
        ref={gridRef}
      >
        
        {/* --- LEFT PANE --- */}
        <Card
          style={{ flexBasis: `${sizes[0]}%` }}
          className="flex flex-col overflow-hidden border-slate-200 shadow-md hover:shadow-lg transition-shadow"
        >
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-auto p-4">
            <Terms onPickTerm={handlePickTerm} />
          </CardContent>
        </Card>

        <div className="resizer bg-slate-300 hover:bg-blue-400 transition-colors" aria-label="Resize left/middle" onMouseDown={(e) => startDrag(0, e)} />

        {/* --- MIDDLE PANE --- */}
        <Card
          style={{ flexBasis: `${sizes[1]}%` }}
          className="flex flex-col overflow-hidden border-slate-200 shadow-md hover:shadow-lg transition-shadow"
        >
          <CardHeader className="bg-slate-50 border-b space-y-3">
            <QueryBuilder query={query} setQuery={setQuery} />
          </CardHeader>
          <CardContent className="flex-grow flex flex-col p-0">
            <Tabs defaultValue="studies" className="flex-grow flex flex-col">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-none border-b">
                <TabsTrigger value="studies" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  📊 Studies
                </TabsTrigger>
                <TabsTrigger value="locations" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  📍 Locations
                </TabsTrigger>
              </TabsList>
              <TabsContent value="studies" className="flex-grow overflow-auto p-4 mt-0">
                <Studies query={query} />
              </TabsContent>
              <TabsContent value="locations" className="flex-grow overflow-auto p-4 mt-0">
                <Locations query={query} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="resizer bg-slate-300 hover:bg-blue-400 transition-colors" aria-label="Resize middle/right" onMouseDown={(e) => startDrag(1, e)} />

        {/* --- RIGHT PANE --- */}
        <Card
          style={{ flexBasis: `${sizes[2]}%` }}
          className="flex flex-col overflow-auto border-slate-200 shadow-md hover:shadow-lg transition-shadow"
        >
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              🧠 NIfTI Viewer
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <NiiViewer query={query} />
          </CardContent>
        </Card>
        
      </main>
    </div>
  )
}