import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Symptom Analyzer | Nora',
  description:
    'Clinical-grade AI symptom assistant. Describe your symptoms and get evidence-based guidance. Not a diagnosis.',
};

export default function TechnologyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
