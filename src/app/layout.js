import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "ERP Construcción — Gestión de Obra y APU",
  description: "Sistema ERP para la industria de la construcción con gestión de Análisis de Precios Unitarios (APU), integración BIM 3D y presupuestos de Revit.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={inter.variable}>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
