import './globals.css' // Asegúrate de haber movido tu archivo globals.css a la carpeta src/app/

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
      <body>{children}</body>
    </html>
  )
}