CREATE TABLE "card_otps" (
	"code" text PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"burn_after_read" boolean DEFAULT false NOT NULL,
	"viewed_count" integer DEFAULT 0 NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "claim_evals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" text NOT NULL,
	"claim_field" text NOT NULL,
	"claim_value" text NOT NULL,
	"label" text NOT NULL,
	"reason" text NOT NULL,
	"evidence_excerpt" text,
	"llm_model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connected_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"handle" text NOT NULL,
	"profile_url" text,
	"profile_pic_url" text,
	"bio" text,
	"full_name" text,
	"account_created_at" timestamp with time zone,
	"link_karma" integer,
	"comment_karma" integer,
	"has_verified_email" boolean,
	"is_premium" boolean,
	"top_subreddits" jsonb,
	"comment_count" integer,
	"submission_count" integer,
	"raw_json" jsonb,
	"ownership_verified_at" timestamp with time zone,
	"scraped_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consumed_messages" (
	"platform" text NOT NULL,
	"message_id" text NOT NULL,
	"consumed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consumed_messages_platform_message_id_pk" PRIMARY KEY("platform","message_id")
);
--> statement-breakpoint
CREATE TABLE "face_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"passed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"method" text NOT NULL,
	"ip_country" text
);
--> statement-breakpoint
CREATE TABLE "passive_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"fp_hash" text NOT NULL,
	"first_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"session_count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_sub" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"consumed_from_handle" text
);
--> statement-breakpoint
ALTER TABLE "card_otps" ADD CONSTRAINT "card_otps_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_evals" ADD CONSTRAINT "claim_evals_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connected_accounts" ADD CONSTRAINT "connected_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "face_checks" ADD CONSTRAINT "face_checks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passive_sessions" ADD CONSTRAINT "passive_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_otps_card_idx" ON "card_otps" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "card_otps_expires_idx" ON "card_otps" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "cards_user_idx" ON "cards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cards_expires_idx" ON "cards" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "claim_evals_card_idx" ON "claim_evals" USING btree ("card_id");--> statement-breakpoint
CREATE UNIQUE INDEX "connected_accounts_user_platform_handle_uniq" ON "connected_accounts" USING btree ("user_id","platform","handle");--> statement-breakpoint
CREATE INDEX "connected_accounts_user_idx" ON "connected_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "consumed_messages_consumed_idx" ON "consumed_messages" USING btree ("consumed_at");--> statement-breakpoint
CREATE INDEX "face_checks_user_idx" ON "face_checks" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "passive_sessions_user_fp_uniq" ON "passive_sessions" USING btree ("user_id","fp_hash");--> statement-breakpoint
CREATE INDEX "passive_sessions_user_idx" ON "passive_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_google_sub_uniq" ON "users" USING btree ("google_sub");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uniq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "verification_codes_code_idx" ON "verification_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "verification_codes_user_idx" ON "verification_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_codes_expires_idx" ON "verification_codes" USING btree ("expires_at");