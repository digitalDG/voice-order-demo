import { NextResponse } from "next/server";

export async function GET() {
  // In development, return the API key directly to avoid temp key rate limits
  if (process.env.NODE_ENV === "development") {
    return NextResponse.json({ key: process.env.DEEPGRAM_API_KEY });
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
        time_to_live_in_seconds: 60,
      }),
    }
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to create token" }, { status: 500 });
  }

  const { key } = await response.json();
  return NextResponse.json({ key });
}
