import React, { useEffect, useState } from 'react';
import { Paperclip, Download, ArrowLeft, Save, Edit2 } from 'lucide-react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import ticketService, { Ticket } from '@/services/ticketService';
import agentService, { Agent } from '@/services/agentService';
import { useAuth } from '@/contexts/AuthContext';
import ChatSection from './ChatSection';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import toast from '@/utils/toast';

export default function SupportTicketSystem() {

  // Dynamic header data
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<Ticket['status'] | null>(null);
  const [showAgentConfirm, setShowAgentConfirm] = useState(false);
  const [pendingAgentId, setPendingAgentId] = useState<string | null>(null);
  // This state is for the new note being added (we append on save)
  const [notes, setNotes] = useState<string>('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  // Prefer route param /dashboard/tickets/[id]; fallback to ?id= query if present
  const ticketId = (params?.id as string) || searchParams.get('id') || '';
  const userRole = user?.role || '';
  const IMAGE_BASE_URL = (process.env.NEXT_PUBLIC_FILE_BASE_URL as string);

  const resolveImageUrl = (url: string) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    const trimmed = url.startsWith('/') ? url.slice(1) : url;
    return `${IMAGE_BASE_URL}/${trimmed}`;
  };

  const getFileName = (url: string) => {
    try {
      const u = /^https?:\/\//i.test(url) ? new URL(url) : new URL(resolveImageUrl(url));
      const name = u.pathname.split('/').filter(Boolean).pop() || 'file';
      return name;
    } catch {
      const parts = url.split('?')[0].split('#')[0].split('/');
      return parts[parts.length - 1] || 'file';
    }
  };

  const handleDirectDownload = async (url: string) => {
    try {
      const fullUrl = resolveImageUrl(url);
      const response = await fetch(fullUrl, { method: 'GET' });
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = getFileName(fullUrl);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Fallback to normal navigation if fetch fails
      const fullUrl = resolveImageUrl(url);
      const a = document.createElement('a');
      a.href = fullUrl;
      a.download = getFileName(fullUrl);
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!ticketId) return;
      try {
        const t = await ticketService.getTicketId(ticketId);
        setTicket(t);
        // New note input should start empty; existing notes are shown read-only
        setNotes('');
      } catch (error: unknown) {
        const errorMessage = (error as Error)?.message || '';
        console.log('Failed to load ticket:', ticketId);
        // If ticket not found or access denied, redirect to tickets dashboard
        if (errorMessage.includes('not found') || errorMessage.includes('access denied')) {
          router.push('/dashboard/tickets');
        }
      }
    };
    load();
  }, [ticketId, router]);

  // Fetch agents when user is manager
  useEffect(() => {
    const loadAgents = async () => {
      try {
        if (userRole === 'manager') {
          const agentsList = await agentService.fetchAgents();
          setAgents(agentsList.data);
        }
      } catch (error) {
        console.error('Failed to load agents:', error);
      }
    };
    loadAgents();
  }, [userRole]);

  const handleStatusChangeRemote = (newStatus: Ticket['status']) => {
    if (!ticket) return;
    setPendingStatus(newStatus);
    setShowStatusConfirm(true);
  };

  const handleStatusConfirm = async () => {
    if (!ticket || !pendingStatus) return;
    try {
      setStatusUpdating(true);
      const updated = await ticketService.updateTicket(ticket._id, { status: pendingStatus });
      setTicket(updated);
      setShowStatusConfirm(false);
      setPendingStatus(null);
      toast.success(`Status updated to "${(updated.status || pendingStatus).replace('_', ' ').toUpperCase()}"`);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleStatusCancel = () => {
    setShowStatusConfirm(false);
    setPendingStatus(null);
  };

  const handleAgentChange = (agentId: string) => {
    if (!ticket) return;
    setPendingAgentId(agentId);
    setShowAgentConfirm(true);
  };

  const handleAgentConfirm = async () => {
    if (!ticket || !pendingAgentId) return;
    try {
      if (pendingAgentId === 'unassigned') {
        // For unassigning, we'll need to reload the ticket
        // or implement an unassign API call
        console.log('Unassign functionality needs to be implemented');
        setShowAgentConfirm(false);
        setPendingAgentId(null);
        toast.error('Unassign functionality is not implemented yet');
        return;
      }
      const updated = await ticketService.assignTicket(ticket._id, pendingAgentId);
      setTicket(updated);

      // Reload ticket to get latest data including chat messages
      const refreshedTicket = await ticketService.getTicketId(ticket._id);
      setTicket(refreshedTicket);
      setShowAgentConfirm(false);
      setPendingAgentId(null);
      toast.success('Agent assigned successfully');
    } catch (error) {
      console.error('Failed to update agent:', error);
      setShowAgentConfirm(false);
      setPendingAgentId(null);
      toast.error('Failed to assign agent');
    }
  };

  const handleAgentCancel = () => {
    setShowAgentConfirm(false);
    setPendingAgentId(null);
  };

  const handleSaveNotes = async () => {
    if (!ticket) return;
    try {
      setSavingNotes(true);
      const updated = await ticketService.updateTicketNotes(ticket._id, notes);
      setTicket(updated);
      setNotes('');
      setIsEditingNotes(false);
      toast.success('Notes saved successfully');
    } catch (error) {
      console.error('Failed to save notes:', error);
      toast.error('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCancelEditNotes = () => {
    setNotes('');
    setIsEditingNotes(false);
  };

  const getAgentName = (agentId: string) => {
    if (agentId === 'unassigned') return 'Unassigned';
    const agent = agents.find(a => a._id === agentId);
    return agent ? `${agent.firstName} ${agent.lastName}`.trim() : 'Unknown Agent';
  };

  const formatDateTime = (value?: string) => {
    if (!value) return 'N/A';
    try {
      return new Date(value).toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const formatDateOnly = (dateString?: string) => {
    if (!dateString) return '';
    try {
      // Extract date from brackets if present (e.g., [2025-12-26T07:13:02.597Z])
      const bracketMatch = dateString.match(/\[([^\]]+)\]/);
      if (bracketMatch && bracketMatch[1]) {
        const date = new Date(bracketMatch[1]);
        if (!isNaN(date.getTime())) {
          const formattedDate = date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          // Get text after brackets if any
          const textAfterBrackets = dateString.replace(/\[[^\]]+\]\s*/, '').trim();
          return textAfterBrackets ? `${formattedDate} ${textAfterBrackets}` : formattedDate;
        }
      }
      // If no brackets, try to parse as date directly
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
      return dateString; // Return original string if not a valid date
    } catch {
      return dateString; // Return original string if parsing fails
    }
  };

  const statusBadgeClass = (s?: Ticket['status']) => {
    switch (s) {
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'resolved': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'in_progress': return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300';
      case 'closed': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  const formatStatus = (status?: Ticket['status']) => {
    if (!status) return 'N/A';
    const statusText = status.replace('_', ' ');
    return statusText.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <main className="flex-1 overflow-auto p-4 sm:p-6 bg-gray-50 dark:bg-gray-900">
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 mb-4 sm:mb-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 w-full lg:w-auto">
            <button className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-xl font-semibold text-blue-600 dark:text-blue-400 truncate">Ticket Details & Communication</h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Ticket #{ticket?.ticketNumber} - {ticket?.customer?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">Status:</span>
            <select
              value={(ticket?.status as string) || 'pending'}
              onChange={(e) => {
                if (ticket?.status === 'closed' && e.target.value !== 'reopen') return; // guard on UI - only allow reopen for closed tickets
                handleStatusChangeRemote(e.target.value as Ticket['status']);
              }}
              disabled={statusUpdating}
              className={`flex-1 lg:flex-none border border-gray-300 cursor-pointer dark:border-gray-600 rounded-lg px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500`}
              title={ticket?.status === 'closed' ? 'Ticket is closed. You can reopen it.' : undefined}
            >
              {ticket?.status === 'closed' ? (
                <>
                  <option value="closed" disabled>Closed</option>
                  <option value="reopen">Reopen</option>
                </>
              ) : (
                <>
                  <option value="reopen">Reopen</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column - Chat & Ticket Info */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Chat Box */}
          {/* <ChatSection ticket={ticket} /> */}

          {/* Ticket Information */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 hover:shadow-md transition-shadow duration-300">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white">Ticket Information</h3>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-1">Description</p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 break-words" >{ticket?.description || 'N/A'}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-1">Equipment</p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">{ticket?.equipmentId?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-1">Serial</p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">{ticket?.serialNumber || 'N/A'}</p>
                </div>
                {ticket?.control && (
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-1">Control</p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">{ticket.control}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 hover:shadow-md transition-shadow duration-300">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white">Attachments</h3>
            <div className="space-y-2 sm:space-y-3">
              {(ticket?.attachments || []).length === 0 && (
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">No attachments uploaded.</p>
              )}
              {(ticket?.attachments || []).map((url, index) => {
                const fullUrl = resolveImageUrl(url);
                const fileName = getFileName(fullUrl);
                return (
                  <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <Paperclip className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 shrink-0" />
                      <a href={fullUrl} target="_blank" rel="noreferrer" className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 hover:underline font-medium truncate">
                        {fileName}
                      </a>
                    </div>
                    <button onClick={() => handleDirectDownload(url)} className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1 whitespace-nowrap flex-shrink-0">
                      <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Download</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column - Ticket & Customer Details */}
        <div className="space-y-4 sm:space-y-6">
          {/* Ticket Details Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 hover:shadow-md transition-shadow duration-300">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white">Ticket Details</h3>
            <div className="space-y-3 sm:space-y-4">
              {/* <div>
                <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-2">Status</p>
                <span className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${statusBadgeClass(ticket?.status)}`}>
                  {formatStatus(ticket?.status)}
                </span>
              </div> */}
              <div>
                <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-1">Category</p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">{ticket?.categoryId?.name || 'N/A'}</p>
              </div>
              {/* <div>
                <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-1">Assigned Agent</p>
                {userRole === 'manager' ? (
                  <select
                    value={ticket?.assignedAgent?._id || 'unassigned'}
                    onChange={(e) => {
                      if (ticket?.status === 'closed') return; // guard on UI
                      handleAgentChange(e.target.value);
                    }}
                    disabled={ticket?.status === 'closed'}
                    className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-white cursor-pointer dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm text-gray-900 dark:text-white ${ticket?.status === 'closed' ? 'opacity-70 cursor-not-allowed' : ''}`}
                    title={ticket?.status === 'closed' ? 'Ticket is closed. Assigned agent cannot be changed.' : undefined}
                  >
                    <option value="unassigned">Unassigned</option>
                    {agents.map((agent) => (
                      <option key={agent._id} value={agent._id}>
                        {`${agent.firstName} ${agent.lastName}`.trim()}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">{ticket?.assignedAgent?.name || 'Unassigned'}</p>
                )}
              </div> */}
              <div>
                <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-1">Created</p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">{formatDateTime(ticket?.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-1">Last Updated</p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">{formatDateTime(ticket?.updatedAt)}</p>
              </div>
            </div>
          </div>

          {/* Customer Information Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 hover:shadow-md transition-shadow duration-300">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white">Customer Information</h3>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden flex-shrink-0 bg-blue-500 text-white font-semibold text-sm sm:text-base flex items-center justify-center">
                  {ticket?.customer?.profileImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveImageUrl(ticket.customer.profileImage)}
                      alt={ticket.customer.name || 'Customer Avatar'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    ticket?.customer?.name ? ticket.customer.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'N/A'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm sm:text-base text-blue-600 dark:text-blue-400 truncate">{ticket?.customer?.name || 'N/A'}</p>
                  <a href={`mailto:${ticket?.customer?.email || ''}`} className="text-blue-600 dark:text-blue-400 hover:underline text-xs sm:text-sm break-all">
                    Email: {ticket?.customer?.email || 'N/A'}
                  </a>
                  {ticket?.customer?.phone && ticket.customer.phone !== 'N/A' ? (
                    <a
                      href={`tel:${ticket.customer.phone}`}
                      className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:underline truncate block mt-1"
                      title={`Call ${ticket.customer.phone}`}
                    >
                      Phone: {ticket.customer.phone}
                    </a>
                  ) : (
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate mt-1">Phone: N/A</p>
                  )}
                </div>
              </div>
              <div>
                {/* <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                  Email
                </p>
                <a href={`mailto:${ticket?.customer?.email || ''}`} className="text-blue-600 dark:text-blue-400 hover:underline text-xs sm:text-sm break-all">
                  {ticket?.customer?.email || 'N/A'}
                </a> */}
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Notes</h3>
              {!isEditingNotes && (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="cursor-pointer p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Edit notes"
                >
                  <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              )}
            </div>
            {isEditingNotes ? (
              <div className="space-y-3">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a new note about this ticket..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white text-sm resize-none"
                  rows={6}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    {savingNotes ? 'Saving...' : 'Save Notes'}
                  </button>
                  <button
                    onClick={handleCancelEditNotes}
                    disabled={savingNotes}
                    className="cursor-pointer px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {ticket?.notes && (
                  Array.isArray(ticket.notes) && (
                    ticket.notes.map((block, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-gray-900/40"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDateOnly(block.split('\n')[0])}
                          </p>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {block.split('\n').slice(1).join('\n') || block}
                        </p>
                      </div>
                    ))
                  )
                )}
                {!ticket?.notes && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    No notes added yet. Click edit to add notes.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Change Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showStatusConfirm}
        onClose={handleStatusCancel}
        onConfirm={handleStatusConfirm}
        title="Change Ticket Status"
        message={`Are you sure you want to change the ticket status to "${pendingStatus?.replace('_', ' ').toUpperCase()}"?`}
        confirmText="Change Status"
        cancelText="Cancel"
        type="warning"
        loading={statusUpdating}
      />

      {/* Agent Assignment Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showAgentConfirm}
        onClose={handleAgentCancel}
        onConfirm={handleAgentConfirm}
        title="Assign Agent"
        message={`Are you sure you want to assign this ticket to "${getAgentName(pendingAgentId || '')}"?`}
        confirmText="Assign Agent"
        cancelText="Cancel"
        type="warning"
        loading={false}
      />
    </main>
  );
}