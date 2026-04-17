-- Remove the Lead Design committee step.
-- Visual submissions now go coordinator_approved -> editor_approved directly.
-- Any rows currently at 'lead_design_committed' drop back into the EiC final-decision
-- queue, which already accepts coordinator_approved + visual.

UPDATE submissions
SET committee_status = 'coordinator_approved'
WHERE committee_status = 'lead_design_committed';

ALTER TABLE submissions DROP COLUMN IF EXISTS lead_design_commit_link;
ALTER TABLE submissions DROP COLUMN IF EXISTS lead_design_committed_at;
