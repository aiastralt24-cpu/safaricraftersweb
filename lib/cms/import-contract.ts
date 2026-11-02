/** Portable import contract. File parsing and database writes are separate trust boundaries. */
export const JOURNEY_TEMPLATE_VERSION = "1.0";
export const MAX_IMPORT_ROWS = 500;
export const MAX_FIELD_CHARACTERS = 50_000;
export const MAX_IMPORT_CHARACTERS = 2_000_000;

export type ImportIssue = { sheet: string; row: number; field: string; severity: "error" | "warning"; code: string; message: string };
export type ImportRow = Record<string, unknown>;
export type ImportSheet = "Pages" | "Itinerary" | "FAQs" | "Media";
export type FieldDefinition = {
  key: string;
  label: string;
  required?: boolean;
  guidance?: { unit: "characters" | "words"; min?: number; max: number };
  max?: number;
};

export const journeyTemplate = {
  version: JOURNEY_TEMPLATE_VERSION,
  type: "journey",
  sheets: {
    Pages: [
      {key:"recordId",label:"Journey ID",required:true},
      {key:"operation",label:"Create or update",required:true},
      {key:"expectedRevision",label:"Current revision (updates only)"},
      {key:"slug",label:"Page URL slug",required:true},
      {key:"title",label:"Page title",required:true,guidance:{unit:"characters",min:30,max:80}},
      {key:"description",label:"Short summary",required:true,guidance:{unit:"words",min:25,max:50}},
      {key:"intro",label:"Introduction",required:true,guidance:{unit:"words",min:100,max:250}},
      {key:"region",label:"Region",required:true},
      {key:"duration",label:"Duration",required:true},
      {key:"bestMonths",label:"Best months",required:true},
      {key:"groupSize",label:"Group size"},
      {key:"difficulty",label:"Activity level"},
      {key:"price",label:"Verified price guidance"},
      {key:"buttonLabel",label:"Enquiry button label",max:30},
      {key:"seoTitle",label:"SEO title",guidance:{unit:"characters",min:50,max:60}},
      {key:"seoDescription",label:"SEO description",guidance:{unit:"characters",min:140,max:160}}
    ],
    Itinerary: [
      {key:"recordId",label:"Journey ID",required:true},
      {key:"itemId",label:"Itinerary item ID",required:true},
      {key:"position",label:"Display order",required:true},
      {key:"label",label:"Day label",required:true},
      {key:"title",label:"Day title",required:true},
      {key:"copy",label:"Day description",required:true,guidance:{unit:"words",min:40,max:150}},
      {key:"stay",label:"Accommodation"}
    ],
    FAQs: [
      {key:"recordId",label:"Journey ID",required:true},
      {key:"itemId",label:"FAQ item ID",required:true},
      {key:"position",label:"Display order",required:true},
      {key:"question",label:"Question",required:true},
      {key:"answer",label:"Answer",required:true,guidance:{unit:"words",min:30,max:120}}
    ],
    Media: [
      {key:"recordId",label:"Journey ID",required:true},
      {key:"itemId",label:"Media item ID",required:true},
      {key:"position",label:"Display order",required:true},
      {key:"role",label:"Placement: hero, mobileHero or gallery",required:true},
      {key:"assetId",label:"Uploaded CMS asset ID",required:true},
      {key:"alt",label:"Image description",required:true,guidance:{unit:"words",min:10,max:25}},
      {key:"caption",label:"Caption"},
      {key:"credit",label:"Credit / rights holder"}
    ]
  } satisfies Record<ImportSheet, FieldDefinition[]>
} as const;

export type JourneyImport = { templateVersion: string; pageType: string; sheets: Partial<Record<ImportSheet, ImportRow[]>> };
export type ExistingImportRecord = { id: string; revision: string; slug: string };
export type DraftImportChange = {
  recordId: string;
  operation: "create" | "update";
  expectedRevision?: string;
  fields: Record<string, string>;
  /** Omitted collection means preserve. Supplied collections are upserts by stable item ID, never wholesale replacement. */
  items: Partial<Record<Exclude<ImportSheet, "Pages">, Record<string, string>[]>>;
};
export type JourneyImportPlan = { valid: boolean; issues: ImportIssue[]; changes: DraftImportChange[] };
const sheets: ImportSheet[] = ["Pages", "Itinerary", "FAQs", "Media"];
const reservedSlugs = new Set(["admin","api","cms","studio","new","preview","login"]);
const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
export function countCharacters(text: string) { return Array.from(text).length; }
export function countWords(text: string) { return text.trim() ? text.trim().split(/\s+/u).length : 0; }

/** No file access, URL fetching, AI rewriting, database changes or publication occurs here. */
export function planJourneyImport(input: unknown, existing: ExistingImportRecord[] = []): JourneyImportPlan {
  const issues: ImportIssue[] = [];
  const changes: DraftImportChange[] = [];
  const add = (sheet: string, row: number, field: string, code: string, message: string, severity: "error" | "warning" = "error") => issues.push({sheet,row,field,code,message,severity});
  const finish = (): JourneyImportPlan => ({valid:!issues.some(i=>i.severity === "error"),issues,changes:issues.some(i=>i.severity === "error") ? [] : changes});
  if (!isObject(input) || !isObject(input.sheets)) { add("Workbook",0,"","shape","Use the supplied structured template."); return finish(); }
  if (input.templateVersion !== JOURNEY_TEMPLATE_VERSION) add("Workbook",0,"templateVersion","version","Download the current template; this version is unsupported.");
  if (input.pageType !== "journey") add("Workbook",0,"pageType","page_type","This template creates journey pages only.");
  for (const name of Object.keys(input.sheets)) if (!sheets.includes(name as ImportSheet)) add(name,0,"","unknown_sheet","This sheet is not part of the journey template.");
  const normalized: Record<ImportSheet, Record<string,string>[]> = {Pages:[],Itinerary:[],FAQs:[],Media:[]};
  const sourceRows: Record<ImportSheet, number[]> = {Pages:[],Itinerary:[],FAQs:[],Media:[]};
  let totalRows = 0, totalCharacters = 0;
  for (const sheet of sheets) {
    const rows = input.sheets[sheet];
    if (rows === undefined && sheet !== "Pages") continue;
    if (!Array.isArray(rows)) { add(sheet,0,"","sheet_shape","Expected a worksheet containing rows."); continue; }
    totalRows += rows.length;
    if (totalRows > MAX_IMPORT_ROWS) { add(sheet,0,"","row_limit",`An import can contain at most ${MAX_IMPORT_ROWS} data rows across all sheets.`); return finish(); }
    const definitions: readonly FieldDefinition[] = journeyTemplate.sheets[sheet];
    for (let index=0; index<rows.length; index++) {
      const rowNumber = index+2; // Row 1 contains stable machine-readable column keys.
      const row = rows[index];
      if (!isObject(row)) { add(sheet,rowNumber,"","row_shape","Expected a row of labelled cells."); continue; }
      if (!Object.values(row).some(value=>value !== undefined && value !== null && String(value).trim() !== "")) continue;
      const result: Record<string,string> = {};
      for (const key of Object.keys(row)) if (!definitions.some(f=>f.key===key)) add(sheet,rowNumber,key,"unknown_field","Unknown column; use the original template headings.");
      for (const def of definitions) {
        const raw = row[def.key];
        if (raw === undefined || raw === null || raw === "") continue;
        // Excel parser must reject formula/error/date cells before reaching this contract.
        if (typeof raw !== "string" && !(def.key === "position" && typeof raw === "number" && Number.isFinite(raw))) { add(sheet,rowNumber,def.key,"cell_type","Use plain text; only display order accepts a number."); continue; }
        const value = String(raw).trim();
        if (!value) continue;
        const length = countCharacters(value);
        totalCharacters += length;
        if (totalCharacters > MAX_IMPORT_CHARACTERS) { add(sheet,rowNumber,def.key,"size_limit","The import contains too much text. Split it into smaller files."); return finish(); }
        if (length > MAX_FIELD_CHARACTERS) { add(sheet,rowNumber,def.key,"field_size","This cell exceeds the technical size limit."); continue; }
        // Stored as plain text. Import templates cannot carry markup or executable expressions.
        if (/^\s*=/.test(value)) add(sheet,rowNumber,def.key,"formula","Formula expressions are not accepted; paste their text values instead.");
        if (/<\/?[a-z][^>]*>/i.test(value)) add(sheet,rowNumber,def.key,"markup","Use plain text, not HTML markup.");
        result[def.key] = value;
        if (def.max && length > def.max) add(sheet,rowNumber,def.key,"hard_length",`Use at most ${def.max} characters, including spaces. Text was not shortened.`);
        if (def.guidance) {
          const count = def.guidance.unit === "words" ? countWords(value) : length;
          if (count > def.guidance.max || def.guidance.min && count < def.guidance.min) add(sheet,rowNumber,def.key,"length_guidance",`${count} ${def.guidance.unit}; recommended ${def.guidance.min || 0}–${def.guidance.max}. Original text is retained.`,"warning");
        }
      }
      const update = sheet === "Pages" && result.operation === "update";
      for (const def of definitions) if (def.required && !result[def.key] && !(update && !["recordId","operation"].includes(def.key))) add(sheet,rowNumber,def.key,"required","This field is required.");
      for (const key of ["recordId","itemId"]) if (result[key] && !idPattern.test(result[key])) add(sheet,rowNumber,key,"identifier","Use 1–128 letters, numbers, underscores or hyphens, beginning with a letter or number.");
      if (result.position && (!/^\d+$/.test(result.position) || !Number.isSafeInteger(Number(result.position)) || Number(result.position)<1)) add(sheet,rowNumber,"position","position","Display order must be a positive whole number.");
      normalized[sheet].push(result);
      sourceRows[sheet].push(rowNumber);
    }
  }
  if (!normalized.Pages.length) add("Pages",0,"","empty","Add at least one journey.");
  const records = new Map(existing.map(r=>[r.id,r]));
  const ownedSlugs = new Map(existing.map(r=>[r.slug,r.id]));
  const pageIds = new Set<string>();
  const plannedSlugs = new Set<string>();
  for (const [index,row] of normalized.Pages.entries()) {
    const rowNumber=sourceRows.Pages[index];
    if (pageIds.has(row.recordId)) add("Pages",rowNumber,"recordId","duplicate_id","A journey may appear only once in Pages.");
    pageIds.add(row.recordId);
    if (!["create","update"].includes(row.operation)) add("Pages",rowNumber,"operation","operation","Choose create or update explicitly.");
    const current=records.get(row.recordId);
    if (row.operation === "create" && current) add("Pages",rowNumber,"recordId","already_exists","This ID already exists. Use update with its current revision.");
    if (row.operation === "update" && !current) add("Pages",rowNumber,"recordId","not_found","No accessible journey with this ID exists.");
    if (row.operation === "update" && (!row.expectedRevision || current && row.expectedRevision !== current.revision)) add("Pages",rowNumber,"expectedRevision","revision_conflict","Export the latest revision before updating this journey.");
    if (row.operation === "create" && row.expectedRevision) add("Pages",rowNumber,"expectedRevision","unexpected_revision","New records must not specify an existing revision.");
    if (row.slug) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug) || reservedSlugs.has(row.slug)) add("Pages",rowNumber,"slug","slug","Use a nonreserved lowercase URL slug with hyphens.");
      if (plannedSlugs.has(row.slug) || ownedSlugs.has(row.slug) && ownedSlugs.get(row.slug) !== row.recordId) add("Pages",rowNumber,"slug","duplicate_slug","This slug is already assigned to another record.");
      plannedSlugs.add(row.slug);
      if (current && row.slug!==current.slug) add("Pages",rowNumber,"slug","redirect_required","URL changes need a redirect decision in the page editor. Omit this cell to preserve the existing URL.");
    }
    const {recordId,operation,expectedRevision,...fields}=row;
    changes.push({recordId,operation:operation as "create"|"update",...(expectedRevision?{expectedRevision}:{}),fields,items:{}});
  }
  for (const sheet of ["Itinerary","FAQs","Media"] as const) {
    const itemIds=new Set<string>(), positions=new Set<string>(), mediaRoles=new Set<string>();
    for (const [index,row] of normalized[sheet].entries()) {
      const rowNumber=sourceRows[sheet][index];
      if (!pageIds.has(row.recordId)) add(sheet,rowNumber,"recordId","orphan","Add this Journey ID to the Pages sheet.");
      const id=`${row.recordId}:${row.itemId}`, position=`${row.recordId}:${row.position}`;
      if (itemIds.has(id)) add(sheet,rowNumber,"itemId","duplicate_item","Item IDs must be unique within each journey and sheet.");
      if (positions.has(position)) add(sheet,rowNumber,"position","duplicate_position","Use a unique display order within each journey and sheet.");
      itemIds.add(id); positions.add(position);
      if (sheet === "Media") {
        if (!["hero","mobileHero","gallery"].includes(row.role)) add(sheet,rowNumber,"role","media_role","Choose hero, mobileHero or gallery.");
        if (row.role !== "gallery" && mediaRoles.has(`${row.recordId}:${row.role}`)) add(sheet,rowNumber,"role","duplicate_media_role","A journey can have only one hero and one mobile hero.");
        mediaRoles.add(`${row.recordId}:${row.role}`);
        if (row.assetId && !idPattern.test(row.assetId)) add(sheet,rowNumber,"assetId","asset_id","Select an uploaded CMS asset ID. Arbitrary URLs are not imported.");
      }
      const change=changes.find(c=>c.recordId===row.recordId);
      if (change) (change.items[sheet] ??= []).push(row);
    }
    for (const change of changes) change.items[sheet]?.sort((a,b)=>Number(a.position)-Number(b.position));
  }
  return finish();
}
