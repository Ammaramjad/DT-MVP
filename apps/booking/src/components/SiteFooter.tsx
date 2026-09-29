import type { Copy } from '../lib/experienceCopy'

export function SiteFooter({ copy }: { copy: Copy }) {
  return <footer className="site-footer">
    <div><strong>FLEET OS</strong><p>Private mobility, orchestrated around you.</p></div>
    <nav aria-label="Footer"><a href="#services">Services</a><a href="#business">Business</a><a href="#about">About</a><a href="#book">Book</a></nav>
    <span>© {new Date().getFullYear()} {copy.footer}</span>
  </footer>
}
