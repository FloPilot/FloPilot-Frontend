import { redirect } from "next/navigation";

export default async function StationMachineRedirectPage({
  params,
}: {
  params: Promise<{ machineId: string }>;
}) {
  const { machineId } = await params;
  redirect(`/app/machines/${machineId}`);
}
