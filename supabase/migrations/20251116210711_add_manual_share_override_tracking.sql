/*
  # Add Manual Share Override Tracking

  1. Changes
    - Add `manual_share_override` boolean column to `contract_participants` table
    - This tracks whether the organizer has manually set a custom share percentage
    - Defaults to false (automatic calculation)
    - When true, the share percentage won't be recalculated automatically

  2. Purpose
    - Allows organizers to manually adjust payout splits per participant
    - Enables automatic equal distribution when not manually overridden
    - Supports both automatic and manual payout management workflows
*/

-- Add manual_share_override column to contract_participants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contract_participants' AND column_name = 'manual_share_override'
  ) THEN
    ALTER TABLE contract_participants 
    ADD COLUMN manual_share_override boolean DEFAULT false NOT NULL;
  END IF;
END $$;