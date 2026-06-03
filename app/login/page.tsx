import Link from "next/link";
import { LoginForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <LoginForm />
        <p className="text-center text-sm text-slate-600">
          New here?{" "}
          <Link href="/register" className="font-medium text-slate-950 underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
