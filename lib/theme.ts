/**
 * ProGuild Design Tokens
 * Single source of truth for dark/light mode colors.
 * Import and call theme(dk) in any component that accepts a darkMode prop.
 */
export function theme(dk: boolean) {
  return {
    // Page & card backgrounds
    pageBg:       dk ? '#0A1628' : '#F5F4F0',
    cardBg:       dk ? '#1E293B' : '#ffffff',
    cardBgAlt:    dk ? '#0F172A' : '#F9FAFB',   // slightly recessed areas (tax row, notes bg)
    cardBgEdit:   dk ? '#1a2e44' : '#F0FDF9',   // edit mode highlight

    // Borders
    cardBorder:   dk ? '#334155' : '#E8E2D9',   // card / section dividers
    inputBorder:  dk ? '#475569' : '#D1D5DB',   // inputs, action buttons — must be visible
    divider:      dk ? '#1E293B' : '#F3F4F6',   // subtle inner table dividers

    // Text
    textPri:      dk ? '#F1F5F9' : '#111827',   // headings, names, primary values
    textBody:     dk ? '#CBD5E1' : '#374151',   // body text, amounts, button labels
    textMuted:    dk ? '#94A3B8' : '#6B7280',   // labels, secondary info, placeholders
    textSubtle:   dk ? '#64748B' : '#9CA3AF',   // timestamps, hints — use sparingly

    // Interactive
    btnBorder:    dk ? '#475569' : '#D1D5DB',   // icon action buttons
    btnText:      dk ? '#CBD5E1' : '#374151',   // icon action buttons text/icon color
    btnHoverBg:   dk ? '#334155' : '#F9FAFB',

    // Inputs
    inputBg:      dk ? '#0F172A' : '#ffffff',

    // Misc
    teal:         '#0F766E',
    tealL:        '#14B8A6',
  }
}

export type Theme = ReturnType<typeof theme>
