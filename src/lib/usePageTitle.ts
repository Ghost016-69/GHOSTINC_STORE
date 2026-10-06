/**
 * Per-route document titles.
 *
 * The legacy pages set one <title> each; a single-page app has to set it from
 * JavaScript. Leaving the title alone on a route that does not call this hook
 * keeps the index.html default.
 */
import { useEffect } from 'react'

export function usePageTitle(title: string): void {
  useEffect(() => {
    if (title) {
      document.title = `${title} | GHOSTINC`
    }
  }, [title])
}
