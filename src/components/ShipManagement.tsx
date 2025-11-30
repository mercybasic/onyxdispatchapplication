import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Ship, Plus, Edit2, Trash2, Users, Settings, CheckCircle, XCircle, Loader2, Fuel, Heart, Package } from 'lucide-react';

interface ShipData {
  id: string;
  name: string;
  ship_type: string;
  call_sign: string;
  capabilities: string[];
  status: string;
  administrator_id: string;
  created_at: string;
  parent_ship_id: string | null;
  sc_ship_id: string | null;
  users: {
    discord_username: string;
  } | null;
  crew_count?: number;
  sub_ships_count?: number;
}

interface ShipResources {
  has_quantum_fuel: boolean;
  has_hydrogen_fuel: boolean;
  has_tier1_beds: boolean;
  has_tier2_beds: boolean;
  has_tier3_beds: boolean;
  notes: string;
}

interface StarCitizenShip {
  id: string;
  manufacturer: string;
  name: string;
  full_name: string;
  category: string;
  size: string;
  can_carry_ships: boolean;
  can_carry_vehicles: boolean;
  max_carried_ships: number;
}

interface CrewMember {
  id: string;
  user_id: string;
  role: string;
  position: string | null;
  status: string;
  users: {
    discord_username: string;
    role: string;
  };
}

interface AvailableUser {
  id: string;
  discord_username: string;
  role: string;
}

export function ShipManagement() {
  const { profile } = useAuth();
  const [ships, setShips] = useState<ShipData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCrewModal, setShowCrewModal] = useState(false);
  const [showResourcesModal, setShowResourcesModal] = useState(false);
  const [showHangarModal, setShowHangarModal] = useState(false);
  const [selectedShip, setSelectedShip] = useState<ShipData | null>(null);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [shipResources, setShipResources] = useState<ShipResources>({
    has_quantum_fuel: false,
    has_hydrogen_fuel: false,
    has_tier1_beds: false,
    has_tier2_beds: false,
    has_tier3_beds: false,
    notes: '',
  });
  const [subShips, setSubShips] = useState<ShipData[]>([]);
  const [availableShips, setAvailableShips] = useState<ShipData[]>([]);
  const [scShips, setScShips] = useState<StarCitizenShip[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    ship_type: '',
    call_sign: '',
    capabilities: [] as string[],
    status: 'active',
    sc_ship_id: '',
  });

  const [newCrewMember, setNewCrewMember] = useState({
    user_id: '',
    position: '',
  });

  const serviceCapabilities = [
    'Refuel',
    'Repair',
    'Medical',
    'Rescue',
    'Transport',
    'Cargo',
    'Combat Support',
    'Mining Support',
  ];

  useEffect(() => {
    loadShips();
  }, []);

  const loadShips = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ships')
        .select(`
          *,
          users!ships_administrator_id_fkey (discord_username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const shipsWithCounts = await Promise.all(
        (data || []).map(async (ship) => {
          const [crewResult, subShipsResult] = await Promise.all([
            supabase
              .from('crew_members')
              .select('*', { count: 'exact', head: true })
              .eq('ship_id', ship.id)
              .eq('status', 'active'),
            supabase
              .from('ships')
              .select('*', { count: 'exact', head: true })
              .eq('parent_ship_id', ship.id)
          ]);

          return {
            ...ship,
            crew_count: crewResult.count || 0,
            sub_ships_count: subShipsResult.count || 0,
          };
        })
      );

      setShips(shipsWithCounts);
    } catch (err) {
      console.error('Error loading ships:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCrewMembers = async (shipId: string) => {
    try {
      const { data, error } = await supabase
        .from('crew_members')
        .select(`
          *,
          users (discord_username, role)
        `)
        .eq('ship_id', shipId)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      setCrewMembers(data || []);
    } catch (err) {
      console.error('Error loading crew:', err);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, discord_username, role')
        .eq('verified', true)
        .order('discord_username');

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const handleCreateShip = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const shipData: any = {
        name: formData.name,
        ship_type: formData.ship_type,
        call_sign: formData.call_sign,
        capabilities: formData.capabilities,
        status: formData.status,
        administrator_id: profile?.id,
      };

      if (formData.sc_ship_id) {
        shipData.sc_ship_id = formData.sc_ship_id;
      }

      console.log('Creating ship with data:', shipData);

      const { data, error } = await supabase.from('ships').insert([shipData]).select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Ship created successfully:', data);

      setShowCreateModal(false);
      setFormData({
        name: '',
        ship_type: '',
        call_sign: '',
        capabilities: [],
        status: 'active',
        sc_ship_id: '',
      });
      await loadShips();
    } catch (err: any) {
      console.error('Error creating ship:', err);
      alert('Failed to create ship: ' + (err.message || JSON.stringify(err)));
    }
  };

  const handleUpdateShip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShip) return;

    try {
      const updateData: any = {
        name: formData.name,
        ship_type: formData.ship_type,
        call_sign: formData.call_sign,
        capabilities: formData.capabilities,
        status: formData.status,
      };

      if (formData.sc_ship_id) {
        updateData.sc_ship_id = formData.sc_ship_id;
      }

      const { error } = await supabase
        .from('ships')
        .update(updateData)
        .eq('id', selectedShip.id);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedShip(null);
      await loadShips();
    } catch (err: any) {
      console.error('Error updating ship:', err);
      alert('Failed to update ship: ' + err.message);
    }
  };

  const handleDeleteShip = async (shipId: string) => {
    if (!confirm('Are you sure you want to delete this ship? This will remove all crew assignments.')) return;

    try {
      const { error } = await supabase
        .from('ships')
        .delete()
        .eq('id', shipId);

      if (error) throw error;
      await loadShips();
    } catch (err: any) {
      console.error('Error deleting ship:', err);
      alert('Failed to delete ship: ' + err.message);
    }
  };

  const handleAddCrew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShip || !newCrewMember.user_id) return;

    try {
      const { error } = await supabase.from('crew_members').insert([{
        ship_id: selectedShip.id,
        user_id: newCrewMember.user_id,
        position: newCrewMember.position || null,
        role: 'crew',
      }]);

      if (error) throw error;

      setNewCrewMember({ user_id: '', position: '' });
      await loadCrewMembers(selectedShip.id);
      await loadShips();
    } catch (err: any) {
      console.error('Error adding crew:', err);
      alert('Failed to add crew member: ' + err.message);
    }
  };

  const handleRemoveCrew = async (crewId: string) => {
    if (!confirm('Remove this crew member from the ship?')) return;

    try {
      const { error } = await supabase
        .from('crew_members')
        .delete()
        .eq('id', crewId);

      if (error) throw error;

      if (selectedShip) {
        await loadCrewMembers(selectedShip.id);
        await loadShips();
      }
    } catch (err: any) {
      console.error('Error removing crew:', err);
      alert('Failed to remove crew member: ' + err.message);
    }
  };

  const loadShipResources = async (shipId: string) => {
    try {
      const { data: crewMembers } = await supabase
        .from('crew_members')
        .select('*')
        .eq('ship_id', shipId)
        .eq('status', 'active');

      if (crewMembers && crewMembers.length > 0) {
        const firstMember = crewMembers[0];
        setShipResources({
          has_quantum_fuel: firstMember.notes?.includes('quantum_fuel') || false,
          has_hydrogen_fuel: firstMember.notes?.includes('hydrogen_fuel') || false,
          has_tier1_beds: firstMember.notes?.includes('tier1_beds') || false,
          has_tier2_beds: firstMember.notes?.includes('tier2_beds') || false,
          has_tier3_beds: firstMember.notes?.includes('tier3_beds') || false,
          notes: firstMember.notes || '',
        });
      }
    } catch (err) {
      console.error('Error loading ship resources:', err);
    }
  };

  const loadSubShips = async (parentShipId: string) => {
    try {
      const { data, error } = await supabase
        .from('ships')
        .select('*, users!ships_administrator_id_fkey (discord_username)')
        .eq('parent_ship_id', parentShipId);

      if (error) throw error;
      setSubShips(data || []);
    } catch (err) {
      console.error('Error loading sub-ships:', err);
    }
  };

  const loadAvailableShipsForHangar = async (parentShipId: string) => {
    try {
      const { data, error } = await supabase
        .from('ships')
        .select('*, users!ships_administrator_id_fkey (discord_username)')
        .is('parent_ship_id', null)
        .neq('id', parentShipId);

      if (error) throw error;
      setAvailableShips(data || []);
    } catch (err) {
      console.error('Error loading available ships:', err);
    }
  };

  const loadStarCitizenShips = async () => {
    try {
      const { data, error } = await supabase
        .from('star_citizen_ships')
        .select('*')
        .order('manufacturer')
        .order('name');

      if (error) throw error;
      setScShips(data || []);
    } catch (err) {
      console.error('Error loading SC ships:', err);
    }
  };

  const handleSaveResources = async () => {
    if (!selectedShip) return;

    try {
      const resourceFlags = [];
      if (shipResources.has_quantum_fuel) resourceFlags.push('quantum_fuel');
      if (shipResources.has_hydrogen_fuel) resourceFlags.push('hydrogen_fuel');
      if (shipResources.has_tier1_beds) resourceFlags.push('tier1_beds');
      if (shipResources.has_tier2_beds) resourceFlags.push('tier2_beds');
      if (shipResources.has_tier3_beds) resourceFlags.push('tier3_beds');

      const notesContent = resourceFlags.join(',');

      const { data: crewMembers } = await supabase
        .from('crew_members')
        .select('id')
        .eq('ship_id', selectedShip.id)
        .eq('status', 'active');

      if (crewMembers && crewMembers.length > 0) {
        await supabase
          .from('crew_members')
          .update({ notes: notesContent })
          .eq('id', crewMembers[0].id);
      }

      alert('Resources updated successfully!');
      setShowResourcesModal(false);
    } catch (err: any) {
      console.error('Error saving resources:', err);
      alert('Failed to save resources: ' + err.message);
    }
  };

  const handleAssignToHangar = async (subShipId: string) => {
    if (!selectedShip) return;

    try {
      const { error } = await supabase
        .from('ships')
        .update({ parent_ship_id: selectedShip.id })
        .eq('id', subShipId);

      if (error) throw error;

      await loadSubShips(selectedShip.id);
      await loadAvailableShipsForHangar(selectedShip.id);
      await loadShips();
    } catch (err: any) {
      console.error('Error assigning ship to hangar:', err);
      alert('Failed to assign ship: ' + err.message);
    }
  };

  const handleRemoveFromHangar = async (subShipId: string) => {
    try {
      const { error } = await supabase
        .from('ships')
        .update({ parent_ship_id: null })
        .eq('id', subShipId);

      if (error) throw error;

      if (selectedShip) {
        await loadSubShips(selectedShip.id);
        await loadAvailableShipsForHangar(selectedShip.id);
        await loadShips();
      }
    } catch (err: any) {
      console.error('Error removing ship from hangar:', err);
      alert('Failed to remove ship: ' + err.message);
    }
  };

  const openEditModal = (ship: ShipData) => {
    setSelectedShip(ship);
    setFormData({
      name: ship.name,
      ship_type: ship.ship_type,
      call_sign: ship.call_sign,
      capabilities: ship.capabilities,
      status: ship.status,
      sc_ship_id: ship.sc_ship_id || '',
    });
    setShowEditModal(true);
  };

  const openCrewModal = async (ship: ShipData) => {
    setSelectedShip(ship);
    await loadCrewMembers(ship.id);
    await loadAvailableUsers();
    setShowCrewModal(true);
  };

  const openResourcesModal = async (ship: ShipData) => {
    setSelectedShip(ship);
    await loadShipResources(ship.id);
    setShowResourcesModal(true);
  };

  const openHangarModal = async (ship: ShipData) => {
    setSelectedShip(ship);
    await loadSubShips(ship.id);
    await loadAvailableShipsForHangar(ship.id);
    setShowHangarModal(true);
  };

  const toggleCapability = (capability: string) => {
    setFormData(prev => ({
      ...prev,
      capabilities: prev.capabilities.includes(capability)
        ? prev.capabilities.filter(c => c !== capability)
        : [...prev.capabilities, capability],
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-900/30 border-green-500/50 text-green-400';
      case 'maintenance':
        return 'bg-yellow-900/30 border-yellow-500/50 text-yellow-400';
      case 'offline':
        return 'bg-red-900/30 border-red-500/50 text-red-400';
      default:
        return 'bg-slate-900/30 border-slate-500/50 text-slate-400';
    }
  };

  const canManageShip = (ship: ShipData) => {
    return profile?.role === 'dispatcher' || profile?.role === 'ceo' || ship.administrator_id === profile?.id;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
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
              <Ship className="w-8 h-8 text-cyan-400" />
              <h1 className="text-2xl sm:text-3xl font-bold text-cyan-400 uppercase tracking-wider">Ship Management</h1>
            </div>
            <p className="text-slate-400 text-sm sm:text-base">Organize crews and manage ship operations</p>
          </div>
          {(profile?.role === 'administrator' || profile?.role === 'dispatcher' || profile?.role === 'ceo') && profile?.verified && (
            <button
              onClick={() => {
                setFormData({
                  name: '',
                  ship_type: '',
                  call_sign: '',
                  capabilities: [],
                  status: 'active',
                  sc_ship_id: '',
                });
                loadStarCitizenShips();
                setShowCreateModal(true);
              }}
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold clip-corners transition-all shadow-[0_0_20px_rgba(6,182,212,0.5)] uppercase tracking-wider text-sm sm:text-base whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Create Ship
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ships.map((ship) => (
            <div key={ship.id} className="bg-gradient-to-br from-slate-900/50 to-black/50 border-2 border-cyan-500/30 clip-corners p-6 shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:border-cyan-500/50 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-cyan-400 mb-1">{ship.name}</h3>
                  <p className="text-slate-400 text-sm">{ship.ship_type}</p>
                </div>
                <div className={`px-3 py-1 clip-corners border ${getStatusColor(ship.status)} text-xs uppercase tracking-wider font-bold`}>
                  {ship.status}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-cyan-600 uppercase tracking-wider">Call Sign:</span>
                  <span className="text-white font-mono">{ship.call_sign}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-cyan-600 uppercase tracking-wider">Admin:</span>
                  <span className="text-white">{ship.users?.discord_username || 'Unassigned'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-cyan-600" />
                  <span className="text-white">{ship.crew_count || 0} Crew Members</span>
                </div>
                {ship.sub_ships_count !== undefined && ship.sub_ships_count > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-cyan-600" />
                    <span className="text-white">{ship.sub_ships_count} Ships in Hangar</span>
                  </div>
                )}
              </div>

              {ship.capabilities.length > 0 && (
                <div className="mb-4">
                  <div className="text-cyan-600 text-xs uppercase tracking-wider mb-2">Capabilities</div>
                  <div className="flex flex-wrap gap-1">
                    {ship.capabilities.map((cap) => (
                      <span key={cap} className="px-2 py-1 bg-cyan-900/20 border border-cyan-500/30 text-cyan-400 text-xs clip-corners">
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {canManageShip(ship) && (
                <>
                  <div className="grid grid-cols-2 gap-2 pt-4 border-t border-cyan-500/20">
                    <button
                      onClick={() => openCrewModal(ship)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-cyan-900/30 hover:bg-cyan-900/50 border-2 border-cyan-500/50 text-cyan-400 clip-corners transition-all uppercase tracking-wider text-xs font-bold"
                    >
                      <Users className="w-4 h-4" />
                      Crew
                    </button>
                    <button
                      onClick={() => openHangarModal(ship)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-900/30 hover:bg-purple-900/50 border-2 border-purple-500/50 text-purple-400 clip-corners transition-all uppercase tracking-wider text-xs font-bold"
                    >
                      <Package className="w-4 h-4" />
                      Hangar
                    </button>
                    <button
                      onClick={() => openResourcesModal(ship)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-green-900/30 hover:bg-green-900/50 border-2 border-green-500/50 text-green-400 clip-corners transition-all uppercase tracking-wider text-xs font-bold"
                    >
                      <Fuel className="w-4 h-4" />
                      Resources
                    </button>
                    <button
                      onClick={() => openEditModal(ship)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-900/30 hover:bg-blue-900/50 border-2 border-blue-500/50 text-blue-400 clip-corners transition-all uppercase tracking-wider text-xs font-bold"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                  </div>
                  <button
                    onClick={() => handleDeleteShip(ship.id)}
                    className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border-2 border-red-500/50 text-red-400 clip-corners transition-all uppercase tracking-wider text-xs font-bold"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Ship
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {ships.length === 0 && (
          <div className="text-center py-20">
            <Ship className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No ships configured yet</p>
            <p className="text-slate-600 text-sm mt-2">Create a ship to start organizing your crews</p>
          </div>
        )}
      </div>

      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-900/95 to-black/95 border-2 border-cyan-500/50 shadow-[0_0_40px_rgba(6,182,212,0.4)] p-8 max-w-2xl w-full clip-corners max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-cyan-400 mb-6 uppercase tracking-wider">
              {showCreateModal ? 'Create New Ship' : 'Edit Ship'}
            </h2>

            <form onSubmit={showCreateModal ? handleCreateShip : handleUpdateShip} className="space-y-4">
              <div>
                <label className="block text-cyan-600 text-xs uppercase tracking-wider mb-2">Ship Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full bg-slate-900/50 border-2 border-cyan-500/30 text-white px-4 py-3 clip-corners focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-cyan-600 text-xs uppercase tracking-wider mb-2">Star Citizen Ship (Optional)</label>
                <select
                  value={formData.sc_ship_id}
                  onChange={(e) => {
                    const selectedShip = scShips.find(s => s.id === e.target.value);
                    setFormData({
                      ...formData,
                      sc_ship_id: e.target.value,
                      ship_type: selectedShip ? selectedShip.full_name : formData.ship_type
                    });
                  }}
                  className="w-full bg-slate-900/50 border-2 border-cyan-500/30 text-white px-4 py-3 clip-corners focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="">Select a ship from database...</option>
                  {scShips.map((ship) => (
                    <option key={ship.id} value={ship.id}>
                      {ship.manufacturer} {ship.name} ({ship.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-cyan-600 text-xs uppercase tracking-wider mb-2">Ship Type *</label>
                <input
                  type="text"
                  value={formData.ship_type}
                  onChange={(e) => setFormData({ ...formData, ship_type: e.target.value })}
                  required
                  placeholder="e.g., Cutlass Red, Carrack"
                  className="w-full bg-slate-900/50 border-2 border-cyan-500/30 text-white px-4 py-3 clip-corners focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-cyan-600 text-xs uppercase tracking-wider mb-2">Call Sign *</label>
                  <input
                    type="text"
                    value={formData.call_sign}
                    onChange={(e) => setFormData({ ...formData, call_sign: e.target.value.toUpperCase() })}
                    required
                    placeholder="e.g., ONYX-1"
                    className="w-full bg-slate-900/50 border-2 border-cyan-500/30 text-white px-4 py-3 clip-corners focus:outline-none focus:border-cyan-500/50 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-cyan-600 text-xs uppercase tracking-wider mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-900/50 border-2 border-cyan-500/30 text-white px-4 py-3 clip-corners focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-cyan-600 text-xs uppercase tracking-wider mb-2">Capabilities</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {serviceCapabilities.map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => toggleCapability(cap)}
                      className={`px-3 py-2 clip-corners border-2 transition-all text-xs font-bold uppercase tracking-wider ${
                        formData.capabilities.includes(cap)
                          ? 'bg-cyan-900/50 border-cyan-500/50 text-cyan-400'
                          : 'bg-slate-900/30 border-slate-500/30 text-slate-500 hover:border-slate-500/50'
                      }`}
                    >
                      {cap}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedShip(null);
                  }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 clip-corners transition-all uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-6 clip-corners transition-all uppercase tracking-wider"
                >
                  {showCreateModal ? 'Create Ship' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCrewModal && selectedShip && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-900/95 to-black/95 border-2 border-cyan-500/50 shadow-[0_0_40px_rgba(6,182,212,0.4)] p-8 max-w-3xl w-full clip-corners max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-cyan-400 uppercase tracking-wider">{selectedShip.name} Crew</h2>
                <p className="text-slate-400 text-sm">{selectedShip.call_sign}</p>
              </div>
              <button
                onClick={() => {
                  setShowCrewModal(false);
                  setSelectedShip(null);
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddCrew} className="mb-6 p-4 bg-cyan-900/10 border-2 border-cyan-500/30 clip-corners">
              <h3 className="text-cyan-400 font-bold uppercase tracking-wider mb-4 text-sm">Add Crew Member</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-cyan-600 text-xs uppercase tracking-wider mb-2">User *</label>
                  <select
                    value={newCrewMember.user_id}
                    onChange={(e) => setNewCrewMember({ ...newCrewMember, user_id: e.target.value })}
                    required
                    className="w-full bg-slate-900/50 border-2 border-cyan-500/30 text-white px-4 py-2 clip-corners focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="">Select a user...</option>
                    {availableUsers.filter(u => !crewMembers.find(cm => cm.user_id === u.id)).map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.discord_username} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-cyan-600 text-xs uppercase tracking-wider mb-2">Position</label>
                  <input
                    type="text"
                    value={newCrewMember.position}
                    onChange={(e) => setNewCrewMember({ ...newCrewMember, position: e.target.value })}
                    placeholder="e.g., Pilot, Engineer"
                    className="w-full bg-slate-900/50 border-2 border-cyan-500/30 text-white px-4 py-2 clip-corners focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="mt-4 w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-2 px-6 clip-corners transition-all uppercase tracking-wider text-sm"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Add Member
              </button>
            </form>

            <div className="space-y-2">
              <h3 className="text-cyan-400 font-bold uppercase tracking-wider mb-4 text-sm">Current Crew</h3>
              {crewMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 bg-slate-900/50 border border-cyan-500/20 clip-corners">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-sm flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-bold">{member.users.discord_username}</div>
                      <div className="text-slate-400 text-sm">
                        {member.position || 'No position assigned'} • {member.users.role}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveCrew(member.id)}
                    className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border-2 border-red-500/50 text-red-400 clip-corners transition-all uppercase tracking-wider text-xs font-bold"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {crewMembers.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No crew members assigned yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showResourcesModal && selectedShip && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-900/95 to-black/95 border-2 border-cyan-500/50 shadow-[0_0_40px_rgba(6,182,212,0.4)] p-8 max-w-2xl w-full clip-corners max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-cyan-400 uppercase tracking-wider">{selectedShip.name} Resources</h2>
                <p className="text-slate-400 text-sm">{selectedShip.call_sign}</p>
              </div>
              <button
                onClick={() => {
                  setShowResourcesModal(false);
                  setSelectedShip(null);
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-cyan-400 font-bold uppercase tracking-wider mb-4 text-sm flex items-center gap-2">
                  <Fuel className="w-5 h-5" />
                  Fuel Availability
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setShipResources(prev => ({ ...prev, has_quantum_fuel: !prev.has_quantum_fuel }))}
                    className={`p-4 clip-corners border-2 transition-all ${
                      shipResources.has_quantum_fuel
                        ? 'bg-cyan-900/50 border-cyan-500/50 text-cyan-400'
                        : 'bg-slate-900/30 border-slate-500/30 text-slate-500 hover:border-slate-500/50'
                    }`}
                  >
                    <Fuel className="w-6 h-6 mx-auto mb-2" />
                    <div className="text-xs font-bold uppercase">Quantum Fuel</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShipResources(prev => ({ ...prev, has_hydrogen_fuel: !prev.has_hydrogen_fuel }))}
                    className={`p-4 clip-corners border-2 transition-all ${
                      shipResources.has_hydrogen_fuel
                        ? 'bg-cyan-900/50 border-cyan-500/50 text-cyan-400'
                        : 'bg-slate-900/30 border-slate-500/30 text-slate-500 hover:border-slate-500/50'
                    }`}
                  >
                    <Fuel className="w-6 h-6 mx-auto mb-2" />
                    <div className="text-xs font-bold uppercase">Hydrogen Fuel</div>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-cyan-400 font-bold uppercase tracking-wider mb-4 text-sm flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Medical Facilities
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setShipResources(prev => ({ ...prev, has_tier1_beds: !prev.has_tier1_beds }))}
                    className={`p-4 clip-corners border-2 transition-all ${
                      shipResources.has_tier1_beds
                        ? 'bg-green-900/50 border-green-500/50 text-green-400'
                        : 'bg-slate-900/30 border-slate-500/30 text-slate-500 hover:border-slate-500/50'
                    }`}
                  >
                    <Heart className="w-6 h-6 mx-auto mb-2" />
                    <div className="text-xs font-bold uppercase">Tier 1 Beds</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShipResources(prev => ({ ...prev, has_tier2_beds: !prev.has_tier2_beds }))}
                    className={`p-4 clip-corners border-2 transition-all ${
                      shipResources.has_tier2_beds
                        ? 'bg-green-900/50 border-green-500/50 text-green-400'
                        : 'bg-slate-900/30 border-slate-500/30 text-slate-500 hover:border-slate-500/50'
                    }`}
                  >
                    <Heart className="w-6 h-6 mx-auto mb-2" />
                    <div className="text-xs font-bold uppercase">Tier 2 Beds</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShipResources(prev => ({ ...prev, has_tier3_beds: !prev.has_tier3_beds }))}
                    className={`p-4 clip-corners border-2 transition-all ${
                      shipResources.has_tier3_beds
                        ? 'bg-green-900/50 border-green-500/50 text-green-400'
                        : 'bg-slate-900/30 border-slate-500/30 text-slate-500 hover:border-slate-500/50'
                    }`}
                  >
                    <Heart className="w-6 h-6 mx-auto mb-2" />
                    <div className="text-xs font-bold uppercase">Tier 3 Beds</div>
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowResourcesModal(false);
                    setSelectedShip(null);
                  }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 clip-corners transition-all uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveResources}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-6 clip-corners transition-all uppercase tracking-wider"
                >
                  Save Resources
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHangarModal && selectedShip && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-900/95 to-black/95 border-2 border-cyan-500/50 shadow-[0_0_40px_rgba(6,182,212,0.4)] p-8 max-w-4xl w-full clip-corners max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-cyan-400 uppercase tracking-wider">{selectedShip.name} Hangar</h2>
                <p className="text-slate-400 text-sm">{selectedShip.call_sign} - Manage carried ships</p>
              </div>
              <button
                onClick={() => {
                  setShowHangarModal(false);
                  setSelectedShip(null);
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-cyan-400 font-bold uppercase tracking-wider mb-4 text-sm">Ships in Hangar</h3>
                <div className="space-y-2">
                  {subShips.map((subShip) => (
                    <div key={subShip.id} className="flex items-center justify-between p-4 bg-slate-900/50 border border-cyan-500/20 clip-corners">
                      <div>
                        <div className="text-white font-bold">{subShip.name}</div>
                        <div className="text-slate-400 text-sm">{subShip.ship_type} - {subShip.call_sign}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveFromHangar(subShip.id)}
                        className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border-2 border-red-500/50 text-red-400 clip-corners transition-all uppercase tracking-wider text-xs font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {subShips.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      No ships in hangar
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-cyan-400 font-bold uppercase tracking-wider mb-4 text-sm">Available Ships</h3>
                <div className="space-y-2">
                  {availableShips.map((availShip) => (
                    <div key={availShip.id} className="flex items-center justify-between p-4 bg-slate-900/50 border border-cyan-500/20 clip-corners">
                      <div>
                        <div className="text-white font-bold">{availShip.name}</div>
                        <div className="text-slate-400 text-sm">{availShip.ship_type} - {availShip.call_sign}</div>
                      </div>
                      <button
                        onClick={() => handleAssignToHangar(availShip.id)}
                        className="px-4 py-2 bg-cyan-900/30 hover:bg-cyan-900/50 border-2 border-cyan-500/50 text-cyan-400 clip-corners transition-all uppercase tracking-wider text-xs font-bold"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                  {availableShips.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      No available ships to add
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
