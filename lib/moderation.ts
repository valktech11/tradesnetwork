// Content moderation — dual layer: fast pattern check + Gemini
// Called server-side before saving any user-generated content to DB

function unmask(text: string): string {
  return text
    .replace(/a\*+/gi, 'ass')
    .replace(/f\*+/gi, 'fuck')
    .replace(/s\*+t/gi, 'shit')
    .replace(/b\*+h/gi, 'bitch')
    .replace(/c\*+t/gi, 'cunt')
    .replace(/\*+/g, '')
}

const BANNED_PATTERNS = [
  /\bfuck(ed|ing|er|s|face)?\b/i,
  /\bshit(ty|s|ter|head)?\b/i,
  /\bbitch(es)?\b/i,
  /\basshole(s)?\b/i,
  /\bcunt(s)?\b/i,
  /\bdick(s|head)?\b/i,
  /\bpiss(ed)?\b/i,
  /\bwhore(s)?\b/i,
  /\bslut(s)?\b/i,
  /\bmoron(s)?\b/i,
  /\bretard(ed|s)?\b/i,
  /\bidiot(s)?\b/i,
  /\bstupid\b/i,
  /\bdumbass\b/i,
  /\bscumbag\b/i,
  /\blosers?\b/i,
  /\bworthless\b/i,
  /\buseless\b/i,
  /\bscam(mer)?\b/i,
  /\bfraud\b/i,
  /\bn[i1]gg[ae]r/i,
  /he is a\s+\w+/i,
]

export function hasObviousProfanity(text: string): boolean {
  const cleaned = unmask(text)
  return BANNED_PATTERNS.some(p => p.test(text) || p.test(cleaned))
}

export async function moderateContent(text: string): Promise<{ safe: boolean; reason?: string }> {
  if (!text || text.trim().length === 0) return { safe: true }
  if (text.trim().length < 10) return { safe: true }

  // Fast path — pattern check on original AND unmasked text
  if (hasObviousProfanity(text)) {
    return { safe: false, reason: 'Contains profanity or offensive language' }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { safe: true }

  try {
    const model = process.env.AI_PROVIDER_MODEL || 'gemini-2.5-flash'
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a strict content moderator for a professional trades marketplace.

Flag as unsafe if the text contains ANY of:
- Profanity or swear words in any form (including asterisk-masked versions)
- Personal insults: stupid, idiot, dumb, incompetent, useless, scammer, fraud, liar, lazy, or similar
- Threats or aggressive language
- Hate speech, slurs, or discriminatory language
- Sexually explicit content

Safe examples: "poor quality work", "did not finish on time", "overcharged me", "wouldn't recommend"
Unsafe examples: "he is an idiot", "stupid worker", "complete moron", "useless fraud"

Personal attacks are always unsafe even without profanity.

Review text: "${text.replace(/"/g, "'")}"`
            }]
          }],
          generationConfig: {
            maxOutputTokens: 100,
            temperature: 0,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                safe:   { type: 'boolean' },
                reason: { type: 'string', nullable: true },
              },
              required: ['safe'],
            },
          },
        }),
      }
    )

    if (!response.ok) {
      console.error('Gemini moderation error:', response.status)
      return { safe: true }
    }

    const data = await response.json()
    const text2 = data.candidates?.[0]?.content?.parts?.[0]?.text || '{"safe":true}'
    const parsed = JSON.parse(text2)
    if (parsed.safe === false) {
      return { safe: false, reason: parsed.reason || 'Content not allowed' }
    }
    return { safe: true }
  } catch (error) {
    console.error('Gemini moderation failed:', error)
    return { safe: true }
  }
}
