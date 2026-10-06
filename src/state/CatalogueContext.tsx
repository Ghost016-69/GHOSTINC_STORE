/**
 * One catalogue load, shared by every page.
 *
 * The legacy site asked the API for whatever it needed per page; here the
 * whole active catalogue (55 rows), the categories, the brands and the promo
 * codes fit comfortably in memory, so they are fetched once at startup and
 * filtered in the browser. Reads are public by design — RLS already allows
 * SELECT on these tables (see 001_ecommerce_schema.sql).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { describeError, getSupabase, isConfigured } from '../lib/supabase'
import {
  toCatalogProduct,
  type BrandRow,
  type CatalogProduct,
  type CategoryRow,
  type ProductWithRelations,
  type PromoCodeRow,
} from '../types/database'
import type { PromoCode } from '../utils/pricing'

export type CatalogueStatus = 'loading' | 'unconfigured' | 'error' | 'ready'

interface CatalogueState {
  status: CatalogueStatus
  error: string | null
  products: CatalogProduct[]
  categories: CategoryRow[]
  brands: BrandRow[]
  promos: PromoCode[]
}

interface CatalogueValue extends CatalogueState {
  /** Re-run the load. Used by the retry button on the error banner. */
  reload: () => void
}

const CatalogueContext = createContext<CatalogueValue | null>(null)

const EMPTY: CatalogueState = {
  status: 'loading',
  error: null,
  products: [],
  categories: [],
  brands: [],
  promos: [],
}

export function CatalogueProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CatalogueState>(EMPTY)
  const [attempt, setAttempt] = useState(0)

  const reload = useCallback(() => setAttempt((value) => value + 1), [])

  useEffect(() => {
    if (!isConfigured) {
      setState({
        status: 'unconfigured',
        error: null,
        products: [],
        categories: [],
        brands: [],
        promos: [],
      })
      return
    }

    let cancelled = false
    setState((current) => ({ ...current, status: 'loading', error: null }))

    const supabase = getSupabase()

    Promise.all([
      supabase
        .from('products')
        .select('*, category:categories(name, slug), brand:brands(name, slug)')
        .eq('is_active', true),
      supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('brands').select('*').order('name'),
      supabase.from('promo_codes').select('*').eq('is_active', true).order('code'),
    ])
      .then(([productResult, categoryResult, brandResult, promoResult]) => {
        if (cancelled) {
          return
        }

        const failure = [productResult, categoryResult, brandResult, promoResult].find(
          (result) => result.error,
        )
        if (failure?.error) {
          setState((current) => ({
            ...current,
            status: 'error',
            error: describeError(failure.error),
          }))
          return
        }

        setState({
          status: 'ready',
          error: null,
          // supabase-js only types embedded relations when a generated
          // Database generic is supplied, so assert at the call site.
          products: ((productResult.data ?? []) as unknown as ProductWithRelations[]).map(
            toCatalogProduct,
          ),
          categories: (categoryResult.data ?? []) as CategoryRow[],
          brands: (brandResult.data ?? []) as BrandRow[],
          promos: ((promoResult.data ?? []) as PromoCodeRow[]).map((row) => ({
            code: row.code,
            percent_off: row.percent_off,
            description: row.description,
            is_active: row.is_active,
            valid_until: row.valid_until,
          })),
        })
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            status: 'error',
            error: describeError(caught),
          }))
        }
      })

    return () => {
      cancelled = true
    }
  }, [attempt])

  const value = useMemo<CatalogueValue>(() => ({ ...state, reload }), [state, reload])

  return <CatalogueContext.Provider value={value}>{children}</CatalogueContext.Provider>
}

export function useCatalogue(): CatalogueValue {
  const value = useContext(CatalogueContext)
  if (!value) {
    throw new Error('useCatalogue must be used inside <CatalogueProvider>.')
  }
  return value
}
