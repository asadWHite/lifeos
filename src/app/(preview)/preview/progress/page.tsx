import type { Metadata } from "next";
import { PreviewProgress } from "./client";

export const metadata: Metadata = { title: "Progress · Preview" };
export default function Page() { return <PreviewProgress />; }
