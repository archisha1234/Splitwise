import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { JoinGroupForm } from "@/components/group-form";

export default async function JoinGroupPage({
  searchParams
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const resolvedSearchParams = await searchParams;
  return (
    <div className="flex justify-center">
      <JoinGroupForm initialCode={resolvedSearchParams.code ?? ""} />
    </div>
  );
}
