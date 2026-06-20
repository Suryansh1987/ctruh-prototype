import type { Metadata } from "next";
import ArchitectureClient from "./architecture-client";

export const metadata: Metadata = {
  title: "Architecture — Ctruh XR Analyzer",
  description:
    "How Ctruh's XR readiness analyzer works: AI scoring pipeline, fallback chains, 3D generation, caching, and cost breakdown.",
};

export default function ArchitecturePage() {
  return <ArchitectureClient />;
}
