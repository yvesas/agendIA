CREATE TYPE "public"."appointment_status" AS ENUM('SCHEDULED', 'CANCELLED', 'DONE');--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"exam_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" "appointment_status" DEFAULT 'SCHEDULED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"preparation" text,
	"duration_min" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_user_scheduled_unique" ON "appointments" USING btree ("user_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "appointments_scheduled_at_idx" ON "appointments" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "appointments_user_id_idx" ON "appointments" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exams_slug_unique" ON "exams" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "exams_name_idx" ON "exams" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");