import { AuthProvider } from "@/lib/auth-context"
import { ThemeProvider } from "@/contexts/ThemeContext"
import './globals.css'

export const metadata = {
  title: 'UtterTuple',
  description: 'UtterTuple',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="gpu-accelerated">
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
