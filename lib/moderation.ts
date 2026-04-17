// Content moderation — dual layer: fast pattern check + Claude Haiku
// Called server-side before saving any user-generated content to DB

// Strip asterisk masking (e.g. "a**hole" → "asshole", "f*** you" → "fuck you")
function unmask(text: string): string {
  return text
    .replace(/a\*+/gi, 'ass')
    .replace(/f\*+/gi, 'fuck')
    .replace(/s\*+t/gi, 'shit')
    .replace(/b\*+h/gi, 'bitch')
    .replace(/c\*+t/gi, 'cunt')
    .replace(/\*+/g, '')  // remove remaining asterisks
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
  /he is a\s+\w+/i,  // "he is a [insult]" pattern
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

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 50,
        messages: [{
          role:    'user',
          content: `You are a strict content moderator for a professional trades marketplace used by contractors and homeowners.

Flag as UNSAFE if the text contains ANY of the following:
- Profanity or swear words in any form (including with asterisks like f***, s***, a**)
- Personal insults or attacks: calling the person stupid, an idiot, dumb, incompetent, useless, a scammer, a fraud, a liar, lazy, or any other derogatory label
- Attacking someone's character, intelligence, or professional integrity in a disrespectful way
- Threats or aggressive language
- Hate speech, slurs, or discriminatory language
- Sexually explicit content

Safe examples: "poor quality work", "did not finish on time", "overcharged me", "wouldn't recommend"
Unsafe examples: "he is an idiot", "stupid worker", "complete moron", "useless fraud"

The bar is STRICT. Personal attacks on the individual are always UNSAFE even without profanity.

Review text: "${text.replace(/"/g, "'")}"

Reply ONLY:
SAFE
or
UNSAFE: [reason in 5 words]`,
        }],
      }),
    })

    if (!response.ok) {
      console.error('Moderation API error:', response.status)
      return { safe: true }
    }

    const data = await response.json()
    const result = data.content?.[0]?.text?.trim() || 'SAFE'
    if (result.startsWith('UNSAFE')) {
      return { safe: false, reason: result.replace('UNSAFE:', '').trim() || 'Content not allowed' }
    }
    return { safe: true }
  } catch (error) {
    console.error('Moderation check failed:', error)
    return { safe: true }
  }
}
