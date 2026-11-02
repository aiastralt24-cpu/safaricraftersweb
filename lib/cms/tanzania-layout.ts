/** Absent flags retain valid historical source layouts; non-default old draft values
 * are explicit choices. Flags distinguish explicit default values from inheritance. */
export const tanzaniaLayoutDefaults={background:'paper',mediaAlign:'end',mobileOrder:'textFirst'} as const;
export type TanzaniaLayoutKey=keyof typeof tanzaniaLayoutDefaults;
export function tanzaniaLayoutOverride(controls:{background?:string;mediaAlign?:string;mobileOrder?:string;tanzaniaOverrides?:Partial<Record<TanzaniaLayoutKey,boolean>>},key:TanzaniaLayoutKey){return controls.tanzaniaOverrides?.[key]===true||(controls[key]!==undefined&&controls[key]!==tanzaniaLayoutDefaults[key]);}
export function tanzaniaLayoutSupported(kind:string,controls:Parameters<typeof tanzaniaLayoutOverride>[0]){return !(kind==='tanzaniaHero'&&tanzaniaLayoutOverride(controls,'background'))&&(['tanzaniaPlaces'].includes(kind)||!['mediaAlign','mobileOrder'].some(key=>tanzaniaLayoutOverride(controls,key as TanzaniaLayoutKey)));}
