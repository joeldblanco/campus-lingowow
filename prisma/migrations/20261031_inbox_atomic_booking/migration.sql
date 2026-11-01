BEGIN;
-- Fixed UTC rollout boundary includes the previous day for midnight-crossing blocks.
-- Historical rows before the boundary remain untouched; re-run preflight immediately before rollout.
-- Preserve existing20minute trial semantics; normal scheduling blocks remain60minutes.
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE FUNCTION inbox_booking_span(day text, slot text, trial boolean DEFAULT false) RETURNS tsrange
LANGUAGE plpgsql IMMUTABLE STRICT AS $$
DECLARE begin_at timestamp; end_at timestamp;
BEGIN
 IF day !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$' OR slot !~ '^([01][0-9]|2[0-3]):[0-5][0-9]-([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
  RAISE EXCEPTION 'booking_interval_invalid';
 END IF;
 begin_at := make_timestamp(substring(day,1,4)::int,substring(day,6,2)::int,substring(day,9,2)::int,substring(slot,1,2)::int,substring(slot,4,2)::int,0);
 end_at := date_trunc('day',begin_at)+make_interval(hours=>substring(slot,7,2)::int,mins=>substring(slot,10,2)::int);
 IF end_at<=begin_at THEN end_at:=end_at+interval '1 day'; END IF;
 RETURN tsrange(begin_at,greatest(end_at,begin_at+make_interval(mins=>CASE WHEN trial THEN 20 ELSE 60 END)),'[)');
END $$;
ALTER TABLE class_bookings ADD CONSTRAINT inbox_teacher_no_overlap EXCLUDE USING gist
 ("teacherId" WITH =,inbox_booking_span(day,"timeSlot","isTrial") WITH &&) WHERE (status <> 'CANCELLED' AND day >= '2026-10-31');
ALTER TABLE class_bookings ADD CONSTRAINT inbox_student_no_overlap EXCLUDE USING gist
 ("studentId" WITH =,inbox_booking_span(day,"timeSlot","isTrial") WITH &&) WHERE (status <> 'CANCELLED' AND day >= '2026-10-31');
CREATE TABLE inbox_booking_requests (
 request_id text PRIMARY KEY,
 fingerprint text NOT NULL,
 booking_id text REFERENCES class_bookings(id) ON DELETE SET NULL,
 operator_id text NOT NULL,
 identity_reference text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
