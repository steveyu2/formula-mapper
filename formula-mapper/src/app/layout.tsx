import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
