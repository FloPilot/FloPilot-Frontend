import { NextRequest, NextResponse } from "next/server";

function mapsApiKey(): string {
  return (
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    ""
  ).trim();
}

export async function GET(request: NextRequest) {
  const input = (request.nextUrl.searchParams.get("input") || "").trim();
  if (input.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const key = mapsApiKey();
  if (!key) {
    return NextResponse.json(
      { error: "Google Maps API key is not configured", predictions: [] },
      { status: 503 }
    );
  }

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/autocomplete/json"
  );
  url.searchParams.set("input", input);
  url.searchParams.set("types", "address");
  url.searchParams.set("components", "country:us");
  url.searchParams.set("key", key);

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = (await res.json()) as {
      status?: string;
      error_message?: string;
      predictions?: Array<{
        description: string;
        place_id: string;
        structured_formatting?: {
          main_text: string;
          secondary_text: string;
        };
      }>;
    };

    if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return NextResponse.json(
        {
          error: data.error_message || data.status,
          predictions: [],
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      predictions: (data.predictions || []).map((prediction) => ({
        description: prediction.description,
        place_id: prediction.place_id,
        structured_formatting: prediction.structured_formatting,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch address suggestions", predictions: [] },
      { status: 502 }
    );
  }
}
