import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Specialists | Nora Health AI',
  description:
    "Browse our network of precision specialists verified by Nora's matching technology.",
};

export default function SpecialistsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
