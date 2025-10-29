// src/app/registrar/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegistrarPage() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState(''); // Estado para erro da senha
  const router = useRouter();

  const validatePassword = (password: string) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    if (!password) {
      setPasswordError('');
      return;
    }
    if (!passwordRegex.test(password)) {
      setPasswordError('A senha deve ter 6+ caracteres, com maiúscula, minúscula e número.');
    } else {
      setPasswordError(''); // Limpa o erro se a senha for válida
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setSenha(newPassword);
    validatePassword(newPassword); // Valida em tempo real
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Garante que não submeta o formulário se a senha for inválida
    if (passwordError) {
      setError('Por favor, corrija os erros no formulário.');
      return;
    }

    if (senha !== confirmarSenha) {
      setError('As senhas não coincidem!');
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ login, password: senha }),
      });

      if (res.ok) {
        alert('Registro bem-sucedido!');
        router.push('/login');
      } else {
        const data = await res.json();
        setError(data.error || 'Falha no registro.');
      }
    } catch (err) {
      setError('Ocorreu um erro. Tente novamente.');
      console.error(err);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-700">
      <div className="bg-gray-200 p-8 rounded-lg shadow-lg w-full max-w-sm text-center">
        <h1 className="text-3xl font-bold mb-8 font-mono tracking-widest">WEB-SNMP</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <p className="text-red-500 bg-red-100 p-2 rounded-lg">{error}</p>}
          <input
            type="text"
            placeholder="LOGIN"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="p-3 rounded-full bg-gray-300 text-center placeholder-gray-600 focus:outline-none"
          />
          <div>
            <input
              type="password"
              placeholder="SENHA"
              value={senha}
              onChange={handlePasswordChange} // Usa a nova função de change
              className="p-3 w-full rounded-full bg-gray-300 text-center placeholder-gray-600 focus:outline-none"
            />
            {/* Exibe o erro da senha em tempo real */}
            {passwordError && <p className="text-red-500 text-sm mt-1">{passwordError}</p>}
          </div>
          <input
            type="password"
            placeholder="CONFIRMAR SENHA"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            className="p-3 rounded-full bg-gray-300 text-center placeholder-gray-600 focus:outline-none"
          />
          <button type="submit" className="p-3 mt-4 bg-gray-400 text-gray-800 rounded-lg hover:bg-gray-500 transition-colors">
            REGISTRAR
          </button>
           <Link href="/login" className="p-3 bg-gray-400 text-gray-800 rounded-lg hover:bg-gray-500 transition-colors">
            VOLTAR
          </Link>
        </form>
      </div>
    </div>
  );
}