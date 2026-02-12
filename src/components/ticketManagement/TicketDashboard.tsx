'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import ticketService from '@/services/ticketService';
import type { Ticket, Category } from '@/services/ticketService';
import Chatbot from './Chatbot';
import ConfirmDialog from '../ui/ConfirmDialog';
import CustomTable from '../ui/CustomTable';
import { TableSkeletonLoader } from '../ui/Loader';
import agentService from '@/services/agentService';
import { useAuth } from '@/contexts/AuthContext';
import toast from '@/utils/toast';
import CreateTicketModal from './CreateTicketModal';
import customerService, { type ApiCustomer } from '@/services/customerService';
import equipmentService from '@/services/equipmentService';
import TicketStats from './TicketStats';
import TicketFilters from './TicketFilters';
import { createTicketColumns } from './TicketTableColumns';
import { exportTicketsToCSV } from '@/utils/exportUtils';

export default function TicketDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [agents, setAgents] = useState<{ _id: string, name: string, email: string }[]>([]);
  const [customers, setCustomers] = useState<{ _id: string, name: string, email: string }[]>([]);
  const [equipment, setEquipment] = useState<{ _id: string, name: string, serialNumber: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatTicketId, setChatTicketId] = useState<string | null>(null);
  const [chatTicketData, setChatTicketData] = useState<Ticket | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [changingAgent, setChangingAgent] = useState(false);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    type: 'warning'
  });
  const router = useRouter();
  const userRole = user?.role || '';
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15); // default per page



  // Fetch tickets, categories, agents, customers, and equipment on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [ticketsData, categoriesData, agentsData, customersData, equipmentData] = await Promise.all([
          ticketService.fetchTickets(),
          ticketService.fetchCategories(),
          agentService.fetchAgents(),
          customerService.fetchCustomers(1, 1000, '').catch(() => ({ customers: [] })),
          equipmentService.fetchEquipment().catch(() => [])
        ]);
        setTickets(ticketsData);
        setCategories(categoriesData);
        setAgents(agentsData.data.map(agent => ({
          _id: agent._id,
          name: agent.firstName + ' ' + agent.lastName,
          email: agent.email
        })));
        setCustomers(customersData.customers.map((customer: ApiCustomer & { id?: string }) => ({
          _id: customer._id || customer.id || '',
          name: customer.name,
          email: customer.email
        })));
        setEquipment(equipmentData.map((eq) => ({
          _id: eq._id || eq.id,
          name: eq.name,
          serialNumber: eq.serialNumber || ''
        })));
      } catch (error: unknown) {
        setError((error as Error).message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Sorting function
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Get sort icon for a field
  const getSortIcon = (field: string) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4 opacity-40" />;
    }
    return sortOrder === 'asc'
      ? <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" />
      : <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" />;
  };

  const filteredTickets = tickets
    .filter((ticket) => {
      const matchesSearch =
        ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket._id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ticket.equipmentId?.name && ticket.equipmentId.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'All Status' || ticket.status === statusFilter.toLowerCase().replace(' ', '_');
      const matchesCategory = categoryFilter === 'All Categories' || (ticket.categoryId?.name && ticket.categoryId.name === categoryFilter);

      return matchesSearch && matchesStatus && matchesCategory;
    })
    .sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortBy) {
        case 'ticketNumber':
          aValue = a.ticketNumber;
          bValue = b.ticketNumber;
          break;
        case 'customer':
          aValue = a.customer.name.toLowerCase();
          bValue = b.customer.name.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'category':
          aValue = a.categoryId?.name?.toLowerCase() || '';
          bValue = b.categoryId?.name?.toLowerCase() || '';
          break;
        case 'assigned':
          aValue = a.assignedAgent?.name?.toLowerCase() || 'zzzz'; // Put unassigned at end
          bValue = b.assignedAgent?.name?.toLowerCase() || 'zzzz';
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Compute pagination
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize));
  const paginatedTickets = filteredTickets.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  // Keep page in bounds and reset on filters/search change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, categoryFilter]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);


  const toggleTicketSelection = (id: string) => {
    setSelectedTickets(prev =>
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  const openChatbot = (ticketId: string, row: Ticket) => {
    setChatTicketData(row);
    setChatTicketId(ticketId);
    setShowChatbot(true);
  };

  const closeChatbot = () => {
    setShowChatbot(false);
    setChatTicketId(null);
  };

  const toggleAllTickets = () => {
    setSelectedTickets(prev =>
      prev.length === filteredTickets.length ? [] : filteredTickets.map(t => t._id)
    );
  };

  const exportTickets = () => {
    try {
      const ticketsToExport = selectedTickets.length > 0
        ? filteredTickets.filter(ticket => selectedTickets.includes(ticket._id))
        : filteredTickets;

      exportTicketsToCSV(ticketsToExport);
      toast.success(`Exported ${ticketsToExport.length} ticket(s) successfully`);
    } catch (error) {
      toast.error((error as Error).message || 'Failed to export tickets');
    }
  };

  const handleAgentChange = (ticketId: string, agentId: string) => {
    if (userRole !== 'manager') return;

    const ticket = tickets.find(t => t._id === ticketId);

    // Do not allow agent change if ticket is closed
    if (ticket?.status === 'closed') {
      toast.error('Ticket is closed. Assigned agent cannot be changed.');
      return;
    }

    const selectedAgent = agents.find(a => a._id === agentId);
    const currentAgent = ticket?.assignedAgent?.name || 'Unassigned';

    setConfirmDialog({
      isOpen: true,
      title: 'Change Agent',
      message: `Are you sure you want to change agent Assigned for ticket ${ticket?.ticketNumber || ''} from ${currentAgent} to ${agentId === 'unassigned' ? 'Unassigned' : selectedAgent?.name || 'Unknown'}?`,
      onConfirm: async () => {
        try {
          setChangingAgent(true);
          if (agentId === 'unassigned') {
            // Handle unassigning agent
            const updatedTickets = await ticketService.fetchTickets();
            setTickets(updatedTickets);

            // Show success toast
            toast.success(`Agent unassigned from ticket ${ticket?.ticketNumber || ''}`);
          } else {
            await ticketService.assignTicket(ticketId, agentId);
            // Refresh tickets after assignment
            const updatedTickets = await ticketService.fetchTickets();
            setTickets(updatedTickets);

            // Show success toast
            toast.success(`Agent ${selectedAgent?.name || ''} assigned to ticket ${ticket?.ticketNumber || ''}`);
          }
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        } catch (error: unknown) {
          setError((error as Error).message || 'Failed to assign agent');
          toast.error((error as Error).message || 'Failed to assign agent');
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        } finally {
          setChangingAgent(false);
        }
      },
      type: 'warning'
    });
  };

  const handleCreateTicket = async (formData: {
    customerId: string;
    description: string;
    categoryId: string;
    equipmentId: string;
    serialNumber: string;
    controlChoice: string;
    equipmentModel: string;
    modelNo: string;
    attachments: File[];
  }) => {
    try {
      setCreatingTicket(true);
      
      // Get category name to determine support_type
      const selectedCategory = categories.find(cat => cat._id === formData.categoryId);
      const categoryName = selectedCategory?.name || '';
      
      // Map category name to support_type
      let support_type = '';
      const categoryLower = categoryName.toLowerCase();
      if (categoryLower.includes('applications support')) {
        support_type = 'applications_support';
      } else if (categoryLower.includes('service support')) {
        support_type = 'service_support';
      } else if (categoryLower.includes('parts support')) {
        support_type = 'parts_support';
      } else if (categoryLower.includes('sales support')) {
        support_type = 'sales_support';
      }
      
      await ticketService.createTicket({
        description: formData.description,
        categoryId: formData.categoryId,
        customerId: formData.customerId,
        equipmentId: formData.equipmentId || undefined,
        serialNumber: formData.serialNumber || undefined,
        control: formData.controlChoice || undefined,
        support_type: support_type || undefined,
        equipmentModel: formData.equipmentModel || undefined,
        modelNo: formData.modelNo || undefined,
        attachments: formData.attachments.length > 0 ? formData.attachments : undefined
      });

      // Refresh tickets list
      const updatedTickets = await ticketService.fetchTickets();
      setTickets(updatedTickets);

      toast.success('Ticket created successfully!');
      setShowCreateModal(false);
    } catch (error: unknown) {
      const errorMessage = (error as Error).message || 'Failed to create ticket';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setCreatingTicket(false);
    }
  };


  // Create table columns
  const columns = createTicketColumns(
    filteredTickets,
    userRole,
    agents,
    handleSort,
    getSortIcon,
    handleAgentChange,
    router,
    openChatbot
  );


  if (error) {
    return (
      <main className="flex-1 overflow-auto pt-2 pb-4 px-4 sm:pt-3 sm:pb-6 sm:px-6 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-center h-64">
          <div className="text-center px-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Tickets</h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm sm:text-base"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="flex-1 overflow-auto pt-2 pb-4 px-4 sm:pt-3 sm:pb-6 sm:px-6 bg-white dark:bg-gray-900">
        {/* Page Header */}
        <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 dark:text-purple-400 bg-clip-text text-transparent mb-1.5">
              Ticket & Communication Management
            </h2>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Unified support ticket and communication hub</p>
          </div>

        </div>

        {/* Stats Grid */}
        {/* <TicketStats tickets={tickets} loading={loading} /> */}

        {/* Search and Filters */}
        <TicketFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          categories={categories}
          userRole={userRole}
          onExport={exportTickets}
          onCreateTicket={() => setShowCreateModal(true)}
        />

        {loading && tickets.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <TableSkeletonLoader rows={5} cols={7} />
          </div>
        ) : !loading && tickets.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-10 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
              No records available
            </p>
          </div>
        ) : (
          <CustomTable<Ticket>
            columns={columns}
            data={paginatedTickets}
            selectedRows={selectedTickets}
            toggleAllRows={toggleAllTickets}
            toggleRowSelection={toggleTicketSelection}
            handleSort={handleSort}
            getSortIcon={getSortIcon}
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            getRowId={(row) => row._id}
            limit={pageSize}
            setLimit={setPageSize}
          />
        )}


        {/* Old Table removed - now using CustomTable above */}

        {/* Inline Chatbot Widget */}
        <Chatbot
          isOpen={showChatbot}
          onClose={closeChatbot}
          ticketId={chatTicketId}
          chatTicketData={chatTicketData}
        />

        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          type={confirmDialog.type}
          confirmText="Change"
          cancelText="Cancel"
          loading={changingAgent}
        />

        <CreateTicketModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTicket}
          categories={categories}
          customers={customers}
          equipment={equipment}
          loading={creatingTicket}
        />
      </main>
    </>
  );
}