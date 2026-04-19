import type { Metadata } from 'next'
import MaintenanceGate from '@/components/layout/MaintenanceGate'
import './globals.css'

export const metadata: Metadata = {
  title: 'ProGuild.ai — Your Craft. Your Guild.',
  description: 'Florida\'s verified trades network. Find DBPR-licensed electricians, plumbers, HVAC techs and more. Zero lead fees. License verified.',
  openGraph: {
    title: 'ProGuild.ai — Your Craft. Your Guild.',
    description: 'Find verified Florida tradespeople. DBPR-integrated. Zero lead fees.',
    siteName: 'ProGuild.ai',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Serif+Display&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-stone-50 text-gray-900 antialiased" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <MaintenanceGate>
          {children}
        </MaintenanceGate>
      </body>
    </html>
  )
}
