import { redirect } from "next/navigation";

export default function StationRedirectPage() {
  redirect("/app/machines");
}
