import { cn } from '@/lib/utils';

/*
 * The landing page's shapes: the things a prior authorization is made of
 * (a chart note, a quote, a check, a gap, a capsule), drawn flat in the accent
 * palette. Decorative only, so every piece is hidden from assistive tech.
 */

type ShapeProps = { className?: string; style?: React.CSSProperties };

function Shape({ className, style, children }: ShapeProps & { children: React.ReactNode }) {
  return (
    <div className={cn('absolute animate-drift', className)} style={style}>
      {children}
    </div>
  );
}

/** A chart note with one line highlighted. */
export function NoteShape({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 180" className={className} fill="none">
      <rect width="150" height="180" rx="30" fill="#4DAFFF" />
      <rect x="26" y="34" width="70" height="12" rx="6" fill="#fff" opacity=".95" />
      <rect x="26" y="62" width="98" height="12" rx="6" fill="#fff" opacity=".55" />
      <rect x="20" y="86" width="110" height="24" rx="12" fill="#FFCF7B" />
      <rect x="26" y="122" width="88" height="12" rx="6" fill="#fff" opacity=".55" />
      <rect x="26" y="146" width="54" height="12" rx="6" fill="#fff" opacity=".55" />
    </svg>
  );
}

export function CheckShape({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 90" className={className} fill="none">
      <circle cx="45" cy="45" r="45" fill="#34C759" />
      <path d="M27 46.5 39.5 59 64 33" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CapsuleShape({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 132 56" className={className} fill="none">
      <rect width="132" height="56" rx="28" fill="#FFBE4C" />
      <path d="M66 0h38a28 28 0 0 1 0 56H66V0Z" fill="#FF5310" />
      <rect x="18" y="14" width="30" height="9" rx="4.5" fill="#fff" opacity=".6" />
    </svg>
  );
}

/** A quotation mark: the excerpt Nora lifts from the chart. */
export function QuoteShape({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none">
      <rect width="96" height="96" rx="28" fill="#9553F9" />
      <path d="M26 62c0-13 6-23 18-28l3 6c-6 3-9 7-9 12h8v14H26v-4Zm26 0c0-13 6-23 18-28l3 6c-6 3-9 7-9 12h8v14H52v-4Z" fill="#fff" />
    </svg>
  );
}

/** A dashed outline: the requirement the chart does not support yet. */
export function GapShape({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 64" className={className} fill="none">
      <rect x="3" y="3" width="114" height="58" rx="29" fill="#FFE9E0" stroke="#FF5310" strokeWidth="6" strokeDasharray="14 10" strokeLinecap="round" />
      <rect x="34" y="27" width="52" height="10" rx="5" fill="#FF5310" />
    </svg>
  );
}

export function CrossShape({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 76 76" className={className} fill="none">
      <path d="M27 6a6 6 0 0 1 6-6h10a6 6 0 0 1 6 6v21h21a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6H49v21a6 6 0 0 1-6 6H33a6 6 0 0 1-6-6V49H6a6 6 0 0 1-6-6V33a6 6 0 0 1 6-6h21V6Z" fill="#F966AC" />
    </svg>
  );
}

export function LensShape({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 92 92" className={className} fill="none">
      <circle cx="38" cy="38" r="29" stroke="#018DFF" strokeWidth="13" fill="#fff" />
      <path d="M61 61 83 83" stroke="#018DFF" strokeWidth="14" strokeLinecap="round" />
    </svg>
  );
}

export function SparkShape({ className, color = '#FFBE4C' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none">
      <path d="M20 0c1.6 10.5 9.5 18.4 20 20-10.5 1.6-18.4 9.5-20 20C18.4 29.500 10.500 21.600 0 20 10.500 18.400 18.400 10.500 20 0Z" fill={color} />
    </svg>
  );
}

function Disc({ className, style }: ShapeProps) {
  return <div className={cn('absolute rounded-full bg-[#F4F1EA]', className)} style={style} />;
}

const tilt = (deg: number, delay = 0) => ({ '--tilt': `${deg}deg`, '--delay': `${delay}s` }) as React.CSSProperties;

/** Shapes to the left of the hero copy. Clipped by the hero on narrow screens. */
export function HeroArtLeft() {
  return (
    <div aria-hidden className="pointer-events-none absolute top-6 right-[calc(50%+300px)] hidden h-[470px] w-[440px] lg:block">
      <Disc className="top-[230px] left-[10px] size-[190px]" />
      <Disc className="top-[30px] left-[240px] size-[130px]" />
      <Shape className="top-[70px] left-[70px] w-[170px]" style={tilt(-9)}><NoteShape /></Shape>
      <Shape className="top-[26px] left-[270px] w-[78px]" style={tilt(8, 1.2)}><CheckShape /></Shape>
      <Shape className="top-[250px] left-[250px] w-[132px]" style={tilt(-24, 0.6)}><CapsuleShape /></Shape>
      <Shape className="top-[330px] left-[90px] w-[84px]" style={tilt(10, 2)}><QuoteShape /></Shape>
      <Shape className="top-[36px] left-[30px] w-7" style={tilt(0, 1.6)}><SparkShape /></Shape>
      <Shape className="top-[210px] left-[330px] w-5" style={tilt(0, 0.3)}><SparkShape color="#7DC4FF" /></Shape>
      <Shape className="top-[410px] left-[230px] w-6" style={tilt(0, 2.4)}><SparkShape color="#F966AC" /></Shape>
      <div className="absolute top-[176px] left-[18px] size-9 rounded-full bg-green" />
      <div className="absolute top-[420px] left-[330px] size-5 rounded-full bg-orange" />
    </div>
  );
}

/** Shapes to the right of the hero copy. */
export function HeroArtRight() {
  return (
    <div aria-hidden className="pointer-events-none absolute top-6 left-[calc(50%+300px)] hidden h-[470px] w-[440px] lg:block">
      <Disc className="top-[60px] left-[120px] size-[150px]" />
      <Disc className="top-[260px] left-[230px] size-[180px]" />
      <Shape className="top-[40px] left-[40px] w-[126px]" style={tilt(-8, 0.8)}><GapShape /></Shape>
      <Shape className="top-[96px] left-[210px] w-[120px]" style={tilt(12, 0.2)}>
        <svg viewBox="0 0 120 120" fill="none">
          <rect width="120" height="120" rx="34" fill="#34C759" />
          <path d="M36 62 52 78 86 42" stroke="#fff" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Shape>
      <Shape className="top-[230px] left-[70px] w-[96px]" style={tilt(-6, 1.4)}><LensShape /></Shape>
      <Shape className="top-[280px] left-[220px] w-[150px]" style={tilt(7, 2.2)}><NoteShape /></Shape>
      <Shape className="top-[200px] left-[350px] w-[66px]" style={tilt(14, 1)}><CrossShape /></Shape>
      <Shape className="top-[30px] left-[350px] w-7" style={tilt(0, 0.5)}><SparkShape /></Shape>
      <Shape className="top-[380px] left-[130px] w-6" style={tilt(0, 1.8)}><SparkShape color="#44C67F" /></Shape>
      <div className="absolute top-[176px] left-[20px] size-7 rounded-full bg-blue" />
      <div className="absolute top-[420px] left-[60px] size-5 rounded-full bg-yellow" />
    </div>
  );
}

/** A short row of the same shapes, for screens too narrow for the clusters. */
export function HeroArtRow() {
  return (
    <div aria-hidden className="mb-7 flex items-center justify-center gap-3 lg:hidden">
      <CheckShape className="w-11" />
      <NoteShape className="w-10 -rotate-6" />
      <QuoteShape className="w-11 rotate-6" />
      <CapsuleShape className="w-16 -rotate-12" />
    </div>
  );
}
