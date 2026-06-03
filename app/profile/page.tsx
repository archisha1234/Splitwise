import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ProfileForm } from "@/components/profile-form";
import { ShellCard } from "@/components/ui";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <ProfileForm initialDisplayName={user.display_name} />
        <ShellCard>
          <div className="space-y-2 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-900">Email:</span> {user.email}
            </p>
            <p>This assignment keeps email immutable and only allows display-name edits.</p>
          </div>
        </ShellCard>
      </div>
    </div>
  );
}
