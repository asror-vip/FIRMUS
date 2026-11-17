import React from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { Footer } from "@/components/shell/footer";
import { FirstLoginNotice } from "@/components/shared/first-login-notice";
import { AppOverlays } from "@/components/shell/app-overlays";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 mx-auto max-w-[1400px] w-full p-4 sm:p-6 lg:p-8">
            {children}
          </div>
          <Footer />
        </main>
      </div>
      <FirstLoginNotice />
      <AppOverlays />
    </div>
  );
}
