import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const websiteEndpoint = "https://www.thesoundfitness.com/api/client-hub/call";
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store", Vary: "Authorization" } });
async function forward(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return reply({ error: "Same-origin request required." }, 403);
  const authorization = request.headers.get("authorization");
  if (!authorization || !/^Bearer [A-Za-z0-9._-]+$/.test(authorization) || authorization.length > 8192) return reply({ error: "Sign in to join your session." }, 401);
  if (request.headers.get("content-type")?.split(";", 1)[0].trim() !== "application/json") return reply({ error: "JSON required." }, 415);
  try {
    const text = await request.text();
    if (text.length > 1024) return reply({ error: "Invalid session request." }, 400);
    let body;
    try { body = JSON.parse(text); } catch { return reply({ error: "Invalid session request." }, 400); }
    if (!body || typeof body !== "object" || Object.keys(body).length !== 1 || typeof body.sessionId !== "string" || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(body.sessionId)) return reply({ error: "Choose a booked session." }, 400);
    // The website verifies the bearer, booking ownership, service and join window,
    // and issues access to its existing Daily room. No app-side Daily key or rooms.
    const response = await fetch(websiteEndpoint, { method: request.method, headers: { Authorization: authorization, "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: body.sessionId }), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20000) });
    const result = await response.json();
    if (!response.ok) return reply({ error: typeof result.error === "string" ? result.error : "The website video service is unavailable." }, response.status >= 400 && response.status <= 599 ? response.status : 502);
    if (request.method === "PATCH") return result.notified === true ? reply({ notified: true }) : reply({ error: "Arrival could not be confirmed." }, 502);
    const room = new URL(result.url);
    if (room.protocol !== "https:" || !room.hostname.endsWith(".daily.co") || room.username || room.password || typeof result.token !== "string" || !result.token) throw Error("Invalid room response");
    return reply({ url: room.href, token: result.token });
  } catch { return reply({ error: "The video service could not be reached. Please try again." }, 502); }
}
export const POST = forward;
export const PATCH = forward;
