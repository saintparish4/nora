'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { AlertCircle, Users } from 'lucide-react';
import { useProviders, type Provider } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { CardSkeleton } from '@/components/ui/page-skeleton';

/** One page is enough to group every provider in the directory today. */
const PER_PAGE = 100;

interface SpecialtyGroup {
  specialty: string;
  providers: Provider[];
  averageRating: number | null;
  lowestRate: number | null;
}

function groupBySpecialty(providers: Provider[]): SpecialtyGroup[] {
  const groups = new Map<string, Provider[]>();

  for (const provider of providers) {
    const existing = groups.get(provider.specialty);
    if (existing) {
      existing.push(provider);
    } else {
      groups.set(provider.specialty, [provider]);
    }
  }

  return Array.from(groups, ([specialty, members]) => {
    const rated = members.filter((p) => Number(p.rating) > 0);
    const priced = members.filter((p) => Number(p.hourly_rate) > 0);

    return {
      specialty,
      providers: members,
      averageRating: rated.length
        ? rated.reduce((sum, p) => sum + Number(p.rating), 0) / rated.length
        : null,
      lowestRate: priced.length
        ? Math.min(...priced.map((p) => Number(p.hourly_rate)))
        : null,
    };
  }).sort((a, b) => b.providers.length - a.providers.length);
}

/**
 * The provider directory grouped by specialty — a way in for patients who know
 * what kind of care they need. Same `/api/v1/providers` data as the main list,
 * grouped client-side; the browse page links through with a `specialty` filter.
 */
export default function ProviderSpecialtiesPage() {
  const { data, isLoading, error } = useProviders({ per_page: PER_PAGE });

  const groups = useMemo(
    () => groupBySpecialty(data?.providers ?? []),
    [data]
  );

  return (
    <div className="flex flex-1 flex-col gap-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Provider Specialties
          </h1>
          <p className="text-gray-600">
            {groups.length > 0
              ? `${groups.length} specialties across ${data?.total ?? 0} providers`
              : 'Explore providers by the kind of care you need'}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/providers">Browse all providers</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-surface-elevated border border-border rounded-2xl">
          <AlertCircle
            className="h-10 w-10 text-gray-300 mx-auto mb-3"
            aria-hidden="true"
          />
          <p className="text-gray-600">
            We couldn&apos;t load the specialty list. Please try again.
          </p>
        </div>
      ) : groups.length === 0 ? (
        <div className="p-10 text-center bg-surface-elevated border border-border rounded-2xl">
          <Users
            className="h-10 w-10 text-gray-300 mx-auto mb-3"
            aria-hidden="true"
          />
          <p className="text-gray-600">No providers are listed yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Link
              key={group.specialty}
              href={`/dashboard/providers?specialty=${encodeURIComponent(group.specialty)}`}
              className="p-6 bg-surface-elevated border border-border rounded-2xl shadow-sm hover:border-foreground transition-colors"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                {group.specialty}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                {group.providers.length} provider
                {group.providers.length === 1 ? '' : 's'}
              </p>
              <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                {group.averageRating !== null && (
                  <div className="flex items-center gap-1">
                    <dt className="sr-only">Average rating</dt>
                    <dd>
                      <span aria-hidden="true">★</span>{' '}
                      {group.averageRating.toFixed(1)}
                    </dd>
                  </div>
                )}
                {group.lowestRate !== null && (
                  <div>
                    <dt className="sr-only">Starting rate</dt>
                    <dd>from ${group.lowestRate.toFixed(0)}/hour</dd>
                  </div>
                )}
              </dl>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
