import { NextResponse } from 'next/server';
const ansibleApi = process.env.ANSIBLE_API_URL || 'http://localhost:5000';

export async function POST(req: Request) {
  const body = await req.json();
  const r = await fetch(`${ansibleApi}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  return NextResponse.json(data, { status: r.status });
}
