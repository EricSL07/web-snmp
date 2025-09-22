// src/app/page.tsx

import { redirect } from 'next/navigation';

export default function HomePage() {
  // Esta função, quando chamada em um Server Component,
  // redireciona o usuário permanentemente para a rota especificada.
  redirect('/login');

  // Como o redirecionamento acontece no servidor, nenhum HTML precisa ser renderizado.
  // A página nunca chega a ser exibida para o usuário.
  return null;
}