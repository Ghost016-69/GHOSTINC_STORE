import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App'
import './index.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('index.html is missing the #root element')
}

/**
 * Router setup for GitHub Pages.
 *
 * Pages serves static files with no rewrite rules, so a hard refresh on a deep
 * link such as /shop would 404 before React ever loads. Two things make that
 * work:
 *
 *   1. `basename={import.meta.env.BASE_URL}` puts the app under
 *      /GHOSTINC_STORE/ in production, matching Vite's `base`.
 *   2. public/404.html is copied to the output root and bounces any unknown
 *      path back to the app with the original path intact.
 *
 * HashRouter would sidestep both, at the cost of # in every URL.
 */
createRoot(container).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
