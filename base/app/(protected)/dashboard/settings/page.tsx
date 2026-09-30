import Link from 'next/link';

const SETTINGS_SECTIONS = [
  {
    href: '/dashboard/settings/profile',
    title: 'Profile',
    description: 'Your name, state, and phone number',
  },
];

export default function SettingsPage() {
  return (
    <div className="max-w-2xl pb-16">
      <h1 className="font-serif text-4xl mb-8">Settings</h1>
      <ul className="space-y-3">
        {SETTINGS_SECTIONS.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="block rounded-2xl border border-border bg-card p-5 hover:bg-muted transition-colors"
            >
              <p className="font-medium">{section.title}</p>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
