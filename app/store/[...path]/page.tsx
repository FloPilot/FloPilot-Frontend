import type { Metadata } from "next";
import {
  buildClientStoreShareMetadata,
  fetchPublicClientStoreShareMeta,
} from "@/lib/client-store-share-meta";
import PublicStoreCatchAllClient from "./store-page-client";

type PageProps = {
  params: Promise<{ path: string[] }>;
};

function tokenFromParams(path: string[] | undefined): string {
  return (path || [])
    .map((part) => decodeURIComponent(part))
    .filter(Boolean)
    .join("/");
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { path } = await params;
  const token = tokenFromParams(path);
  const meta = await fetchPublicClientStoreShareMeta(token);
  return buildClientStoreShareMetadata(meta, token);
}

/**
 * Public store routes:
 * - /store/{jwt}
 * - /store/{storeSlug}
 * - /store/{shopSlug}/{storeSlug}
 */
export default function PublicStoreCatchAllPage(props: PageProps) {
  return <PublicStoreCatchAllClient params={props.params} />;
}
