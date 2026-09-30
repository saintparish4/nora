'use client';

import { useAuth } from '@/lib/auth/context';

export default function TodayPage() {
  const { user } = useAuth();

  return (
    <div className="pb-16">
      <h1 className="font-serif text-4xl mb-2">Today</h1>
      <p className="text-muted-foreground">Signed in as {user?.email}.</p>
    </div>
  );
}
