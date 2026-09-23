import type { CarePreferences } from '@/lib/api/schemas';

export type { CarePreferences };

/** Options offered on the care-preferences form. */
export const PREFERRED_TIME_OPTIONS = [
  { value: 'morning', label: 'Morning (8am – 12pm)' },
  { value: 'afternoon', label: 'Afternoon (12pm – 5pm)' },
  { value: 'evening', label: 'Evening (5pm – 8pm)' },
] as const;

export const PROVIDER_GENDER_OPTIONS = [
  { value: 'no_preference', label: 'No preference' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
] as const;

export const LANGUAGE_OPTIONS = [
  'English',
  'Spanish',
  'Mandarin',
  'Vietnamese',
  'Arabic',
] as const;
