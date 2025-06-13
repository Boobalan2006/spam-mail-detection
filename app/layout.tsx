import "@/styles/globals.css"
import { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"

import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SpamShield AI - Email Spam Detection",
  description: "Analyze emails and detect spam with advanced ML models",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}