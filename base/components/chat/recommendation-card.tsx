'use client';

import { formatDate, getUrgencyColor } from '@/lib/format';
import type { SymptomAnalysis, ChatProvider } from '@/types';

interface RecommendationCardProps {
  analysis: SymptomAnalysis;
  providers: ChatProvider[];
  onBook: (provider: ChatProvider) => void;
}

/**
 * The triage result rendered inline at the end of a chat: the specialty and
 * urgency the analyzer settled on, followed by bookable providers.
 *
 * Shared by the public analyzer (`/technology`) and the in-product checker
 * (`/dashboard/symptoms`) so the two can't drift apart.
 */
export function RecommendationCard({
  analysis,
  providers,
  onBook,
}: RecommendationCardProps) {
  const isEmergency = analysis.urgency === 'emergency';
  const assessmentFailed = analysis.assessment_failed === true;

  return (
    <div className="self-start max-w-[90%] animate-fade-in">
      {/* Emergency callout. Deliberately above and visually louder than the
          rest of the card — at this urgency the next step is a phone call, not
          a booking, and the backend returns no providers to book. */}
      {isEmergency && (
        <div
          role="alert"
          className="mb-4 p-5 bg-red-50 border-2 border-red-300 rounded-[20px] rounded-tl-md shadow-organic-sm"
        >
          <p className="text-[0.95rem] font-semibold text-red-900 mb-1">
            Seek emergency care now
          </p>
          <p className="text-[0.85rem] text-red-800">
            Call 911 or go to your nearest emergency room. Do not wait for an
            appointment. If you are having thoughts of harming yourself, call or
            text 988 to reach the Suicide &amp; Crisis Lifeline.
          </p>
          {analysis.red_flags.length > 0 && (
            <ul className="mt-2 text-[0.8rem] text-red-800 list-disc list-inside">
              {analysis.red_flags.map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Degraded triage. The backend could not assess the symptoms and
          escalated as a precaution, so this is explicitly not a recommendation. */}
      {assessmentFailed && (
        <div
          role="alert"
          className="mb-4 p-5 bg-amber-50 border-2 border-amber-300 rounded-[20px] rounded-tl-md shadow-organic-sm"
        >
          <p className="text-[0.95rem] font-semibold text-amber-900 mb-1">
            We couldn&apos;t assess your symptoms
          </p>
          <p className="text-[0.85rem] text-amber-800">
            Our check didn&apos;t run, so this is not an assessment. We&apos;ve
            pointed you to urgent care as the safer default. If this feels like
            an emergency, call 911 instead of waiting for an appointment.
          </p>
        </div>
      )}

      {/* Analysis summary */}
      <div className="mb-4 p-5 bg-white/90 backdrop-blur-sm border border-[var(--glass-border)] rounded-[20px] rounded-tl-md shadow-organic-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[0.7rem] uppercase tracking-widest opacity-50 font-semibold">
            {assessmentFailed ? 'Precautionary routing' : 'Recommendation'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-3 py-1 bg-[var(--ink-color)]/5 rounded-full text-[0.8rem] font-semibold">
            {analysis.specialty_name}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-[0.8rem] font-medium border ${getUrgencyColor(analysis.urgency)}`}
          >
            {analysis.urgency.charAt(0).toUpperCase() + analysis.urgency.slice(1)}
          </span>
        </div>
        {analysis.urgency_details && (
          <p className="text-[0.8rem] opacity-60">
            {analysis.urgency_details.message}
          </p>
        )}
        {/* Safety netting: a patient told "routine" still needs to know what
            would change that. Redundant once the emergency banner is up. */}
        {!isEmergency && (
          <p className="mt-3 pt-3 border-t border-[var(--glass-border)] text-[0.78rem] opacity-60">
            If your symptoms get worse, or you develop chest pain, trouble
            breathing, severe bleeding, or sudden weakness or confusion, treat
            it as an emergency and call 911.
          </p>
        )}
      </div>

      {/* Provider cards */}
      {providers.length > 0 && (
        <div className="space-y-3">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="p-5 bg-white/90 backdrop-blur-sm border border-[var(--glass-border)] rounded-[20px] shadow-organic-sm hover:shadow-organic transition-shadow duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--beam-start)] to-[var(--beam-end)] flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                  {provider.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-[0.95rem] truncate">
                    {provider.name}
                  </h4>
                  <p className="text-[0.8rem] opacity-60">{provider.specialty}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-[0.78rem] opacity-50">
                    {provider.rating > 0 && (
                      <span className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-500" aria-hidden><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        {Number(provider.rating).toFixed(1)}
                      </span>
                    )}
                    {provider.location && <span>{provider.location}</span>}
                    {provider.hourly_rate > 0 && (
                      <span>${provider.hourly_rate}/hr</span>
                    )}
                  </div>
                  {provider.next_available_slots.length > 0 && (
                    <p className="text-[0.78rem] text-green-700 mt-1">
                      Next available:{' '}
                      {formatDate(provider.next_available_slots[0].start_time)}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onBook(provider)}
                className="mt-4 w-full py-2.5 bg-[var(--ink-color)] text-[var(--bg-color)] rounded-[var(--radius-pill)] text-[0.85rem] font-medium cursor-pointer border-0 transition-all duration-200 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]"
              >
                Book with {provider.name.split(' ')[0]}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
