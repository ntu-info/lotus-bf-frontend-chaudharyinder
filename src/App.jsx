import { useCallback, useRef, useState, useEffect } from 'react' // Added useEffect
import { Terms } from './components/Terms'
import { QueryBuilder } from './components/QueryBuilder'
import { Studies } from './components/Studies'
import { NiiViewer } from './components/NiiViewer'
import { Locations } from './components/Locations'
import { useUrlQueryState } from './hooks/useUrlQueryState'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// --- NEW IMPORTS ---
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
// ---------------------

import './App.css'

export default function App () {
  const [query, setQuery] = useUrlQueryState('q')

  // --- NEW STATE FOR CLICK-TO-NAVIGATE ---
  const [coords, setCoords] = useState({ x: '0', y: '0', z: '0' });
  
  // --- NEW STATE FOR DARK MODE ---
  const [isDarkMode, setIsDarkMode] = useState(false);

  // --- DARK MODE LOGIC ---
  useEffect(() => {
    // On mount, check user's preference from localStorage
    const isDark = localStorage.getItem('theme') === 'dark';
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = (checked) => {
    setIsDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };
  // -----------------------

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

      {/* --- HEADER UPDATED --- */}
      <header className="app__header bg-gradient-to-r from-slate-800 to-slate-700 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.jpg"
            alt="LoTUS-BF Logo" 
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <h1 className="app__title text-2xl font-bold text-white">LoTUS-BF</h1>
            <div className="app__subtitle text-slate-300 text-sm">Location-or-Term Unified Search for Brain Functions</div>
          </div>
        </div>
        
        {/* --- DARK MODE TOGGLE ADDED --- */}
        <div className="flex items-center space-x-2">
          <Switch 
            id="dark-mode" 
            checked={isDarkMode} 
            onCheckedChange={toggleDarkMode}
          />
          <Label htmlFor="dark-mode" className="text-slate-300">Dark Mode</Label>
        </div>
      </header>

      <main
        className="app__grid bg-muted/40" // <-- Adds a light gray background
        ref={gridRef}
      >
        
        {/* --- LEFT PANE (Dark mode classes added) --- */}
        <Card
          style={{ flexBasis: `${sizes[0]}%` }}
          className="flex flex-col overflow-hidden border-slate-200 shadow-md hover:shadow-lg transition-shadow dark:border-slate-700"
        >
          <CardHeader className="bg-slate-50 border-b dark:bg-slate-900 dark:border-slate-700">
            <CardTitle className="text-lg flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* --- MIDDLE PANE (Dark mode classes added, prop added) --- */}
        <Card
          style={{ flexBasis: `${sizes[1]}%` }}
          // --- FIX 1: Changed overflow-hidden to overflow-auto ---
          className="flex flex-col overflow-auto border-slate-200 shadow-md hover:shadow-lg transition-shadow dark:border-slate-700"
        >
          <CardHeader className="bg-slate-50 border-b space-y-3 dark:bg-slate-900 dark:border-slate-700">
            {/* --- ADD THIS TITLE BACK --- */}
            <CardTitle className="text-lg flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Query Builder
            </CardTitle>
            {/* ------------------------- */}
            <QueryBuilder query={query} setQuery={setQuery} />
          </CardHeader>
          <CardContent className="flex-grow flex flex-col p-0">
            {/* --- FIX 2: Removed flex-grow from Tabs --- */}
            <Tabs defaultValue="studies" className="flex flex-col">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-none border-b dark:bg-slate-800 dark:border-slate-700">
                <TabsTrigger value="studies" className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700">
                  📊 Studies
                </TabsTrigger>
                <TabsTrigger value="locations" className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700">
                  📍 Locations
                </TabsTrigger>
              </TabsList>
              {/* --- FIX 3: Removed flex-grow and overflow-auto from TabsContent --- */}
              <TabsContent value="studies" className="p-4 mt-0">
                <Studies query={query} />
              </TabsContent>
              {/* --- FIX 4: Removed flex-grow and overflow-auto from TabsContent --- */}
              <TabsContent value="locations" className="p-4 mt-0">
                {/* --- PROP ADDED --- */}
                <Locations query={query} onCoordinateClick={setCoords} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="resizer bg-slate-300 hover:bg-blue-400 transition-colors" aria-label="Resize middle/right" onMouseDown={(e) => startDrag(1, e)} />

        {/* --- RIGHT PANE (Dark mode classes added, props added) --- */}
        <Card
          style={{ flexBasis: `${sizes[2]}%` }}
          className="flex flex-col overflow-auto border-slate-200 shadow-md hover:shadow-lg transition-shadow dark:border-slate-700"
        >
          <CardHeader className="bg-slate-50 border-b dark:bg-slate-900 dark:border-slate-700">
            <CardTitle className="text-lg flex items-center gap-2">
              🧠 NIfTI Viewer
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {/* --- PROPS ADDED --- */}
            <NiiViewer query={query} coords={coords} setCoords={setCoords} />
          </CardContent>
        </Card>
        
      </main>
    </div>
  )
}