'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { quickBookingAnalyze, quickBookingBook, prefetchProvider, Provider, TimeSlot, SymptomAnalysis } from '@/lib/api';
import { useAnalysisProgress } from '@/hooks/useAnalysisProgress';
import { Button } from '@/components/ui/button';
import { formatDate, formatTime, getUrgencyColor } from '@/lib/format';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Check, 
  Clock, 
  MapPin, 
  Star, 
  ArrowRight, 
  ArrowLeft,
  HeartPulse, 
  Calendar,
  Stethoscope,
  AlertCircle,
  Sparkles,
  MessageSquare
} from 'lucide-react';

type Step = 'start' | 'symptoms' | 'providers' | 'slots' | 'confirm' | 'success';

const QUICK_REASONS = [
  { id: 'checkup', label: 'General Checkup', icon: Stethoscope },
  { id: 'pain', label: 'Pain or Discomfort', icon: AlertCircle },
  { id: 'followup', label: 'Follow-up Visit', icon: Calendar },
  { id: 'other', label: 'Describe Symptoms', icon: MessageSquare },
];

function GetCareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillSpecialty = searchParams.get('specialty');
  const prefillProviderId = searchParams.get('provider_id');
  const hasPrefilled = useRef(false);

  const [currentStep, setCurrentStep] = useState<Step>(prefillSpecialty ? 'symptoms' : 'start');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const analysisProgress = useAnalysisProgress(loading && currentStep === 'symptoms');
  
  const [analysis, setAnalysis] = useState<SymptomAnalysis | null>(null);
  const [providers, setProviders] = useState<(Provider & { next_available_slots: TimeSlot[] })[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider & { next_available_slots: TimeSlot[] } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Prefill from SymptomX chat or external link with ?specialty=X&provider_id=Y
  useEffect(() => {
    if (!prefillSpecialty || hasPrefilled.current) return;
    hasPrefilled.current = true;

    const prefillDescription = `I need to see a ${prefillSpecialty} specialist`;
    setDescription(prefillDescription);
    setLoading(true);

    quickBookingAnalyze(prefillDescription)
      .then((result) => {
        setAnalysis(result.analysis);
        setProviders(result.providers);

        if (result.providers.length === 0) {
          setError('No providers available for this specialty. Please try again later.');
          return;
        }

        // Warm provider detail caches for recommended providers.
        result.providers.slice(0, 5).forEach((p: Provider & { next_available_slots: TimeSlot[] }) => prefetchProvider(p.id));

        if (prefillProviderId) {
          const match = result.providers.find(
            (p: Provider & { next_available_slots: TimeSlot[] }) => String(p.id) === prefillProviderId
          );
          if (match) {
            setSelectedProvider(match);
            setCurrentStep('slots');
            return;
          }
        }

        setCurrentStep('providers');
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load providers';
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, [prefillSpecialty, prefillProviderId]);

  const handleQuickSelect = (reasonId: string) => {
    if (reasonId === 'other') {
      setCurrentStep('symptoms');
    } else {
      const reasonMap: Record<string, string> = {
        'checkup': 'I would like to schedule a general health checkup and wellness exam.',
        'pain': 'I am experiencing pain or discomfort and need to see a healthcare provider.',
        'followup': 'I need to schedule a follow-up appointment for an ongoing health concern.',
      };
      setDescription(reasonMap[reasonId] || '');
      setCurrentStep('symptoms');
    }
  };

  const handleAnalyzeSymptoms = async () => {
    if (description.length < 10) {
      setError('Please provide more details (at least 10 characters)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await quickBookingAnalyze(description);
      setAnalysis(result.analysis);
      setProviders(result.providers);

      // Warm provider detail caches while the user reads recommendations.
      result.providers.slice(0, 5).forEach((p) => prefetchProvider(p.id));

      if (result.providers.length === 0) {
        setError('No providers available for your symptoms. Please try again later.');
      } else {
        setCurrentStep('providers');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to analyze symptoms';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProvider = (provider: Provider & { next_available_slots: TimeSlot[] }) => {
    setSelectedProvider(provider);
    setCurrentStep('slots');
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setCurrentStep('confirm');
  };

  const handleConfirmBooking = async () => {
    if (!selectedProvider || !selectedSlot) return;

    setLoading(true);
    setError('');

    try {
      await quickBookingBook({
        provider_id: selectedProvider.id,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        notes: description
      });

      setCurrentStep('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to book appointment';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const getStepNumber = () => {
    const steps: Step[] = ['start', 'symptoms', 'providers', 'slots', 'confirm'];
    return steps.indexOf(currentStep) + 1;
  };

  const resetWizard = () => {
    setCurrentStep('start');
    setDescription('');
    setAnalysis(null);
    setProviders([]);
    setSelectedProvider(null);
    setSelectedSlot(null);
    setError('');
  };

  return (
    <div className="flex flex-1 flex-col pb-16">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-rose-50 to-teal-50 px-6 py-8 mb-6 rounded-2xl border border-[var(--glass-border)]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur rounded-full text-sm font-medium text-rose-700 mb-4 shadow-sm">
            <Sparkles className="h-4 w-4" />
            AI-Powered Care
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Get the Care You Need
          </h1>
          <p className="text-gray-600">
            Tell us what&apos;s going on, and we&apos;ll match you with the right provider
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      {currentStep !== 'success' && (
        <div className="border-b bg-white px-6 py-4 mb-6 rounded-2xl border border-[var(--glass-border)]">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              {['What', 'Describe', 'Provider', 'Time', 'Confirm'].map((label, index) => (
                <div key={label} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                      getStepNumber() > index + 1 
                        ? 'bg-teal-500 text-white' 
                        : getStepNumber() === index + 1 
                          ? 'bg-rose-500 text-white' 
                          : 'bg-gray-200 text-gray-500'
                    }`}>
                      {getStepNumber() > index + 1 ? <Check className="h-4 w-4" /> : index + 1}
                    </div>
                    <span className={`text-xs mt-1 ${getStepNumber() === index + 1 ? 'text-rose-600 font-medium' : 'text-gray-500'}`}>
                      {label}
                    </span>
                  </div>
                  {index < 4 && (
                    <div className={`w-12 sm:w-20 h-0.5 mx-1 ${
                      getStepNumber() > index + 1 ? 'bg-teal-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1">
        <div className="max-w-3xl mx-auto">
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {loading ? analysisProgress : ''}
          </p>
          <div aria-live="polite" aria-atomic="true">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 flex items-start gap-3" role="alert">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p>{error}</p>
              </div>
            )}
          </div>

          {currentStep === 'start' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HeartPulse className="h-5 w-5 text-rose-500" />
                    What brings you in today?
                  </CardTitle>
                  <CardDescription>
                    Select a reason or describe your symptoms in detail
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {QUICK_REASONS.map((reason) => (
                      <button
                        key={reason.id}
                        onClick={() => handleQuickSelect(reason.id)}
                        className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-rose-300 hover:bg-rose-50 transition-all text-left group"
                      >
                        <div className="p-3 bg-gray-100 rounded-lg group-hover:bg-rose-100 transition-colors">
                          <reason.icon className="h-6 w-6 text-gray-600 group-hover:text-rose-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{reason.label}</p>
                          <p className="text-sm text-gray-500">
                            {reason.id === 'other' ? 'Enter detailed symptoms' : 'Quick selection'}
                          </p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400 ml-auto group-hover:text-rose-500" />
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 'symptoms' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setCurrentStep('start')}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                </div>
                <CardTitle>Describe Your Symptoms</CardTitle>
                <CardDescription>
                  The more details you provide, the better we can match you with the right provider
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Example: I've had a persistent headache for 3 days, feel dizzy when standing up, and have been more tired than usual..."
                  className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none text-gray-900"
                  disabled={loading}
                />
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    {description.length} characters {description.length < 10 && '(minimum 10)'}
                  </p>
                  <Button
                    onClick={handleAnalyzeSymptoms}
                    disabled={loading || description.length < 10}
                    className="bg-rose-500 hover:bg-rose-600"
                  >
                    {loading ? analysisProgress : 'Find Providers'}
                    {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> This tool provides guidance only and does not replace professional medical advice. 
                    If you&apos;re experiencing a medical emergency, call 911 immediately.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 'providers' && analysis && (
            <div className="space-y-6">
              <Card className="border-teal-200 bg-teal-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-teal-600" />
                    AI Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-3">{analysis.reasoning}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm font-medium">
                      {analysis.specialty_name}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getUrgencyColor(analysis.urgency)}`}>
                      {analysis.urgency.charAt(0).toUpperCase() + analysis.urgency.slice(1)} urgency
                    </span>
                  </div>
                </CardContent>
              </Card>

              {analysis.urgency === 'emergency' && (
                <Card className="border-red-500 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                      <div>
                        <h3 className="font-bold text-red-900">Seek Immediate Medical Attention</h3>
                        <p className="text-red-800 mt-1">
                          Based on your symptoms, we recommend calling 911 or visiting the nearest emergency room.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setCurrentStep('symptoms')}>
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  </div>
                  <CardTitle>Select a Provider</CardTitle>
                  <CardDescription>{providers.length} providers available for your needs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {providers.map((provider) => (
                      <div
                        key={provider.id}
                        className="border border-gray-200 rounded-xl p-4 hover:border-rose-300 hover:shadow-md transition-all cursor-pointer group focus-within:ring-2 focus-within:ring-rose-300"
                        role="button"
                        tabIndex={0}
                        aria-label={`Select ${provider.name}, ${provider.specialty}`}
                        onClick={() => handleSelectProvider(provider)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectProvider(provider); } }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-400 to-orange-400 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                            {provider.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-semibold text-gray-900 truncate">{provider.name}</h4>
                              <span className="text-lg font-bold text-gray-900">${provider.hourly_rate}/hr</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{provider.specialty}</p>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span>{Number(provider.rating).toFixed(1)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                <span>{provider.location}</span>
                              </div>
                              {provider.next_available_slots.length > 0 && (
                                <div className="flex items-center gap-1 text-teal-600 font-medium">
                                  <Clock className="h-4 w-4" />
                                  <span>Next: {formatDate(provider.next_available_slots[0].start_time)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-rose-500 flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 'slots' && selectedProvider && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setCurrentStep('providers')}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                </div>
                <CardTitle>Select Time with {selectedProvider.name}</CardTitle>
                <CardDescription>Choose your preferred appointment time</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedProvider.next_available_slots.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedProvider.next_available_slots.map((slot, index) => (
                      <div
                        key={index}
                        role="button"
                        tabIndex={0}
                        aria-label={`Select slot on ${formatDate(slot.start_time)}`}
                        onClick={() => handleSelectSlot(slot)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectSlot(slot); } }}
                        className="border border-gray-200 rounded-xl p-4 hover:border-rose-300 hover:shadow-md transition-all cursor-pointer group focus-within:ring-2 focus-within:ring-rose-300"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="h-5 w-5 text-rose-500" />
                              <span className="font-semibold text-gray-900">
                                {formatDate(slot.start_time)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Clock className="h-4 w-4" />
                              <span>
                                {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-rose-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    No available slots found. Please try another provider.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 'confirm' && selectedProvider && selectedSlot && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setCurrentStep('slots')}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                </div>
                <CardTitle>Confirm Your Appointment</CardTitle>
                <CardDescription>Review the details below</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-400 to-orange-400 flex items-center justify-center text-white text-xl font-bold">
                    {selectedProvider.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-lg">{selectedProvider.name}</h4>
                    <p className="text-gray-600">{selectedProvider.specialty}</p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      <MapPin className="h-4 w-4" />
                      <span>{selectedProvider.location}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-rose-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="h-5 w-5 text-rose-600" />
                    <span className="font-semibold text-gray-900">
                      {formatDate(selectedSlot.start_time)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-rose-600" />
                    <span className="text-gray-700">
                      {formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <h5 className="font-semibold text-gray-900 mb-2">Reason for visit:</h5>
                  <p className="text-gray-700">{description}</p>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep('slots')}
                    className="flex-1"
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleConfirmBooking}
                    disabled={loading}
                    className="flex-1 bg-teal-600 hover:bg-teal-700"
                  >
                    {loading ? 'Booking...' : 'Confirm Booking'}
                    <Check className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 'success' && (
            <Card className="text-center">
              <CardContent className="pt-12 pb-8">
                <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="h-10 w-10 text-teal-600" />
                </div>
                
                <h3 className="text-3xl font-bold text-gray-900 mb-3">
                  Appointment Booked!
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  You&apos;ll receive a confirmation email shortly with all the details.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/dashboard/appointments')}
                  >
                    View Appointments
                  </Button>
                  <Button
                    onClick={resetWizard}
                    className="bg-rose-500 hover:bg-rose-600"
                  >
                    Book Another
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GetCarePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center py-20">
        <p className="text-gray-500">Loading...</p>
      </div>
    }>
      <GetCareContent />
    </Suspense>
  );
}
