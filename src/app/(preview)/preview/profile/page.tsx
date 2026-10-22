import type { Metadata } from "next";
import { PreviewProfile } from "./client";

export const metadata: Metadata = { title: "Profile · Preview" };
export default function Page() { return <PreviewProfile />; }
