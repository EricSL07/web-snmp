"use client";
import { useEffect, useState } from 'react';

export default function CredentialsList({ selected, onSelect }: { selected?: string | null; onSelect: (id: string | null) => void }) {
  const [creds, setCreds] = useState<Array<{ id: string; name: string; username?: string; type?: string }>>([]);

  useEffect(() => {
    let mounted = true;
    fetch('/api/credentials')
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        if (Array.isArray(data)) setCreds(data);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  return (
    <div className="bg-gray-800 p-4 rounded">
      <div className="flex flex-col gap-2">
        <button onClick={() => onSelect(null)} className={`text-left p-2 rounded ${selected ? 'bg-gray-700' : 'bg-gray-600'}`}>-- Nenhuma --</button>
        {creds.map((c) => (
          <button key={c.id} onClick={() => onSelect(c.id)} className={`text-left p-2 rounded ${selected === c.id ? 'bg-blue-600' : 'bg-gray-600'}`}>
            <div className="font-semibold">{c.name}</div>
            <div className="text-xs text-gray-300">{c.username ?? '—'} {c.type ? `• ${c.type}` : ''}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
