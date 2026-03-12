import './globals.css'

export const metadata = {
  title: 'Jocker — Open Scholarship',
  description: '独立学术论文发布与分享平台',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  )
}