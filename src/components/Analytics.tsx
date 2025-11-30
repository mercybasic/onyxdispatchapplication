import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { XCircle, TrendingUp, Calendar, MessageSquare, CheckCircle, Clock, AlertTriangle, BarChart3 } from 'lucide-react';

interface CancellationRecord {
  id: string;
  request_id: string;
  reason: string;
  additional_details: string | null;
  cancelled_by: string;
  cancelled_at: string;
  service_requests: {
    tracking_code: string;
    client_name: string;
    client_discord: string;
    created_at: string;
    service_types: { name: string };
    star_citizen_systems: { name: string; code: string };
  };
}

interface ReasonStats {
  reason: string;
  count: number;
  percentage: number;
}

interface ServiceStats {
  service_name: string;
  total: number;
  completed: number;
  cancelled: number;
  in_progress: number;
}

interface OverallMetrics {
  total_requests: number;
  completed_requests: number;
  cancelled_requests: number;
  in_progress_requests: number;
  avg_completion_time: number;
}

export function Analytics() {
  const [cancellations, setCancellations] = useState<CancellationRecord[]>([]);
  const [cancellationStats, setCancellationStats] = useState<ReasonStats[]>([]);
  const [serviceStats, setServiceStats] = useState<ServiceStats[]>([]);
  const [overallMetrics, setOverallMetrics] = useState<OverallMetrics>({
    total_requests: 0,
    completed_requests: 0,
    cancelled_requests: 0,
    in_progress_requests: 0,
    avg_completion_time: 0,
  });
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'all' | '7d' | '30d'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [timeFilter]);

  const getTimeFilterDate = () => {
    if (timeFilter === '7d') {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      return date.toISOString();
    } else if (timeFilter === '30d') {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date.toISOString();
    }
    return null;
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCancellations(),
        loadServiceStats(),
        loadOverallMetrics(),
      ]);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCancellations = async () => {
    try {
      let query = supabase
        .from('cancellation_reasons')
        .select(`
          *,
          service_requests (
            tracking_code,
            client_name,
            client_discord,
            created_at,
            service_types (name),
            star_citizen_systems (name, code)
          )
        `)
        .order('cancelled_at', { ascending: false });

      const filterDate = getTimeFilterDate();
      if (filterDate) {
        query = query.gte('cancelled_at', filterDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      setCancellations(data || []);
      calculateCancellationStats(data || []);
    } catch (err) {
      console.error('Error loading cancellations:', err);
    }
  };

  const loadServiceStats = async () => {
    try {
      let requestsQuery = supabase
        .from('service_requests')
        .select('service_type_id, status, service_types(name)');

      const filterDate = getTimeFilterDate();
      if (filterDate) {
        requestsQuery = requestsQuery.gte('created_at', filterDate);
      }

      const { data, error } = await requestsQuery;

      if (error) throw error;

      const statsMap: { [key: string]: ServiceStats } = {};

      (data || []).forEach((request: any) => {
        const serviceName = request.service_types?.name || 'Unknown';

        if (!statsMap[serviceName]) {
          statsMap[serviceName] = {
            service_name: serviceName,
            total: 0,
            completed: 0,
            cancelled: 0,
            in_progress: 0,
          };
        }

        statsMap[serviceName].total++;

        if (request.status === 'completed') {
          statsMap[serviceName].completed++;
        } else if (request.status === 'cancelled') {
          statsMap[serviceName].cancelled++;
        } else if (request.status === 'in_progress' || request.status === 'assigned') {
          statsMap[serviceName].in_progress++;
        }
      });

      setServiceStats(Object.values(statsMap));
    } catch (err) {
      console.error('Error loading service stats:', err);
    }
  };

  const loadOverallMetrics = async () => {
    try {
      let requestsQuery = supabase
        .from('service_requests')
        .select('status, created_at, completed_at');

      const filterDate = getTimeFilterDate();
      if (filterDate) {
        requestsQuery = requestsQuery.gte('created_at', filterDate);
      }

      const { data, error } = await requestsQuery;

      if (error) throw error;

      const metrics: OverallMetrics = {
        total_requests: data?.length || 0,
        completed_requests: 0,
        cancelled_requests: 0,
        in_progress_requests: 0,
        avg_completion_time: 0,
      };

      let totalCompletionTime = 0;
      let completedCount = 0;

      (data || []).forEach((request) => {
        if (request.status === 'completed') {
          metrics.completed_requests++;
          if (request.completed_at && request.created_at) {
            const completionTime = new Date(request.completed_at).getTime() - new Date(request.created_at).getTime();
            totalCompletionTime += completionTime;
            completedCount++;
          }
        } else if (request.status === 'cancelled') {
          metrics.cancelled_requests++;
        } else if (request.status === 'in_progress' || request.status === 'assigned' || request.status === 'pending') {
          metrics.in_progress_requests++;
        }
      });

      if (completedCount > 0) {
        metrics.avg_completion_time = Math.round(totalCompletionTime / completedCount / (1000 * 60));
      }

      setOverallMetrics(metrics);
    } catch (err) {
      console.error('Error loading overall metrics:', err);
    }
  };

  const calculateCancellationStats = (data: CancellationRecord[]) => {
    const reasonCounts: { [key: string]: number } = {};

    data.forEach((record) => {
      reasonCounts[record.reason] = (reasonCounts[record.reason] || 0) + 1;
    });

    const total = data.length;
    const statsArray = Object.entries(reasonCounts).map(([reason, count]) => ({
      reason,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));

    statsArray.sort((a, b) => b.count - a.count);
    setCancellationStats(statsArray);
  };

  const formatReason = (reason: string) => {
    return reason.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getReasonColor = (index: number) => {
    const colors = [
      'from-red-900/30 to-red-800/30 border-red-500/50',
      'from-orange-900/30 to-orange-800/30 border-orange-500/50',
      'from-yellow-900/30 to-yellow-800/30 border-yellow-500/50',
      'from-cyan-900/30 to-cyan-800/30 border-cyan-500/50',
      'from-blue-900/30 to-blue-800/30 border-blue-500/50',
      'from-slate-900/30 to-slate-800/30 border-slate-500/50',
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400 text-xl">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6 lg:p-8 relative overflow-hidden w-full">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 via-black to-black"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#0a0a0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

      <div className="max-w-7xl mx-auto relative w-full">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl font-bold text-cyan-400 uppercase tracking-wider">Analytics & Insights</h1>
          </div>
          <p className="text-slate-400">Comprehensive metrics and performance data</p>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-4 mb-6">
          <button
            onClick={() => setTimeFilter('7d')}
            className={`px-3 sm:px-4 py-2 clip-corners border-2 ${timeFilter === '7d' ? 'bg-cyan-900/30 border-cyan-500/50 text-cyan-400' : 'bg-slate-900/50 border-cyan-500/20 text-slate-400'} transition-all uppercase tracking-widest text-xs sm:text-sm`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeFilter('30d')}
            className={`px-3 sm:px-4 py-2 clip-corners border-2 ${timeFilter === '30d' ? 'bg-cyan-900/30 border-cyan-500/50 text-cyan-400' : 'bg-slate-900/50 border-cyan-500/20 text-slate-400'} transition-all uppercase tracking-widest text-xs sm:text-sm`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeFilter('all')}
            className={`px-3 sm:px-4 py-2 clip-corners border-2 ${timeFilter === 'all' ? 'bg-cyan-900/30 border-cyan-500/50 text-cyan-400' : 'bg-slate-900/50 border-cyan-500/20 text-slate-400'} transition-all uppercase tracking-widest text-xs sm:text-sm`}
          >
            All Time
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-slate-900/50 to-black/50 border-2 border-cyan-500/30 clip-corners p-6 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-cyan-400" />
              <div className="text-3xl font-bold text-cyan-400">{overallMetrics.total_requests}</div>
            </div>
            <div className="text-slate-400 text-sm uppercase tracking-widest">Total Requests</div>
          </div>

          <div className="bg-gradient-to-br from-slate-900/50 to-black/50 border-2 border-green-500/30 clip-corners p-6 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <div className="text-3xl font-bold text-green-400">{overallMetrics.completed_requests}</div>
            </div>
            <div className="text-slate-400 text-sm uppercase tracking-widest">Completed</div>
          </div>

          <div className="bg-gradient-to-br from-slate-900/50 to-black/50 border-2 border-red-500/30 clip-corners p-6 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <div className="flex items-center justify-between mb-2">
              <XCircle className="w-8 h-8 text-red-400" />
              <div className="text-3xl font-bold text-red-400">{overallMetrics.cancelled_requests}</div>
            </div>
            <div className="text-slate-400 text-sm uppercase tracking-widest">Cancelled</div>
          </div>

          <div className="bg-gradient-to-br from-slate-900/50 to-black/50 border-2 border-yellow-500/30 clip-corners p-6 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-yellow-400" />
              <div className="text-3xl font-bold text-yellow-400">{overallMetrics.avg_completion_time}</div>
            </div>
            <div className="text-slate-400 text-sm uppercase tracking-widest">Avg Time (min)</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-slate-900/50 to-black/50 border-2 border-cyan-500/30 clip-corners p-6 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <h2 className="text-xl font-bold text-cyan-400 mb-4 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Service Performance
            </h2>
            <div className="space-y-4">
              {serviceStats.map((service) => (
                <div key={service.service_name} className="bg-slate-900/50 border border-cyan-500/20 clip-corners p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-bold">{service.service_name}</span>
                    <span className="text-cyan-400 text-sm">{service.total} total</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-green-900/20 border border-green-500/30 clip-corners p-2 text-center">
                      <div className="text-green-400 font-bold">{service.completed}</div>
                      <div className="text-slate-400">Completed</div>
                    </div>
                    <div className="bg-yellow-900/20 border border-yellow-500/30 clip-corners p-2 text-center">
                      <div className="text-yellow-400 font-bold">{service.in_progress}</div>
                      <div className="text-slate-400">Active</div>
                    </div>
                    <div className="bg-red-900/20 border border-red-500/30 clip-corners p-2 text-center">
                      <div className="text-red-400 font-bold">{service.cancelled}</div>
                      <div className="text-slate-400">Cancelled</div>
                    </div>
                  </div>
                </div>
              ))}
              {serviceStats.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No service data for this period
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900/50 to-black/50 border-2 border-cyan-500/30 clip-corners p-6 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <h2 className="text-xl font-bold text-cyan-400 mb-4 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Cancellation Breakdown
            </h2>
            <div className="space-y-3">
              {cancellationStats.map((stat, index) => (
                <div key={stat.reason}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-300 text-sm">{formatReason(stat.reason)}</span>
                    <span className="text-cyan-400 font-bold">{stat.count} ({stat.percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 bg-slate-800 clip-corners overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${getReasonColor(index)} transition-all duration-500`}
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
              {cancellationStats.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No cancellation data for this period
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900/50 to-black/50 border-2 border-cyan-500/30 clip-corners p-6 shadow-[0_0_20px_rgba(6,182,212,0.2)] max-h-[600px] overflow-y-auto">
          <h2 className="text-xl font-bold text-cyan-400 mb-4 uppercase tracking-wider flex items-center gap-2 sticky top-0 bg-gradient-to-br from-slate-900/95 to-black/95 pb-2">
            <MessageSquare className="w-5 h-5" />
            Recent Cancellations
          </h2>
          <div className="space-y-4">
            {cancellations.map((cancellation) => (
              <div key={cancellation.id} className="bg-slate-900/50 border-2 border-red-500/20 clip-corners p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-cyan-400 font-bold">{cancellation.service_requests.tracking_code}</div>
                    <div className="text-slate-400 text-xs">{cancellation.service_requests.client_name}</div>
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(cancellation.cancelled_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="mb-2">
                  <span className="inline-block px-3 py-1 bg-red-900/30 border border-red-500/50 clip-corners text-red-400 text-xs uppercase tracking-wider">
                    {formatReason(cancellation.reason)}
                  </span>
                </div>
                {cancellation.additional_details && (
                  <div className="text-slate-400 text-sm italic border-l-2 border-cyan-500/30 pl-3 mt-2">
                    "{cancellation.additional_details}"
                  </div>
                )}
                <div className="mt-2 text-xs text-slate-500">
                  Service: {cancellation.service_requests.service_types.name} •
                  System: {cancellation.service_requests.star_citizen_systems.code}
                </div>
              </div>
            ))}
            {cancellations.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                No cancellations found for this period
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
