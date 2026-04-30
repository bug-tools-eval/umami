DROP INDEX IF EXISTS "website_event_website_id_visit_id_created_at_idx";

CREATE INDEX "website_event_website_id_visit_id_created_at_idx"
ON "website_event"("website_id", "visit_id", "created_at")
INCLUDE ("event_type", "event_name", "url_path");
