/** Deployment-owned namespaces. Reserve the whole first segment so new pages
 * cannot shadow existing routes, dynamic records, redirects or static assets.
 * Keep the database counterpart in sync through a migration. */
export const reservedCustomPageRoots=[
 'about','admin','api','assets','auth','blog','blogs','brand','cms','concept',
 'conservation-commitment','contact','destinations','documents','enquire',
 'guided-bespoke-safaris','itineraries','journal','journeys','legal','login','logout',
 'languages','mice','photo-expeditions','plan','private-aviation','register','reviews',
 'projects','news','events','leadership','applications','industries','locations','careers','certifications','partners','product-categories','products','search','specialists','store','studio','tours',
] as const;
export function customPagePathStatus(value:unknown):'available'|'invalid'|'reserved'{
 if(typeof value!=='string'||value.length>500||/[^a-z0-9\/-]/.test(value)||!/^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(value))return 'invalid';
 return (reservedCustomPageRoots as readonly string[]).includes(value.split('/')[1])?'reserved':'available';
}
/** Availability here means an eligible namespace, not a uniqueness or ownership
 * grant. Database identity, website/language and publication checks still apply. */
export function isCustomPagePath(value:unknown):value is string{return customPagePathStatus(value)==='available';}
