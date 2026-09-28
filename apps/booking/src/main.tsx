import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.tsx'

// No StrictMode: its dev-only double-mount makes drei <Html> portals unmount
// synchronously mid-render (React 19 warns on every overlay).
createRoot(document.getElementById('root')!).render(<App />)
