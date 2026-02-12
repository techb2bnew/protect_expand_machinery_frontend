import React from 'react';
import { Ticket as TicketIcon, Clock, PlayCircle, CheckCircle } from 'lucide-react';
import { StatsSkeletonLoader } from '../ui/Loader';

type TicketStatsProps = {
  tickets: Array<{ status: string }>;
  loading: boolean;
};

const TicketStats: React.FC<TicketStatsProps> = ({ tickets, loading }) => {
  const pendingCount = tickets.filter(t => String(t.status) === 'pending').length;
  const inProgressCount = tickets.filter(t => String(t.status) === 'in_progress').length;
  const closedCount = tickets.filter(t => ['closed', 'resolved'].includes(String(t.status))).length;

  const stats = [
    { title: 'Total Tickets', value: tickets.length.toString(), change: 'All tickets', color: 'from-red-700 to-red-900', icon: TicketIcon },
    { title: 'Pending', value: pendingCount.toString(), change: 'Awaiting assignment', color: 'from-orange-700 to-orange-900', icon: Clock },
    { title: 'In Progress', value: inProgressCount.toString(), change: 'Being worked on', color: 'from-cyan-700 to-blue-900', icon: PlayCircle },
    { title: 'Closed & Resolved', value: closedCount.toString(), change: 'Successfully completed', color: 'from-green-700 to-emerald-900', icon: CheckCircle },
  ];

  if (loading && tickets.length === 0) {
    return <StatsSkeletonLoader />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <div 
            key={index} 
            className={`group bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white relative overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-500/20 hover:scale-[1.02]`}
          >
            <div className="relative z-10 transition-transform duration-300 group-hover:scale-105">
              <p className="text-white/80 text-sm mb-1 font-semibold uppercase tracking-wide">{stat.title}</p>
              <p className="text-4xl font-bold mb-2 text-white">{stat.value}</p>
              <p className="text-white/60 text-xs mt-1">{stat.change}</p>
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 transition-all duration-300 group-hover:opacity-50 group-hover:scale-110">
              {IconComponent && <IconComponent className="w-16 h-16 text-white" />}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TicketStats;

