import type { Metadata } from "next";
import { getApiBaseUrl } from "@/lib/api";
import type { PublicClientStore } from "@/lib/client-stores";

export type ClientStoreShareMeta = {
  title: string;
  description: string;
  imageUrl?: string;
};

/** Resolve the text/image used for Open Graph / link unfurls. */
export function resolveClientStoreShareMeta(
  store: Pick<
    PublicClientStore,
    | "name"
    | "headline"
    | "description"
    | "shareTitle"
    | "shareDescription"
    | "shareImageUrl"
    | "logoUrl"
    | "heroImageUrl"
    | "company"
    | "customerName"
  >
): ClientStoreShareMeta {
  const title =
    (store.shareTitle || "").trim() ||
    (store.name || "").trim() ||
    "Client store";
  const description =
    (store.shareDescription || "").trim() ||
    (store.headline || "").trim() ||
    (store.description || "").trim() ||
    `Shop ${store.company || store.customerName || store.name || "this collection"} on FloPilot.`;
  const imageUrl =
    (store.shareImageUrl || "").trim() ||
    (store.heroImageUrl || "").trim() ||
    (store.logoUrl || "").trim() ||
    undefined;
  return { title, description, imageUrl };
}

export async function fetchPublicClientStoreShareMeta(
  token: string
): Promise<ClientStoreShareMeta | null> {
  const trimmed = (token || "").trim();
  if (!trimmed) return null;
  try {
    const url = new URL(`${getApiBaseUrl()}/getPublicClientStore`);
    url.searchParams.set("token", trimmed);
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      // Link unfurls should see fresh share copy after edits.
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { store?: PublicClientStore };
    if (!data?.store) return null;
    return resolveClientStoreShareMeta(data.store);
  } catch {
    return null;
  }
}

export function buildClientStoreShareMetadata(
  meta: ClientStoreShareMeta | null,
  pathToken?: string
): Metadata {
  const title = meta?.title || "Client Store";
  const description =
    meta?.description || "Order branded apparel from your print shop.";
  const images = meta?.imageUrl
    ? [{ url: meta.imageUrl, alt: title }]
    : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "FloPilot",
      url: pathToken ? `/store/${pathToken}` : undefined,
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description,
      images: meta?.imageUrl ? [meta.imageUrl] : undefined,
    },
  };
}
