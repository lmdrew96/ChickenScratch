-- Self-service group meeting check-ins (QR code attendance flow).
-- Members scan a static QR code in the meeting room → /attend → check in.
-- Distinct from meeting_attendance (which is officer meetings tied to
-- meeting_proposals). Group meetings have no meeting entity — Article VIII
-- voting-rights logic only cares about monthly check-in counts, so a
-- per-(member, date) record is the right granularity.
--
-- recorded_by semantics:
--   NULL  → member self-checked-in via QR
--   uuid  → officer recorded a manual override

CREATE TABLE IF NOT EXISTS group_meeting_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meeting_date timestamptz NOT NULL,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES profiles(id),
  notes text,
  UNIQUE (member_id, meeting_date)
);

CREATE INDEX IF NOT EXISTS group_checkins_member_id_idx ON group_meeting_checkins(member_id);
CREATE INDEX IF NOT EXISTS group_checkins_meeting_date_idx ON group_meeting_checkins(meeting_date);
