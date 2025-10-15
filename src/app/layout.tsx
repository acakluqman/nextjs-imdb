import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

import { ThemeProvider } from '@/components/theme-provider'

export const metadata: Metadata = {
  title: 'IMDb API',
  description: 'IMDb API is a RESTful API that provides access to IMDb data.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
