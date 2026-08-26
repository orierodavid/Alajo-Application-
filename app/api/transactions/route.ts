import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type TransactionRow = {
  id: string
  type: string
  amount: number | string
  currency: string | null
  status: string
  provider: string | null
  reference: string | null
  date: string
  group_id: string | null
  contribution_id: string | null
  description: string | null
  source: string
}

function encodeCursor(row: TransactionRow) {
  return Buffer.from(JSON.stringify({ createdAt: row.date, id: row.id, source: row.source }), 'utf8').toString('base64url')
}

function decodeCursor(value: string | null) {
  if (!value) return null
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as { createdAt?: string; id?: string; source?: string }
    if (!parsed.createdAt || !parsed.id || !['ledger', 'payment'].includes(parsed.source ?? '')) return null
    return { createdAt: parsed.createdAt, id: parsed.id, source: parsed.source as 'ledger' | 'payment' }
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ authenticated: false }, { status: 401 })

    const url = new URL(request.url)
    const requestedLimit = Number(url.searchParams.get('limit') ?? 25)
    const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, Math.floor(requestedLimit))) : 25
    const cursorValue = url.searchParams.get('cursor')
    const cursor = decodeCursor(cursorValue)
    if (cursorValue && !cursor) return NextResponse.json({ error: 'Invalid transaction cursor.' }, { status: 400 })

    const { data, error } = await supabase.rpc('get_my_transactions', {
      p_limit: limit,
      p_cursor_created_at: cursor?.createdAt ?? null,
      p_cursor_id: cursor?.id ?? null,
      p_cursor_source: cursor?.source ?? null,
    })
    if (error) throw error

    const rows = (data ?? []) as TransactionRow[]
    const hasMore = rows.length > limit
    const pageRows = hasMore ? rows.slice(0, limit) : rows
    const transactions = pageRows.map(t => ({
      id: t.id,
      type: String(t.type),
      amount: Number(t.amount ?? 0),
      currency: t.currency ?? 'NGN',
      status: String(t.status),
      provider: t.provider,
      reference: t.reference,
      date: t.date,
      groupId: t.group_id,
      contributionId: t.contribution_id,
      description: t.description ?? String(t.type),
      source: t.source,
    }))

    return NextResponse.json({
      authenticated: true,
      transactions,
      pagination: {
        limit,
        hasMore,
        nextCursor: hasMore && pageRows.length ? encodeCursor(pageRows[pageRows.length - 1]) : null,
      },
    })
  } catch (error) {
    console.error('Transactions data error:', error)
    return NextResponse.json({ authenticated: true, error: 'Unable to load transactions' }, { status: 500 })
  }
}
