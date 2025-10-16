import './globals.css'

import { GeistSans } from 'geist/font/sans'
import type { Metadata } from 'next'

import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

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
          <div className="min-h-screen flex flex-col">
            <main className="flex-1">{children}</main>
            <footer className="px-4 py-12 text-center text-xs text-muted-foreground">
              Built by shadcn at Vercel. The source code is available on{' '}
              <a
                href="https://github.com/acakluqman/nextjs-imdb"
                target="_blank"
                className="text-sidebar-foreground dark:text-sidebar-primary-foreground/70"
              >
                GitHub
              </a>
            </footer>
          </div>
        </ThemeProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
