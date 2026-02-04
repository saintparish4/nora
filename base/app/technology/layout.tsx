import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Technology | Aura Health AI',
  description:
    "Where biological intuition meets computational rigor. Explore the neural framework behind Aura's diagnostic engine.",
};

export default function TechnologyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
