import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Alumni Intelligence Platform",
  description: "Alumni Career Analytics and Intelligence Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 text-gray-900">
        <div className="flex min-h-screen">
          {/* Desktop sidebar */}
          <div className="hidden md:flex md:flex-shrink-0">
            <Sidebar />
          </div>
          {/* Mobile navbar */}
          <Navbar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
