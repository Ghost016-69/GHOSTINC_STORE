/**
 * The application: providers first, then the route table.
 *
 * Routes sit under <Layout> (src/components/Layout.tsx), which renders the
 * shared header/footer around whichever page the URL matches. The router
 * itself lives in main.tsx with basename={import.meta.env.BASE_URL}, so every
 * path here is relative to the GitHub Pages subpath.
 */
import { Route, Routes } from 'react-router-dom'

import Layout from './components/Layout'
import AboutPage from './pages/AboutPage'
import CartPage from './pages/CartPage'
import ConfirmationPage from './pages/ConfirmationPage'
import ContactPage from './pages/ContactPage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import ProductPage from './pages/ProductPage'
import ShopPage from './pages/ShopPage'
import { CartProvider } from './state/CartContext'
import { CatalogueProvider } from './state/CatalogueContext'

export default function App() {
  return (
    <CatalogueProvider>
      <CartProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="product/:slug" element={<ProductPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="confirmation" element={<ConfirmationPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </CartProvider>
    </CatalogueProvider>
  )
}
