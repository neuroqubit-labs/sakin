-- Auth: Firebase → Custom JWT migration
-- - firebaseUid nullable yapıldı (mevcut kullanıcılar korunur, yeni kullanıcılarda gerekmez)
-- - passwordHash eklendi (bcrypt)
-- - email unique oldu (login için)

ALTER TABLE "users" ALTER COLUMN "firebaseUid" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT;
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
