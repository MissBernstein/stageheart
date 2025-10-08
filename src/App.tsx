import React from "react";
import { ToastProvider } from "@/ui/Toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Favorites from "./pages/Favorites";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import AddSong from "./pages/AddSong";
import AdminSubmissions from "./pages/AdminSubmissions";
import MigrateLegacySongs from "./pages/MigrateLegacySongs";
import SimpleMigration from "./pages/SimpleMigration";
import { ImportSongsPage } from "./pages/ImportSongsPage";
import { VoicesApp } from "./VoicesApp";
import { AuthProvider } from "./hooks/useAuth";
import { PlayerProvider } from "./hooks/usePlayer";
import { UnreadMessagesProvider } from "./hooks/useUnreadMessages";
import { CombinedLegalBanner } from "./components/CombinedLegalBanner";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PlayerProvider>
        <UnreadMessagesProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
          forcedTheme="dark"
        >
          <TooltipProvider>
            <ToastProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/add" element={<AddSong />} />
                  <Route path="/admin/submissions" element={<AdminSubmissions />} />
                  <Route path="/admin/migrate" element={<MigrateLegacySongs />} />
                  <Route path="/admin/simple-migration" element={<SimpleMigration />} />
                  <Route path="/admin/import-songs" element={<ImportSongsPage />} />
                  {/* Voices & Profiles Feature - accessible at /app/* */}
                  <Route path="/app/*" element={<VoicesApp />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <CombinedLegalBanner />
              </BrowserRouter>
            </ToastProvider>
          </TooltipProvider>
        </ThemeProvider>
        </UnreadMessagesProvider>
      </PlayerProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
