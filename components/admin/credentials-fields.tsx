"use client";

import { useState } from "react";
import type { FieldErrors, Path, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { Field } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generatePassword } from "@/lib/password";

type WithCredentials = { email: string; password: string };

/** E-mail + senha de acesso para o cadastro manual, com botão de gerar senha. */
export function CredentialsFields<T extends WithCredentials>({
  register,
  errors,
  setValue,
  emailLabel = "E-mail de acesso",
}: {
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  setValue: UseFormSetValue<T>;
  emailLabel?: string;
}) {
  const [show, setShow] = useState(true);
  const emailPath = "email" as Path<T>;
  const passwordPath = "password" as Path<T>;

  return (
    <>
      <Field label={emailLabel} error={errors.email?.message as string | undefined}>
        <Input type="email" autoComplete="off" {...register(emailPath)} placeholder="usuario@empresa.com" />
      </Field>
      <Field
        label="Senha de acesso"
        error={errors.password?.message as string | undefined}
        hint="Anote e repasse ao usuário. Mínimo de 6 caracteres."
      >
        <div className="flex gap-1.5">
          <Input type={show ? "text" : "password"} autoComplete="new-password" {...register(passwordPath)} className="font-mono" />
          <Button type="button" variant="outline" size="icon" aria-label={show ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShow((s) => !s)}>
            {show ? <EyeOff /> : <Eye />}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Gerar senha"
            title="Gerar senha"
            onClick={() => setValue(passwordPath, generatePassword() as never, { shouldValidate: true })}
          >
            <RefreshCw />
          </Button>
        </div>
      </Field>
    </>
  );
}
