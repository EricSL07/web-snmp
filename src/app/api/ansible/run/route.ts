import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { yaml, credentialId, target, extra_vars } = body || {};
    if (!yaml || typeof yaml !== 'string' || !yaml.trim()) {
      return Response.json({ error: 'yaml é obrigatório' }, { status: 400 });
    }

    // Monta extra_vars com credencial e outros dados se necessário
    const payload = {
      yaml,
      extra_vars: extra_vars || {
        credentialId: credentialId || null,
      },
      limit: target || null,
    };

    // Chama o serviço Flask interno (container ansible-api)
    const res = await fetch('http://ansible-api:5000/run_yaml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (e: any) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
