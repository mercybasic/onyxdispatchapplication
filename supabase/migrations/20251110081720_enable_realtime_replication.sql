/*
  # Enable Real-time Replication
  
  1. Changes
    - Enable real-time replication for service_requests table
    - Enable real-time replication for crew_status table
    - Enable real-time replication for request_messages table
  
  2. Notes
    - This allows Supabase to broadcast changes to subscribed clients in real-time
    - Essential for the dashboard and client tracker to update automatically
*/

-- Enable realtime for service_requests
ALTER PUBLICATION supabase_realtime ADD TABLE service_requests;

-- Enable realtime for crew_status
ALTER PUBLICATION supabase_realtime ADD TABLE crew_status;

-- Enable realtime for request_messages
ALTER PUBLICATION supabase_realtime ADD TABLE request_messages;