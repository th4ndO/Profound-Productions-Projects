import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Atkinson_Hyperlegible } from "next/font/google";
import "./globals.css";

// Display font — headings/brand. Matches the weights the prototype pins
// (500, 700) across the optical-size axis.
const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
  variable: "--font-display",
  display: "swap",
});

// Body font — everything else. Matches the prototype's weights (400, 700).
const atkinsonHyperlegible = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Groundwork",
  description: "A personal milestone tracker.",
  appleWebApp: { capable: true, title: "Groundwork", statusBarStyle: "default" },
  icons: { icon: "/icon.png", apple: "/icon.png" },
};

// Browser/OS chrome colour: --accent in light, --bg in dark.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3b4cca" },
    { media: "(prefers-color-scheme: dark)", color: "#10161d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bricolageGrotesque.variable} ${atkinsonHyperlegible.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
