export class CheckoutOriginError extends Error {
  constructor(message: string, public status: 400 | 403 | 503) { super(message); }
}
type CheckoutEnvironment = { APP_URL?: string; NEXT_PUBLIC_APP_URL?: string; NODE_ENV?: string };
const loopback = (url: URL) => ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
function originUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new CheckoutOriginError("Checkout address is not configured correctly.", 503); }
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash || !["http:", "https:"].includes(url.protocol))
    throw new CheckoutOriginError("Checkout address is not configured correctly.", 503);
  return url;
}

/** Return destinations come from server configuration, never a caller-supplied Origin. */
export function checkoutOrigin(request: Request, environment: CheckoutEnvironment = process.env): string {
  const configured = environment.APP_URL || environment.NEXT_PUBLIC_APP_URL;
  let url: URL;
  if (configured) url = originUrl(configured);
  else {
    if (environment.NODE_ENV === "production") throw new CheckoutOriginError("Checkout address is not configured yet.", 503);
    const local = new URL(request.url);
    if (!loopback(local)) throw new CheckoutOriginError("Checkout address is not configured yet.", 503);
    url = originUrl(local.origin);
  }
  if (url.protocol !== "https:" && !(environment.NODE_ENV !== "production" && loopback(url)))
    throw new CheckoutOriginError("Checkout requires a secure configured address.", 503);
  if (environment.NODE_ENV === "production" && loopback(url)) throw new CheckoutOriginError("Checkout address is not configured correctly.", 503);
  const caller = request.headers.get("origin");
  if (caller !== null) {
    let callerUrl: URL;
    try { callerUrl = originUrl(caller); } catch { throw new CheckoutOriginError("Checkout request origin is invalid.", 403); }
    if (callerUrl.origin !== url.origin) throw new CheckoutOriginError("Start checkout from the Sound Fitness app.", 403);
  }
  return url.origin;
}
