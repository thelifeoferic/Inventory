"use client";

import { FormEvent, useEffect, useState } from "react";

export default function LoginPage() {
  const [message, setMessage] = useState("");
  const [mustChange,setMustChange] = useState(false);
  const [busy,setBusy] = useState(false);
  useEffect(() => { fetch("/api/session").then(async response => { if(response.ok) { const user=await response.json(); if(user.mustChange) setMustChange(true); else window.location.assign("/"); } }).catch(() => {}); },[]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if(mustChange && form.get("password") !== form.get("confirm")) { setMessage("Passwords must match."); setBusy(false); return; }
    try {
      const response=await fetch(mustChange ? "/api/password" : "/api/login", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({username:form.get("username"),password:form.get("password")})});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error || "Sign-in failed. Please try again.");
      if(result.mustChange) { setMustChange(true); formElement.reset(); }
      else window.location.assign("/");
    } catch(error) { setMessage(error instanceof Error ? error.message : "Unable to sign in."); }
    finally { setBusy(false); }
  }
  return (
    <main className="wren-login">
      <section className="wren-login-card" aria-labelledby="login-title">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="wren-login-logo" src="/hotel-wren-logotype-brown.png" alt="Hotel Wren" />
        <p className="eyebrow">THE NEST</p>
        <h1 id="login-title">{mustChange ? "Make it yours." : "Welcome back."}</h1>
        <p className="wren-login-intro">{mustChange ? "Choose a new password with at least 8 characters before continuing." : "Sign in to your Wren team account."}</p>
        <form onSubmit={submit} key={mustChange ? "change" : "login"}>
          {!mustChange && <>
          <label htmlFor="username">Username</label>
          <input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="Your first name" required />
          </>}
          <label htmlFor="password">{mustChange ? "New password" : "Password"}</label>
          <input id="password" name="password" type="password" autoComplete={mustChange ? "new-password" : "current-password"} minLength={mustChange ? 8 : undefined} maxLength={256} required />
          {mustChange && <><label htmlFor="confirm">Confirm new password</label><input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={256} required /></>}
          <button className="button" type="submit" disabled={busy}>{busy ? "Please wait…" : mustChange ? "Save password & continue" : "Sign in"}</button>
          {message && <p className="wren-login-message" role="status">{message}</p>}
        </form>
        <p className="wren-login-help">Need access? Contact your Wren team administrator.</p>
      </section>
    </main>
  );
}
