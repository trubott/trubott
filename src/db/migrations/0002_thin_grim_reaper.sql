ALTER TABLE "cards" ADD COLUMN "flash_reveal_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "cards_flash_reveal_key_uniq" ON "cards" USING btree ("flash_reveal_key");