// src/middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. Pega o cookie de autenticação da requisição
  const token = request.cookies.get('auth_token');

  // 2. Se não houver token e o usuário tentar acessar uma página protegida
  if (!token) {
    // Redireciona o usuário para a página de login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. Se houver um token, permite que o usuário continue para a página solicitada
  return NextResponse.next();
}

// Configuração do Middleware
export const config = {
  // Define quais rotas serão protegidas pelo middleware
  matcher: ['/dashboard/:path*'],
};