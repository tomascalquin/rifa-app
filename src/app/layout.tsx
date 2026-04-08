import './globals.css'
import { Toaster } from 'react-hot-toast' // Agrega esto

export const metadata = {
  title: 'Gran Rifa',
  description: 'Compra tu número y participa en la rifa',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        {children}
        <Toaster position="top-center" /> {/* Agrega esto */}
      </body>
    </html>
  )
}