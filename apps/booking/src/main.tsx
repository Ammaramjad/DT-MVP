import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.tsx'

// No StrictMode: its dev-only double-mount tears down drei <Html> DOM roots twice.
createRoot(document.getElementById('root')!).render(<App />)
