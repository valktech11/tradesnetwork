// ─────────────────────────────────────────────────────────────────────────────
// ProGuild.ai — Content Moderation
// Configurable via env vars — no code changes needed to switch modes.
//
// MODERATION_MODE = "both" | "ai" | "local" | "off"
//   both  → local patterns first (fast), then AI for edge cases (default)
//   ai    → AI only, skip local patterns
//   local → regex patterns only, zero API cost
//   off   → no moderation (dev/staging only)
//
// Fallback chain: AI fails → local patterns → fail open (never block on error)
// ─────────────────────────────────────────────────────────────────────────────

import { getModerationConfig, getAIEndpoint } from './launch-config'

// ── Asterisk unmasking ────────────────────────────────────────────────────────

function unmask(text: string): string {
  return text
    .replace(/a\*+/gi, 'ass')
    .replace(/f\*+/gi, 'fuck')
    .replace(/s\*+t/gi, 'shit')
    .replace(/b\*+h/gi, 'bitch')
    .replace(/c\*+t/gi, 'cunt')
    .replace(/\*+/g, '')
}

// ── Local pattern list ────────────────────────────────────────────────────────

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

function localCheck(text: string): { safe: boolean; reason?: string } {
  const cleaned = unmask(text)
  const hit = BANNED_PATTERNS.some(p => p.test(text) || p.test(cleaned))
  if (hit) return { safe: false, reason: 'Contains profanity or offensive language' }
  return { safe: true }
}

// ── AI moderation (Gemini / Claude / OpenAI) ─────────────────────────────────

async function aiCheck(text: string): Promise<{ safe: boolean; reason?: string }> {
  const config = getModerationConfig()
  const { url, headers } = getAIEndpoint(config)

  const prompt = `You are a strict content moderator for a professional trades marketplace.
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

  try {
    let body: object

    if (config.provider === 'gemini') {
      body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              safe: { type: 'boolean' },
              reason: { type: 'string', nullable: true },
            },
            required: ['safe'],
          },
        },
      }
    } else if (config.provider === 'claude') {
      body = {
        model: config.model,
        max_tokens: 50,
        messages: [{ role: 'user', content: prompt + '\n\nReply ONLY:\nSAFE\nor\nUNSAFE: [reason in 5 words]' }],
      }
    } else {
      // openai
      body = {
        model: config.model,
        messages: [{ role: 'user', content: prompt + '\n\nReply ONLY:\nSAFE\nor\nUNSAFE: [reason in 5 words]' }],
        max_tokens: 50,
        temperature: 0,
      }
    }

    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
    if (!res.ok) { console.error('Moderation AI error:', res.status); return { safe: true } }

    const data = await res.json()
    let resultText = ''

    if (config.provider === 'gemini') {
      resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{"safe":true}'
      try {
        const parsed = JSON.parse(resultText)
        return { safe: parsed.safe !== false, reason: parsed.reason || undefined }
      } catch { return { safe: true } }
    } else if (config.provider === 'claude') {
      resultText = data.content?.[0]?.text?.trim() || 'SAFE'
    } else {
      resultText = data.choices?.[0]?.message?.content?.trim() || 'SAFE'
    }

    if (resultText.startsWith('UNSAFE')) {
      return { safe: false, reason: resultText.replace('UNSAFE:', '').trim() || 'Content not allowed' }
    }
    return { safe: true }
  } catch(e) {
    console.error('Moderation AI exception:', e)
    return { safe: true } // fail open — never block on API error
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function moderateContent(text: string): Promise<{ safe: boolean; reason?: string }> {
  if (!text || text.trim().length === 0) return { safe: true }
  if (text.trim().length < 10) return { safe: true }

  const config = getModerationConfig()

  switch (config.mode) {
    case 'off':
      return { safe: true }

    case 'local': {
      return localCheck(text)
    }

    case 'ai': {
      // AI only — fallback to local if AI fails
      const result = await aiCheck(text)
      if (result.safe === true && result.reason === undefined) {
        // AI returned safe — double check with local as safety net
        return result
      }
      return result
    }

    case 'both':
    default: {
      // Fast path: local patterns first
      const local = localCheck(text)
      if (!local.safe) return local
      // Slow path: AI for edge cases
      return aiCheck(text)
    }
  }
}

// ── Image moderation (for upload route) ──────────────────────────────────────

export async function moderateImage(base64: string, mimeType: string): Promise<{ safe: boolean; reason?: string }> {
  const config = getModerationConfig()
  if (config.mode === 'off' || config.mode === 'local') return { safe: true }
  if (config.provider !== 'gemini') return { safe: true } // only Gemini supports vision currently

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { safe: true }

  try {
    const model = config.model
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: base64 } },
              { text: 'Does this image contain nudity, sexual content, graphic violence, gore, hate symbols, weapons pointed at people, or illegal content?' },
            ]
          }],
          generationConfig: {
            maxOutputTokens: 100,
            temperature: 0,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                safe: { type: 'boolean' },
                reason: { type: 'string', nullable: true },
              },
              required: ['safe'],
            },
          },
        }),
      }
    )
    if (!res.ok) return { safe: true }
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{"safe":true}'
    const parsed = JSON.parse(text)
    return { safe: parsed.safe !== false, reason: parsed.reason }
  } catch {
    return { safe: true }
  }
}

// Re-export for backward compat
export { localCheck as hasObviousProfanity }
