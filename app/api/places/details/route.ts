import { NextRequest, NextResponse } from "next/server";

function mapsApiKey(): string {
  return (
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    ""
  ).trim();
}

type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

function componentByType(components: AddressComponent[], type: string) {
  return components.find((entry) => entry.types.includes(type));
}

function parseAddress(components: AddressComponent[] = [], name?: string) {
  const streetNumber =
    componentByType(components, "street_number")?.short_name || "";
  const route = componentByType(components, "route")?.long_name || "";
  const line1 = [streetNumber, route].filter(Boolean).join(" ").trim();
  const line2 =
    componentByType(components, "subpremise")?.long_name ||
    componentByType(components, "premise")?.long_name ||
    "";
  const city =
    componentByType(components, "locality")?.long_name ||
    componentByType(components, "postal_town")?.long_name ||
    componentByType(components, "sublocality_level_1")?.long_name ||
    componentByType(components, "neighborhood")?.long_name ||
    "";
  const state =
    componentByType(components, "administrative_area_level_1")?.short_name ||
    "";
  const postalCode =
    componentByType(components, "postal_code")?.short_name || "";
  const country = componentByType(components, "country")?.short_name || "US";

  if (!line1 && !city && !state && !postalCode) return null;

  return {
    line1: line1 || name || "",
    line2,
    city,
    state,
    postalCode,
    country,
  };
}

export async function GET(request: NextRequest) {
  const placeId = (request.nextUrl.searchParams.get("placeId") || "").trim();
  if (!placeId) {
    return NextResponse.json({ error: "placeId is required" }, { status: 400 });
  }

  const key = mapsApiKey();
  if (!key) {
    return NextResponse.json(
      { error: "Google Maps API key is not configured" },
      { status: 503 }
    );
  }

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json"
  );
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "address_component,formatted_address,name");
  url.searchParams.set("key", key);

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = (await res.json()) as {
      status?: string;
      error_message?: string;
      result?: {
        address_components?: AddressComponent[];
        formatted_address?: string;
        name?: string;
      };
    };

    if (data.status !== "OK" || !data.result) {
      return NextResponse.json(
        { error: data.error_message || data.status || "Place not found" },
        { status: 502 }
      );
    }

    const address = parseAddress(
      data.result.address_components,
      data.result.name
    );
    if (!address) {
      return NextResponse.json(
        { error: "Could not parse place address" },
        { status: 502 }
      );
    }

    return NextResponse.json({ address });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch place details" },
      { status: 502 }
    );
  }
}
