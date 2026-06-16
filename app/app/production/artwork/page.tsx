import { redirect } from "next/navigation";
import { ARTWORK_BASE } from "@/components/layout/nav-config";

export default function LegacyArtworkRedirect() {
  redirect(ARTWORK_BASE);
}
