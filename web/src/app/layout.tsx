import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "IDP Platform", template: "%s · IDP Platform" },
  description: "Self-service provisioning for microservices: repo, Dockerfile, CI and Kubernetes in one step.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Providers>
          <header className="site-header">
            <div className="container site-header-inner">
              <Link href="/" className="brand">
                <span className="brand-mark" aria-hidden="true">◆</span> IDP Platform
              </Link>
              <nav aria-label="Main" className="site-nav">
                <Link href="/">Services</Link>
                <Link href="/services/new" className="button button-small">
                  New service
                </Link>
              </nav>
              <ConnectionBadge />
            </div>
          </header>
          <main id="main" className="container main" tabIndex={-1}>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
