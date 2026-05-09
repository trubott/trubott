ALTER TABLE "verification_codes" ADD COLUMN "pending_handle" text;--> statement-breakpoint
ALTER TABLE "verification_codes" ADD COLUMN "listen_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "verification_codes" ADD COLUMN "listen_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "verification_codes" ADD COLUMN "last_bio_scrape_at" timestamp with time zone;