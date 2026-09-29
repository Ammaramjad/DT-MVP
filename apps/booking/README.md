# Fleet OS — immersive 3D booking experience

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
- `src/lib/experienceCopy.ts` — centralized English and Traditional Chinese copy for the 2030 customer experience.
- `src/lib/content.ts` — legacy scene-story constants retained for the older scroll experience.
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

The SUV, dedicated three-row **7-Seater**, and Van / Group bodies are original procedural geometry in `src/three/ProceduralVehicle.tsx`; they do not introduce third-party badges or assets.

## Deployment

- **Project/root directory:** `apps/booking`
- **Install command:** `npm ci`
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment variables:** none are required for the current static demo.
- **Routing:** `vercel.json` rewrites unknown paths to `index.html` for SPA-compatible hosting.
- **Static assets:** deploy the generated `dist/` directory without rewriting `/models`, `/textures`, or `/hdr` asset requests.

The current fare, route, confirmation, and fleet information are deterministic demo estimates. A production deployment still requires server-side pricing, routing/geocoding, availability/dispatch, reservation, authentication, and payment integrations. The UI does not claim that a reservation or payment has occurred.

## Production geography and vehicle integration

`src/lib/geo.ts` defines provider-neutral contracts for geocoding, routing, POIs and geographic 3D context. The checked-in location list is explicitly a preview dataset, not a live geocoder. A production deployment should inject authenticated providers, preserve their attribution, and only describe buildings as exact when the provider supplies that identity.

Vehicle records distinguish the redistributed CC BY reference GLB from original digital prototypes. The latter are capacity/shape previews and must be replaced with properly licensed, optimized production GLBs before marketing the viewer as photorealistic. Category and model labels are separate so multiple licensed models can be added without changing booking capacity rules.

Shared UI translations live in `src/lib/i18n.ts`; all customer copy used by the 2030 experience lives in `src/lib/experienceCopy.ts`; the selected locale is persisted locally. Provider-returned place names remain in their source language until a localized production places provider is configured.
