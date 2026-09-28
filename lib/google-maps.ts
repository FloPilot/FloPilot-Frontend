export type ParsedStreetAddress = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type AddressPrediction = {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
};

export function isGoogleMapsConfigured(): boolean {
  return Boolean(
    (
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      ""
    ).trim()
  );
}

/** Client-side: key presence is baked in at build via NEXT_PUBLIC_*. */
export function isAddressAutocompleteEnabled(): boolean {
  if (typeof window === "undefined") return isGoogleMapsConfigured();
  // Always try the local proxy — the route reads the server env key.
  return true;
}

export async function fetchAddressPredictions(
  input: string
): Promise<AddressPrediction[]> {
  const query = input.trim();
  if (query.length < 2) return [];

  const res = await fetch(
    `/api/places/autocomplete?input=${encodeURIComponent(query)}`,
    { cache: "no-store" }
  );
  const data = (await res.json()) as {
    predictions?: AddressPrediction[];
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || "Address lookup failed");
  }
  return data.predictions || [];
}

export async function fetchPlaceAddress(
  placeId: string
): Promise<ParsedStreetAddress | null> {
  const res = await fetch(
    `/api/places/details?placeId=${encodeURIComponent(placeId)}`,
    { cache: "no-store" }
  );
  const data = (await res.json()) as {
    address?: ParsedStreetAddress;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || "Place details failed");
  }
  return data.address || null;
}
