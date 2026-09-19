import type { Metadata } from "next";
import { PitchDeck } from "@/components/PitchDeck";

export const metadata: Metadata = {
  title: "Pitch — Eye of Grok",
  description: "Five-slide demo context for Eye of Grok.",
};

export default function PitchPage() {
  return <PitchDeck />;
}
