'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { analyzeSymptoms, SymptomAnalysis } from '@/lib/api';
import { AuthProtected } from '@/components/dashboard/auth-protected';
import { PatientSidebar } from '@/components/dashboard/patient-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default function SymptomsPage() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<SymptomAnalysis | null>(null);

  const handleAnalyze = async () => {
    if (description.length < 10) {
      setError('Please provide more details about your symptoms');
      return;
    }

    setAnalyzing(true);
    setError('');
    setAnalysis(null);

    try {
      const result = await analyzeSymptoms(description);
      setAnalysis(result.analysis);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to analyze symptoms');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFindProviders = () => {
    if (analysis) {
      // Navigate to providers page with specialty filter
      router.push(`/providers?specialty=${analysis.specialty}`);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    const colors: Record<string, string> = {
      low: 'bg-green-100 border-green-300 text-green-800',
      moderate: 'bg-orange-100 border-orange-300 text-orange-800',
      high: 'bg-red-100 border-red-300 text-red-800',
      emergency: 'bg-red-100 border-red-300 text-red-800'
    };
    return colors[urgency] || colors.low;
  };

  return (
    <AuthProtected>
      <SidebarProvider suppressHydrationWarning>
        <PatientSidebar />
        <SidebarInset>
          <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
            <div className="max-w-3xl mx-auto w-full px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Describe Your Symptoms
          </h1>
          <p className="text-gray-600">
            Our AI will help match you with the right type of healthcare provider
          </p>
        </div>

        {/* Input Section */}
        {!analysis && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <label className="block text-sm font-medium text-black mb-2">
              What are you experiencing?
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#CC342D] focus:border-transparent text-black"
              placeholder="Example: I've had a persistent cough for 3 days with mild fever and fatigue..."
              maxLength={1000}
            />
            <div className="flex justify-between items-center mt-2 text-sm">
              <span className="text-gray-500">
                {description.length}/1000 characters
              </span>
              {description.length < 10 && description.length > 0 && (
                <span className="text-orange-600">
                  Please provide more details
                </span>
              )}
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={analyzing || description.length < 10}
              className="w-full mt-6 px-6 py-3 bg-[#CC342D] text-white font-semibold rounded-lg hover:bg-[#B02D27] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {analyzing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing your symptoms...
                </span>
              ) : (
                'Analyze Symptoms'
              )}
            </button>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    Disclaimer: This AI tool is for guidance only and does not provide medical diagnosis. 
                    If you&apos;re experiencing a medical emergency, call 911 immediately.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {analysis && (
          <div className="space-y-6">
            {/* Emergency Warning */}
            {analysis.urgency === 'emergency' && (
              <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6">
                <div className="flex items-start">
                  <svg className="h-6 w-6 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="ml-3">
                    <h3 className="text-lg font-bold text-red-900">Seek Immediate Medical Attention</h3>
                    <p className="text-red-800 mt-1">Call 911 or go to the nearest emergency room</p>
                  </div>
                </div>
              </div>
            )}

            {/* Urgency Level */}
            <div className={`border-2 rounded-lg p-6 ${getUrgencyColor(analysis.urgency)}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold uppercase">Urgency Level</span>
                <span className="text-lg font-bold capitalize">{analysis.urgency}</span>
              </div>
              <p className="text-sm">{analysis.urgency_details?.message}</p>
            </div>

            {/* Recommended Specialty */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-black mb-4">
                Recommended Provider Type
              </h2>
              <div className="flex items-start space-x-4 mb-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-[#CC342D] rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-black">
                    {analysis.specialty_name}
                  </h3>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-black mb-2">AI Analysis:</h4>
                  <p className="text-black">{analysis.reasoning}</p>
                </div>

                {analysis.keywords && analysis.keywords.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-black mb-2">Key Symptoms Identified:</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-gray-100 text-black rounded-full text-sm"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.red_flags && analysis.red_flags.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Important Notes:</h4>
                    <ul className="list-disc list-inside space-y-1 text-yellow-800">
                      {analysis.red_flags.map((flag, index) => (
                        <li key={index}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.urgency !== 'emergency' && (
                  <>
                    <button
                      onClick={handleFindProviders}
                      className="w-full px-6 py-3 bg-[#CC342D] text-white font-semibold rounded-lg hover:bg-[#B02D27] transition-colors mt-6"
                    >
                      Find {analysis.specialty_name} Providers
                    </button>
                    
                    <button
                      onClick={() => router.push('/providers')}
                      className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Show All Providers
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Start Over */}
            <button
              onClick={() => {
                setAnalysis(null);
                setDescription('');
              }}
              className="w-full text-center text-gray-600 hover:text-gray-900"
            >
              ← Start over with different symptoms
            </button>
          </div>
        )}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthProtected>
  );
}
