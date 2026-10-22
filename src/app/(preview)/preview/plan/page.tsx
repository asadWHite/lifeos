import type { Metadata } from "next";
import { PreviewPlan } from "./client";

export const metadata: Metadata = { title: "Plan · Preview" };
export default function Page() { return <PreviewPlan />; }
