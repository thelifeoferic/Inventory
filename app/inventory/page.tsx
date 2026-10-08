import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Inventory from "@/app/inventory";
import { handleApi } from "@/server/vercel-backend";
export const dynamic = "force-dynamic";
export default async function Page() {
  const h = await headers();
  const response = await handleApi(new Request("https://inventory.local/api/session", {headers: {cookie: h.get("cookie") || ""}}));
  if (!response.ok) redirect("/login");
  const user = await response.json();
  if (user.mustChange) redirect("/login");
  return <Inventory isAdmin={user.isAdmin === true} displayName={user.displayName} />;
}
