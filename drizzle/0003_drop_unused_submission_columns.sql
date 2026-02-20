-- Drop unused columns from the submissions table.
-- workflow_step: superseded by committee_status
-- assigned_coordinator/proofreader/lead_design/editor_in_chief: never used, committee routes via user_roles
-- current_version, version_history, original_files: version control never implemented

ALTER TABLE submissions DROP COLUMN IF EXISTS workflow_step;
ALTER TABLE submissions DROP COLUMN IF EXISTS assigned_coordinator;
ALTER TABLE submissions DROP COLUMN IF EXISTS assigned_proofreader;
ALTER TABLE submissions DROP COLUMN IF EXISTS assigned_lead_design;
ALTER TABLE submissions DROP COLUMN IF EXISTS assigned_editor_in_chief;
ALTER TABLE submissions DROP COLUMN IF EXISTS current_version;
ALTER TABLE submissions DROP COLUMN IF EXISTS version_history;
ALTER TABLE submissions DROP COLUMN IF EXISTS original_files;
