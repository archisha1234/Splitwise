import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { JoinGroupForm } from "@/components/group-form";

export default async function JoinGroupPage({
  searchParams
}: {
  searchParams: { code?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="flex justify-center">
      <JoinGroupForm initialCode={searchParams.code ?? ""} />
    </div>
  );
}
