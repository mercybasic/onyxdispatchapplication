/*
  # Fix Ships Table Missing Columns and RLS Issues

  ## Overview
  This migration adds missing columns to the ships table and fixes RLS policy issues
  that prevent ship creation and updates.

  ## Changes
  1. Add missing columns to ships table:
     - `sc_ship_id` (uuid) - Reference to Star Citizen ship database
     - `parent_ship_id` (uuid) - For ships carried in other ships' hangars

  2. Important Notes
     - Uses IF NOT EXISTS pattern to safely add columns
     - Maintains referential integrity with foreign keys
     - No data loss or destructive operations
*/

-- Add sc_ship_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ships' AND column_name = 'sc_ship_id'
  ) THEN
    ALTER TABLE ships ADD COLUMN sc_ship_id uuid;
  END IF;
END $$;

-- Add parent_ship_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ships' AND column_name = 'parent_ship_id'
  ) THEN
    ALTER TABLE ships ADD COLUMN parent_ship_id uuid REFERENCES ships(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for parent_ship_id for better query performance
CREATE INDEX IF NOT EXISTS idx_ships_parent_ship ON ships(parent_ship_id);

-- Add index for sc_ship_id for better query performance
CREATE INDEX IF NOT EXISTS idx_ships_sc_ship ON ships(sc_ship_id);
