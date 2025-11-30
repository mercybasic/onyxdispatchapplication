/*
  # Add Request Timer and Completion Time Tracking

  ## Changes
  1. Updates to `service_requests` table
    - Modify `completed_at` to track when request is completed/cancelled
    - Automatically set `completed_at` when status changes to completed or cancelled

  2. New Function
    - `calculate_completion_time` - Trigger function to automatically set completed_at
    - Trigger to update completed_at when status changes

  ## Purpose
  Enables tracking of how long requests take from creation to completion/cancellation
  for calculating average wait times.
*/

-- Create function to automatically set completed_at timestamp
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'cancelled') AND OLD.status NOT IN ('completed', 'cancelled') THEN
    NEW.completed_at = now();
  END IF;
  
  IF NEW.status NOT IN ('completed', 'cancelled') AND OLD.status IN ('completed', 'cancelled') THEN
    NEW.completed_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update completed_at
DROP TRIGGER IF EXISTS trigger_set_completed_at ON service_requests;
CREATE TRIGGER trigger_set_completed_at
  BEFORE UPDATE ON service_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_completed_at();
