-- Secretary inline attendance (toolkit overhaul §11).
-- Persists per-member attendance for each meeting so the "voting rights
-- at risk" rule (Article VIII: 3 misses in a rolling calendar month) can
-- be computed.

CREATE TABLE IF NOT EXISTS meeting_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meeting_proposals(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL, -- 'present' | 'absent' | 'excused'
  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES profiles(id),
  UNIQUE (meeting_id, member_id)
);

CREATE INDEX IF NOT EXISTS meeting_attendance_meeting_id_idx ON meeting_attendance(meeting_id);
CREATE INDEX IF NOT EXISTS meeting_attendance_member_id_idx ON meeting_attendance(member_id);
