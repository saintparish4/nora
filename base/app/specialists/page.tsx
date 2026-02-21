import type { ProvidersResponse } from '@/types';
import { API_URL } from '@/lib/api/client';
import SpecialistsClient from './specialists-client';

/**
 * Server Component – fetches providers during SSR so data is available on
 * first paint instead of waiting for client-side hydration + useEffect.
 *
 * The providers index endpoint does not require authentication
 * (skip_before_action :authenticate_request), so a plain fetch works.
 */
async function fetchProviders(): Promise<ProvidersResponse> {
  try {
    const res = await fetch(`${API_URL}/api/v1/providers`, {
      headers: { 'Content-Type': 'application/json' },
      // Revalidate at most every 60 seconds so the page stays reasonably fresh
      // without hammering the API on every single request.
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`Providers API returned ${res.status}`);
    }

    return res.json();
  } catch {
    // If the API is unreachable during SSR (e.g. cold start), return empty
    // data and let the client-side SWR retry.
    return {
      providers: [],
      total: 0,
      page: 1,
      per_page: 20,
      total_pages: 0,
    };
  }
}

export default async function SpecialistsPage() {
  const initialData = await fetchProviders();

  return <SpecialistsClient initialData={initialData} />;
}
