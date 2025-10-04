import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 800, // lowered after splitting; adjust as needed
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Targeted library groupings for better browser caching & smaller parallel fetches
            if (id.match(/framer-motion/)) return 'vendor-motion';
            if (id.match(/@supabase/)) return 'vendor-supabase';
            if (id.match(/react-router/)) return 'vendor-react-router';
            if (id.match(/i18next|react-i18next/)) return 'vendor-i18n';
            if (id.match(/@radix-ui/)) return 'vendor-radix';
            if (id.match(/recharts/)) return 'vendor-charts';
            if (id.match(/react-query|@tanstack\/react-query/)) return 'vendor-query';
            if (id.match(/react-hook-form|@hookform|zod/)) return 'vendor-forms';
            if (id.match(/lucide-react/)) return 'vendor-icons';
            if (id.match(/date-fns/)) return 'vendor-date';
            if (id.match(/clsx|class-variance-authority|tailwind-merge/)) return 'vendor-style-utils';
            // Fallback catch-all vendor
            return 'vendor';
          }
          // Feature slabs
            if (id.includes('/src/components/PerformancePrepTools')) return 'feature-prep';
            if (id.includes('/src/components/MusicPlayer')) return 'feature-player';
            if (id.includes('/src/components/PitchDetector')) return 'feature-pitch';
        }
      }
    }
  }
}));
