/**
 * Resolve a stored `image_path` ("Images/products/phones.svg") to a URL that
 * works under the GitHub Pages subpath.
 *
 * The seed keeps the legacy path relative to Front-end/ so the old static site
 * can still read the same rows. The React app ships its own copies in
 * public/images/products/, so only the filename carries over, prefixed with
 * import.meta.env.BASE_URL ("/GHOSTINC_STORE/" in production).
 *
 * Returns null when there is no usable filename — callers render a neutral
 * placeholder rather than a broken image.
 */
export function productImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) {
    return null
  }

  const file = imagePath.split('/').pop()
  if (!file) {
    return null
  }

  return `${import.meta.env.BASE_URL}images/products/${file}`
}
