import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: '公式变量映射与可视化工具',
  description: '英文公式与中文公式的变量映射和可视化展示',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" style={{ touchAction: 'pan-x pan-y' }}>
      <body style={{ touchAction: 'pan-x pan-y', overflowX: 'hidden', maxWidth: '100vw' }}>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
