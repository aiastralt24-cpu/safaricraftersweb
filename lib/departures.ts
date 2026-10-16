import type { Expedition, ExpeditionDeparture } from "./data";
export function upcomingDepartures(expedition: Pick<Expedition,"departures">, today = new Date().toISOString().slice(0,10)): ExpeditionDeparture[] {
  return (expedition.departures || []).filter(item=>/^\d{4}-\d{2}-\d{2}$/.test(item.date) && !Number.isNaN(Date.parse(item.date)) && item.date>=today).sort((a,b)=>a.date.localeCompare(b.date));
}
export function departureLabel(item?: ExpeditionDeparture) {
  if (!item) return "New dates being planned";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
  const parts = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return { year, month, day, label: `${day} ${months[month - 1]} ${year}` };
  };
  const start = parts(item.date);
  if (!item.endDate) return start.label;
  const end = parts(item.endDate);
  if (start.year === end.year && start.month === end.month) return `${start.day} – ${end.day} ${months[start.month - 1]} ${start.year}`;
  if (start.year === end.year) return `${start.day} ${months[start.month - 1]} – ${end.day} ${months[end.month - 1]} ${start.year}`;
  return `${start.label} – ${end.label}`;
}
export function isFeaturedExpedition(expedition: Expedition) {
  return expedition.publicationStatus !== "preview" && (!(expedition.departures?.length) || upcomingDepartures(expedition).length>0);
}
