/** Absent flags retain valid historical source layouts; non-default old draft values
 * are explicit choices. Flags distinguish explicit default values from inheritance. */
export const kenyaLayoutDefaults={background:'paper',mediaAlign:'end',mobileOrder:'textFirst'} as const;
export type KenyaLayoutKey=keyof typeof kenyaLayoutDefaults;
export function kenyaLayoutOverride(controls:{background?:string;mediaAlign?:string;mobileOrder?:string;kenyaOverrides?:Partial<Record<KenyaLayoutKey,boolean>>},key:KenyaLayoutKey){return controls.kenyaOverrides?.[key]===true||(controls[key]!==undefined&&controls[key]!==kenyaLayoutDefaults[key]);}
export function kenyaLayoutSupported(kind:string,controls:Parameters<typeof kenyaLayoutOverride>[0]){return !(kind==='kenyaHero'&&kenyaLayoutOverride(controls,'background'))&&(['kenyaPlaces','kenyaLuxury'].includes(kind)||!['mediaAlign','mobileOrder'].some(key=>kenyaLayoutOverride(controls,key as KenyaLayoutKey)));}
