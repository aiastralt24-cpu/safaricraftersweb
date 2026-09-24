"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackFunnel } from "@/lib/funnel-client";
export function FunnelTracking() {
  const path=usePathname();
  useEffect(()=>{
    if (/^\/(destinations|photo-expeditions|journeys)\/[^/]+$/.test(path)) trackFunnel("trip_viewed",path);
  },[path]);
  return null;
}
