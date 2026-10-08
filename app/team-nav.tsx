import Link from 'next/link';
import './team-nav.css';

const destinations = [
  { id: 'home', href: '/', label: 'Home', path: 'm3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9' },
  { id: 'schedule', href: '/schedule', label: 'Schedule', path: 'M8 3v4m8-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM8 14h2m4 0h2m-8 3h2' },
  { id: 'inventory', href: '/inventory', label: 'Inventory', path: 'm3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10M7.5 5l9 4' },
  { id: 'checklists', href: '/checklists', label: 'Checklists', path: 'M9 6h11M9 12h11M9 18h11M3 5l1 1 2-2M3 11l1 1 2-2M3 17l1 1 2-2' },
] as const;

type Destination = typeof destinations[number]['id'];
export default function TeamNav({ active }: { active: Destination }) {
  return <header className="wren-team-header">
    <div className="wren-team-header-inner">
      <Link href="/" className="wren-team-brand" aria-label="Hotel Wren home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hotel-wren-logotype-brown.png" alt="Hotel Wren" width="152" />
      </Link>
      <nav className="wren-team-links" aria-label="Team pages">
        {destinations.map(link => <Link key={link.id} href={link.href} aria-current={active === link.id ? 'page' : undefined}>
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={link.path} /></svg>
          <span>{link.label}</span>
        </Link>)}
      </nav>
    </div>
  </header>;
}
