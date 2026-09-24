import type { Expedition, ExpeditionDeparture } from "./data";
export function upcomingDepartures(expedition: Pick<Expedition,"departures">, today = new Date().toISOString().slice(0,10)): ExpeditionDeparture[] {
  return (expedition.departures || []).filter(item=>/^\d{4}-\d{2}-\d{2}$/.test(item.date) && !Number.isNaN(Date.parse(item.date)) && item.date>=today).sort((a,b)=>a.date.localeCompare(b.date));
}
export function departureLabel(item?: ExpeditionDeparture) {
  if (!item) return "New dates being planned";
  const formatter=new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});
  return item.endDate ? formatter.formatRange(new Date(item.date),new Date(item.endDate)) : formatter.format(new Date(item.date));
}
export function isFeaturedExpedition(expedition: Expedition) {
  return expedition.publicationStatus !== "preview" && (!(expedition.departures?.length) || upcomingDepartures(expedition).length>0);
}
