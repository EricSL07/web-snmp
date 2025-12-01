import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const PLAYBOOKS_DIR = path.join(process.cwd(), 'ansible', 'playbooks')

function sanitizeName(name: string) {
  const base = name.trim().replace(/\s+/g, '_')
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, '')
  if (!safe || safe.includes('/') || safe.includes('..')) return null
  return safe.endsWith('.yml') || safe.endsWith('.yaml') ? safe : `${safe}.yml`
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const name = searchParams.get('name')
    if (!name) {
      // If no name is provided, list files (convenience)
      const entries = await fs.readdir(PLAYBOOKS_DIR, { withFileTypes: true }).catch(() => [])
      const playbooks = entries
        .filter((e: any) => e.isFile())
        .map((e: any) => e.name)
        .filter((n: string) => n.endsWith('.yml') || n.endsWith('.yaml'))
        .sort((a: string, b: string) => a.localeCompare(b))
      return NextResponse.json({ playbooks })
    }
    const safe = sanitizeName(name)
    if (!safe) return NextResponse.json({ error: 'nome inválido' }, { status: 400 })
    const filePath = path.join(PLAYBOOKS_DIR, safe)
    const yaml = await fs.readFile(filePath, 'utf-8')
    return NextResponse.json({ name: safe, yaml })
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, yaml } = await req.json()
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name é obrigatório' }, { status: 400 })
    }
    if (!yaml || typeof yaml !== 'string' || !yaml.trim()) {
      return NextResponse.json({ error: 'yaml é obrigatório' }, { status: 400 })
    }

    const finalName = sanitizeName(name)
    if (!finalName) return NextResponse.json({ error: 'nome inválido' }, { status: 400 })
    const dest = path.join(PLAYBOOKS_DIR, finalName)

    // ensure dir exists
    await fs.mkdir(PLAYBOOKS_DIR, { recursive: true })
    // check exists
    try {
      await fs.access(dest)
      return NextResponse.json({ error: 'playbook já existe' }, { status: 409 })
    } catch {}

    await fs.writeFile(dest, yaml, 'utf-8')
    return NextResponse.json({ ok: true, name: finalName })
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { name, yaml, newName } = await req.json()
    if (!name || typeof name !== 'string') return NextResponse.json({ error: 'name é obrigatório' }, { status: 400 })
    if (!yaml || typeof yaml !== 'string' || !yaml.trim()) return NextResponse.json({ error: 'yaml é obrigatório' }, { status: 400 })
    const safeName = sanitizeName(name)
    if (!safeName) return NextResponse.json({ error: 'nome inválido' }, { status: 400 })
    const src = path.join(PLAYBOOKS_DIR, safeName)
    try { await fs.access(src) } catch { return NextResponse.json({ error: 'playbook não encontrado' }, { status: 404 }) }

    const finalName = newName ? sanitizeName(newName) : safeName
    if (!finalName) return NextResponse.json({ error: 'novo nome inválido' }, { status: 400 })
    const dest = path.join(PLAYBOOKS_DIR, finalName)
    if (finalName !== safeName) {
      // prevent overwrite if destination exists
      try { await fs.access(dest); return NextResponse.json({ error: 'já existe playbook com este nome' }, { status: 409 }) } catch {}
      await fs.writeFile(dest, yaml, 'utf-8')
      await fs.unlink(src)
    } else {
      await fs.writeFile(src, yaml, 'utf-8')
    }
    return NextResponse.json({ ok: true, name: finalName })
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { name } = await req.json()
    if (!name || typeof name !== 'string') return NextResponse.json({ error: 'name é obrigatório' }, { status: 400 })
    const safeName = sanitizeName(name)
    if (!safeName) return NextResponse.json({ error: 'nome inválido' }, { status: 400 })
    const filePath = path.join(PLAYBOOKS_DIR, safeName)
    try { await fs.unlink(filePath) } catch {
      return NextResponse.json({ error: 'playbook não encontrado' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
