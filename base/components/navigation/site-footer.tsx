import { NoraMark } from '@/components/navigation/nora-logo';

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <NoraMark className="text-[#b9b4ac]" />
        <p>Nora prepares administrative work for people to review. It does not make clinical or coverage decisions.</p>
      </div>
    </footer>
  );
}
