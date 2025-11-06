'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { quickBookingAnalyze, quickBookingBook, Provider, TimeSlot, SymptomAnalysis } from '@/lib/api';
import { AuthProtected } from '@/components/auth-protected';
import { Button } from '@/components/ui/button';
import { Check, Clock, MapPin, Star, ArrowRight, Sparkles, Calendar } from 'lucide-react';

type Step = 'symptoms' | 'providers' | 'slots' | 'confirm' | 'success';

export default function QuickBookingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('symptoms');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Data from each step
  const [analysis, setAnalysis] = useState<SymptomAnalysis | null>(null);
  const [providers, setProviders] = useState<(Provider & { next_available_slots: TimeSlot[] })[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider & { next_available_slots: TimeSlot[] } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [appointmentId, setAppointmentId] = useState<number | null>(null);

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
      
      if (result.providers.length === 0) {
        setError('No providers available for your symptoms. Please try again later.');
      } else {
        setCurrentStep('providers');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to analyze symptoms');
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
      const result = await quickBookingBook({
        provider_id: selectedProvider.id,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        notes: description
      });

      setAppointmentId(result.appointment.id);
      setCurrentStep('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const getUrgencyColor = (urgency: string) => {
    const colors: Record<string, string> = {
      routine: 'bg-green-100 text-green-800 border-green-300',
      urgent: 'bg-orange-100 text-orange-800 border-orange-300',
      emergency: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[urgency] || colors.routine;
  };

  return (
    <AuthProtected>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              AI-Powered Quick Booking
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              From Symptoms to Appointment in Under 2 Minutes
            </h1>
            <p className="text-gray-600">
              Let AI help you find the right provider and book instantly
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            {['symptoms', 'providers', 'slots', 'confirm'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep === step ? 'bg-blue-600 border-blue-600 text-white' :
                  ['providers', 'slots', 'confirm'].indexOf(currentStep) > index ? 'bg-green-500 border-green-500 text-white' :
                  'bg-white border-gray-300 text-gray-400'
                }`}>
                  {['providers', 'slots', 'confirm'].indexOf(currentStep) > index ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                {index < 3 && (
                  <div className={`w-16 h-0.5 ${
                    ['providers', 'slots', 'confirm'].indexOf(currentStep) > index ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          {/* Step 1: Symptoms */}
          {currentStep === 'symptoms' && (
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Describe Your Symptoms
              </h2>
              <p className="text-gray-600 mb-6">
                Tell us what you're experiencing, and our AI will recommend the right specialist.
              </p>
              
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Example: I've had a persistent headache for 3 days, feel dizzy, and sensitive to light..."
                className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={loading}
              />
              
              <div className="mt-6 flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  {description.length} characters {description.length < 10 && '(minimum 10)'}
                </p>
                <Button
                  onClick={handleAnalyzeSymptoms}
                  disabled={loading || description.length < 10}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                >
                  {loading ? 'Analyzing...' : 'Analyze & Find Providers'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Select Provider */}
          {currentStep === 'providers' && analysis && (
            <div className="space-y-6">
              {/* AI Analysis Summary */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">AI Analysis</h3>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <p className="text-gray-700 mb-3">{analysis.reasoning}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">Recommended:</span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {analysis.specialty_name}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getUrgencyColor(analysis.urgency)}`}>
                        {analysis.urgency.charAt(0).toUpperCase() + analysis.urgency.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Provider Selection */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Select a Provider ({providers.length} available)
                </h3>
                <div className="space-y-4">
                  {providers.map((provider) => (
                    <div
                      key={provider.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => handleSelectProvider(provider)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                          {provider.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-gray-900">{provider.name}</h4>
                            <span className="text-lg font-bold text-gray-900">${provider.hourly_rate}/hr</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{provider.specialty}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span>{provider.rating.toFixed(1)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span>{provider.location}</span>
                            </div>
                            {provider.next_available_slots.length > 0 && (
                              <div className="flex items-center gap-1 text-green-600 font-medium">
                                <Clock className="h-4 w-4" />
                                <span>Next: {formatDate(provider.next_available_slots[0].start_time)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Select Time Slot */}
          {currentStep === 'slots' && selectedProvider && (
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="mb-6">
                <Button
                  variant="ghost"
                  onClick={() => setCurrentStep('providers')}
                  className="mb-4"
                >
                  ← Back to Providers
                </Button>
                <h3 className="text-2xl font-bold text-gray-900">
                  Select Time Slot with {selectedProvider.name}
                </h3>
                <p className="text-gray-600 mt-2">Choose your preferred appointment time</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedProvider.next_available_slots.map((slot, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelectSlot(slot)}
                    className="border border-gray-200 rounded-lg p-5 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-5 w-5 text-blue-600" />
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
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>

              {selectedProvider.next_available_slots.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No available slots found. Please try another provider.
                </p>
              )}
            </div>
          )}

          {/* Step 4: Confirm Booking */}
          {currentStep === 'confirm' && selectedProvider && selectedSlot && (
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Confirm Your Appointment</h3>
              
              <div className="space-y-6 mb-8">
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
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

                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-gray-900">
                      {formatDate(selectedSlot.start_time)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <span className="text-gray-700">
                      {formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h5 className="font-semibold text-gray-900 mb-2">Your Symptoms:</h5>
                  <p className="text-gray-700">{description}</p>
                </div>
              </div>

              <div className="flex gap-4">
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
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {loading ? 'Booking...' : 'Confirm Booking'}
                  <Check className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Success */}
          {currentStep === 'success' && (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="h-10 w-10 text-green-600" />
              </div>
              
              <h3 className="text-3xl font-bold text-gray-900 mb-3">
                Appointment Booked Successfully! 🎉
              </h3>
              <p className="text-gray-600 mb-8">
                You'll receive a confirmation email shortly with all the details.
              </p>

              <div className="flex gap-4 justify-center">
                <Button
                  variant="outline"
                  onClick={() => router.push('/appointments')}
                >
                  View Appointments
                </Button>
                <Button
                  onClick={() => {
                    setCurrentStep('symptoms');
                    setDescription('');
                    setAnalysis(null);
                    setProviders([]);
                    setSelectedProvider(null);
                    setSelectedSlot(null);
                    setAppointmentId(null);
                    setError('');
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Book Another Appointment
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthProtected>
  );
}

