import type { Metadata } from "next";
import { PreviewToday } from "./client";

export const metadata: Metadata = { title: "Today · Preview" };
export default function Page() { return <PreviewToday />; }
