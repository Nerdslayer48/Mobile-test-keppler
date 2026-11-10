CREATE TYPE "public"."identity_kind" AS ENUM('owner', 'staff');--> statement-breakpoint
CREATE TABLE "boards" (
	"companyId" text NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "boards_companyId_key_pk" PRIMARY KEY("companyId","key")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"companyName" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "datasets" (
	"companyId" text NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "datasets_companyId_key_pk" PRIMARY KEY("companyId","key")
);
--> statement-breakpoint
CREATE TABLE "identities" (
	"id" text PRIMARY KEY NOT NULL,
	"companyId" text NOT NULL,
	"kind" "identity_kind" NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"passwordHash" text,
	"tokenHash" text,
	"tokenCipher" text,
	"role" text DEFAULT '' NOT NULL,
	"profilePicture" text DEFAULT '' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identities_email_unique" UNIQUE("email"),
	CONSTRAINT "identities_tokenHash_unique" UNIQUE("tokenHash"),
	CONSTRAINT "identities_company_id" UNIQUE("companyId","id"),
	CONSTRAINT "identities_normalized_email" CHECK ("identities"."email" = lower(trim("identities"."email"))),
	CONSTRAINT "identities_credentials" CHECK (("identities"."kind" = 'owner' AND "identities"."passwordHash" IS NOT NULL AND "identities"."tokenHash" IS NULL AND "identities"."tokenCipher" IS NULL) OR ("identities"."kind" = 'staff' AND "identities"."passwordHash" IS NULL AND "identities"."tokenHash" IS NOT NULL AND "identities"."tokenCipher" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"companyId" text NOT NULL,
	"digest" text NOT NULL,
	"mimeType" text NOT NULL,
	"content" "bytea" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"tokenHash" text PRIMARY KEY NOT NULL,
	"companyId" text NOT NULL,
	"identityId" text NOT NULL,
	"authenticatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_companyId_companies_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_companyId_companies_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_companyId_companies_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_companyId_companies_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_companyId_companies_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_companyId_identityId_identities_companyId_id_fk" FOREIGN KEY ("companyId","identityId") REFERENCES "public"."identities"("companyId","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "identities_one_owner_per_company" ON "identities" USING btree ("companyId") WHERE "identities"."kind" = 'owner';--> statement-breakpoint
CREATE UNIQUE INDEX "media_company_digest" ON "media" USING btree ("companyId","digest");--> statement-breakpoint
CREATE INDEX "sessions_company" ON "sessions" USING btree ("companyId");--> statement-breakpoint
CREATE INDEX "sessions_expiry" ON "sessions" USING btree ("expiresAt");