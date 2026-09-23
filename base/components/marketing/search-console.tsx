'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const SPECIALTY_REQUIRED_ERROR =
  'Please enter a specialty to search for specialists (e.g. primary care, cardiology, pediatrics).';

const FIELDS = [
  { id: 'specialty', label: 'Specialty', placeholder: 'Primary care, cardiology, pediatrics' },
  { id: 'location', label: 'Location', placeholder: 'New York, NY' },
  { id: 'insurance', label: 'Insurance', placeholder: 'Select provider' },
] as const;

type FieldId = (typeof FIELDS)[number]['id'];

/**
 * The booking console.
 *
 * Deliberately the least animated element on the page. Everything around it is
 * doing the persuading; this is the part someone actually has to use while
 * feeling unwell, so it stays a plain, legible form with real labels and a
 * visible focus ring. The only motion is the hairline that tracks the focused
 * field, which is feedback rather than decoration.
 */
export function SearchConsole() {
  const router = useRouter();
  const [values, setValues] = useState<Record<FieldId, string>>({
    specialty: '',
    location: '',
    insurance: '',
  });
  const [focused, setFocused] = useState<FieldId | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(id: FieldId, value: string) {
    setValues((current) => ({ ...current, [id]: value }));
    if (error) setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const specialty = values.specialty.trim();
    if (!specialty) {
      setError(SPECIALTY_REQUIRED_ERROR);
      return;
    }

    setError(null);
    const params = new URLSearchParams({ specialty });
    if (values.location.trim()) params.set('location', values.location.trim());
    if (values.insurance.trim()) params.set('insurance', values.insurance.trim());
    router.push(`/specialists?${params.toString()}`);
  }

  return (
    <div className="w-full max-w-[860px]">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="group relative flex flex-col overflow-hidden rounded-[28px] border border-[var(--ink-color)]/12 bg-[var(--bg-color)]/70 backdrop-blur-xl transition-[border-color,box-shadow] duration-500 focus-within:border-[var(--ink-color)]/30 focus-within:shadow-[0_24px_60px_-28px_rgba(15,17,21,0.28)] lg:flex-row lg:items-stretch lg:rounded-full"
      >
        {FIELDS.map((field, index) => (
          <div
            key={field.id}
            className={[
              'relative flex-1 px-6 py-4 lg:py-5',
              index < FIELDS.length - 1
                ? 'border-b border-[var(--ink-color)]/8 lg:border-b-0 lg:border-r'
                : '',
            ].join(' ')}
          >
            <label
              htmlFor={`search-${field.id}`}
              className="mb-1 block text-[0.62rem] uppercase tracking-[0.18em] text-[var(--ink-color)]/45"
            >
              {field.label}
            </label>
            <input
              id={`search-${field.id}`}
              type="text"
              value={values[field.id]}
              placeholder={field.placeholder}
              onFocus={() => setFocused(field.id)}
              onBlur={() => setFocused(null)}
              onChange={(event) => update(field.id, event.target.value)}
              aria-invalid={field.id === 'specialty' ? !!error : undefined}
              aria-describedby={field.id === 'specialty' && error ? 'search-error' : undefined}
              className="w-full border-none bg-transparent text-[0.95rem] text-[var(--ink-color)] outline-none placeholder:text-[var(--ink-color)]/28"
            />
            {/* Hairline that follows focus. */}
            <span
              aria-hidden
              className={[
                'pointer-events-none absolute bottom-0 left-6 right-6 h-px origin-left bg-[var(--ink-color)]/60 transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)]',
                focused === field.id ? 'scale-x-100' : 'scale-x-0',
              ].join(' ')}
            />
          </div>
        ))}

        <div className="p-3 lg:flex lg:items-center lg:pr-3">
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--ink-color)] text-[var(--bg-color)] transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ink-color)] motion-reduce:transition-none motion-reduce:hover:scale-100 lg:w-12"
          >
            <span className="lg:sr-only">Find specialists</span>
            <svg
              aria-hidden
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </form>

      {error && (
        <p
          id="search-error"
          role="alert"
          className="mt-3 px-2 text-center text-sm text-[var(--color-destructive)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
