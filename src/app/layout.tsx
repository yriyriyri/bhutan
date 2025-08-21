// app/layout.tsx
import './globals.css';
import Script from 'next/script';

export const metadata = { title: 'btc' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script id="console-banner" strategy="beforeInteractive">
          {`(function(){
            const banner = String.raw\`
_|_|_|    _|_|_|_|_|    _|_|_| 
_|    _|      _|      _|       
_|_|_|        _|      _|       
_|    _|      _|      _|       
_|_|_|        _|        _|_|_| 
\`;
            console.log('%c' + banner, 'font-family: monospace; line-height:1.1;');
          })();`}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}