'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getProvider, getAvailableSlots, bookAppointment, Provider, TimeSlot, AvailableSlotsResponse } from '@/lib/api';

export default function ProviderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const providerId = Number(params.id);
  
  const [provider, setProvider] = useState<Provider | null>(null);
  const [slotsData, setSlotsData] = useState<AvailableSlotsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  
  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const loadProviderData = useCallback(async () => {
    setLoading(true);
    try {
      const [providerData, slotsResponse] = await Promise.all([
        getProvider(providerId),
        getAvailableSlots(providerId)
      ]);
      
      setProvider(providerData);
      setSlotsData(slotsResponse);
      
      const dates = Object.keys(slotsResponse.slots);
      if (dates.length > 0) {
        setSelectedDate(dates[0]);
      }
    } catch (error) {
      console.error('Failed to load provider:', error);
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    loadProviderData();
  }, [loadProviderData]);

  const handleBookingClick = () => {
    if (selectedSlot) {
      setShowModal(true);
      setBookingError('');
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedSlot || !provider) return;
    
    setBooking(true);
    setBookingError('');
    
    try {
      await bookAppointment({
        provider_id: provider.id,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        notes: notes
      });
      
      setBookingSuccess(true);
      
      const slotsResponse = await getAvailableSlots(providerId);
      setSlotsData(slotsResponse);
    } catch (error: unknown) {
      setBookingError(error instanceof Error ? error.message : 'Failed to book appointment');
      setBooking(false);
    }
  };

  const handleCloseModal = () => {
    if (bookingSuccess) {
      router.push('/dashboard/appointments');
    } else {
      setShowModal(false);
      setNotes('');
      setBookingError('');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="text-xl">Loading provider details...</div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="text-xl">Provider not found</div>
      </div>
    );
  }

  const availableDates = slotsData ? Object.keys(slotsData.slots) : [];
  const slotsForSelectedDate = selectedDate && slotsData ? slotsData.slots[selectedDate] || [] : [];

  return (
    <div className="flex flex-1 flex-col gap-6 pb-16">
      <div className="max-w-7xl mx-auto w-full">
        {/* Provider Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-[var(--glass-border)]">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex-shrink-0"></div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {provider.name}
              </h1>
              <p className="text-lg text-[#CC342D] mb-3">
                {provider.specialty}
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                <span className="flex items-center gap-1">
                  ★
                  <span className="font-semibold">
                    {parseFloat(provider.rating.toString()).toFixed(1)}
                  </span>
                </span>
                <span>
                  {provider.experience_years} years experience
                </span>
                <span>
                  📍 {provider.location}
                </span>
              </div>
              <p className="text-gray-700 mb-4">{provider.bio}</p>
              <div className="text-2xl font-bold text-[#CC342D]">
                <span className="text-3xl">
                  ${parseFloat(provider.hourly_rate.toString()).toFixed(0)}
                </span>
                <span className="text-lg">/hour</span>
              </div>
            </div>
          </div>
        </div>

        {/* Available Slots Section */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-[var(--glass-border)]">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Book an Appointment
          </h2>

          {availableDates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No available slots in the next 14 days
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <h3 className="text-lg font-semibold mb-4 text-black">
                  Select a Date
                </h3>
                <div className="space-y-2">
                  {availableDates.map((date) => {
                    const slotsCount = slotsData?.slots[date]?.length || 0;
                    return (
                      <button
                        key={date}
                        onClick={() => {
                          setSelectedDate(date);
                          setSelectedSlot(null);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                          selectedDate === date
                            ? 'border-[#CC342D] bg-[#CC342D] bg-opacity-10'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-semibold text-black">
                          {formatDate(date)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {slotsCount} slot{slotsCount !== 1 ? 's' : ''} available
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold mb-4 text-black">
                  Available Times for {selectedDate ? formatDate(selectedDate) : '...'}
                </h3>
                <div>
                  {slotsForSelectedDate.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No available slots for this date
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {slotsForSelectedDate.map((slot: TimeSlot, index: number) => (
                        <button
                          key={index}
                          onClick={() => setSelectedSlot(slot)}
                          className={`px-4 py-3 rounded-lg border-2 font-semibold transition-all ${
                            selectedSlot === slot
                              ? 'border-[#CC342D] bg-[#CC342D] text-white'
                              : 'border-gray-300 hover:border-[#CC342D] hover:bg-[#CC342D] hover:bg-opacity-10 text-black'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedSlot && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border-2 border-[#CC342D]">
                      <h4 className="font-semibold text-lg mb-3 text-black">
                        Selected Appointment
                      </h4>
                      <p className="text-sm text-black mb-2">
                        <strong>Date:</strong> {formatDate(selectedSlot.date)}
                      </p>
                      <p className="text-sm text-black mb-2">
                        <strong>Time:</strong> {selectedSlot.time}
                      </p>
                      <p className="text-sm text-black mb-4">
                        <strong>Duration:</strong> 30 minutes
                      </p>
                      <button onClick={handleBookingClick} className="w-full bg-[#CC342D] text-white py-3 rounded-lg font-semibold hover:bg-[#a82a24] transition">
                        Book Appointment - ${parseFloat(provider.hourly_rate.toString()).toFixed(0)}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Booking Modal */}
        {showModal && selectedSlot && provider && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              {bookingSuccess ? (
                <div className="p-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-center mb-2 text-black">
                    Booking Confirmed!
                  </h2>
                  <p className="text-gray-600 text-center mb-6">
                    Your appointment has been successfully booked.
                  </p>
                  <div className="space-y-4 mb-6">
                    <div className="border-b pb-3">
                      <p className="text-sm text-gray-500">Provider</p>
                      <p className="font-semibold text-black">{provider.name}</p>
                    </div>
                    <div className="border-b pb-3">
                      <p className="text-sm text-gray-500">Date & Time</p>
                      <p className="font-semibold text-black">
                        {formatDate(selectedSlot.date)} at {selectedSlot.time}
                      </p>
                    </div>
                    <div className="border-b pb-3">
                      <p className="text-sm text-gray-500">Duration</p>
                      <p className="font-semibold text-black">30 minutes</p>
                    </div>
                  </div>
                  <button onClick={handleCloseModal} className="w-full bg-[#CC342D] text-white py-3 rounded-lg font-semibold hover:bg-[#a82a24] transition">
                    View My Appointments
                  </button>
                </div>
              ) : (
                <>
                  <div className="p-6">
                    <h2 className="text-2xl font-bold mb-6 text-black">
                      Confirm Booking
                    </h2>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 pb-4 border-b">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0"></div>
                        <div>
                          <p className="font-semibold text-black">{provider.name}</p>
                          <p className="text-sm text-gray-600">{provider.specialty}</p>
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2 text-black">
                          Appointment Details
                        </h3>
                        <p className="text-sm mb-1 text-black">
                          {formatDate(selectedSlot.date)} at {selectedSlot.time}
                        </p>
                        <p className="text-sm text-gray-600">Duration: 30 minutes</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-black">
                          Notes (Optional)
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#CC342D] focus:border-transparent text-black"
                          placeholder="Any special requests or information..."
                        />
                      </div>
                      {bookingError && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                          {bookingError}
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-4 border-t">
                        <span className="font-semibold text-black">Total</span>
                        <span className="text-2xl font-bold text-[#CC342D]">
                          ${parseFloat(provider.hourly_rate.toString()).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 px-6 pb-6">
                    <button onClick={handleCloseModal} className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition">
                      Cancel
                    </button>
                    <button onClick={handleBookAppointment} disabled={booking} className="flex-1 bg-[#CC342D] text-white py-3 rounded-lg font-semibold hover:bg-[#a82a24] transition disabled:opacity-50 disabled:cursor-not-allowed">
                      {booking ? 'Booking...' : 'Confirm Booking'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
