// src/app/api/auth/profile/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

// Helper para extrair userId do token
async function getUserIdFromToken() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('auth_token');

  if (!tokenCookie) {
    return null;
  }

  const token = tokenCookie.value;
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return null;
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as any;
    return payload?.userId;
  } catch (err) {
    return null;
  }
}

// PUT - Atualizar perfil (nome e/ou senha)
export async function PUT(request: Request) {
  try {
    const userId = await getUserIdFromToken();
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { name, currentPassword, newPassword } = await request.json();

    // Buscar usuário atual
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const updateData: any = {};

    // Atualizar nome se fornecido
    if (name !== undefined) {
      updateData.name = name || null;
    }

    // Atualizar senha se fornecida
    if (newPassword) {
      // Validar senha atual
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Senha atual é obrigatória para alterar a senha.' },
          { status: 400 }
        );
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Senha atual está incorreta.' },
          { status: 400 }
        );
      }

      // Validar nova senha
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
      if (!passwordRegex.test(newPassword)) {
        return NextResponse.json(
          {
            error:
              'A senha deve ter no mínimo 6 caracteres, incluindo pelo menos uma letra maiúscula, uma minúscula e um número.',
          },
          { status: 400 }
        );
      }

      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum dado foi fornecido para atualizar.' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, login: true, name: true },
    });

    return NextResponse.json(
      { message: 'Perfil atualizado com sucesso!', user: updatedUser },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

// DELETE - Excluir conta
export async function DELETE() {
  try {
    const userId = await getUserIdFromToken();
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    // Deletar usuário
    await prisma.user.delete({
      where: { id: userId },
    });

    // Limpar cookie
    const cookieStore = await cookies();
    cookieStore.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(0),
      path: '/',
    });

    return NextResponse.json({ message: 'Conta deletada com sucesso!' }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
