import React from 'react';
import { Search, Download, Plus } from 'lucide-react';
import type { Category } from '@/services/ticketService';

type TicketFiltersProps = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  categories: Category[];
  userRole: string;
  onExport: () => void;
  onCreateTicket: () => void;
};

const TicketFilters: React.FC<TicketFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  categories,
  userRole,
  onExport,
  onCreateTicket
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 mb-4">
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-4 items-center">
        {/* Search Bar */}
        <div className="relative flex-1 w-full lg:flex-[2]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ticket #, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-2 w-full lg:w-auto lg:flex-shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 lg:flex-none min-w-[120px] px-3 sm:px-4 py-2 sm:py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base text-gray-900 dark:text-white cursor-pointer"
          >
            <option>All Status</option>
            <option>Pending</option>
            <option>Resolved</option>
            <option>In Progress</option>
            <option>Closed</option>
            <option>Reopen</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex-1 lg:flex-none min-w-[120px] px-3 sm:px-4 py-2 sm:py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base text-gray-900 dark:text-white cursor-pointer"
          >
            <option>All Departments</option>
            {categories.map(category => (
              <option key={category._id} value={category.name}>{category.name}</option>
            ))}
          </select>

          {userRole === 'manager' && (
            <button
              onClick={onCreateTicket}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl transition-all shadow-lg font-medium cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm sm:text-base">Create Ticket</span>
            </button>
          )}
          <button
            onClick={onExport}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            <span className="font-medium text-sm sm:text-base text-gray-700 dark:text-gray-300 hidden sm:inline">Export</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketFilters;

