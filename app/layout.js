import './globals.css';

export const metadata = {
  title: 'AM Prem Generator',
  description: 'Automated Alight Motion Premium Generator & Telegram Bot Service.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
