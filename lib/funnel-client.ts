export type FunnelEvent = "trip_viewed" | "planner_started" | "enquiry_started" | "enquiry_failed";
export function trackFunnel(event: FunnelEvent, path = location.pathname) {
  if (process.env.NEXT_PUBLIC_FUNNEL_ENABLED !== "true" || navigator.doNotTrack === "1") return;
  try {
    let visit=JSON.parse(sessionStorage.getItem("safari-visit") || "null");
    if (!visit || Date.now()-visit.at>1800000) {visit={id:crypto.randomUUID(),at:Date.now()};sessionStorage.setItem("safari-visit",JSON.stringify(visit));}
    const marker=`safari-event:${visit.id}:${event}:${path}`;
    if (sessionStorage.getItem(marker)) return;
    sessionStorage.setItem(marker,"1");
    void fetch("/api/events",{method:"POST",keepalive:true,headers:{"Content-Type":"application/json"},body:JSON.stringify({event,path,visit:visit.id})}).catch(()=>{});
  } catch {}
}
