import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const linkError = params.error === "link-invalido";

  return (
    <>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Bem-vindo de volta</h1>
      <p className="mt-1 text-sm text-muted-foreground">Entre com o e-mail e a senha da sua conta.</p>
      {linkError && (
        <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Esse link expirou ou é inválido. Peça um novo convite ao administrador.
        </p>
      )}
      <div className="mt-6">
        <LoginForm next={next} />
      </div>
    </>
  );
}
