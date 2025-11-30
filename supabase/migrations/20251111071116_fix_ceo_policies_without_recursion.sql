/*
  # Fix CEO Policies Without Recursion

  ## Problem
  Previous attempt still causes recursion. The function queries users table which requires
  passing RLS policies.

  ## Solution
  Instead of using a function, we'll:
  1. Drop the recursive function and policies
  2. Use a simpler approach: make certain fields in users table updatable by service role only
  3. For now, CEO will need to use the verify-discord-roles function which uses service role
  
  ## Changes
  - Drop the recursive function and policies
  - Keep the basic user policies
  - Role changes should happen through the Discord verification edge function
*/

-- Drop the recursive function and policies
DROP POLICY IF EXISTS "CEO can view all users" ON users;
DROP POLICY IF EXISTS "CEO can update all users" ON users;
DROP FUNCTION IF EXISTS is_ceo();

-- The solution: CEO should use the Discord verification function for role management
-- That function uses the service role key which bypasses RLS
-- For manual role changes, we need a different approach