import "./platform.css";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <div className="platform-shell min-h-screen bg-[#0f0d0b] text-[#f5ede4]">{children}</div>;
}
