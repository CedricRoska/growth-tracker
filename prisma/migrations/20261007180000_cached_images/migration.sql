-- Les URL d'images TikTok / Instagram sont signées et expirent (~24 h) : on stocke une miniature
-- compressée (data URL) dans avatarUrl / thumbnailUrl, et le chemin source pour ne pas re-télécharger.
ALTER TABLE "Account" ADD COLUMN "avatarSource" TEXT;
ALTER TABLE "Post" ADD COLUMN "thumbnailSource" TEXT;
