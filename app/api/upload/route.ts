import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file   = formData.get('file') as File | null
  const proId  = formData.get('pro_id') as string | null

  if (!file || !proId) {
    return NextResponse.json({ error: 'file and pro_id are required' }, { status: 400 })
  }

  // Validate file type
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPG, PNG and WebP images are allowed' }, { status: 400 })
  }

  // Validate file size — max 5MB
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 })
  }

  const ext      = file.type.split('/')[1]
  const path     = `${proId}/avatar.${ext}`
  const bytes    = await file.arrayBuffer()
  const buffer   = Buffer.from(bytes)

  // Upload to Supabase Storage — avatars bucket
  const { error: uploadError } = await getSupabaseAdmin()
    .storage
    .from('avatars')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true, // overwrite if exists
    })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Get public URL
  const { data: { publicUrl } } = getSupabaseAdmin()
    .storage
    .from('avatars')
    .getPublicUrl(path)

  // Update pro record with new photo URL
  const { error: updateError } = await getSupabaseAdmin()
    .from('pros')
    .update({ profile_photo_url: publicUrl })
    .eq('id', proId)

  if (updateError) {
    console.error('Pro update error:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ url: publicUrl })
}
