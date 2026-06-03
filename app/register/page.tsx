import Link from "next/link";
import { RegisterForm } from "@/components/auth-form";

export default function RegisterPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <RegisterForm />
        <p className="text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-slate-950 underline underline-offset-4">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
