import type { Metadata } from "next";
import { Lora, Poppins } from "next/font/google";
import "./pitch.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-pitch-sans",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-pitch-serif",
});

export const metadata: Metadata = {
  title: "Pitch — Eye of Grok",
  description: "Five-slide demo context for Eye of Grok.",
};

export default function PitchLayout({ children }: LayoutProps<"/pitch">) {
  return <div className={`pitch-fonts ${poppins.variable} ${lora.variable}`}>{children}</div>;
}
