import "@/styles/globals.css";

import type { Metadata } from "next";

import { Providers } from "./providers";

const themeInitializer = `
  (function () {
    try {
      var stored = localStorage.getItem("catre-theme");
      var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", dark ? "#07130e" : "#fffefa");
    } catch (_) {}
  })();
`;

export const metadata: Metadata = {
  title: {
    default: "Eventos | CATRE Ipitinga",
    template: "%s | CATRE Ipitinga"
  },
  description: "Inscrições, pagamentos e check-in dos eventos CATRE Ipitinga.",
  applicationName: "CATRE Ipitinga",
  keywords: ["CATRE", "Ipitinga", "eventos", "inscrições", "check-in"]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#fffefa" />
        <script dangerouslySetInnerHTML={{ __html: themeInitializer }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
