import { NextResponse } from "next/server";

// In development, return the API key directly to avoid temp key rate limits
if (process.env.NODE_ENV === "development") {
  // no-op — handled in GET below
}

let cachedKey: string | null = null;
let cacheExpiresAt = 0;
const TTL_SECONDS = 240; // refresh 1 min before Deepgram's 300s expiry

export async function GET() {
  if (process.env.NODE_ENV === "development") {
    return NextResponse.json({ key: process.env.DEEPGRAM_API_KEY });
  }

  const now = Date.now();
  if (cachedKey && now < cacheExpiresAt) {
    return NextResponse.json({ key: cachedKey });
  }

  const response = await fetch(
    `https://api.deepgram.com/v1/projects/${process.env.DEEPGRAM_PROJECT_ID}/keys`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        comment: "temp",
        scopes: ["usage:write"],
        time_to_live_in_seconds: 300,
      }),
    }
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to create token" }, { status: 500 });
  }

  const { key } = await response.json();
  cachedKey = key;
  cacheExpiresAt = now + TTL_SECONDS * 1000;

  return NextResponse.json({ key });
}
