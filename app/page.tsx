import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import TeamNav from "./team-nav";
import { handleApi } from "@/server/vercel-backend";
import "./welcome.css";
export const dynamic = "force-dynamic";
export default async function Page() {
  const h = await headers();
  const response = await handleApi(new Request("https://inventory.local/api/session", {headers: {cookie: h.get("cookie") || ""}}));
  if (!response.ok) redirect("/login");
  const user = await response.json();
  if (user.mustChange) redirect("/login");
  return <><TeamNav active="home" /><main className="team-welcome">
    <section aria-labelledby="welcome-title">
      <p className="eyebrow">THE NEST</p>
      <h1 id="welcome-title">Welcome, {user.displayName}.</h1>
      <p className="welcome-intro">What would you like to do?</p>
      <nav className="welcome-choices" aria-label="Choose your workspace">
        <Link className="welcome-choice welcome-schedule" href="/schedule"><div><strong>Schedule</strong></div><span className="welcome-arrow wren-chevron" aria-hidden="true"></span></Link>
        <Link className="welcome-choice" href="/inventory"><div><strong>Inventory</strong></div><span className="welcome-arrow wren-chevron" aria-hidden="true"></span></Link>
        <Link className="welcome-choice" href="/checklists"><div><strong>Daily Checklists</strong></div><span className="welcome-arrow wren-chevron" aria-hidden="true"></span></Link>
        <Link className="welcome-choice" href="/repairs"><div><strong>Repair Request</strong></div><span className="welcome-arrow wren-chevron" aria-hidden="true"></span></Link>
        <Link className="welcome-choice" href="/projects"><div><strong>Projects</strong></div><span className="welcome-arrow wren-chevron" aria-hidden="true"></span></Link>
      </nav>
      <form action="/api/logout" method="post"><button className="text-button" type="submit">Sign out</button></form>
    </section>
  </main></>;
}
