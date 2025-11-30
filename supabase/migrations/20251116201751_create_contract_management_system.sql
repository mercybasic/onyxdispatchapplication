/*
  # Contract Management System

  1. New Tables
    - `contracts`
      - `id` (uuid, primary key)
      - `created_by` (uuid, foreign key to users)
      - `title` (text)
      - `description` (text)
      - `type` (text) - mining, trading, bounty_hunting, exploration, etc.
      - `status` (text) - planning, active, completed, cancelled
      - `target_payout` (numeric) - expected payout in UEC
      - `actual_payout` (numeric) - actual payout received
      - `location` (text) - where the contract takes place
      - `start_date` (timestamptz)
      - `end_date` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `contract_participants`
      - `id` (uuid, primary key)
      - `contract_id` (uuid, foreign key to contracts)
      - `user_id` (uuid, foreign key to users)
      - `role` (text) - leader, member, support
      - `joined_at` (timestamptz)
      - `share_percentage` (numeric) - their cut of the payout
    
    - `contract_contributions`
      - `id` (uuid, primary key)
      - `contract_id` (uuid, foreign key to contracts)
      - `user_id` (uuid, foreign key to users)
      - `contribution_type` (text) - supplies, materials, equipment, ship, time
      - `item_name` (text)
      - `quantity` (numeric)
      - `estimated_value` (numeric) - in UEC
      - `notes` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Authenticated users can view all contracts and contributions
    - Only contract creator can update/delete contracts
    - Participants can be added by contract creator or leaders
    - Users can add their own contributions
    - Users can update/delete their own contributions
*/

-- Create contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  type text NOT NULL CHECK (type IN ('mining', 'trading', 'bounty_hunting', 'exploration', 'cargo_hauling', 'salvage', 'medical', 'escort', 'other')),
  status text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
  target_payout numeric DEFAULT 0,
  actual_payout numeric DEFAULT 0,
  location text DEFAULT '',
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create contract participants table
CREATE TABLE IF NOT EXISTS contract_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member', 'support')),
  share_percentage numeric DEFAULT 0 CHECK (share_percentage >= 0 AND share_percentage <= 100),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(contract_id, user_id)
);

-- Create contract contributions table
CREATE TABLE IF NOT EXISTS contract_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  contribution_type text NOT NULL CHECK (contribution_type IN ('supplies', 'materials', 'equipment', 'ship', 'fuel', 'ammunition', 'medical_supplies', 'time', 'other')),
  item_name text NOT NULL,
  quantity numeric DEFAULT 1,
  estimated_value numeric DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_contributions ENABLE ROW LEVEL SECURITY;

-- Contracts policies
CREATE POLICY "Authenticated users can view all contracts"
  ON contracts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create contracts"
  ON contracts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
  );

CREATE POLICY "Contract creators can update their contracts"
  ON contracts
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Contract creators can delete their contracts"
  ON contracts
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Contract participants policies
CREATE POLICY "Authenticated users can view all participants"
  ON contract_participants
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Contract creators and leaders can add participants"
  ON contract_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_id
      AND contracts.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM contract_participants cp
      WHERE cp.contract_id = contract_id
      AND cp.user_id = auth.uid()
      AND cp.role = 'leader'
    )
  );

CREATE POLICY "Contract creators and leaders can update participants"
  ON contract_participants
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_id
      AND contracts.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM contract_participants cp
      WHERE cp.contract_id = contract_id
      AND cp.user_id = auth.uid()
      AND cp.role = 'leader'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_id
      AND contracts.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM contract_participants cp
      WHERE cp.contract_id = contract_id
      AND cp.user_id = auth.uid()
      AND cp.role = 'leader'
    )
  );

CREATE POLICY "Contract creators and leaders can remove participants"
  ON contract_participants
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_id
      AND contracts.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM contract_participants cp
      WHERE cp.contract_id = contract_id
      AND cp.user_id = auth.uid()
      AND cp.role = 'leader'
    )
  );

-- Contract contributions policies
CREATE POLICY "Authenticated users can view all contributions"
  ON contract_contributions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Contract participants can add contributions"
  ON contract_contributions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM contracts
        WHERE contracts.id = contract_id
        AND contracts.created_by = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM contract_participants
        WHERE contract_participants.contract_id = contract_id
        AND contract_participants.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own contributions"
  ON contract_contributions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own contributions"
  ON contract_contributions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contracts_created_by ON contracts(created_by);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contract_participants_contract_id ON contract_participants(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_participants_user_id ON contract_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_contract_contributions_contract_id ON contract_contributions(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_contributions_user_id ON contract_contributions(user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE contracts;
ALTER PUBLICATION supabase_realtime ADD TABLE contract_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE contract_contributions;
