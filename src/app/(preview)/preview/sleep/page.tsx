import type { Metadata } from "next";
import { PreviewSleep } from "./client";

export const metadata: Metadata = { title: "Sleep · Preview" };
export default function Page() { return <PreviewSleep />; }
