# AURA — immersive 3D booking experience

Cinematic, scroll-driven B2C transportation booking site built with React 19, Vite, React Three Fiber, GSAP ScrollTrigger and Lenis.

```bash
cd apps/booking
npm install
npm run dev      # http://localhost:5180
npm run build    # tsc -b && vite build
npm run lint     # oxlint
```

## Structure

- `src/lib/scroll.ts` — Lenis + ScrollTrigger; measures `[data-section]` blocks, publishes per-section progress to `scrollState` (read by the 3D scene) and to CSS `--p` (read by DOM sections). Journey stage / showcase index are derived here so text and scene always agree.
- `src/lib/data.ts` — places, vehicle categories, fare/duration estimation.
- `src/lib/content.ts` — story copy shared by DOM and 3D.
- `src/store.ts` — Zustand booking state, quality tier and WebGL detection.
- `src/three/` — procedural city, route, vehicles, camera rig, fleet map, benefit objects, studio.
- `src/ui/` — nav, loader, story sections, booking controls, mobile bar.

## Quality & fallbacks

Quality is picked from device class and renderer (software renderers → `low`). Override with `?q=low|medium|high`; force the CSS-only fallback with `?gl=0`. The 3D bundle (`three`, `r3f` chunks) is lazy-loaded; the DOM booking flow works without it.

## Assets

All bundled assets are free to redistribute; each is streamed lazily with a procedural/flat fallback while loading.

- `public/models/car.glb` — Ferrari 458 by [vicent091036](https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6) (CC BY 4.0), via the three.js examples. Body/glass/chrome/rim/light materials are replaced at runtime per vehicle category.
- `public/textures/asphalt_02_*` and `concrete_wall_005_*` — [Poly Haven](https://polyhaven.com) (CC0), 1k.
- `public/hdr/sky_1k.hdr` — Poly Haven "Kloofendal 48d Partly Cloudy (Pure Sky)" (CC0), used for image-based lighting/reflections.
