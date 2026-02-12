'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Users, Activity, User, Phone, Mail, UserPlus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import AgentModal, { AgentFormData } from './AgentModal';
import AgentViewModal from './AgentViewModal';
import ConfirmDialog from '../ui/ConfirmDialog';
import CustomTable, { TableColumn } from '../ui/CustomTable';
import { TableSkeletonLoader, StatsSkeletonLoader } from '../ui/Loader';
import ExportButton, { ExportColumn } from '../ui/ExportButton';
import agentService, { Agent } from '@/services/agentService';
import toast from '@/utils/toast';
import { useSocket } from '@/contexts/SocketContext';

// Extended interface for display purposes
interface DisplayAgent extends Agent {
    id: string;
    name: string;
    initials: string;
    color: string;
    isActive?: boolean;
}

const statsConfig = [
    { key: 'totalAgents', title: 'Total Agents', subtitle: 'Team size growing', color: 'from-red-700 to-red-900', icon: Users },
    { key: 'newThisWeek', title: 'New This Week', subtitle: 'Recently added', color: 'from-green-700 to-emerald-900', icon: UserPlus },
    { key: 'activeAgents', title: 'Active Agents', subtitle: 'Ready to help', color: 'from-pink-700 to-pink-900', icon: Activity },
    { key: 'deactivatedAgents', title: 'Deactivated Agents', subtitle: 'Currently away', color: 'from-orange-700 to-orange-900', icon: User },
];

export default function AgentManagement() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
    const [viewingAgent, setViewingAgent] = useState<Agent | null>(null);
    const [agents, setAgents] = useState<DisplayAgent[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(1);
    const [limit, setLimit] = useState<number>(15);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [totalAgents, setTotalAgents] = useState<number>(0);
    const [sortField, setSortField] = useState<'name' | 'email' | 'phone' | 'status' | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [categories, setCategories] = useState<{ _id: string, name: string }[]>([]);

    // Define columns for the table
    const columns: TableColumn<DisplayAgent>[] = [
        {
            key: 'name',
            label: 'Name',
            sortable: true,
            render: (value, row) => (
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 ${row.color} rounded-lg flex items-center justify-center text-white font-semibold text-xs sm:text-sm`}>
                        {row.initials}
                    </div>
                    <div className="min-w-0">
                        <p className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors truncate">{row.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{row.role}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'email',
            label: 'Email',
            sortable: true,
            render: (value) => (
                <div className="flex items-center gap-2 min-w-0">
                    <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <a
                        href={`mailto:${value as string}`}
                        className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:underline cursor-pointer transition-colors break-all"
                        title={`Send email to ${value as string}`}
                    >
                        {value as string}
                    </a>
                </div>
            ),
        },
        {
            key: 'phone',
            label: 'Phone',
            sortable: true,
            hidden: 'md',
            render: (value) => {
                const phoneValue = value as string;
                return (
                    <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        {phoneValue && phoneValue !== 'N/A' ? (
                            <a
                                href={`tel:${phoneValue}`}
                                className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:underline cursor-pointer transition-colors"
                                title={`Call ${phoneValue}`}
                            >
                                {phoneValue}
                            </a>
                        ) : (
                            <span className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">N/A</span>
                        )}
                    </div>
                );
            },
        },

        {
            key: 'isActive',
            label: 'Account Status',
            sortable: false,
            hidden: 'lg',
            render: (value, row) => {
                const isActive = row.isActive !== undefined ? row.isActive : (value !== undefined ? (value as boolean) : true);
                return (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStatus(row);
                            }}
                            className={`cursor-pointer relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${isActive
                                ? 'bg-green-500 dark:bg-green-600'
                                : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                            title={isActive ? 'Deactivate agent' : 'Activate agent'}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-5' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                        <span className={`text-xs sm:text-sm font-medium ${isActive
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-500 dark:text-gray-400'
                            }`}>
                            {isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                );
            },
        },
    ];
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type: 'danger' | 'warning' | 'info';
        confirmText?: string;
        cancelText?: string;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'danger',
        confirmText: 'Confirm',
        cancelText: 'Cancel'
    });
    const { socket } = useSocket();

    // Calculate dynamic stats
    const calculateStats = () => {
        const activeAgents = agents.filter(a => a.isActive === true).length;
        const deactivatedAgents = agents.filter(a => a.isActive === false).length;

        // Calculate agents added in last 7 days
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const newThisWeek = agents.filter(a => {
            const createdDate = new Date(a.createdAt || Date.now());
            return createdDate >= oneWeekAgo;
        }).length;

        return {
            totalAgents: totalAgents, // Use total from pagination
            activeAgents,
            deactivatedAgents,
            newThisWeek
        };
    };

    const stats = calculateStats();

    // Sorting function
    const handleSort = (field: string) => {
        const sortableField = field as 'name' | 'email' | 'phone' | 'status';
        if (sortField === sortableField) {
            // Toggle sort order if same field
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            // Set new field and default to ascending
            setSortField(sortableField);
            setSortOrder('asc');
        }
    };

    // Get sorted agents
    const getSortedAgents = () => {
        if (!sortField) {
            // Default sort by creation date (latest first)
            return [...agents].sort((a, b) => {
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                return dateB.getTime() - dateA.getTime();
            });
        }

        return [...agents].sort((a, b) => {
            let aValue = a[sortField];
            let bValue = b[sortField];

            // Handle null/undefined values
            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;

            // Convert to string for comparison
            aValue = String(aValue).toLowerCase();
            bValue = String(bValue).toLowerCase();

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });
    };

    const sortedAgents = getSortedAgents();

    // Render sort icon
    const getSortIcon = (field: string) => {
        const sortableField = field as 'name' | 'email' | 'phone' | 'status';
        if (sortField !== sortableField) {
            return <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4 opacity-40" />;
        }
        return sortOrder === 'asc'
            ? <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" />
            : <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" />;
    };

    const fetchAgents = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await agentService.fetchAgents(page, limit, searchQuery);
            if (response && response.data) {
                // Map API data to match frontend format
                const mappedAgents: DisplayAgent[] = response.data.map((agent: Agent, index: number) => ({
                    ...agent,
                    id: agent._id,
                    name: `${agent.firstName} ${agent.lastName}`,
                    initials: `${agent.firstName[0]}${agent.lastName[0]}`,
                    color: index % 2 === 0 ? 'bg-cyan-400' : 'bg-teal-400',
                    phone: agent.phone || 'N/A',
                    role: `#agent${index + 1}`,
                    categoryIds: agent.categoryIds || [],
                    status: agent.status || 'offline',
                    isActive: agent.isActive ?? true,
                }));
                setAgents(mappedAgents);
                setTotalPages(response.pagination.totalPages);
                setTotalAgents(response.pagination.totalAgents);
            }
        } catch (err: unknown) {
            console.error('Error fetching agents:', err);
            setError('Failed to load agents');
            // Keep mock data as fallback
        } finally {
            setLoading(false);
        }
    }, [page, limit, searchQuery]);

    // Fetch agents on mount and when page/search changes
    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    // Fetch categories on mount
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const categoryList = await agentService.getCategoryList();
                setCategories(categoryList);
            } catch (err) {
                console.error('Error fetching categories:', err);
            }
        };
        fetchCategories();
    }, []);

    // Real-time agent status updates via socket
    useEffect(() => {
        if (socket) {
            // Listen for agent status updates
            socket.on('agent_status_update', (data) => {

                setAgents(prevAgents =>
                    prevAgents.map(agent => {
                        // Match by email or userId
                        if (agent.email === data.userEmail || agent._id === data.userId) {
                            return {
                                ...agent,
                                status: data.status,
                                lastSeen: data.timestamp
                            };
                        }
                        return agent;
                    })
                );
            });

            return () => {
                socket.off('agent_status_update');
            };
        }
    }, [socket]);

    // Refresh agent data when page becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('🔄 Page visible, refreshing agent data...');
                fetchAgents();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchAgents]);

    const handleCreateAgent = async (formData: AgentFormData) => {
        try {
            const newAgent = await agentService.createAgent(formData);
            // Add new agent to list
            const mappedAgent: DisplayAgent = {
                ...newAgent,
                id: newAgent._id,
                name: `${newAgent.firstName} ${newAgent.lastName}`,
                phone: newAgent.phone || 'N/A',
                role: `#agent${agents.length + 1}`,
                status: newAgent.status || 'offline',
                initials: `${newAgent.firstName[0]}${newAgent.lastName[0]}`,
                color: 'bg-cyan-400',
                categoryIds: newAgent.categoryIds || [],
                createdAt: newAgent.createdAt || new Date().toISOString()
            };
            setAgents([...agents, mappedAgent]);
            setIsModalOpen(false);
            toast.success(`Agent ${newAgent.firstName} ${newAgent.lastName} created successfully!`);
        } catch (err: unknown) {
            const errorMessage = (err as Error).message || 'Failed to create agent';
            toast.error(errorMessage);
            throw new Error(errorMessage);
        }
    };

    const handleEditAgent = async (formData: AgentFormData) => {
        try {
            if (!editingAgent) return;

            await agentService.updateAgent(editingAgent._id, formData);
            fetchAgents();
            setIsEditModalOpen(false);
            setEditingAgent(null);
            toast.success(`Agent ${formData.firstName} ${formData.lastName} updated successfully!`);
        } catch (err: unknown) {
            const errorMessage = (err as Error).message || 'Failed to update agent';
            toast.error(errorMessage);
            throw new Error(errorMessage);
        }
    };

    const handleDeleteAgent = (agentId: string) => {
        const agentToDelete = agents.find(a => a.id === agentId);
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Agent',
            message: `Are you sure you want to delete ${agentToDelete?.name || 'this agent'}? This action cannot be undone.`,
            onConfirm: async () => {
                try {
                    await agentService.deleteAgent(agentId);
                    setAgents(agents.filter(a => a.id !== agentId));
                    fetchAgents();
                    toast.success(`Agent ${agentToDelete?.name || 'deleted'} removed successfully!`);
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                } catch (err: unknown) {
                    const errorMessage = (err as Error).message || 'Failed to delete agent';
                    setError(errorMessage);
                    toast.error(errorMessage);
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }
            },
            type: 'danger'
        });
    };

    const handleOpenEdit = async (agent: DisplayAgent) => {
        try {
            // Fetch fresh agent data by ID
            const freshAgentData = await agentService.getAgent(agent.id);
            setEditingAgent(freshAgentData);
            setIsEditModalOpen(true);
        } catch (err: unknown) {
            setError((err as Error).message || 'Failed to load agent data');
        }
    };

    const handleOpenView = async (agent: DisplayAgent) => {
        try {
            // Fetch fresh agent data by ID
            const freshAgentData = await agentService.getAgent(agent.id);
            setViewingAgent(freshAgentData);
            setIsViewModalOpen(true);
        } catch (err: unknown) {
            setError((err as Error).message || 'Failed to load agent data');
        }
    };

    const handleToggleStatus = async (agent: DisplayAgent) => {
        const currentStatus = agent.isActive !== undefined ? agent.isActive : true;
        const newStatus = !currentStatus;
        const action = newStatus ? 'activate' : 'deactivate';

        setConfirmDialog({
            isOpen: true,
            title: `${newStatus ? 'Activate' : 'Deactivate'} Agent`,
            message: `Are you sure you want to ${action} ${agent.name}?`,
            onConfirm: async () => {
                try {
                    setError(null);
                    const updatedAgent = await agentService.toggleAgentStatus(agent.id);
                    // Update local state immediately for better UX
                    setAgents(prevAgents =>
                        prevAgents.map(a =>
                            a.id === agent.id
                                ? { ...a, isActive: updatedAgent.isActive ?? !currentStatus }
                                : a
                        )
                    );
                    fetchAgents(); // Refresh to get latest data
                    toast.success(`Agent ${action}d successfully!`);
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                } catch (err: unknown) {
                    const errorMessage = (err as Error).message || `Failed to ${action} agent`;
                    setError(errorMessage);
                    toast.error(errorMessage);
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }
            },
            type: newStatus ? 'info' : 'warning',
            confirmText: newStatus ? 'Activate' : 'Deactivate',
            cancelText: 'Cancel'
        });
    };

    // Define export columns
    const exportColumns: ExportColumn<DisplayAgent>[] = [
        {
            key: 'name',
            label: 'Name',
            render: (value) => value as string
        },
        {
            key: 'email',
            label: 'Email',
            render: (value) => value as string
        },
        {
            key: 'phone',
            label: 'Phone',
            render: (value) => value === 'N/A' ? '' : (value as string)
        },
        {
            key: 'status',
            label: 'Status',
            render: (value) => value === 'online' ? 'Online' : 'Offline'
        },
        {
            key: 'isActive',
            label: 'Account Status',
            render: (value) => value ? 'Active' : 'Inactive'
        },
        {
            key: 'categoryIds',
            label: 'Departments',
            render: (value, row) => {
                if (!row.categoryIds || row.categoryIds.length === 0) {
                    return 'N/A';
                }
                const departmentNames = row.categoryIds
                    .map((cat: string | { _id: string, name?: string } | { _id?: string, name?: string }) => {
                        // Handle both cases: string ID or object with _id and name
                        if (typeof cat === 'string') {
                            const category = categories.find(c => c._id === cat);
                            return category ? category.name : cat;
                        } else if (cat && typeof cat === 'object') {
                            // If object has name property, use it directly
                            if ('name' in cat && typeof cat.name === 'string') {
                                return cat.name;
                            }
                            // If object has _id, look up in categories
                            if ('_id' in cat && typeof cat._id === 'string') {
                                const category = categories.find(c => c._id === cat._id);
                                return category ? category.name : cat._id;
                            }
                        }
                        return null;
                    })
                    .filter((name: string | null): name is string => name !== null && name !== undefined);
                return departmentNames.length > 0 ? departmentNames.join(', ') : 'N/A';
            }
        },
    ];

    // Reset to page 1 when search query or limit changes
    useEffect(() => {
        if (searchQuery !== '') {
            setPage(1);
        }
    }, [searchQuery]);

    useEffect(() => {
        setPage(1);
    }, [limit]);

    const toggleAgentSelection = (id: string) => {
        setSelectedAgents(prev =>
            prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id]
        );
    };

    const toggleAllAgents = () => {
        setSelectedAgents(prev =>
            prev.length === agents.length ? [] : agents.map(a => a.id)
        );
    };

    return (
        <>
            {/* Create Agent Modal */}
            <AgentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateAgent}
            />

            {/* Edit Agent Modal */}
            <AgentModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditingAgent(null);
                }}
                onSubmit={handleEditAgent}
                initialData={editingAgent ? {
                    firstName: editingAgent.firstName,
                    lastName: editingAgent.lastName,
                    email: editingAgent.email,
                    phone: editingAgent.phone === 'N/A' ? '' : (editingAgent.phone || ''),
                    status: editingAgent.status || 'offline',
                    categoryId: editingAgent.categoryIds || []
                } : undefined}
                isEdit={true}
            />

            {/* View Agent Modal */}
            <AgentViewModal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                agent={viewingAgent}
            />

            {/* Page Content */}
            <main className="flex-1 overflow-auto pt-1 pb-4 px-4 sm:pt-2 sm:pb-6 sm:px-6 bg-gray-50 dark:bg-gray-900">
                {/* Page Header */}
                <div className="mb-2 sm:mb-3">
                    <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-1">
                        Agent Management
                    </h2>
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Manage support agents and team members</p>
                </div>
                {/* Stats Grid */}
                {loading && agents.length === 0 ? (
                    <StatsSkeletonLoader />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                        {statsConfig.map((statConfig, index) => (
                            <div
                                key={index}
                                className={`group bg-gradient-to-br ${statConfig.color} rounded-2xl p-6 text-white relative overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-500/20 hover:scale-[1.02]`}
                            >
                                <div className="relative z-10 transition-transform duration-300 group-hover:scale-105">
                                    <p className="text-white/80 text-sm mb-1 font-semibold uppercase tracking-wide">{statConfig.title}</p>
                                    <p className="text-4xl font-bold mb-2 text-white transition-all duration-300">
                                        {stats[statConfig.key as keyof typeof stats]}
                                    </p>
                                    <p className="text-white/60 text-xs mt-1">{statConfig.subtitle}</p>
                                </div>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 transition-all duration-300 group-hover:opacity-50 group-hover:scale-110">
                                    <statConfig.icon className="w-16 h-16 text-white" />
                                </div>
                                {statConfig.key === 'activeAgents' && stats.activeAgents > 0 && (
                                    <div className="absolute top-2 right-2">
                                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Search and Actions */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 mb-4">
                    <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-4 items-center">
                        <div className="relative flex-1 w-full lg:flex-[2]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search by name, email, or phone..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-900 dark:text-white dark:placeholder-gray-400 text-sm sm:text-base"
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap w-full lg:w-auto lg:flex-shrink-0">
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="cursor-pointer flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-lg text-sm sm:text-base whitespace-nowrap"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="font-medium hidden sm:inline">Add Agent</span>
                                <span className="font-medium sm:hidden">Add</span>
                            </button>
                            <ExportButton<DisplayAgent>
                                data={sortedAgents}
                                selectedIds={selectedAgents}
                                columns={exportColumns}
                                entityName="agent"
                                requireSelection={true}
                                getRowId={(row) => row.id}
                                filename="agents"
                            />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 text-sm sm:text-base">{error}</div>
                )}

                {loading && agents.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <TableSkeletonLoader rows={5} cols={4} />
                    </div>
                ) : !loading && agents.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-10 text-center">
                        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                            No records available
                        </p>
                    </div>
                ) : (
                    <CustomTable
                        columns={columns}
                        data={sortedAgents}
                        selectedRows={selectedAgents}
                        toggleAllRows={toggleAllAgents}
                        toggleRowSelection={toggleAgentSelection}
                        handleSort={handleSort}
                        getSortIcon={getSortIcon}
                        onView={handleOpenView}
                        onEdit={handleOpenEdit}
                        onDelete={handleDeleteAgent}
                        page={page}
                        totalPages={totalPages}
                        setPage={setPage}
                        getRowId={(row) => row.id}
                        limit={limit}
                        setLimit={setLimit}
                    />
                )}

            </main>

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type={confirmDialog.type}
                confirmText={confirmDialog.confirmText || 'Confirm'}
                cancelText={confirmDialog.cancelText || 'Cancel'}
            />
        </>
    );
}