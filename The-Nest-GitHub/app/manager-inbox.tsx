"use client";
import { useEffect, useState } from "react";
type Report = {id:string;itemName:string;space:string;reporter:string;level:string;needed:number;notes:string;createdAt:string};
export default function ManagerInbox() {
  const [reports,setReports]=useState<Report[]>([]);
  const [error,setError]=useState("");
  useEffect(()=>{
    let active=true;
    async function load(){try{const r=await fetch("/api/notifications");if(!r.ok)throw new Error("Reports could not be loaded.");const body=await r.json();if(active){setReports(body.reports);setError("");}}catch{if(active)setError("Reports could not be loaded. Please refresh to retry.");}}
    void load(); const timer=setInterval(()=>void load(),30000);
    return ()=>{active=false;clearInterval(timer);};
  },[]);
  return <details className="manager-inbox"><summary>Manager notifications ({reports.length})</summary>{error&&<p role="alert">{error}</p>}{!reports.length&&!error&&<p>No stock reports yet.</p>}{reports.map(r=><article key={r.id}><strong>{r.level}: {r.itemName}</strong><p>{r.space} · {r.needed} needed · Reported by {r.reporter}</p><p>{r.notes}</p><small>{new Date(r.createdAt).toLocaleString()}</small></article>)}</details>;
}
