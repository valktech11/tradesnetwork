import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { moderateContent } from '@/lib/moderation'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const proId   = searchParams.get('pro_id')
  const limit   = parseInt(searchParams.get('limit') || '30')

  // Always fetch global feed, ordered by recency
  // If feed_for provided, boost followed pros by fetching them first
  const feedFor = searchParams.get('feed_for')

  let query = getSupabaseAdmin()
    .from('posts')
    .select(`*, pro:pros(id, full_name, profile_photo_url, plan_tier, city, state, trade_category:trade_categories(category_name))`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (proId) query = query.eq('pro_id', proId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let posts = data || []

  // If feed_for — boost followed pros to top, but keep all posts visible
  if (feedFor && !proId) {
    const { data: followData } = await getSupabaseAdmin()
      .from('follows')
      .select('following_id')
      .eq('follower_id', feedFor)

    const followingIds = new Set((followData || []).map(f => f.following_id))
    followingIds.add(feedFor) // include own posts at top too

    // Sort: followed/own posts first, then rest chronologically
    posts = [
      ...posts.filter(p => followingIds.has(p.pro_id)),
      ...posts.filter(p => !followingIds.has(p.pro_id)),
    ]
  }

  return NextResponse.json({ posts })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { pro_id, content, photo_url, post_type } = body

  if (!pro_id || !content?.trim()) {
    return NextResponse.json({ error: 'pro_id and content are required' }, { status: 400 })
  }

  // Moderate content before saving
  const mod = await moderateContent(content)
  if (!mod.safe) {
    return NextResponse.json({
      error: `Your post was not allowed: ${mod.reason}. Please keep content professional and respectful.`
    }, { status: 422 })
  }

  const { data, error } = await getSupabaseAdmin()
    .from('posts')
    .insert({
      pro_id,
      content: content.trim(),
      photo_url: photo_url || null,
      post_type: post_type || 'update',
    })
    .select(`*, pro:pros(id, full_name, profile_photo_url, trade_category:trade_categories(category_name))`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post: data }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id    = searchParams.get('id')
  const proId = searchParams.get('pro_id')
  if (!id || !proId) return NextResponse.json({ error: 'id and pro_id required' }, { status: 400 })
  const { error } = await getSupabaseAdmin().from('posts').delete().eq('id', id).eq('pro_id', proId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
