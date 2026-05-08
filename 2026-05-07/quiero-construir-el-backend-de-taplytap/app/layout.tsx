import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaplyTap",
  description: "Backend MVP for TaplyTap NFC and QR plates"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
