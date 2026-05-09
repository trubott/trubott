"use client";

import { useEffect, useRef } from "react";

import { browserVisitorId } from "@/lib/browser-id";

const SESSION_KEY = "trustcard.passive.fired";

/**
 * Mounts on the dashboard and fires a single heartbeat per browser session.
 *
 * The heartbeat sends a hand-rolled, MIT-clean browser visitor id; the
 * server peppered-hashes it before persistence and the raw value never
 * appears in any database column. The visitor id is intentionally weak --
 * see `lib/browser-id.ts` for the rationale.
 */
export function PassiveBeacon() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // private mode / blocked storage: still fire once per page load
    }

    (async () => {
      try {
        const visitorId = await browserVisitorId();
        await fetch("/api/passive-signal/heartbeat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ v: visitorId }),
        });
      } catch {
        // Heartbeat failures are intentionally silent: a missed beacon just
        // means this session doesn't count toward the consistency threshold.
      }
    })();
  }, []);

  return null;
}
