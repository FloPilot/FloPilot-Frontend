import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOST_SUFFIXES = [
  "ssactivewear.com",
  "sanmar.com",
  "cdnm.sanmar.com",
  // Our own bucket — design artwork and mockups that outgrew the inline data
  // URL budget live here, and the canvas needs them CORS-clean to re-compose.
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
];

function isAllowedImageUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    return ALLOWED_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`)
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url")?.trim();
  if (!raw || !isAllowedImageUrl(raw)) {
    return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
  }

  try {
    const upstream = await fetch(raw, {
      headers: { Accept: "image/*,*/*" },
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream ${upstream.status}` },
        { status: 502 }
      );
    }

    const contentType =
      upstream.headers.get("content-type") || "image/jpeg";
    const buffer = await upstream.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch image" },
      { status: 502 }
    );
  }
}
