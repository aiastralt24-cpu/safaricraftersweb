import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/lib/admin-auth";
import { SiteContent } from "@/lib/data";

export const runtime = "nodejs";

const contentPath = path.join(process.cwd(), "content/site-content.json");
const backupDir = path.join(process.cwd(), "content/backups");

export async function GET(request: Request) {
  const unauthorized = authorizeAdmin(request);
  if (unauthorized) return unauthorized;

  const raw = await fs.readFile(contentPath, "utf8");
  return NextResponse.json(JSON.parse(raw));
}

export async function PUT(request: Request) {
  const unauthorized = authorizeAdmin(request);
  if (unauthorized) return unauthorized;

  const content = (await request.json()) as SiteContent;
  const validation = validateContent(content);
  if (validation) {
    return NextResponse.json({ ok: false, error: validation }, { status: 400 });
  }

  await writeBackup();
  await fs.writeFile(contentPath, `${JSON.stringify(content, null, 2)}\n`);
  return NextResponse.json({ ok: true, updatedAt: new Date().toISOString() });
}

async function writeBackup() {
  await fs.mkdir(backupDir, { recursive: true });
  const previous = await fs.readFile(contentPath, "utf8");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  await fs.writeFile(path.join(backupDir, `site-content-${stamp}.json`), previous);
}

function validateContent(content: SiteContent) {
  if (!Array.isArray(content.journeys)) return "journeys must be an array";
  if (!Array.isArray(content.destinations)) return "destinations must be an array";
  if (!Array.isArray(content.expeditions)) return "expeditions must be an array";
  if (!Array.isArray(content.journal)) return "journal must be an array";

  const collections = [
    ["journeys", content.journeys],
    ["destinations", content.destinations],
    ["expeditions", content.expeditions],
    ["journal", content.journal],
  ] as const;

  for (const [name, items] of collections) {
    const slugs = new Set<string>();
    for (const item of items) {
      if (!item.slug || !item.title) return `${name} items require slug and title`;
      if (slugs.has(item.slug)) return `${name} has duplicate slug: ${item.slug}`;
      slugs.add(item.slug);
    }
  }

  return "";
}
