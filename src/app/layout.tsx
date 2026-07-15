import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/service-worker-register';

export const metadata: Metadata = {
  title: {
    default: 'TamFam — Tamworth Christadelphian Church',
    template: '%s · TamFam',
  },
  description: 'Members, meetings and attendance for Tamworth Christadelphian Church.',
  manifest: '/manifest.webmanifest',
  applicationName: 'TamFam',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TamFam',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#1f4577',
  width: 'device-width',
  initialScale: 1,
  // Do not disable zoom — pinch-zoom is required for WCAG 1.4.4 / 1.4.10.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
