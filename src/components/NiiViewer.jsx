// 顯示設定：讓 x>0 出現在畫面右側（右腦在右）
const X_RIGHT_ON_SCREEN_RIGHT = true;

import { useEffect, useMemo, useRef, useState } from 'react'
import * as nifti from 'nifti-reader-js'
import { API_BASE } from '../api'

// --- Shadcn/ui Imports ---
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
// --- End Shadcn/ui Imports ---

const MNI_BG_URL = 'static/mni_2mm.nii.gz'

// ... (All logic functions like isStandardMNI2mm, MNI2MM, asTypedArray, minmax, etc. remain unchanged) ...
// Detect MNI152 2mm template dims & spacing (91x109x91, 2mm iso)
function isStandardMNI2mm(dims, voxelMM) {
  const okDims = Array.isArray(dims) && dims[0]===91 && dims[1]===109 && dims[2]===91;
  const okSp   = voxelMM && Math.abs(voxelMM[0]-2)<1e-3 && Math.abs(voxelMM[1]-2)<1e-3 && Math.abs(voxelMM[2]-2)<1e-3;
  return okDims && okSp;
}
// Standard MNI152 2mm affine (voxel i,j,k -> MNI mm):
// x = -2*i + 90;  y = 2*j - 126;  z = 2*k - 72
const MNI2MM = { x0: 90, y0: -126, z0: -72, vx: 2, vy: 2, vz: 2 };

export function NiiViewer({ query }) {
  const [loadingBG, setLoadingBG] = useState(false)
  const [loadingMap, setLoadingMap] = useState(false)
  const [errBG, setErrBG] = useState('')
  const [errMap, setErrMap] = useState('')

  // backend params (map generation)
  // const [voxel, setVoxel] = useState(2.0) // <-- These are not used in the UI, but I see FWHM is
  const [fwhm, setFwhm] = useState(10.0)
  // const [kernel, setKernel] = useState('gauss') // <-- Not used in UI
  // const [r, setR] = useState(6.0) // <-- Not used in UI

  // overlay controls
  const [overlayAlpha, setOverlayAlpha] = useState(0.5)
  const [posOnly, setPosOnly] = useState(true) // <-- Not used in UI
  const [useAbs, setUseAbs] = useState(false) // <-- Not used in UI
  const [thrMode, setThrMode] = useState('pctl') // default: Percentile (per request)
  const [pctl, setPctl] = useState(95)
  const [thrValue, setThrValue] = useState(0)     // used when mode === 'value'

  // volumes
  const bgRef  = useRef(null)   // { data, dims:[nx,ny,nz], voxelMM:[vx,vy,vz], min, max }
  const mapRef = useRef(null)   // { data, dims:[nx,ny,nz], voxelMM:[vx,vy,vz], min, max }
  const getVoxelMM = () => {
    const vm = bgRef.current?.voxelMM ?? mapRef.current?.voxelMM ?? [1,1,1]
    return { x: vm[0], y: vm[1], z: vm[2] }
  }
  const [dims, setDims] = useState([0,0,0]) // canvas dims (prefer BG; overlay only if same dims)

  // slice indices (voxel coordinates in [0..N-1])
  const [ix, setIx] = useState(0) // sagittal (X)
  const [iy, setIy] = useState(0) // coronal  (Y)
  const [iz, setIz] = useState(0) // axial    (Z)

  // Neurosynth-style displayed coords: signed, centered at middle voxel
  const [cx, setCx] = useState('0')
  const [cy, setCy] = useState('0')
  const [cz, setCz] = useState('0')

  const canvases = [useRef(null), useRef(null), useRef(null)]

  // NOTE: Kept params that are not in the UI (voxel, kernel, r)
  const mapUrl = useMemo(() => {
    if (!query) return ''
    const u = new URL(`${API_BASE}/query/${encodeURIComponent(query)}/nii`)
    u.searchParams.set('voxel', '2.0') // Was using state, but no UI for it. Hardcoding to default.
    u.searchParams.set('fwhm', String(fwhm))
    u.searchParams.set('kernel', 'gauss') // Was using state, but no UI for it.
    u.searchParams.set('r', '6.0') // Was using state, but no UI for it.
    return u.toString()
  }, [query, fwhm]) // Removed voxel, kernel, r from dependency array

  // ---------- utils (no changes) ----------
  function asTypedArray (header, buffer) {
    switch (header.datatypeCode) {
      case nifti.NIFTI1.TYPE_INT8:    return new Int8Array(buffer)
      case nifti.NIFTI1.TYPE_UINT8:   return new Uint8Array(buffer)
      case nifti.NIFTI1.TYPE_INT16:   return new Int16Array(buffer)
      case nifti.NIFTI1.TYPE_UINT16:  return new Uint16Array(buffer)
      case nifti.NIFTI1.TYPE_INT32:   return new Int32Array(buffer)
      case nifti.NIFTI1.TYPE_UINT32:  return new Uint32Array(buffer)
      case nifti.NIFTI1.TYPE_FLOAT32: return new Float32Array(buffer)
      case nifti.NIFTI1.TYPE_FLOAT64: return new Float64Array(buffer)
      default: return new Float32Array(buffer)
    }
  }
  function minmax (arr) {
    let mn =  Infinity, mx = -Infinity
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i]
      if (v < mn) mn = v
      if (v > mx) mx = v
    }
    return [mn, mx]
  }
  function percentile(arr, p, step=Math.ceil(arr.length/200000)) {
    if (!arr.length) return 0
    const samp = []
    for (let i=0; i<arr.length; i+=step) samp.push(arr[i])
    samp.sort((a,b)=>a-b)
    const k = Math.floor((p/100) * (samp.length - 1))
    return samp[Math.max(0, Math.min(samp.length-1, k))]
  }
  async function loadNifti(url) {
    const res = await fetch(url)
    if (!res.ok) {
      const t = await res.text().catch(()=> '')
      throw new Error(`GET ${url} → ${res.status} ${t}`)
    }
    let ab = await res.arrayBuffer()
    if (nifti.isCompressed(ab)) ab = nifti.decompress(ab)
    if (!nifti.isNIFTI(ab)) throw new Error('not a NIfTI file')
    const header = nifti.readHeader(ab)
    const image  = nifti.readImage(header, ab)
    const ta     = asTypedArray(header, image)
    let f32
    if (ta instanceof Float32Array) f32 = ta
    else if (ta instanceof Float64Array) f32 = Float32Array.from(ta)
    else {
      const [mn, mx] = minmax(ta)
      const range = (mx - mn) || 1
      f32 = new Float32Array(ta.length)
      for (let i=0;i<ta.length;i++) f32[i] = (ta[i] - mn) / range
    }
    const nx = header.dims[1] | 0
    const ny = header.dims[2] | 0
    const nz = header.dims[3] | 0
    if (!nx || !ny || !nz) throw new Error('invalid dims')
    const [mn, mx] = minmax(f32)
    const vx = Math.abs(header.pixDims?.[1] ?? 1)
    const vy = Math.abs(header.pixDims?.[2] ?? 1)
    const vz = Math.abs(header.pixDims?.[3] ?? 1)
    return { data: f32, dims:[nx,ny,nz], voxelMM:[vx,vy,vz], min: mn, max: mx }
  }

  // ... (clamp, idx2coord, coord2idx functions remain unchanged) ...
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
  const AXIS_SIGN = { x: -1, y: 1, z: 1 }
  const idx2coord = (i, n, axis) => {
    const [nx, ny, nz] = dims;
    const { x: vx, y: vy, z: vz } = getVoxelMM();
    const isStd = isStandardMNI2mm([nx, ny, nz], [vx, vy, vz]);
    if (isStd) {
      if (axis === 'x') return (-MNI2MM.vx * i + MNI2MM.x0);
      if (axis === 'y') return ( MNI2MM.vy * i + MNI2MM.y0);
      if (axis === 'z') return ( MNI2MM.vz * i + MNI2MM.z0);
    }
    const mmPerVoxel = axis === 'x' ? vx : axis === 'y' ? vy : vz;
    return AXIS_SIGN[axis] * (i - Math.floor(n/2)) * mmPerVoxel;
  }
  const coord2idx = (c_mm, n, axis) => {
    const [nx, ny, nz] = dims;
    const { x: vx, y: vy, z: vz } = getVoxelMM();
    const isStd = isStandardMNI2mm([nx, ny, nz], [vx, vy, vz]);
    if (isStd) {
      let v;
      if (axis === 'x') v = ( (MNI2MM.x0 - c_mm) / MNI2MM.vx );
      else if (axis === 'y') v = ( (c_mm - MNI2MM.y0) / MNI2MM.vy );
      else v = ( (c_mm - MNI2MM.z0) / MNI2MM.vz );
      const idx = Math.round(v);
      return Math.max(0, Math.min(n-1, idx));
    }
    const mmPerVoxel = axis === 'x' ? vx : axis === 'y' ? vy : vz;
    const sign = AXIS_SIGN[axis];
    const v = (sign * (c_mm / mmPerVoxel)) + Math.floor(n/2);
    const idx = Math.round(v);
    return Math.max(0, Math.min(n-1, idx));
  }
  
  // ... (useEffect hooks for loadNifti, thrValue, load map remain unchanged) ...
  useEffect(() => {
    let alive = true
    setLoadingBG(true); setErrBG('')
    ;(async () => {
      try {
        const bg = await loadNifti(MNI_BG_URL)
        if (!alive) return
        bgRef.current = bg
        setDims(bg.dims)
        const [nx,ny,nz] = bg.dims
        const mx = Math.floor(nx/2), my = Math.floor(ny/2), mz = Math.floor(nz/2)
        setIx(mx); setIy(my); setIz(mz)
        setCx('0'); setCy('0'); setCz('0')
      } catch (e) {
        if (!alive) return
        setErrBG(e?.message || String(e))
        bgRef.current = null
      } finally {
        if (!alive) return
        setLoadingBG(false)
      }
    })()
    return () => { alive = false }
  }, [])
  
  useEffect(() => {
    const mn = mapRef.current?.min ?? 0
    const mx = mapRef.current?.max ?? 1
    if (thrValue < mn || thrValue > mx) {
      setThrValue(Math.min(mx, Math.max(mn, thrValue)))
    }
  }, [mapRef.current, dims])

  useEffect(() => {
    if (!mapUrl) { mapRef.current = null; return }
    let alive = true
    setLoadingMap(true); setErrMap('')
    ;(async () => {
      try {
        const mv = await loadNifti(mapUrl)
        if (!alive) return
        mapRef.current = mv
        if (!bgRef.current) {
          setDims(mv.dims)
          const [nx,ny,nz] = mv.dims
          const mx = Math.floor(nx/2), my = Math.floor(ny/2), mz = Math.floor(nz/2)
          setIx(mx); setIy(my); setIz(mz)
          setCx('0'); setCy('0'); setCz('0')
        }
      } catch (e) {
        if (!alive) return
        setErrMap(e?.message || String(e))
        mapRef.current = null
      } finally {
        if (!alive) return
        setLoadingMap(false)
      }
    })()
    return () => { alive = false }
  }, [mapUrl])


  // ... (useMemo for mapThreshold remains unchanged) ...
  const mapThreshold = useMemo(() => {
    const mv = mapRef.current
    if (!mv) return null
    if (thrMode === 'value') return Number(thrValue) || 0
    return percentile(mv.data, Math.max(0, Math.min(100, Number(pctl) || 95)))
  }, [thrMode, thrValue, pctl, mapRef.current])

  // ... (drawSlice function remains unchanged) ...
  function drawSlice (canvas, axis /* 'z' | 'y' | 'x' */, index) {
    const [nx, ny, nz] = dims
    
    const sx = (x) => (X_RIGHT_ON_SCREEN_RIGHT ? (nx - 1 - x) : x);
    const bg  = bgRef.current
    const map = mapRef.current

    const dimsStr = dims.join('x')
    const bgOK  = !!(bg  && bg.dims.join('x')  === dimsStr)
    const mapOK = !!(map && map.dims.join('x') === dimsStr)

    let w=0, h=0, getBG=null, getMap=null
    if (axis === 'z') { w = nx; h = ny; if (bgOK)  getBG  = (x,y)=> bg.data[sx(x) + y*nx + index*nx*ny]; if (mapOK) getMap = (x,y)=> map.data[sx(x) + y*nx + index*nx*ny] }
    if (axis === 'y') { w = nx; h = nz; if (bgOK)  getBG  = (x,y)=> bg.data[sx(x) + index*nx + y*nx*ny]; if (mapOK) getMap = (x,y)=> map.data[sx(x) + index*nx + y*nx*ny] }
    if (axis === 'x') { w = ny; h = nz; if (bgOK)  getBG  = (x,y)=> bg.data[index + x*nx + y*nx*ny]; if (mapOK) getMap = (x,y)=> map.data[index + x*nx + y*nx*ny] }

    if (!canvas || w === 0 || h === 0) return; // Guard clause
    canvas.width = w; canvas.height = h;
    canvas.style.aspectRatio = `${w} / ${h}`; // <-- *** FIX 1: ADDED THIS LINE ***
    const ctx = canvas.getContext('2d', { willReadFrequently: false })
    if (!ctx) return; // Guard clause
    const img = ctx.createImageData(w, h)

    const alpha = Math.max(0, Math.min(1, overlayAlpha))
    const R = 255, G = 0, B = 0
    const thr = mapThreshold

    const bgMin = bg?.min ?? 0
    const bgMax = bg?.max ?? 1
    const bgRange = (bgMax - bgMin) || 1

    let p = 0
    for (let yy=0; yy<h; yy++) {
      const srcY = h - 1 - yy // flip vertically
      for (let xx=0; xx<w; xx++) {
        let gray = 0
        if (getBG) {
          const vbg = getBG(xx, srcY)
          let g = (vbg - bgMin) / bgRange
          if (g < 0) g = 0
          if (g > 1) g = 1
          gray = (g * 255) | 0
        }
        img.data[p    ] = gray
        img.data[p + 1] = gray
        img.data[p + 2] = gray
        img.data[p + 3] = 255

        if (getMap) {
          let mv = getMap(xx, srcY)
          const raw = mv
          if (useAbs) mv = Math.abs(mv)
          let pass = (thr == null) ? (mv > 0) : (mv >= thr)
          if (posOnly && raw <= 0) pass = false
          if (pass) {
            img.data[p    ] = ((1 - alpha) * img.data[p]     + alpha * R) | 0
            img.data[p + 1] = ((1 - alpha) * img.data[p + 1] + alpha * G) | 0
            img.data[p + 2] = ((1 - alpha) * img.data[p + 2] + alpha * B) | 0
          }
        }
        p += 4
      }
    }
    ctx.putImageData(img, 0, 0)

    ctx.save()
    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 1
    let cx = 0, cy = 0
    if (axis === 'z') {
      cx = Math.max(0, Math.min(w-1, (X_RIGHT_ON_SCREEN_RIGHT ? (w - 1 - ix) : ix)))
      cy = Math.max(0, Math.min(h-1, iy))
    } else if (axis === 'y') {
      cx = Math.max(0, Math.min(w-1, (X_RIGHT_ON_SCREEN_RIGHT ? (w - 1 - ix) : ix)))
      cy = Math.max(0, Math.min(h-1, iz))
    } else {
      cx = Math.max(0, Math.min(w-1, iy))
      cy = Math.max(0, Math.min(h-1, iz))
    }
    const screenY = h - 1 - cy
    ctx.beginPath(); ctx.moveTo(cx + 0.5, 0); ctx.lineTo(cx + 0.5, h); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, screenY + 0.5); ctx.lineTo(w, screenY + 0.5); ctx.stroke()
    ctx.restore()
  }

  // ... (onCanvasClick, useEffect for coords, commitCoord, useEffect for redraw remain unchanged) ...
  function onCanvasClick (e, axis) {
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) * canvas.width / rect.width)
    const y = Math.floor((e.clientY - rect.top) * canvas.height / rect.height)
    const srcY = canvas.height - 1 - y // invert because we draw with vertical flip
    const [nx,ny,nz] = dims
    
    const toIdxX = (screenX) => (X_RIGHT_ON_SCREEN_RIGHT ? (nx - 1 - screenX) : screenX);
    if (axis === 'z') { const xi = toIdxX(x); setIx(xi); setIy(srcY); setCx(String(idx2coord(xi, nx, 'x'))); setCy(String(idx2coord(srcY, ny, 'y'))) }
    else if (axis === 'y') { const xi = toIdxX(x); setIx(xi); setIz(srcY); setCx(String(idx2coord(xi, nx, 'x'))); setCz(String(idx2coord(srcY, nz, 'z'))) }
    else { setIy(x); setIz(srcY); setCy(String(idx2coord(x, ny, 'y'))); setCz(String(idx2coord(srcY, nz, 'z'))) }
  }

  useEffect(() => {
    const [nx,ny,nz] = dims
    if (!nx) return
    setCx(String(idx2coord(ix, nx, 'x')))
    setCy(String(idx2coord(iy, ny, 'y')))
    setCz(String(idx2coord(iz, nz, 'z')))
  }, [ix,iy,iz,dims])

  const commitCoord = (axis) => {
    const [nx,ny,nz] = dims
    let vStr = axis==='x' ? cx : axis==='y' ? cy : cz
    if (vStr === '' || vStr === '-' ) return
    const parsed = parseFloat(vStr)
    if (Number.isNaN(parsed)) return
    if (axis==='x') setIx(coord2idx(parsed, nx, 'x'))
    if (axis==='y') setIy(coord2idx(parsed, ny, 'y'))
    if (axis==='z') setIz(coord2idx(parsed, nz, 'z'))
  }

  useEffect(() => {
    const [nx, ny, nz] = dims
    if (!nx) return
    const c0 = canvases[0].current, c1 = canvases[1].current, c2 = canvases[2].current
    if (c0 && iz >=0 && iz < nz) drawSlice(c0, 'z', iz)
    if (c1 && iy >=0 && iy < ny) drawSlice(c1, 'y', iy)
    if (c2 && ix >=0 && ix < nx) drawSlice(c2, 'x', ix)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dims, ix, iy, iz,
    overlayAlpha, posOnly, useAbs, thrMode, pctl, thrValue,
    loadingBG, loadingMap, errBG, errMap, query, bgRef.current, mapRef.current // Added refs
  ])


  const [nx, ny, nz] = dims

  // slice configs (labels only; numbers removed)
  const sliceConfigs = [
    { key: 'y', name: 'Coronal',  axisLabel: 'Y', canvasRef: canvases[1] },
    { key: 'x', name: 'Sagittal', axisLabel: 'X', canvasRef: canvases[2] },
    { key: 'z', name: 'Axial',    axisLabel: 'Z', canvasRef: canvases[0] },
  ]

  // --- REMOVED old nsInputCls and nsLabelCls constants ---

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center justify-end'>
        <div className='card__title'>NIfTI Viewer</div>
        <div className='flex items-center gap-2 text-sm text-gray-500'>
          {query && (
            <Button asChild variant="outline" size="sm">
              <a href={mapUrl}>Download map</a>
            </Button>
          )}
        </div>
      </div>

      {/* --- Threshold mode & value (Modernized) --- */}
      <div className='rounded-xl border p-4 space-y-4 text-sm'>
        <div className='grid grid-cols-2 items-center gap-x-4 gap-y-2'>
          <Label htmlFor='thr-mode'>Threshold mode</Label>
          <Select value={thrMode} onValueChange={setThrMode}>
            <SelectTrigger id='thr-mode'>
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='value'>Value</SelectItem>
              <SelectItem value->Percentile</SelectItem>
            </SelectContent>
          </Select>
        
          {thrMode === 'value' ? (
            <>
              <Label htmlFor='thr-value'>Threshold</Label>
              <Input
                id='thr-value'
                type='number'
                step='0.01'
                value={thrValue}
                onChange={e=>setThrValue(Number(e.target.value))}
              />
            </>
          ) : (
            <>
              <Label htmlFor='thr-pctl'>Percentile</Label>
              <Input
                id='thr-pctl'
                type='number'
                min={50}
                max={99.9}
                step={0.5}
                value={pctl}
                onChange={e=>setPctl(Number(e.target.value)||95)}
              />
            </>
          )}
        </div>

        {/* --- Coordinate inputs (Modernized) --- */}
        <div className='grid grid-cols-3 items-center gap-4'>
          <div className='space-y-1.5'>
            <Label htmlFor='coord-x'>X (mm)</Label>
            <Input
              id='coord-x'
              type='text'
              value={cx}
              onChange={e=>setCx(e.target.value)}
              onBlur={()=>commitCoord('x')}
              onKeyDown={e=>{ if(e.key==='Enter'){ commitCoord('x') } }}
              aria-label='X coordinate (centered)'
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='coord-y'>Y (mm)</Label>
            <Input
              id='coord-y'
              type='text'
              value={cy}
              onChange={e=>setCy(e.target.value)}
              onBlur={()=>commitCoord('y')}
              onKeyDown={e=>{ if(e.key==='Enter'){ commitCoord('y') } }}
              aria-label='Y coordinate (centered)'
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='coord-z'>Z (mm)</Label>
            <Input
              id='coord-z'
              type='text'
              value={cz}
              onChange={e=>setCz(e.target.value)}
              onBlur={()=>commitCoord('z')}
              onKeyDown={e=>{ if(e.key==='Enter'){ commitCoord('z') } }}
              aria-label='Z coordinate (centered)'
            />
          </div>
        </div>
      </div>

      {/* --- Brain views (Already uses Tailwind, no changes) --- */}
      {(loadingBG || loadingMap) && (
        <div className='grid gap-3 lg:grid-cols-3'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className='h-64 animate-pulse rounded-xl border bg-muted' />
          ))}
        </div>
      )}
      {(errBG || errMap) && (
        <div className='rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive'>
          {errBG && <div>Background: {errBG}</div>}
          {errMap && <div>Map: {errMap}</div>}
        </div>
      )}

      {!!nx && (
        <div className='grid grid-cols-3 gap-3'>
          {sliceConfigs.map(({ key, name, axisLabel, canvasRef }) => (
            <div key={key} className='flex flex-col gap-2'>
              <div className='text-xs text-muted-foreground'>{name} ({axisLabel})</div>
              <canvas
                ref={canvasRef}
                // --- *** FIX 2: MODIFIED THIS LINE *** ---
                className='w-full rounded-xl border' // Removed 'h-64' and 'object-contain'
                onClick={(e)=>onCanvasClick(e, key)}
                style={{ cursor: 'crosshair', imageRendering: 'pixelated' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* map generation params (Modernized) */}
      <div className='rounded-xl border p-4 text-sm space-y-1.5'>
        <Label htmlFor='fwhm'>Gaussian FWHM (mm)</Label>
        <Input
          id='fwhm'
          type='number'
          step='0.5'
          value={fwhm}
          onChange={e=>setFwhm(Number(e.target.value)||0)}
          className='w-28'
        />
      </div>

      {/* overlay controls (Modernized) */}
      <div className='rounded-xl border p-4 text-sm space-y-2'>
        <Label>Overlay alpha ({overlayAlpha.toFixed(2)})</Label>
        <Slider
          value={[overlayAlpha]}
          onValueChange={(val) => setOverlayAlpha(val[0])}
          min={0}
          max={1}
          step={0.05}
        />
      </div>
    </div>
  )
}