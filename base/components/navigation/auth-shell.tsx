import { NoraLogo } from '@/components/navigation/nora-logo';

/** Centered card layout shared by the sign-in and sign-up pages. */
export function AuthShell({ title, subtitle, children }: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <NoraLogo href="/" className="font-serif text-2xl italic flex items-center gap-3 text-foreground no-underline" />
      </header>
      <main id="main-content" className="px-4 sm:px-6 pb-16 flex justify-center">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-10">
          <h1 className="font-serif text-3xl mb-1">{title}</h1>
          <p className="text-muted-foreground mb-8">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {message}
    </p>
  );
}
