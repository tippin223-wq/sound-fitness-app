"use client";

import { useEffect, type CSSProperties } from "react";

const RELOAD_ONCE_KEY = "sf-chunk-reload-once";

const CHUNK_ERROR_MESSAGE_RE =
  /Loading chunk .+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

function isChunkLoadError(error: Error): boolean {
  return (
    error.name === "ChunkLoadError" ||
    CHUNK_ERROR_MESSAGE_RE.test(error.message)
  );
}

// global-error replaces the root layout, so none of the app's stylesheets
// are loaded here — everything must be inline.
const styles: Record<string, CSSProperties> = {
  body: {
    margin: 0,
    background: "#020713",
  },
  panel: {
    minHeight: "100dvh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "32px 24px",
    background: "#020713",
    color: "#e2e8f0",
    textAlign: "center",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
  heading: {
    margin: 0,
    fontSize: "1.5rem",
    fontWeight: 600,
    color: "#22d3ee",
    letterSpacing: "0.01em",
  },
  message: {
    margin: 0,
    maxWidth: "26rem",
    fontSize: "0.95rem",
    lineHeight: 1.6,
    color: "#94a3b8",
  },
  buttonRow: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "12px",
    marginTop: "16px",
  },
  primaryButton: {
    appearance: "none",
    cursor: "pointer",
    borderRadius: "9999px",
    border: "1px solid #22d3ee",
    background: "rgba(34, 211, 238, 0.12)",
    color: "#22d3ee",
    padding: "10px 22px",
    fontSize: "0.9rem",
    fontWeight: 600,
    fontFamily: "inherit",
  },
  secondaryButton: {
    appearance: "none",
    cursor: "pointer",
    borderRadius: "9999px",
    border: "1px solid rgba(148, 163, 184, 0.4)",
    background: "transparent",
    color: "#e2e8f0",
    padding: "10px 22px",
    fontSize: "0.9rem",
    fontWeight: 600,
    fontFamily: "inherit",
  },
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);

    try {
      if (isChunkLoadError(error)) {
        // A deferred chunk 404'd — most likely a tab left open across a
        // deploy. One automatic reload picks up the fresh assets; the
        // sessionStorage guard stops a persistent failure from looping.
        if (!window.sessionStorage.getItem(RELOAD_ONCE_KEY)) {
          window.sessionStorage.setItem(RELOAD_ONCE_KEY, "1");
          window.location.reload();
        }
      } else {
        // Not a chunk failure: re-arm the one-shot guard for next time.
        window.sessionStorage.removeItem(RELOAD_ONCE_KEY);
      }
    } catch {
      // sessionStorage unavailable (privacy mode) — skip auto-reload.
    }
  }, [error]);

  return (
    // global-error must include its own html and body tags: it replaces the
    // root layout entirely when active.
    <html lang="en">
      <body style={styles.body}>
        <div style={styles.panel}>
          <h2 style={styles.heading}>Something hiccuped</h2>
          <p style={styles.message}>
            Your training data is safe &mdash; this screen just crashed.
          </p>
          <div style={styles.buttonRow}>
            <button
              type="button"
              style={styles.primaryButton}
              onClick={() => window.location.reload()}
            >
              Reload dashboard
            </button>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => reset()}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
