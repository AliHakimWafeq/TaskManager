import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CommandPalette } from "@/components/layout/command-palette";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { NewTaskHost } from "@/components/task/new-task-button";
import { listProjectsWithMeta } from "@/lib/queries/meta";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { TodayProvider } from "@/components/layout/today-provider";
import { getPreferences } from "@/lib/preferences";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const dynamic = "force-dynamic";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Tasks", template: "%s · Tasks" },
  description: "Personal task manager",
};

export default async function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const prefs = await getPreferences();
  const meta = listProjectsWithMeta();
  const projects = meta.map((m) => m.project);
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden">
        <ThemeProvider>
          <TodayProvider today={prefs.today} timeZone={prefs.timeZone}>
          <TooltipProvider>
            <div className="flex h-dvh">
              <Sidebar projects={projects} className="hidden md:flex" />
              <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <MobileNav>
                  <Sidebar projects={projects} className="w-full border-r-0" />
                </MobileNav>
                {children}
              </main>
            </div>
            {modal}
            <NewTaskHost projects={meta} />
            <CommandPalette projects={projects} />
            <Toaster position="bottom-right" />
          </TooltipProvider>
          </TodayProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
