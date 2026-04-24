ALTER TABLE "refresh_tokens" ADD COLUMN "ip" varchar(45);--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD COLUMN "user_agent" varchar(512);--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD COLUMN "last_used_at" timestamp with time zone;