'use client';

import { useState, useEffect, useCallback } from 'react';
import { getProviders, Provider } from '@/lib/api';
import Link from 'next/link';
import { AuthProtected } from '@/components/auth-protected';
import { PatientSidebar } from '@/components/patient-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [specialty, setSpecialty] = useState('');
  const [sortBy, setSortBy] = useState('');

  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProviders({ 
        specialty: specialty || undefined,
        sort: sortBy || undefined
      });
      setProviders(data.providers);
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setLoading(false);
    }
  }, [specialty, sortBy]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const specialties = [
    'All Specialties',
    'Physical Therapy',
    'Personal Training',
    'Nutrition Counseling',
    'Yoga Instruction',
    'Mental Health Counseling'
  ];

  return (
    <AuthProtected>
      <SidebarProvider suppressHydrationWarning>
        <PatientSidebar />
        <SidebarInset>
          <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Browse Providers
          </h1>
          <p className="text-gray-600">
            Find the perfect health and wellness professional for your needs
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specialty
              </label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value === 'All Specialties' ? '' : e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#CC342D] focus:border-transparent text-black"
              >
                {specialties.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#CC342D] focus:border-transparent text-black"
              >
                <option value="">Most Recent</option>
                <option value="rating_desc">Highest Rated</option>
                <option value="hourly_rate_asc">Lowest Price</option>
                <option value="hourly_rate_desc">Highest Price</option>
                <option value="experience_desc">Most Experience</option>
              </select>
            </div>
          </div>
        </div>

        {/* Providers Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading providers...</div>
          </div>
        ) : providers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500">No providers found</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((provider) => (
              <div key={provider.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {provider.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {provider.specialty}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center mb-3">
                    <span className="text-yellow-400">★</span>
                    <span className="ml-1 text-sm font-medium text-gray-900">
                      {typeof provider.rating === 'number' ? provider.rating.toFixed(1) : 'N/A'}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">
                      • {provider.experience_years} years exp
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {provider.bio}
                  </p>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-500">
                      📍 {provider.location}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      ${typeof provider.hourly_rate === 'number' ? provider.hourly_rate.toFixed(0) : 'N/A'}/hr
                    </span>
                  </div>

                  <Link
                    href={`/providers/${provider.id}`}
                    className="w-full bg-[#CC342D] text-white text-center py-2 px-4 rounded-md hover:bg-[#B02E28] transition-colors block"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-500">
            Showing {providers.length} provider{providers.length !== 1 ? 's' : ''}
          </p>
        </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthProtected>
  );
}