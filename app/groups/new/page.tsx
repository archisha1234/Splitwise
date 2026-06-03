import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { GroupCreateForm } from "@/components/group-form";

export default async function NewGroupPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex justify-center">
      <GroupCreateForm />
    </div>
  );
}
