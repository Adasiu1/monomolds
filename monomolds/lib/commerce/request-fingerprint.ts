import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

export async function requestFingerprint() {
  const values = await headers();
  const forwarded = values.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ?? "unknown";
  return createHash("sha256").update(`${forwarded}|${values.get("user-agent") ?? "unknown"}`).digest("hex");
}

