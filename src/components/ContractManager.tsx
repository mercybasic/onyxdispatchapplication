import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Plus, Users, Package, X, Edit2, Trash2, CheckCircle, Clock, XCircle as XCircleIcon, ChevronDown, ChevronUp } from 'lucide-react';

interface Contract {
  id: string;
  created_by: string;
  title: string;
  description: string;
  type: string;
  status: string;
  target_payout: number;
  actual_payout: number;
  location: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  users: {
    discord_username: string;
  };
}

interface Participant {
  id: string;
  contract_id: string;
  user_id: string;
  role: string;
  share_percentage: number;
  manual_share_override: boolean;
  joined_at: string;
  users: {
    discord_username: string;
  };
}

interface Contribution {
  id: string;
  contract_id: string;
  user_id: string;
  contribution_type: string;
  item_name: string;
  quantity: number;
  estimated_value: number;
  notes: string;
  created_at: string;
  users: {
    discord_username: string;
  };
}

export function ContractManager() {
  const { profile } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [participants, setParticipants] = useState<{ [key: string]: Participant[] }>({});
  const [contributions, setContributions] = useState<{ [key: string]: Contribution[] }>({});
  const [expandedContract, setExpandedContract] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<{ id: string; discord_username: string }[]>([]);
  const [editingPayout, setEditingPayout] = useState<string | null>(null);
  const [newTargetPayout, setNewTargetPayout] = useState<string>('');
  const [editingShare, setEditingShare] = useState<string | null>(null);
  const [newSharePercentage, setNewSharePercentage] = useState<string>('');

  const [contractForm, setContractForm] = useState({
    title: '',
    description: '',
    type: 'mining',
    status: 'planning',
    target_payout: '',
    location: '',
    start_date: '',
    end_date: '',
  });

  const [participantForm, setParticipantForm] = useState({
    user_id: '',
    role: 'member',
    share_percentage: 0,
  });

  const [contributionForm, setContributionForm] = useState({
    contribution_type: 'supplies',
    item_name: '',
    quantity: 1,
    estimated_value: 0,
    notes: '',
  });

  useEffect(() => {
    loadContracts();
    loadUsers();

    const contractsChannel = supabase
      .channel('contracts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contracts' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            loadContracts();
          } else if (payload.eventType === 'UPDATE') {
            setContracts(prev => prev.map(c =>
              c.id === payload.new.id
                ? { ...c, ...payload.new }
                : c
            ));
          } else if (payload.eventType === 'DELETE') {
            setContracts(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    const participantsChannel = supabase
      .channel('participants-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contract_participants' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            loadParticipants(payload.new.contract_id);
          } else if (payload.eventType === 'DELETE') {
            loadParticipants(payload.old.contract_id);
          }
        }
      )
      .subscribe();

    const contributionsChannel = supabase
      .channel('contributions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contract_contributions' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            loadContributions(payload.new.contract_id);
          } else if (payload.eventType === 'DELETE') {
            loadContributions(payload.old.contract_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(contractsChannel);
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(contributionsChannel);
    };
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, discord_username')
        .eq('verified', true)
        .order('discord_username');

      if (error) throw error;
      setAllUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const loadContracts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contracts')
        .select('*, users(discord_username)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);

      for (const contract of data || []) {
        await loadParticipants(contract.id);
        await loadContributions(contract.id);
      }
    } catch (err) {
      console.error('Error loading contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async (contractId: string) => {
    try {
      const { data, error } = await supabase
        .from('contract_participants')
        .select('*, users(discord_username)')
        .eq('contract_id', contractId)
        .order('joined_at');

      if (error) throw error;
      setParticipants(prev => ({ ...prev, [contractId]: data || [] }));
    } catch (err) {
      console.error('Error loading participants:', err);
    }
  };

  const loadContributions = async (contractId: string) => {
    try {
      const { data, error } = await supabase
        .from('contract_contributions')
        .select('*, users(discord_username)')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContributions(prev => ({ ...prev, [contractId]: data || [] }));
    } catch (err) {
      console.error('Error loading contributions:', err);
    }
  };

  const createContract = async () => {
    try {
      const contractData: any = {
        title: contractForm.title,
        description: contractForm.description,
        type: contractForm.type,
        status: contractForm.status,
        target_payout: contractForm.target_payout ? Number(contractForm.target_payout) : 0,
        location: contractForm.location,
        created_by: profile?.id,
      };

      if (contractForm.start_date) {
        contractData.start_date = contractForm.start_date;
      }
      if (contractForm.end_date) {
        contractData.end_date = contractForm.end_date;
      }

      const { data, error } = await supabase
        .from('contracts')
        .insert([contractData])
        .select('*, users(discord_username)')
        .single();

      if (error) throw error;

      await supabase
        .from('contract_participants')
        .insert([{
          contract_id: data.id,
          user_id: profile?.id,
          role: 'leader',
          share_percentage: 100,
        }]);

      setContracts([data, ...contracts]);
      setShowCreateModal(false);
      setContractForm({
        title: '',
        description: '',
        type: 'mining',
        status: 'planning',
        target_payout: '',
        location: '',
        start_date: '',
        end_date: '',
      });
      await loadParticipants(data.id);

      try {
        const siteUrl = window.location.origin;
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-discord`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contract_title: data.title,
            contract_type: data.type,
            created_by: data.users.discord_username,
            location: data.location,
            target_payout: data.target_payout,
            description: data.description,
            site_url: siteUrl,
          }),
        });
      } catch (notifyError) {
        console.error('Failed to send Discord notification:', notifyError);
      }
    } catch (err) {
      console.error('Error creating contract:', err);
      alert('Failed to create contract');
    }
  };

  const addParticipant = async () => {
    if (!selectedContract || !participantForm.user_id) return;

    try {
      const { error } = await supabase
        .from('contract_participants')
        .insert([{
          contract_id: selectedContract,
          ...participantForm,
        }]);

      if (error) throw error;

      await loadParticipants(selectedContract);

      const contract = contracts.find(c => c.id === selectedContract);
      const addedUser = allUsers.find(u => u.id === participantForm.user_id);

      if (contract && addedUser) {
        try {
          const siteUrl = window.location.origin;
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-discord`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contract_title: contract.title,
              participant_name: addedUser.discord_username,
              participant_role: participantForm.role,
              action: 'added',
              added_by: profile?.discord_username,
              site_url: siteUrl,
            }),
          });
        } catch (notifyError) {
          console.error('Failed to send Discord notification:', notifyError);
        }
      }

      setShowParticipantModal(false);
      setParticipantForm({
        user_id: '',
        role: 'member',
        share_percentage: 0,
      });

      await recalculateShares(selectedContract);
    } catch (err) {
      console.error('Error adding participant:', err);
      alert('Failed to add participant');
    }
  };

  const removeParticipant = async (participantId: string, contractId: string) => {
    if (!confirm('Are you sure you want to remove this participant?')) return;

    try {
      const { error } = await supabase
        .from('contract_participants')
        .delete()
        .eq('id', participantId);

      if (error) throw error;

      await loadParticipants(contractId);
      await recalculateShares(contractId);
    } catch (err) {
      console.error('Error removing participant:', err);
      alert('Failed to remove participant');
    }
  };

  const addContribution = async () => {
    if (!selectedContract) return;

    try {
      const { error } = await supabase
        .from('contract_contributions')
        .insert([{
          contract_id: selectedContract,
          user_id: profile?.id,
          ...contributionForm,
        }]);

      if (error) throw error;

      await loadContributions(selectedContract);
      setShowContributionModal(false);
      setContributionForm({
        contribution_type: 'supplies',
        item_name: '',
        quantity: 1,
        estimated_value: 0,
        notes: '',
      });
    } catch (err) {
      console.error('Error adding contribution:', err);
      alert('Failed to add contribution');
    }
  };

  const deleteContract = async (contractId: string) => {
    if (!confirm('Are you sure you want to delete this contract?')) return;

    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractId);

      if (error) throw error;

      setContracts(contracts.filter(c => c.id !== contractId));
    } catch (err) {
      console.error('Error deleting contract:', err);
      alert('Failed to delete contract');
    }
  };

  const updateContractStatus = async (contractId: string, newStatus: string) => {
    try {
      const contract = contracts.find(c => c.id === contractId);
      const oldStatus = contract?.status || 'unknown';

      const { error } = await supabase
        .from('contracts')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', contractId);

      if (error) throw error;

      setContracts(contracts.map(c => c.id === contractId ? { ...c, status: newStatus } : c));

      if (contract) {
        try {
          const siteUrl = window.location.origin;
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-discord`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contract_title: contract.title,
              old_status: oldStatus,
              new_status: newStatus,
              changed_by: profile?.discord_username,
              site_url: siteUrl,
            }),
          });
        } catch (notifyError) {
          console.error('Failed to send Discord notification:', notifyError);
        }
      }
    } catch (err) {
      console.error('Error updating contract status:', err);
      alert('Failed to update contract status');
    }
  };

  const recalculateShares = async (contractId: string) => {
    const contractParticipants = participants[contractId] || [];
    const nonManualParticipants = contractParticipants.filter(p => !p.manual_share_override);

    if (nonManualParticipants.length === 0) return;

    const manualTotal = contractParticipants
      .filter(p => p.manual_share_override)
      .reduce((sum, p) => sum + p.share_percentage, 0);

    const remainingPercentage = 100 - manualTotal;
    const equalShare = remainingPercentage / nonManualParticipants.length;

    for (const participant of nonManualParticipants) {
      await supabase
        .from('contract_participants')
        .update({ share_percentage: equalShare })
        .eq('id', participant.id);
    }

    await loadParticipants(contractId);
  };

  const updateTargetPayout = async (contractId: string) => {
    if (!newTargetPayout) return;

    try {
      const { error } = await supabase
        .from('contracts')
        .update({ target_payout: Number(newTargetPayout), updated_at: new Date().toISOString() })
        .eq('id', contractId);

      if (error) throw error;

      setContracts(contracts.map(c =>
        c.id === contractId ? { ...c, target_payout: Number(newTargetPayout) } : c
      ));
      setEditingPayout(null);
      setNewTargetPayout('');
    } catch (err) {
      console.error('Error updating target payout:', err);
      alert('Failed to update target payout');
    }
  };

  const updateParticipantShare = async (participantId: string, contractId: string) => {
    if (!newSharePercentage) return;

    try {
      const { error } = await supabase
        .from('contract_participants')
        .update({
          share_percentage: Number(newSharePercentage),
          manual_share_override: true
        })
        .eq('id', participantId);

      if (error) throw error;

      await loadParticipants(contractId);
      setEditingShare(null);
      setNewSharePercentage('');
    } catch (err) {
      console.error('Error updating participant share:', err);
      alert('Failed to update participant share');
    }
  };

  const resetParticipantShare = async (participantId: string, contractId: string) => {
    try {
      const { error } = await supabase
        .from('contract_participants')
        .update({ manual_share_override: false })
        .eq('id', participantId);

      if (error) throw error;

      await recalculateShares(contractId);
    } catch (err) {
      console.error('Error resetting participant share:', err);
      alert('Failed to reset participant share');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-slate-900/30 border-slate-500/50 text-slate-400';
      case 'active': return 'bg-cyan-900/30 border-cyan-500/50 text-cyan-400';
      case 'completed': return 'bg-green-900/30 border-green-500/50 text-green-400';
      case 'cancelled': return 'bg-red-900/30 border-red-500/50 text-red-400';
      default: return 'bg-slate-900/30 border-slate-500/50 text-slate-400';
    }
  };

  const getTypeIcon = (type: string) => {
    return <FileText className="w-4 h-4" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'decimal' }).format(amount);
  };

  const canManageContract = (contract: Contract) => {
    return contract.created_by === profile?.id ||
           participants[contract.id]?.some(p => p.user_id === profile?.id && p.role === 'leader');
  };

  const isParticipant = (contractId: string) => {
    return participants[contractId]?.some(p => p.user_id === profile?.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400 text-xl">Loading contracts...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6 lg:p-8 relative overflow-hidden w-full">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-black to-black"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

      <div className="max-w-7xl mx-auto relative w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-8 h-8 text-cyan-400" />
              <h1 className="text-2xl sm:text-3xl font-bold text-cyan-400 uppercase tracking-wider">Contract Manager</h1>
            </div>
            <p className="text-slate-400 text-sm sm:text-base">Organize missions, track participants, and manage contributions</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold clip-corners transition-all shadow-[0_0_20px_rgba(6,182,212,0.5)] uppercase tracking-wider text-sm sm:text-base whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Create Contract
          </button>
        </div>

        <div className="space-y-4">
          {contracts.map((contract) => (
            <div key={contract.id} className="bg-gradient-to-br from-slate-900/50 to-black/50 border-2 border-cyan-500/30 clip-corners shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getTypeIcon(contract.type)}
                      <h3 className="text-xl font-bold text-cyan-400">{contract.title}</h3>
                      <span className={`px-3 py-1 clip-corners border text-xs uppercase tracking-wider font-bold ${getStatusColor(contract.status)}`}>
                        {contract.status}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mb-2">{contract.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="text-slate-500">
                        Type: <span className="text-cyan-400 uppercase">{contract.type.replace('_', ' ')}</span>
                      </span>
                      {contract.location && (
                        <span className="text-slate-500">
                          Location: <span className="text-cyan-400">{contract.location}</span>
                        </span>
                      )}
                      <span className="text-slate-500">
                        Target:
                        {editingPayout === contract.id ? (
                          <span className="inline-flex items-center gap-2 ml-2">
                            <input
                              type="number"
                              value={newTargetPayout}
                              onChange={(e) => setNewTargetPayout(e.target.value)}
                              className="w-32 bg-slate-900/50 border border-cyan-500/30 px-2 py-1 text-white text-sm"
                              placeholder="Amount"
                            />
                            <button
                              onClick={() => updateTargetPayout(contract.id)}
                              className="px-2 py-1 bg-green-900/30 border border-green-500/50 text-green-400 hover:bg-green-900/50 text-xs"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingPayout(null);
                                setNewTargetPayout('');
                              }}
                              className="px-2 py-1 bg-red-900/30 border border-red-500/50 text-red-400 hover:bg-red-900/50 text-xs"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <span className="text-green-400">
                            {formatCurrency(contract.target_payout)} UEC
                            {canManageContract(contract) && (
                              <button
                                onClick={() => {
                                  setEditingPayout(contract.id);
                                  setNewTargetPayout(contract.target_payout.toString());
                                }}
                                className="ml-2 text-cyan-400 hover:text-cyan-300"
                              >
                                <Edit2 className="w-3 h-3 inline" />
                              </button>
                            )}
                          </span>
                        )}
                      </span>
                      <span className="text-slate-500">
                        Creator: <span className="text-cyan-400">{contract.users.discord_username}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {canManageContract(contract) && (
                      <>
                        {contract.status === 'planning' && (
                          <button
                            onClick={() => updateContractStatus(contract.id, 'active')}
                            className="px-3 py-1 bg-cyan-900/30 border border-cyan-500/50 clip-corners text-cyan-400 hover:bg-cyan-900/50 transition-all text-sm"
                            title="Start Contract"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                        )}
                        {contract.status === 'active' && (
                          <button
                            onClick={() => updateContractStatus(contract.id, 'completed')}
                            className="px-3 py-1 bg-green-900/30 border border-green-500/50 clip-corners text-green-400 hover:bg-green-900/50 transition-all text-sm"
                            title="Complete Contract"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteContract(contract.id)}
                          className="px-3 py-1 bg-red-900/30 border border-red-500/50 clip-corners text-red-400 hover:bg-red-900/50 transition-all text-sm"
                          title="Delete Contract"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setExpandedContract(expandedContract === contract.id ? null : contract.id)}
                      className="px-3 py-1 bg-slate-900/30 border border-slate-500/50 clip-corners text-slate-400 hover:bg-slate-900/50 transition-all text-sm"
                    >
                      {expandedContract === contract.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expandedContract === contract.id && (
                  <div className="border-t-2 border-cyan-500/20 pt-4 mt-4 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          Participants ({participants[contract.id]?.length || 0})
                        </h4>
                        {canManageContract(contract) && (
                          <button
                            onClick={() => {
                              setSelectedContract(contract.id);
                              setShowParticipantModal(true);
                            }}
                            className="px-3 py-1 bg-cyan-900/30 border border-cyan-500/50 clip-corners text-cyan-400 hover:bg-cyan-900/50 transition-all text-sm"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {participants[contract.id]?.map((participant) => (
                          <div key={participant.id} className="bg-slate-900/50 border border-cyan-500/20 clip-corners p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <div className="text-cyan-400 font-bold text-sm">{participant.users.discord_username}</div>
                                <div className="text-slate-500 text-xs uppercase">{participant.role}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                {editingShare === participant.id ? (
                                  <>
                                    <input
                                      type="number"
                                      value={newSharePercentage}
                                      onChange={(e) => setNewSharePercentage(e.target.value)}
                                      className="w-16 bg-slate-900/50 border border-cyan-500/30 px-2 py-1 text-white text-xs text-center"
                                      placeholder="%"
                                      min="0"
                                      max="100"
                                    />
                                    <button
                                      onClick={() => updateParticipantShare(participant.id, contract.id)}
                                      className="px-1 py-1 bg-green-900/30 border border-green-500/50 text-green-400 hover:bg-green-900/50"
                                      title="Save"
                                    >
                                      <CheckCircle className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingShare(null);
                                        setNewSharePercentage('');
                                      }}
                                      className="px-1 py-1 bg-red-900/30 border border-red-500/50 text-red-400 hover:bg-red-900/50"
                                      title="Cancel"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-green-400 font-bold text-sm">
                                      {participant.share_percentage.toFixed(1)}%
                                      {participant.manual_share_override && (
                                        <span className="text-yellow-500 text-xs ml-1" title="Manual override">*</span>
                                      )}
                                    </span>
                                    {canManageContract(contract) && (
                                      <button
                                        onClick={() => {
                                          setEditingShare(participant.id);
                                          setNewSharePercentage(participant.share_percentage.toString());
                                        }}
                                        className="text-cyan-400 hover:text-cyan-300"
                                        title="Edit share"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 mt-2">
                              {canManageContract(contract) && participant.manual_share_override && (
                                <button
                                  onClick={() => resetParticipantShare(participant.id, contract.id)}
                                  className="flex-1 px-2 py-1 bg-slate-900/30 border border-slate-500/30 text-slate-400 hover:bg-slate-900/50 text-xs"
                                  title="Reset to automatic calculation"
                                >
                                  Reset to Auto
                                </button>
                              )}
                              {canManageContract(contract) && (
                                <button
                                  onClick={() => removeParticipant(participant.id, contract.id)}
                                  className="flex-1 px-2 py-1 bg-red-900/30 border border-red-500/30 text-red-400 hover:bg-red-900/50 text-xs flex items-center justify-center gap-1"
                                  title="Remove participant"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Remove
                                </button>
                              )}
                            </div>
                            <div className="text-slate-500 text-xs mt-1">
                              Share: {formatCurrency((contract.target_payout * participant.share_percentage) / 100)} UEC
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                          <Package className="w-5 h-5" />
                          Contributions ({contributions[contract.id]?.length || 0})
                        </h4>
                        {isParticipant(contract.id) && (
                          <button
                            onClick={() => {
                              setSelectedContract(contract.id);
                              setShowContributionModal(true);
                            }}
                            className="px-3 py-1 bg-cyan-900/30 border border-cyan-500/50 clip-corners text-cyan-400 hover:bg-cyan-900/50 transition-all text-sm"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {contributions[contract.id]?.map((contribution) => (
                          <div key={contribution.id} className="bg-slate-900/50 border border-cyan-500/20 clip-corners p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-cyan-400 font-bold text-sm">{contribution.item_name}</span>
                                  <span className="text-slate-500 text-xs">x{contribution.quantity}</span>
                                  <span className="px-2 py-0.5 bg-slate-800 border border-slate-600 clip-corners text-xs text-slate-400 uppercase">
                                    {contribution.contribution_type.replace('_', ' ')}
                                  </span>
                                </div>
                                <div className="text-slate-400 text-xs">
                                  By {contribution.users.discord_username} • Value: {formatCurrency(contribution.estimated_value)} UEC
                                </div>
                                {contribution.notes && (
                                  <div className="text-slate-500 text-xs mt-1 italic">{contribution.notes}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!contributions[contract.id] || contributions[contract.id].length === 0) && (
                          <div className="text-center py-4 text-slate-500 text-sm">No contributions yet</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {contracts.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No contracts yet. Create one to get started!
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-900 to-black border-2 border-cyan-500/50 clip-corners p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-cyan-400 uppercase tracking-wider">Create Contract</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-cyan-400 text-sm font-bold mb-2 uppercase tracking-wider">Title</label>
                <input
                  type="text"
                  value={contractForm.title}
                  onChange={(e) => setContractForm({ ...contractForm, title: e.target.value })}
                  className="w-full bg-slate-900/50 border-2 border-cyan-500/30 clip-corners px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="Contract title"
                />
              </div>

              <div>
                <label className="block text-cyan-400 text-sm font-bold mb-2 uppercase tracking-wider">Description</label>
                <textarea
                  value={contractForm.description}
                  onChange={(e) => setContractForm({ ...contractForm, description: e.target.value })}
                  className="w-full bg-slate-900/50 border-2 border-cyan-500/30 clip-corners px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                  rows={3}
                  placeholder="Contract details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-cyan-400 text-sm font-bold mb-2 uppercase tracking-wider">Type</label>
                  <select
                    value={contractForm.type}
                    onChange={(e) => setContractForm({ ...contractForm, type: e.target.value })}
                    className="w-full bg-slate-900/50 border-2 border-cyan-500/30 clip-corners px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="mining">Mining</option>
                    <option value="trading">Trading</option>
                    <option value="bounty_hunting">Bounty Hunting</option>
                    <option value="exploration">Exploration</option>
                    <option value="cargo_hauling">Cargo Hauling</option>
                    <option value="salvage">Salvage</option>
                    <option value="medical">Medical</option>
                    <option value="escort">Escort</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-cyan-400 text-sm font-bold mb-2 uppercase tracking-wider">Target Payout (UEC)</label>
                  <input
                    type="number"
                    value={contractForm.target_payout}
                    onChange={(e) => setContractForm({ ...contractForm, target_payout: e.target.value })}
                    className="w-full bg-slate-900/50 border-2 border-cyan-500/30 clip-corners px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                    placeholder="Enter target payout"
                  />
                </div>
              </div>

              <div>
                <label className="block text-cyan-400 text-sm font-bold mb-2 uppercase tracking-wider">Location</label>
                <input
                  type="text"
                  value={contractForm.location}
                  onChange={(e) => setContractForm({ ...contractForm, location: e.target.value })}
                  className="w-full bg-slate-900/50 border-2 border-cyan-500/30 clip-corners px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="Stanton System, Crusader, etc."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={createContract}
                  disabled={!contractForm.title}
                  className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-600 text-white font-bold clip-corners transition-all uppercase tracking-wider"
                >
                  Create Contract
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold clip-corners transition-all uppercase tracking-wider"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showParticipantModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-900 to-black border-2 border-cyan-500/50 clip-corners p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-cyan-400 uppercase tracking-wider">Add Participant</h2>
              <button onClick={() => setShowParticipantModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-cyan-400 text-sm font-bold mb-2 uppercase tracking-wider">User</label>
                <select
                  value={participantForm.user_id}
                  onChange={(e) => setParticipantForm({ ...participantForm, user_id: e.target.value })}
                  className="w-full bg-slate-900/50 border-2 border-cyan-500/30 clip-corners px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">Select user...</option>
                  {allUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.discord_username}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-cyan-400 text-sm font-bold mb-2 uppercase tracking-wider">Role</label>
                <select
                  value={participantForm.role}
                  onChange={(e) => setParticipantForm({ ...participantForm, role: e.target.value })}
                  className="w-full bg-slate-900/50 border-2 border-cyan-500/30 clip-corners px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="member">Member</option>
                  <option value="leader">Leader</option>
                  <option value="support">Support</option>
                </select>
              </div>

              <div>
                <label className="block text-cyan-400 text-sm font-bold mb-2 uppercase tracking-wider">Share Percentage</label>
                <input
                  type="number"
                  value={participantForm.share_percentage}
                  onChange={(e) => setParticipantForm({ ...participantForm, share_percentage: Number(e.target.value) })}
                  min="0"
                  max="100"
                  className="w-full bg-slate-900/50 border-2 border-cyan-500/30 clip-corners px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={addParticipant}
                  disabled={!participantForm.user_id}
                  className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-600 text-white font-bold clip-corners transition-all uppercase tracking-wider"
                >
                  Add Participant
                </button>
                <button
                  onClick={() => setShowParticipantModal(false)}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold clip-corners transition-all uppercase tracking-wider"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showContributionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-900 to-black border-2 border-cyan-500/50 clip-corners p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-cyan-400 uppercase tracking-wider">Add Contribution</h2>
              <button onClick={() => setShowContributionModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-cyan-400 text-sm font-bold mb-2 uppercase tracking-wider">Type</label>
                <select
                  value={contributionForm.contribution_type}
                  onChange={(e) => setContributionForm({ ...contributionForm, contribution_type: e.target.value })}
                  className="w-full bg-slate-900/50 border-2 border-cyan-500/30 clip-corners px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="supplies">Supplies</option>
                  <option value="materials">Materials</option>
                  <option value="equipment">Equipment</option>
                  <option value="ship">Ship</option>
                  <option value="fuel">Fuel</option>
                  <option value="ammunition">Ammunition</option>
                  <option value="medical_supplies">Medical Supplies</option>
                  <option value="time">Time</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-cyan-400 text-sm font-bold mb-2 uppercase tracking-wider">Item Name</label>
                <input
                  type="text"
                  value={contributionForm.item_name}
                  onChange={(e) => setContributionForm({ ...contributionForm, item_name: e.target.value })}
                  className="w-full bg-slate-900/50 border-2 border-cyan-500/30 clip-corners px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="e.g., Hadanite, Mining Laser, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-cyan-400 text-sm font-bold mb-2 uppercase tracking-wider">Quantity</label>
                  <input
                    type="number"
                    value={contributionForm.quantity}
                    onChange={(e) => setContributionForm({ ...contributionForm, quantity: Number(e.target.value) })}
                    min="1"
                    className="w-full bg-slate-900/50 border-2 border-cyan-500/30 clip-corners px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-cyan-400 text-sm font-bold mb-2 uppercase tracking-wider">Value (UEC)</label>
                  <input
                    type="number"
                    value={contributionForm.estimated_value}
                    onChange={(e) => setContributionForm({ ...contributionForm, estimated_value: Number(e.target.value) })}
                    min="0"
                    className="w-full bg-slate-900/50 border-2 border-cyan-500/30 clip-corners px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-cyan-400 text-sm font-bold mb-2 uppercase tracking-wider">Notes</label>
                <textarea
                  value={contributionForm.notes}
                  onChange={(e) => setContributionForm({ ...contributionForm, notes: e.target.value })}
                  className="w-full bg-slate-900/50 border-2 border-cyan-500/30 clip-corners px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                  rows={2}
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={addContribution}
                  disabled={!contributionForm.item_name}
                  className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-600 text-white font-bold clip-corners transition-all uppercase tracking-wider"
                >
                  Add Contribution
                </button>
                <button
                  onClick={() => setShowContributionModal(false)}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold clip-corners transition-all uppercase tracking-wider"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
