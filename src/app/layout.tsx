// app/layout.tsx
import './globals.css';
import Script from 'next/script';
import ShaderSurface from '../components/ShaderSurface';
import { ShaderSceneProvider } from '../components/ShaderSceneContext';

export const metadata = { title: 'btc' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="theme-light" suppressHydrationWarning>
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

        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
        <meta id="meta-theme-color" name="theme-color" content="#ffffff" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){
            try {
              var saved = localStorage.getItem('ui-theme');     // 'dark' | 'light' | null
              var mql   = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
              var dark  = saved ? (saved === 'dark') : (mql ? mql.matches : false);

              var html = document.documentElement;
              var body = document.body;

              html.classList.toggle('theme-dark', dark);
              html.classList.toggle('theme-light', !dark);
              body.classList.toggle('theme-dark', dark);
              body.classList.toggle('theme-light', !dark);

              var meta = document.querySelector('meta#meta-theme-color');
              if (meta) meta.setAttribute('content', dark ? '#000000' : '#ffffff');

              // Keep meta in sync if app toggles classes later (e.g. "i" key)
              var mo = new MutationObserver(function(){
                var isDark = body.classList.contains('theme-dark');
                var m = document.querySelector('meta#meta-theme-color');
                if (m) m.setAttribute('content', isDark ? '#000000' : '#ffffff');
              });
              mo.observe(body, { attributes: true, attributeFilter: ['class'] });

              // Follow system while no explicit user choice
              if (!saved && mql && mql.addEventListener) {
                mql.addEventListener('change', function(e){
                  var d = !!e.matches;
                  html.classList.toggle('theme-dark', d);
                  html.classList.toggle('theme-light', !d);
                  body.classList.toggle('theme-dark', d);
                  body.classList.toggle('theme-light', !d);
                  var m = document.querySelector('meta#meta-theme-color');
                  if (m) m.setAttribute('content', d ? '#000000' : '#ffffff');
                });
              }
            } catch(e) {}
          })();`}
        </Script>
      </head>

      <body className="theme-light" suppressHydrationWarning style={{ margin: 0 }}>
        <ShaderSceneProvider>
          <ShaderSurface />
          {children}
        </ShaderSceneProvider>
      </body>
    </html>
  );
}