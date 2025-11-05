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
    <div className="app flex flex-col">
      {/* The <style> block is gone */}

      <header className="app__header">
        <h1 className="app__title">LoTUS-BF</h1>
        <div className="app__subtitle">Location-or-Term Unified Search for Brain Functions</div>
      </header>

      <main className="app__grid" ref={gridRef}>
        
        {/* --- LEFT PANE (Updated) --- */}
        <Card
          style={{ flexBasis: `${sizes[0]}%` }}
          className="flex flex-col overflow-hidden" // flex-col lets content fill space
        >
          <CardHeader>
            <CardTitle>Terms</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-auto"> {/* flex-grow makes it fill */}
            <Terms onPickTerm={handlePickTerm} />
          </CardContent>
        </Card>

        <div className="resizer" aria-label="Resize left/middle" onMouseDown={(e) => startDrag(0, e)} />

        {/* --- MIDDLE PANE (Updated) --- */}
        <Card
          style={{ flexBasis: `${sizes[1]}%` }}
          className="flex flex-col overflow-hidden"
        >
          {/* QueryBuilder is now in a CardHeader for better spacing */}
          <CardHeader>
            <QueryBuilder query={query} setQuery={setQuery} />
          </CardHeader>
          <CardContent className="flex-grow flex flex-col"> {/* flex-grow */}
            <Tabs defaultValue="studies" className="flex-grow flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="studies">Studies</TabsTrigger>
                <TabsTrigger value="locations">Locations</TabsTrigger>
              </TabsList>
              <TabsContent value="studies" className="flex-grow overflow-auto">
                <Studies query={query} />
              </TabsContent>
              <TabsContent value="locations" className="flex-grow overflow-auto">
                <Locations query={query} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="resizer" aria-label="Resize middle/right" onMouseDown={(e) => startDrag(1, e)} />

        {/* --- RIGHT PANE (Updated) --- */}
        <Card
          style={{ flexBasis: `${sizes[2]}%` }}
          className="flex flex-col overflow-auto" // overflow-auto to scroll the whole pane
        >
          <CardHeader>
            <CardTitle>NIfTI Viewer</CardTitle>
          </CardHeader>
          <CardContent>
            <NiiViewer query={query} />
          </CardContent>
        </Card>
        
      </main>
    </div>
  )
}