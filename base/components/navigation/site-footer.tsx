import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--glass-border)] py-10 mt-auto">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="w-px h-5 bg-[var(--ink-color)] rotate-[15deg] opacity-40" />
            <span className="font-serif text-lg italic text-[var(--ink-color)] opacity-80">
              nora.ai
            </span>
          </div>

          <nav aria-label="Footer navigation" className="flex flex-wrap justify-center gap-6 text-[0.85rem]">
            <Link
              href="/privacy"
              className="text-[var(--ink-color)] opacity-60 hover:opacity-100 transition-opacity no-underline"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-[var(--ink-color)] opacity-60 hover:opacity-100 transition-opacity no-underline"
            >
              Terms of Service
            </Link>
            <a
              href="mailto:hello@nora.ai"
              className="text-[var(--ink-color)] opacity-60 hover:opacity-100 transition-opacity no-underline"
            >
              Contact
            </a>
            <Link
              href="/specialists"
              className="text-[var(--ink-color)] opacity-60 hover:opacity-100 transition-opacity no-underline"
            >
              Specialists
            </Link>
          </nav>

          <p className="text-[0.8rem] text-[var(--ink-color)] opacity-40">
            © {new Date().getFullYear()} Nora Health AI
          </p>
        </div>
      </div>
    </footer>
  );
}
