import React from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { Footer } from "@/components/shell/footer";
import { FirstLoginNotice } from "@/components/shared/first-login-notice";
import { AppOverlays } from "@/components/shell/app-overlays";
import { AppStateProvider } from "@/lib/context/app-state";
import { GuideTopBanner } from "@/components/shared/guide-top-banner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppStateProvider>
      <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
        <GuideTopBanner />
        <div className="flex flex-1 min-h-0 w-full overflow-hidden">
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
        </div>
        <FirstLoginNotice />
        <AppOverlays />
      </div>
    </AppStateProvider>
  );
}
