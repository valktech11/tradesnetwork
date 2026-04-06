// Content moderation using Claude API
// Called server-side before saving any user-generated text to DB

export async function moderateContent(text: string): Promise<{ safe: boolean; reason?: string }> {
  if (!text || text.trim().length === 0) return { safe: true }

  // Skip very short text (names, single words) — not worth moderating
  if (text.trim().length < 10) return { safe: true }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':            'application/json',
        'x-api-key':               process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version':       '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 50,
        messages: [{
          role:    'user',
          content: `You are a content moderator for a professional trades marketplace. Review the following text and determine if it contains:
- Profanity or obscene language
- Racial slurs or hate speech
- Discrimination based on race, gender, religion, nationality, or sexual orientation
- Harassment or threatening language
- Sexually explicit content
- Spam or irrelevant promotional content

Text to review: "${text.replace(/"/g, "'")}"

Reply with ONLY one of these two responses:
SAFE
UNSAFE: [brief reason in 5 words or less]`,
        }],
      }),
    })

    if (!response.ok) {
      console.error('Moderation API error:', response.status)
      return { safe: true } // fail open — don't block if API is down
    }

    const data = await response.json()
    const result = data.content?.[0]?.text?.trim() || 'SAFE'

    if (result.startsWith('UNSAFE')) {
      const reason = result.replace('UNSAFE:', '').trim()
      return { safe: false, reason: reason || 'Content not allowed' }
    }

    return { safe: true }
  } catch (error) {
    console.error('Moderation check failed:', error)
    return { safe: true } // fail open — never block if moderation itself errors
  }
}
