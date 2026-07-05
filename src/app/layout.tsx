import type { Metadata } from "next";
import { ThemeProvider } from "@/lib/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Noetis — Your AI Personalization Profile",
  description:
    "Answer 10 questions and generate a portable AI_PROFILE.md that helps any AI assistant understand how you communicate, learn, and think.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <div className="relative min-h-screen overflow-x-hidden">
            <div
              className="bg-orb h-[420px] w-[420px] bg-[var(--accent)] top-[-120px] left-[-120px]"
              aria-hidden
            />
            <div
              className="bg-orb h-[380px] w-[380px] bg-[var(--success)] bottom-[-100px] right-[-100px]"
              aria-hidden
            />
            <div className="relative z-10">{children}</div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
