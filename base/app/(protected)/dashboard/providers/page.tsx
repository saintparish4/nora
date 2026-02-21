'use client';

import { useState, useEffect, useCallback } from 'react';
import { getProviders, Provider } from '@/lib/api';
import Link from 'next/link';
import { 
  Activity, 
  Heart, 
  Eye, 
  Smile, 
  Baby, 
  Users,
  Star,
  MapPin,
  Clock
} from 'lucide-react';

const SPECIALTY_CARDS = [
  { 
    id: '', 
    label: 'All Providers', 
    icon: Users, 
    color: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
    activeColor: 'bg-gray-800 text-white'
  },
  { 
    id: 'Primary Care', 
    label: 'Primary Care', 
    icon: Activity, 
    color: 'bg-blue-50 hover:bg-blue-100 text-blue-700',
    activeColor: 'bg-blue-600 text-white'
  },
  { 
    id: 'Cardiology', 
    label: 'Cardiology', 
    icon: Heart, 
    color: 'bg-red-50 hover:bg-red-100 text-red-700',
    activeColor: 'bg-red-600 text-white'
  },
  { 
    id: 'Ophthalmology', 
    label: 'Ophthalmology', 
    icon: Eye, 
    color: 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700',
    activeColor: 'bg-cyan-600 text-white'
  },
  { 
    id: 'Dentistry', 
    label: 'Dentistry', 
    icon: Smile, 
    color: 'bg-green-50 hover:bg-green-100 text-green-700',
    activeColor: 'bg-green-600 text-white'
  },
  { 
    id: 'Pediatrics', 
    label: 'Pediatrics', 
    icon: Baby, 
    color: 'bg-amber-50 hover:bg-amber-100 text-amber-700',
    activeColor: 'bg-amber-600 text-white'
  },
];

const PER_PAGE = 20;

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [specialty, setSpecialty] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProviders({
        specialty: specialty || undefined,
        sort: sortBy || undefined,
        page,
        per_page: PER_PAGE,
      });
      setProviders(data.providers);
      setTotal(data.total);
      setTotalPages(data.total_pages ?? 1);
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setLoading(false);
    }
  }, [specialty, sortBy, page]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const handleSpecialtyClick = (specId: string) => {
    setSpecialty(specId);
    setPage(1);
  };

  return (
    <div className="flex flex-1 flex-col pb-16">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-8 mb-6 rounded-2xl border border-[var(--glass-border)]">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Browse Providers
          </h1>
          <p className="text-gray-600">
            Find the perfect health and wellness professional for your needs
          </p>
        </div>
      </div>

      {/* Specialty Cards */}
      <div className="border-b bg-white px-6 py-6 mb-6 rounded-2xl border border-[var(--glass-border)]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-3">
            {SPECIALTY_CARDS.map((spec) => {
              const isActive = specialty === spec.id;
              return (
                <button
                  key={spec.id}
                  onClick={() => handleSpecialtyClick(spec.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                    isActive ? spec.activeColor : spec.color
                  }`}
                >
                  <spec.icon className="h-5 w-5" />
                  <span>{spec.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <div className="max-w-6xl mx-auto">
          {/* Sort & Results Count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600">
              {loading ? 'Loading...' : `${total} provider${total !== 1 ? 's' : ''} found`}
              {specialty && ` in ${specialty}`}
            </p>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">Most Recent</option>
                <option value="rating_desc">Highest Rated</option>
                <option value="price_asc">Lowest Price</option>
                <option value="price_desc">Highest Price</option>
                <option value="experience_desc">Most Experience</option>
              </select>
            </div>
          </div>

          {/* Providers Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-xl p-6 animate-pulse border border-[var(--glass-border)]">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-gray-200" />
                    <div className="flex-1">
                      <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-[var(--glass-border)]">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No providers found</h3>
              <p className="text-gray-500">
                Try selecting a different specialty or clearing filters
              </p>
              {specialty && (
                <button
                  onClick={() => setSpecialty('')}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                >
                  View all providers
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {providers.map((provider) => (
                <div 
                  key={provider.id} 
                  className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all group border border-[var(--glass-border)]"
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                        {provider.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                          {provider.name}
                        </h3>
                        <p className="text-sm text-blue-600 font-medium">
                          {provider.specialty}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium text-gray-900">
                          {typeof provider.rating === 'number' ? provider.rating.toFixed(1) : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>{provider.experience_years} yrs exp</span>
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {provider.bio}
                    </p>

                    <div className="flex items-center justify-between mb-4 text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {provider.location}
                      </span>
                      <span className="font-bold text-gray-900">
                        ${typeof provider.hourly_rate === 'number' ? provider.hourly_rate.toFixed(0) : 'N/A'}/hr
                      </span>
                    </div>

                    <Link
                      href={`/dashboard/providers/${provider.id}`}
                      className="w-full bg-gray-900 text-white text-center py-2.5 px-4 rounded-lg hover:bg-gray-800 transition-colors block font-medium"
                    >
                      View Profile
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === 'ellipsis' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                        page === p
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
