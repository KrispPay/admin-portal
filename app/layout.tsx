import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'KrispPay Super Admin',
  description: 'Internal super admin portal for KrispPay SAAS',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg text-slate-200">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  )
}
