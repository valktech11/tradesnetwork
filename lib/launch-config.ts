// ─────────────────────────────────────────────────────────────────────────────
// ProGuild.ai — Launch Configuration
// Change env vars in Vercel to expand scope. Zero code deploys needed.
//
// LAUNCH_SCOPE      = "FL" | "FL,TX" | "national"
// MODERATION_MODE   = "both" | "ai" | "local" | "off"
// MODERATION_AI_PROVIDER = "gemini" | "claude" | "openai"
// AI_PROVIDER_MODEL = "gemini-2.5-flash"
// NEXT_PUBLIC_CLIENT_MODERATION = "true" | "false"
// ─────────────────────────────────────────────────────────────────────────────

export type LaunchMode = 'single' | 'multi' | 'national'
export type ModerationMode = 'both' | 'ai' | 'local' | 'off'
export type ModerationProvider = 'gemini' | 'claude' | 'openai'

// US state full names for display
const STATE_NAMES: Record<string, string> = {
  FL: 'Florida', TX: 'Texas', CA: 'California', NY: 'New York',
  GA: 'Georgia', NC: 'North Carolina', AZ: 'Arizona', CO: 'Colorado',
  WA: 'Washington', IL: 'Illinois', OH: 'Ohio', PA: 'Pennsylvania',
  NJ: 'New Jersey', VA: 'Virginia', TN: 'Tennessee', MI: 'Michigan',
  OR: 'Oregon', MN: 'Minnesota', NV: 'Nevada', SC: 'South Carolina',
}

export interface ScopeConfig {
  mode: LaunchMode
  activeStates: string[]           // e.g. ['FL'] or ['FL','TX']
  label: string                    // e.g. "Florida" or "Florida & Texas"
  heroSubtext: string              // hero tagline
  trustLine: string                // trust bar text
  searchPlaceholder: string        // search input placeholder
  isNational: boolean
}

export interface ModerationConfig {
  mode: ModerationMode
  provider: ModerationProvider
  model: string
  clientSideEnabled: boolean       // NEXT_PUBLIC_CLIENT_MODERATION
}

// ── Scope ────────────────────────────────────────────────────────────────────

export function getLaunchScope(): ScopeConfig {
  const raw = (process.env.LAUNCH_SCOPE || 'FL').trim().toUpperCase()

  if (raw === 'NATIONAL') {
    return {
      mode: 'national',
      activeStates: [],
      label: 'Nationwide',
      heroSubtext: "America's verified trades network",
      trustLine: '134,000+ DBPR-verified pros nationwide · Zero lead fees · License checked',
      searchPlaceholder: 'Trade or skill · City or ZIP...',
      isNational: true,
    }
  }

  const states = raw.split(',').map(s => s.trim()).filter(Boolean)

  if (states.length === 1) {
    const name = STATE_NAMES[states[0]] || states[0]
    return {
      mode: 'single',
      activeStates: states,
      label: name,
      heroSubtext: `${name}'s verified trades network`,
      trustLine: `134,000+ DBPR-verified ${name} pros · Zero lead fees · License checked`,
      searchPlaceholder: `Trade or skill · City or ZIP in ${name}...`,
      isNational: false,
    }
  }

  // Multi-state
  const names = states.map(s => STATE_NAMES[s] || s)
  const label = names.length === 2
    ? `${names[0]} & ${names[1]}`
    : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`

  return {
    mode: 'multi',
    activeStates: states,
    label,
    heroSubtext: `Verified trades pros across ${label}`,
    trustLine: `134,000+ DBPR-verified pros across ${label} · Zero lead fees`,
    searchPlaceholder: 'Trade or skill · City or ZIP...',
    isNational: false,
  }
}

// ── Geo detection (server-side, from Vercel edge headers) ────────────────────

export function detectStateFromHeaders(headers: Headers): string | null {
  // Vercel injects visitor's region automatically
  const region = headers.get('x-vercel-ip-country-region')
  const country = headers.get('x-vercel-ip-country')
  if (country !== 'US') return null
  return region || null
}

export function resolveVisitorScope(visitorState: string | null, scope: ScopeConfig): {
  inScope: boolean
  visitorState: string | null
  nearestState: string | null
  comingSoonMessage: string | null
} {
  if (scope.isNational) {
    return { inScope: true, visitorState, nearestState: null, comingSoonMessage: null }
  }
  if (!visitorState) {
    // Unknown location — show first active state
    return { inScope: true, visitorState: scope.activeStates[0], nearestState: null, comingSoonMessage: null }
  }
  if (scope.activeStates.includes(visitorState)) {
    return { inScope: true, visitorState, nearestState: null, comingSoonMessage: null }
  }
  // Out of scope — show coming soon
  const nearest = scope.activeStates[0]
  const visitorName = STATE_NAMES[visitorState] || visitorState
  const nearestName = STATE_NAMES[nearest] || nearest
  return {
    inScope: false,
    visitorState,
    nearestState: nearest,
    comingSoonMessage: `ProGuild is coming to ${visitorName} soon. Browse ${nearestName} pros below.`,
  }
}

// ── Moderation ───────────────────────────────────────────────────────────────

export function getModerationConfig(): ModerationConfig {
  return {
    mode: (process.env.MODERATION_MODE || 'both') as ModerationMode,
    provider: (process.env.MODERATION_AI_PROVIDER || 'gemini') as ModerationProvider,
    model: process.env.AI_PROVIDER_MODEL || 'gemini-2.5-flash',
    clientSideEnabled: process.env.NEXT_PUBLIC_CLIENT_MODERATION !== 'false',
  }
}

// ── AI API endpoint builder ──────────────────────────────────────────────────

export function getAIEndpoint(config: ModerationConfig): { url: string; headers: Record<string, string> } {
  switch (config.provider) {
    case 'gemini':
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        headers: { 'Content-Type': 'application/json' },
      }
    case 'claude':
      return {
        url: 'https://api.anthropic.com/v1/messages',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
        },
      }
    case 'openai':
      return {
        url: 'https://api.openai.com/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
  }
}
