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
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('react-router')) return 'vendor-react-router';
            if (id.includes('i18next') || id.includes('react-i18next')) return 'vendor-i18n';
            if (id.includes('@radix-ui')) return 'vendor-radix';
            if (id.includes('recharts')) return 'vendor-charts';
            return 'vendor';
          }
          // Split large feature areas by folder (optional future refinement)
          if (id.includes('/src/components/PerformancePrepTools')) return 'feature-prep';
          if (id.includes('/src/components/MusicPlayer')) return 'feature-player';
          if (id.includes('/src/components/PitchDetector')) return 'feature-pitch';
        }
      }
    }
  }
}));
