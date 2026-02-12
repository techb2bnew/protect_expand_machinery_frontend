import React from 'react';
import { Eye, MessageSquare, Paperclip } from 'lucide-react';
import { TableColumn } from '../ui/CustomTable';
import type { Ticket } from '@/services/ticketService';
import { useRouter } from 'next/navigation';

type AppRouterInstance = ReturnType<typeof useRouter>;

type TicketStatus = 'pending' | 'in_progress' | 'closed' | 'resolved' | 'reopen';

const statusColors: Record<TicketStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  in_progress: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  closed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  resolved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  reopen: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
};

// Helper functions
const getInitials = (name: string) => {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase();
};

const getColor = (index: number) => {
  const colors = ['bg-cyan-400', 'bg-blue-400', 'bg-purple-400', 'bg-green-400', 'bg-orange-400', 'bg-pink-400'];
  return colors[index % colors.length];
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB');
};

export const createTicketColumns = (
  filteredTickets: Ticket[],
  userRole: string,
  agents: { _id: string, name: string, email: string }[],
  handleSort: (field: string) => void,
  getSortIcon: (field: string) => React.ReactNode,
  handleAgentChange: (ticketId: string, agentId: string) => void,
  router: AppRouterInstance,
  openChatbot: (ticketId: string, row: Ticket) => void
): TableColumn<Ticket>[] => {
  return [
    {
      key: 'ticketNumber',
      label: 'Ticket Number',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <a
            href={`/dashboard/tickets/${row._id}`}
            onClick={(e) => {
              e.preventDefault();
              router.push(`/dashboard/tickets/${row._id}`);
            }}
            className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 hover:underline cursor-pointer transition-colors"
          >
            {value as string}
          </a>
          {row.attachments && row.attachments.length > 0 && (
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <Paperclip className="w-3 h-3" />
              <span className="text-xs">{row.attachments.length}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      sortable: true,
      render: (value, row) => {
        const index = filteredTickets.findIndex(t => t._id === row._id);
        return (
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 ${getColor(index)} rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm`}>
              {getInitials(row.customer?.name)}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white truncate">{row?.customer?.name}</p>
              <a
                href={`mailto:${row?.customer?.email}`}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:underline cursor-pointer transition-colors truncate block"
                title={`Send email to ${row?.customer?.email}`}
              >
                {row?.customer?.email}
              </a>
            </div>
          </div>
        );
      },
    },
    // {
    //   key: 'description',
    //   label: 'Description',
    //   sortable: false,
    //   hidden: 'md',
    //   render: (value, row) => {
    //     const description = row.description || '';
    //     const truncatedDescription = description.length > 15
    //       ? description.substring(0, 15) + '...'
    //       : description;

    //     return (
    //       <div>
    //         <p className="text-xs sm:text-sm text-gray-900 dark:text-white mb-1" title={description}>
    //           {truncatedDescription}
    //         </p>
    //         {row.equipmentId?.name && (
    //           <p className="text-xs text-blue-600 dark:text-blue-400">{row.equipmentId.name}</p>
    //         )}
    //       </div>
    //     );
    //   },
    // },
    {
      key: 'categoryId',
      label: 'Category',
      sortable: true,
      hidden: 'lg',
      render: (value, row) => (
        <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{row.categoryId?.name || 'N/A'}</span>
      ),
    },
    // {
    //   key: 'status',
    //   label: 'Status',
    //   sortable: true,
    //   render: (value) => {
    //     const statusText = (value as string).replace('_', ' ');
    //     const formattedText = statusText.split(' ').map(word =>
    //       word.charAt(0).toUpperCase() + word.slice(1)
    //     ).join(' ');
    //     const status = value as TicketStatus;
    //     const colorClass = statusColors[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';

    //     return (
    //       <span
    //         className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap inline-flex ${colorClass}`}
    //         title={formattedText}
    //       >
    //         <span className="hidden sm:inline">{formattedText}</span>
    //         <span className="sm:hidden">
    //           {value === 'in_progress' ? 'Progress' : formattedText.split(' ')[0]}
    //         </span>
    //       </span>
    //     );
    //   },
    // },
    // {
    //   key: 'assignedAgent',
    //   label: 'Assigned',
    //   sortable: true,
    //   hidden: 'lg',
    //   customHeader: (
    //     <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('assigned')}>
    //       Assigned
    //       {getSortIcon('assigned')}
    //     </div>
    //   ),
    //   customCell: (row) => {
    //     if (userRole === 'manager') {
    //       const isClosed = row.status === 'closed';
    //       const list = row.customerslist ?? [];
      
    //       return (
    //         <select
    //           value={row.assignedAgent?._id || 'unassigned'}
    //           onChange={(e) => {
    //             if (isClosed) return;
    //             handleAgentChange(row._id, e.target.value);
    //           }}
    //           disabled={isClosed}
    //           className={`w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm text-gray-900 dark:text-white ${
    //             isClosed ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
    //           }`}
    //           title={isClosed ? 'Ticket is closed. Assigned agent cannot be changed.' : undefined}
    //         >
    //           <option value="unassigned">Unassigned</option>
      
    //           {list.length === 0 ? (
    //             <option disabled>No agent for this category</option>
    //           ) : (
    //             list.map((agent) => (
    //               <option key={agent._id} value={agent._id}>
    //                 {agent.name}
    //               </option>
    //             ))
    //           )}
    //         </select>
    //       );
    //     }
      
    //     return row.assignedAgent ? (
    //       <div className="flex items-center gap-2">
    //         <div className="w-6 h-6 bg-gray-300 dark:bg-gray-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
    //           {getInitials(row.assignedAgent.name)}
    //         </div>
    //         <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
    //           {row.assignedAgent.name}
    //         </span>
    //       </div>
    //     ) : (
    //       <span className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">
    //         Unassigned
    //       </span>
    //     );
    //   },      
    // },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      hidden: 'lg',
      render: (value) => (
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <span className="text-xs sm:text-sm">{formatDate(value as string)}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      customCell: (row) => (
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            className="p-1.5 sm:p-2 hover:bg-blue-50 dark:hover:bg-gray-600 rounded-lg transition-colors cursor-pointer"
            title="View"
            onClick={() => router.push(`/dashboard/tickets/${row._id}`)}
          >
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
          </button>
          <button
            className="p-1.5 sm:p-2 hover:bg-green-50 dark:hover:bg-gray-600 rounded-lg transition-colors cursor-pointer"
            title="Reply"
            onClick={() => openChatbot(row._id, row)}
          >
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 dark:text-green-400" />
          </button>
        </div>
      ),
    },
  ];
};

