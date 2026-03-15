import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Locations | Nora',
  description:
    'Find advanced AI-integrated healthcare at one of our flagship centers or boutique clinics across the region.',
};

export default function LocationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
