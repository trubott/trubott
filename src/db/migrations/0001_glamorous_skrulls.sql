CREATE TABLE "used_flash_payments" (
	"stripe_session_id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"card_id" text NOT NULL,
	"used_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "used_flash_payments" ADD CONSTRAINT "used_flash_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "used_flash_payments" ADD CONSTRAINT "used_flash_payments_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "used_flash_payments_user_idx" ON "used_flash_payments" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "used_flash_payments_card_uniq" ON "used_flash_payments" USING btree ("card_id");