import Link from 'next/link';
import './team-nav.css';
export default function TeamNav({active}:{active:'home'|'schedule'|'inventory'|'checklists'}) {
  return <header className="wren-team-header">
    <Link href="/" className="wren-team-brand" aria-label="Hotel Wren home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/hotel-wren-logotype-brown.png" alt="Hotel Wren" />
    </Link>
    <nav className="wren-team-links" aria-label="Team pages">
      {([{id:'home',href:'/',label:'Home'},{id:'schedule',href:'/schedule',label:'Schedule'},{id:'inventory',href:'/inventory',label:'Inventory'},{id:'checklists',href:'/checklists',label:'Checklists'}] as const).map(link=><Link key={link.id} href={link.href} aria-current={active===link.id?'page':undefined}>{link.label}</Link>)}
    </nav>
  </header>;
}
