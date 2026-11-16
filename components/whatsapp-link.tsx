import { MessageCircle } from "lucide-react";
import { formatWhatsApp } from "@/lib/format";
import { cn } from "@/lib/utils";

export function WhatsAppLink({ number, className }: { number: string; className?: string }) {
  const digits = number.replace(/\D/g, "");
  const intl = digits.startsWith("55") ? digits : `55${digits}`;
  return (
    <a
      href={`https://wa.me/${intl}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("inline-flex items-center gap-1 text-success hover:underline", className)}
    >
      <MessageCircle className="size-3.5" />
      {formatWhatsApp(digits)}
    </a>
  );
}
