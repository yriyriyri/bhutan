// app/layout.tsx
import './globals.css';
import Script from 'next/script';
import ShaderSurface from '../components/ShaderSurface';
import { ShaderSceneProvider } from '../components/ShaderSceneContext';

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
      <body style={{ margin: 0 }}>
        <ShaderSceneProvider>
          <ShaderSurface />
          {children}
        </ShaderSceneProvider>
      </body>
    </html>
  );
}