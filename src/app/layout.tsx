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

        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){
            try {
              var saved = localStorage.getItem('ui-theme'); // 'dark' | 'light' | null
              var mql   = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
              var dark  = saved ? (saved === 'dark') : (mql ? mql.matches : false);

              var html = document.documentElement;
              var body = document.body;

              html.classList.remove('theme-light','theme-dark');
              body.classList.remove('theme-light','theme-dark');
              (dark ? (html.classList.add('theme-dark'), body.classList.add('theme-dark'))
                    : (html.classList.add('theme-light'), body.classList.add('theme-light')));
            } catch(e){}
          })();`}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}