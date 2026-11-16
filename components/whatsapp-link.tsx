import { MessageCircle } from "lucide-react";
import { formatWhatsApp } from "@/lib/format";
import { cn } from "@/lib/utils";

export function WhatsAppLink({
  number,
  className,
  iconOnly = false,
  label,
  message,
}: {
  number: string;
  className?: string;
  /** Só o ícone (botão redondo), para listas compactas. */
  iconOnly?: boolean;
  /** Texto acessível/título quando `iconOnly` (ex.: nome do contato). */
  label?: string;
  /** Mensagem pré-preenchida na conversa (o usuário ainda revisa e envia). */
  message?: string;
}) {
  const digits = number.replace(/\D/g, "");
  const intl = digits.startsWith("55") ? digits : `55${digits}`;
  const href = `https://wa.me/${intl}${message ? `?text=${encodeURIComponent(message)}` : ""}`;

  if (iconOnly) {
    const title = `WhatsApp${label ? ` de ${label}` : ""}: ${formatWhatsApp(digits)}`;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={title}
        aria-label={title}
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full bg-success/10 text-success transition-colors hover:bg-success hover:text-white",
          className,
        )}
      >
        <MessageCircle className="size-4" />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("inline-flex items-center gap-1 text-success hover:underline", className)}
    >
      <MessageCircle className="size-3.5" />
      {formatWhatsApp(digits)}
    </a>
  );
}
