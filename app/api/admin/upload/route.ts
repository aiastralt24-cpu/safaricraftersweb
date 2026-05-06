import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

const uploadDir = path.join(process.cwd(), "public/assets/cms");

export async function POST(request: Request) {
  const unauthorized = authorizeAdmin(request);
  if (unauthorized) return unauthorized;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "file is required" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ ok: false, error: "Only image uploads are supported" }, { status: 400 });
  }

  await fs.mkdir(uploadDir, { recursive: true });
  const ext = path.extname(file.name) || extensionFor(file.type);
  const basename = path
    .basename(file.name, ext)
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const filename = `${basename || "image"}-${Date.now()}${ext.toLowerCase()}`;
  const target = path.join(uploadDir, filename);
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(target, bytes);

  return NextResponse.json({
    ok: true,
    asset: {
      src: `/assets/cms/${filename}`,
      alt: basename.replace(/-/g, " "),
      credit: "Safari Crafters",
    },
  });
}

function extensionFor(type: string) {
  if (type === "image/png") return ".png";
  if (type === "image/svg+xml") return ".svg";
  if (type === "image/webp") return ".webp";
  return ".jpg";
}
