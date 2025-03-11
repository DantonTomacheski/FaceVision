import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Escute em todas as interfaces de rede
    hmr: {
      // Tente diferentes opções de conexão para o HMR
      protocol: "ws",
      host: "localhost",
      port: 5173,
      clientPort: 5173,
      // Descomente a linha abaixo se precisar desativar o WebSocket e utilizar polling
      // overlay: false
    },
  },
});
