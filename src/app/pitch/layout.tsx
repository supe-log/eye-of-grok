import type { Metadata } from "next";
import { Familjen_Grotesk, Source_Serif_4 } from "next/font/google";
import "./pitch.css";

const grotesk = Familjen_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-pitch-sans",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-pitch-serif",
});

export const metadata: Metadata = {
  title: "Pitch — Eye of Grok",
  description: "Five-slide Anthropic demo deck for Eye of Grok.",
};

export default function PitchLayout({ children }: LayoutProps<"/pitch">) {
  return <div className={`pitch-fonts ${grotesk.variable} ${serif.variable}`}>{children}</div>;
}
