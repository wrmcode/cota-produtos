"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { resetPassword } from "@/actions/admin";
import { Field } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { generatePassword } from "@/lib/password";

export function ResetPasswordDialog({
  profileId,
  email,
  open,
  onOpenChange,
}: {
  profileId: string;
  email?: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* O conteúdo é desmontado ao fechar, então a senha gerada é renovada a cada abertura */}
        <ResetPasswordForm profileId={profileId} email={email} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordForm({ profileId, email, onClose }: { profileId: string; email?: string | null; onClose: () => void }) {
  const [password, setPassword] = useState(() => generatePassword());
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      const res = await resetPassword({ profile_id: profileId, password });
      if (res.ok) {
        toast.success(`${res.message}. Nova senha: ${password}`, { duration: 10000 });
        onClose();
      } else {
        toast.error(res.error);
      }
    });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Redefinir senha</DialogTitle>
        <DialogDescription>
          {email ? <>Nova senha para <strong>{email}</strong>. </> : null}
          Anote e repasse ao usuário; ela não é enviada por e-mail.
        </DialogDescription>
      </DialogHeader>
      <Field label="Nova senha" hint="Mínimo de 6 caracteres">
        <div className="flex gap-1.5">
          <Input value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" autoComplete="new-password" />
          <Button type="button" variant="outline" size="icon" aria-label="Gerar senha" onClick={() => setPassword(generatePassword())}>
            <RefreshCw />
          </Button>
        </div>
      </Field>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={pending || password.length < 6}>
          {pending ? "Salvando..." : "Redefinir"}
        </Button>
      </DialogFooter>
    </>
  );
}
