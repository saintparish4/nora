import { NoraLogo } from '@/components/navigation/nora-logo';
import { Notice } from '@/components/workspace/notice';

/** Header and centred tile shared by the sign-in, sign-up, and demo pages. */
export function AuthShell({ title, subtitle, children }: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex h-[72px] max-w-[1024px] items-center px-5 sm:px-8">
        <NoraLogo />
      </header>
      <main id="main-content" className="flex justify-center px-5 pt-6 pb-20 sm:px-8 sm:pt-12">
        <div className="w-full max-w-[440px]">
          {/* Three small shapes: the same vocabulary as the landing page. */}
          <div className="mb-6 flex items-center gap-2" aria-hidden>
            <span className="size-7 rounded-full bg-blue" />
            <span className="size-7 rounded-[9px] bg-yellow rotate-12" />
            <span className="h-7 w-11 rounded-full bg-green" />
          </div>
          <h1 className="text-[2.25rem] leading-[1.05] tracking-[-0.035em] sm:text-[2.75rem]">{title}</h1>
          <p className="mt-3 mb-8 text-[1.0625rem] text-body">{subtitle}</p>
          <div className="rounded-tile bg-tile p-6 sm:p-8">{children}</div>
        </div>
      </main>
    </div>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <Notice tone="danger" role="alert" className="mb-4">
      {message}
    </Notice>
  );
}
