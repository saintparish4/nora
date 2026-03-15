'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import {
  useProvider,
  useProviderSlots,
  bookAppointment,
  type TimeSlot,
} from '@/lib/api';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProviderDetailSkeleton } from '@/components/ui/page-skeleton';
import { AlertCircle, Check } from 'lucide-react';

export default function ProviderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const providerId = Number(params.id);

  const { data: provider, isLoading: providerLoading } = useProvider(providerId);
  const { data: slotsData, mutate: mutateSlots, isLoading: slotsLoading } = useProviderSlots(providerId);
  const loading = providerLoading || slotsLoading;

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Auto-select the first available date whenever slot data loads/changes.
  useEffect(() => {
    if (slotsData) {
      const dates = Object.keys(slotsData.slots);
      if (dates.length > 0) {
        setSelectedDate(dates[0]);
      }
    }
  }, [slotsData]);

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
        notes,
      });

      setBookingSuccess(true);
      await mutateSlots();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to book appointment';
      setBookingError(message);
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

  if (loading) {
    return <ProviderDetailSkeleton />;
  }

  if (!provider) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
          <p className="text-xl text-gray-600">Provider not found</p>
        </div>
      </div>
    );
  }

  const availableDates = slotsData ? Object.keys(slotsData.slots) : [];
  const slotsForSelectedDate =
    selectedDate && slotsData ? slotsData.slots[selectedDate] || [] : [];

  return (
    <div className="flex flex-1 flex-col gap-6 pb-16">
      <div className="max-w-7xl mx-auto w-full">
        {/* Provider Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-[var(--glass-border)]">
          <div className="flex flex-col md:flex-row gap-6">
            <div
              aria-hidden="true"
              className="w-24 h-24 bg-gray-200 rounded-full flex-shrink-0"
            />
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{provider.name}</h1>
              <p className="text-lg text-[var(--brand)] mb-3">{provider.specialty}</p>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                <span className="flex items-center gap-1">
                  <span aria-hidden="true">★</span>
                  <span className="font-semibold">
                    {parseFloat(provider.rating.toString()).toFixed(1)}
                  </span>
                  <span className="sr-only">rating</span>
                </span>
                <span>{provider.experience_years} years experience</span>
                <span>📍 {provider.location}</span>
              </div>
              <p className="text-gray-700 mb-4">{provider.bio}</p>
              <div className="text-2xl font-bold text-[var(--brand)]">
                <span className="text-3xl">
                  ${parseFloat(provider.hourly_rate.toString()).toFixed(0)}
                </span>
                <span className="text-lg">/hour</span>
              </div>
            </div>
          </div>
        </div>

        {/* Available Slots Section */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-[var(--glass-border)]">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Book an Appointment</h2>

          {availableDates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No available slots in the next 14 days
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Select a Date</h3>
                <div className="space-y-2" role="radiogroup" aria-label="Available dates">
                  {availableDates.map((date) => {
                    const slotsCount = slotsData?.slots[date]?.length || 0;
                    return (
                      <button
                        key={date}
                        onClick={() => {
                          setSelectedDate(date);
                          setSelectedSlot(null);
                        }}
                        role="radio"
                        aria-checked={selectedDate === date}
                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-1 ${
                          selectedDate === date
                            ? 'border-[var(--brand)] bg-[var(--brand)]/10'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-semibold text-gray-900">
                          {formatDate(date, { relative: true })}
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
                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                  Available Times for{' '}
                  {selectedDate ? formatDate(selectedDate, { relative: true }) : '…'}
                </h3>
                <div>
                  {slotsForSelectedDate.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No available slots for this date
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Available times">
                      {slotsForSelectedDate.map((slot: TimeSlot, index: number) => (
                        <button
                          key={index}
                          onClick={() => setSelectedSlot(slot)}
                          role="radio"
                          aria-checked={selectedSlot === slot}
                          className={`px-4 py-3 rounded-xl border-2 font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-1 ${
                            selectedSlot === slot
                              ? 'border-[var(--brand)] bg-[var(--brand)] text-white'
                              : 'border-gray-300 hover:border-[var(--brand)] hover:bg-[var(--brand)]/10 text-gray-900'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedSlot && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-2xl border-2 border-[var(--brand)]">
                      <h4 className="font-semibold text-lg mb-3 text-gray-900">
                        Selected Appointment
                      </h4>
                      <p className="text-sm text-gray-900 mb-2">
                        <strong>Date:</strong>{' '}
                        {formatDate(selectedSlot.date, { relative: true })}
                      </p>
                      <p className="text-sm text-gray-900 mb-2">
                        <strong>Time:</strong> {selectedSlot.time}
                      </p>
                      <p className="text-sm text-gray-900 mb-4">
                        <strong>Duration:</strong> 30 minutes
                      </p>
                      <Button
                        onClick={handleBookingClick}
                        className="w-full"
                      >
                        Book Appointment — ${parseFloat(provider.hourly_rate.toString()).toFixed(0)}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Booking Dialog — Radix Dialog for proper focus trap */}
      <Dialog
        open={showModal}
        onOpenChange={(open) => {
          if (!open && !bookingSuccess) {
            setShowModal(false);
            setNotes('');
            setBookingError('');
          }
        }}
      >
        <DialogContent>
          {bookingSuccess ? (
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-500" aria-hidden="true" />
                </div>
              </div>
              <DialogHeader>
                <DialogTitle className="text-center">Booking Confirmed!</DialogTitle>
                <DialogDescription className="text-center">
                  Your appointment has been successfully booked.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 my-6">
                <div className="border-b pb-3">
                  <p className="text-sm text-gray-500">Provider</p>
                  <p className="font-semibold text-gray-900">{provider.name}</p>
                </div>
                {selectedSlot && (
                  <div className="border-b pb-3">
                    <p className="text-sm text-gray-500">Date &amp; Time</p>
                    <p className="font-semibold text-gray-900">
                      {formatDate(selectedSlot.date, { relative: true })} at {selectedSlot.time}
                    </p>
                  </div>
                )}
                <div className="border-b pb-3">
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-semibold text-gray-900">30 minutes</p>
                </div>
              </div>
              <Button onClick={handleCloseModal} className="w-full">
                View My Appointments
              </Button>
            </div>
          ) : (
            <>
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle>Confirm Booking</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="flex items-center gap-3 pb-4 border-b">
                    <div
                      aria-hidden="true"
                      className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">{provider.name}</p>
                      <p className="text-sm text-gray-600">{provider.specialty}</p>
                    </div>
                  </div>
                  {selectedSlot && (
                    <div className="bg-gray-50 p-4 rounded-xl">
                      <h3 className="font-semibold mb-2 text-gray-900">Appointment Details</h3>
                      <p className="text-sm mb-1 text-gray-900">
                        {formatDate(selectedSlot.date, { relative: true })} at {selectedSlot.time}
                      </p>
                      <p className="text-sm text-gray-600">Duration: 30 minutes</p>
                    </div>
                  )}
                  <div>
                    <label htmlFor="booking-notes" className="block text-sm font-medium mb-2 text-gray-900">
                      Notes (Optional)
                    </label>
                    <textarea
                      id="booking-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent text-gray-900"
                      placeholder="Any special requests or information…"
                    />
                  </div>
                  {bookingError && (
                    <div
                      role="alert"
                      className="bg-red-50 text-red-700 p-3 rounded-xl text-sm flex items-start gap-2"
                    >
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      {bookingError}
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-4 border-t">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-[var(--brand)]">
                      ${parseFloat(provider.hourly_rate.toString()).toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 px-6 pb-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCloseModal}
                  disabled={booking}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleBookAppointment}
                  disabled={booking}
                >
                  {booking ? 'Booking…' : 'Confirm Booking'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
