// src/app/dashboard/switch/[id]/comandos/page.tsx
import Link from 'next/link';

export default function ComandosPage({ params }: { params: { id: string } }) {
  // No futuro, você pode buscar o nome do switch aqui também se quiser
  return (
    <div className="min-h-screen bg-gray-700 text-white p-8">
      <h1 className="text-4xl font-bold mb-4 font-mono">NOME DO SWITCH</h1>
      <h2 className="text-3xl font-semibold mb-8 font-mono">LISTA DE COMANDOS</h2>
      <div className="flex flex-col gap-4 max-w-sm">
        <button className="bg-gray-300 text-black p-4 rounded-lg text-left hover:bg-gray-400">REINICIAR</button>
        <button className="bg-gray-300 text-black p-4 rounded-lg text-left hover:bg-gray-400">VERSÃO</button>
        <button className="bg-gray-300 text-black p-4 rounded-lg text-left hover:bg-gray-400">PING</button>
        <button className="bg-gray-300 text-black p-4 rounded-lg text-left hover:bg-gray-400">ALTERAR PORTA</button>
      </div>
      <div className="mt-8">
        <Link href={`/dashboard/switch/${params.id}`} className="bg-gray-300 text-black px-6 py-3 rounded-lg hover:bg-gray-400">
          ← VOLTAR
        </Link>
      </div>
    </div>
  );
}