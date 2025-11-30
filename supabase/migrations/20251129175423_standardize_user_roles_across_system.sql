/*
  # Standardize User Roles Across System

  ## Overview
  This migration standardizes role naming across the entire application to fix
  inconsistencies between database policies and frontend code.

  ## Role Standardization
  The system will use these standardized roles:
  - `ceo` - Chief Executive Officer (highest access)
  - `dispatcher` - Dispatch coordinators
  - `administrator` - Ship/crew administrators
  - `crew` - Standard crew members (default)

  ## Changes
  1. Update any references to 'staff' to use 'crew' instead
  2. Update any references to 'admin' to use 'administrator' instead
  3. Ensure all RLS policies use these standardized role names
  4. Add check constraint to enforce valid role values

  ## Important Notes
  - Frontend code must also be updated to match these role names
  - 'crew' is the default role for new users
  - Role checks should always use exact matches
*/

-- Add check constraint to enforce valid roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users 
    ADD CONSTRAINT users_role_check 
    CHECK (role IN ('ceo', 'dispatcher', 'administrator', 'crew'));
  END IF;
END $$;

-- Update any 'staff' roles to 'crew'
UPDATE users SET role = 'crew' WHERE role = 'staff';

-- Update any 'admin' roles to 'administrator'
UPDATE users SET role = 'administrator' WHERE role = 'admin';

-- Update default role for users table
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'crew';

-- Add comment for clarity
COMMENT ON COLUMN users.role IS 'User role: ceo, dispatcher, administrator, or crew (default)';
