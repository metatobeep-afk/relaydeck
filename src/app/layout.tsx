import type { Metadata } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import "./globals.css";
import { SwRegister } from "@/components/sw-register";
import { Analytics } from '@vercel/analytics/next';

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["400","600","700","800"] });

export const metadata: Metadata = {
  title: 'RelayDeck — B2B Ordering & Operations System',
  description: 'Μετά την έκθεση, ξεκινάει το χάος. Εμείς το εξαφανίζουμε. Ψηφιακή καταγραφή παραγγελιών, CRM, παραγωγή και προμηθευτές για B2B επιχειρήσεις.',
  openGraph: {
    title: 'RelayDeck — B2B Ordering & Operations System',
    description: 'Ψηφιακό σύστημα παραγγελιών για B2B εκθέσεις και χονδρική.',
    type: 'website',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="el" className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SwRegister />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
