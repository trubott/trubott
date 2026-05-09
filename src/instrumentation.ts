/**
 * Next.js instrumentation hook. Runs once when the server boots.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if (process.env.NODE_ENV === "production") {
    // In production, we MUST use literal strings in import() so the bundler
    // correctly includes these files in the build.
    if (process.env.RUN_MIGRATIONS_ON_START !== "0") {
      try {
        const { runMigrations } = await import("./server/db/migrate");
        await runMigrations();
      } catch (err) {
        console.error("[instrumentation] migration failed:", err);
        process.exit(1);
      }
    }

    try {
      const { startExpiryWorker } = await import("./server/workers/expiry");
      startExpiryWorker();
      
      const { startRedditPoller } = await import("./server/reddit/poller");
      startRedditPoller();
    } catch (err) {
      console.warn("[instrumentation] background workers failed to start:", err);
    }
  } else {
    // Background workers disabled in dev to prevent process hangs/Bad Gateway issues
    /*
    const shield = (p: string) => import(p);
    try {
      const { startExpiryWorker } = await shield("./server/workers/expiry");
      startExpiryWorker();
    } catch (err) {
      console.warn("[instrumentation][dev] worker failed:", err);
    }
    */
  }
}
