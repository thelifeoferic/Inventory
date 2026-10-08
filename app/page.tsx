import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { handleApi } from "@/server/vercel-backend";
import "./welcome.css";
export const dynamic = "force-dynamic";
export default async function Page() {
  const h = await headers();
  const response = await handleApi(new Request("https://inventory.local/api/session", {headers: {cookie: h.get("cookie") || ""}}));
  if (!response.ok) redirect("/login");
  const user = await response.json();
  if (user.mustChange) redirect("/login");
  return <main className="team-welcome">
    <section aria-labelledby="welcome-title">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="welcome-logo" src="/hotel-wren-logotype-brown.png" alt="Hotel Wren" />
      <p className="eyebrow">THE NEST</p>
      <h1 id="welcome-title">Welcome, {user.displayName}.</h1>
      <p className="welcome-intro">What would you like to do?</p>
      <nav className="welcome-choices" aria-label="Choose your workspace">
        <Link className="welcome-choice" href="/inventory"><strong>Inventory <span aria-hidden="true">→</span></strong><span>Count items and find what you need.</span></Link>
        <Link className="welcome-choice welcome-schedule" href="/schedule"><strong>Team Schedule <span aria-hidden="true">→</span></strong><span>See the team’s shifts for the week.</span></Link>
      </nav>
      <form action="/api/logout" method="post"><button className="text-button" type="submit">Sign out</button></form>
    </section>
  </main>;
}
