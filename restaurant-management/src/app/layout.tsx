import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RestoHub — Restaurant Management",
  description: "Whitelabel restaurant management platform for Poland",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
