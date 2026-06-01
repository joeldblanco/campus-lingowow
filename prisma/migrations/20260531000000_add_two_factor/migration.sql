-- Add two-factor authentication (TOTP) fields to "User".
-- Purely additive. Uses IF NOT EXISTS so it is idempotent and safe to (re)apply
-- on a database whose migration history has drifted.
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT;
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "twoFactorRecoveryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];
