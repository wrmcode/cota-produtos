import { redirect } from "next/navigation";

// O proxy já redireciona usuários logados para a área do papel.
// Quem chega aqui sem sessão vai para o login.
export default function Home() {
  redirect("/login");
}
