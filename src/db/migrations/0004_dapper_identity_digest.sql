ALTER TABLE "connected_accounts" ADD COLUMN "about_text" text;--> statement-breakpoint
ALTER TABLE "connected_accounts" ADD COLUMN "headline" text;--> statement-breakpoint
ALTER TABLE "connected_accounts" ADD COLUMN "location_text" text;--> statement-breakpoint
ALTER TABLE "connected_accounts" ADD COLUMN "location_city" text;--> statement-breakpoint
ALTER TABLE "connected_accounts" ADD COLUMN "location_state" text;--> statement-breakpoint
ALTER TABLE "connected_accounts" ADD COLUMN "location_country" text;--> statement-breakpoint
ALTER TABLE "connected_accounts" ADD COLUMN "followers_count" integer;--> statement-breakpoint
ALTER TABLE "connected_accounts" ADD COLUMN "connections_count" integer;--> statement-breakpoint
ALTER TABLE "connected_accounts" ADD COLUMN "account_age_days" integer;--> statement-breakpoint
ALTER TABLE "connected_accounts" ADD COLUMN "current_title" text;--> statement-breakpoint
ALTER TABLE "connected_accounts" ADD COLUMN "first_work_year" integer;--> statement-breakpoint
ALTER TABLE "connected_accounts" ADD COLUMN "past_roles" jsonb;--> statement-breakpoint

ALTER TABLE "face_checks" ADD COLUMN "age_min" integer;--> statement-breakpoint
ALTER TABLE "face_checks" ADD COLUMN "age_max" integer;--> statement-breakpoint
ALTER TABLE "face_checks" ADD COLUMN "gender_estimate" text;
