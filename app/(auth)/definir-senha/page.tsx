import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "@/components/auth/set-password-form";

export const metadata: Metadata = { title: "Definir senha" };

export default async function SetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=link-invalido");

  return (
    <>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Crie sua senha</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Conta: <span className="font-medium text-foreground">{user.email}</span>
      </p>
      <div className="mt-6">
        <SetPasswordForm />
      </div>
    </>
  );
}
