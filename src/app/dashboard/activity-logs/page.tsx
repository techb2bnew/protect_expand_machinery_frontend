'use client';
import { useCallback, useEffect, useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import CustomTable, { TableColumn } from '@/components/ui/CustomTable';
import activityLogService, { ApiActivityLog } from '@/services/activelogService';
import toast from '@/utils/toast';


type SortableField = 'user' | 'message' | 'createdAt' | 'status';

type ApiActivityLogRaw = {
    _id: string;
    userId?: { name?: string } | null;
    message: string;
    createdAt: string;
    status?: string;
};

export default function ActivityLogsPage() {
    const [sortField, setSortField] = useState<'user' | 'message' | 'createdAt' | 'status' | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [selectedLogs] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [activityLogs, setActivityLogs] = useState<ApiActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(1);

    // 🗓️ New date filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    // Applied filters (only change on Apply/Reset)
    const [appliedStartDate, setAppliedStartDate] = useState('');
    const [appliedEndDate, setAppliedEndDate] = useState('');



    const fetchLogs = useCallback(async (p: number = page, ps: number = pageSize, s: string = appliedStartDate, e: string = appliedEndDate) => {
        setLoading(true);
        try {
            const data = await activityLogService.fetchActivityLogs(p, ps, '', s, e);
            const mapped: ApiActivityLog[] = data.data.map((log: ApiActivityLogRaw) => ({
                _id: log._id,
                user: log.userId?.name || 'Unknown User',
                status: log.status,
                message: log.message,
                createdAt: log.createdAt,
            }));
            setActivityLogs(mapped);

            setTotalPages(data.pagination?.totalPages || 1);
        } catch (error: unknown) {
            toast.error((error as Error).message || 'Failed to load activity logs');
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, appliedStartDate, appliedEndDate]);

    useEffect(() => {
        // Fetch on page or pageSize change using applied filters only
        fetchLogs(page, pageSize, appliedStartDate, appliedEndDate);
    }, [page, pageSize, fetchLogs, appliedStartDate, appliedEndDate]);

    const applyFilter = () => {
        if (startDate && endDate) {
            const s = new Date(startDate);
            const e = new Date(endDate);
            if (s.getTime() > e.getTime()) {
                toast.error('Start date must be before or equal to End date');
                return;
            }
        }
        // Apply current inputs and fetch
        setAppliedStartDate(startDate);
        setAppliedEndDate(endDate);
        fetchLogs(page, pageSize, startDate, endDate);
    };

    const handleSort = (field: string) => {
        const f = (['user','message','createdAt','status'] as SortableField[]).includes(field as SortableField)
            ? (field as SortableField)
            : 'createdAt';
        if (sortField === f) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(f as typeof sortField);
            setSortDirection('asc');
        }
        setActivityLogs(prev => {
            const sorted = [...prev].sort((a, b) => {
                const va = a[f];
                const vb = b[f];
                if (va == null && vb == null) return 0;
                if (va == null) return -1;
                if (vb == null) return 1;
                if (f === 'createdAt') {
                    return (new Date(va as string).getTime() - new Date(vb as string).getTime());
                }
                return String(va).localeCompare(String(vb));
            });
            return sortDirection === 'asc' ? sorted : sorted.reverse();
        });
    };

    const getSortIconFor = (field: string) => {
        if (sortField !== field) return <ArrowUpDown className="w-4 h-4 opacity-50" />;
        return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
    };

    const exportCsv = async () => {
        try {
            const data = await activityLogService.fetchActivityLogs(1, 1000, '', appliedStartDate, appliedEndDate);
            const rows = data.data.map((d: ApiActivityLogRaw) => ({
                user: d.userId?.name || 'Unknown User',
                status: d.status || '',
                message: d.message,
                createdAt: d.createdAt,
            }));
            const header = ['User', 'Status', 'Message', 'Created At'];
            const csv = [header.join(','), ...rows.map(r => [r.user, r.status, r.message.replace(/\n/g, ' '), r.createdAt].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `activity_logs_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Exported activity logs');
        } catch {
            toast.error('Failed to export logs');
        }
    };
    const formatDateTime = (dateString?: string) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'added':
                return 'bg-green-100 text-green-800';
            case 'updated':
                return 'bg-yellow-100 text-yellow-800';
            case 'deleted':
                return 'bg-red-100 text-red-800';
            case 'login':
                return 'bg-blue-100 text-blue-800';
            case 'password_reset_requested':
                return 'bg-purple-100 text-purple-800';
            case 'password_reset':
                return 'bg-green-100 text-green-800';
            case 'logout':
                return 'bg-red-100 text-red-800';
            case 'password_reset_requested':
                return 'bg-purple-100 text-purple-800';
            case 'password_reset':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };
    const columns: TableColumn<ApiActivityLog>[] = [
        {
            key: 'sno',
            label: 'S.No',
            sortable: false,
            customCell: (_, index) => (
                <span className="text-xs sm:text-sm text-gray-900 dark:text-white">
                    {(page - 1) * pageSize + index + 1}
                </span>
            ),
        },
        { key: 'user', label: 'User', sortable: true },
        {
            key: 'message',
            label: 'Message',
            sortable: true,
            customCell: (row) => (
                <span className="text-xs sm:text-sm text-gray-900 dark:text-white whitespace-pre-wrap break-words max-w-[800px]">
                    {(row as ApiActivityLog).message}
                </span>
            )
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            render: (value) => (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(value as string)}`}>
                    {value as string}
                </span>
            )
        },
        {
            key: 'createdAt',
            label: 'Timestamp',
            sortable: true,
            customCell: (row) => (
                <span className="text-xs sm:text-sm text-gray-900 dark:text-white">
                    {formatDateTime((row as ApiActivityLog).createdAt)}
                </span>
            )
        },

    ];

    return (
        <main className="flex-1 overflow-auto pt-1 pb-4 px-4 sm:pt-2 sm:pb-6 sm:px-6 bg-gray-50 dark:bg-gray-900">
            <div className="mb-2 sm:mb-3">
                <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-1">
                    Activity Logs
                </h2>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                    Monitor and track all system activities
                </p>
            </div>

            {/* 🔍 Search & Filter */}
            <div className="flex flex-wrap items-end gap-3 mb-4">
                <label className="text-sm text-gray-600 dark:text-gray-300 flex flex-col gap-1">
                    <span>Start date</span>
                    <input
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(e) => {
                        const v = e.target.value;
                        setStartDate(v);
                        if (endDate && v && new Date(v).getTime() > new Date(endDate).getTime()) {
                            setEndDate(v);
                            toast.info('End date adjusted to match Start date');
                        }
                    }}
                    placeholder="Start date"
                    aria-label="Start date"
                    className="border px-3 rounded-md text-sm h-10 cursor-pointer"
                />
                </label>
                <label className="text-sm text-gray-600 dark:text-gray-300 flex flex-col gap-1">
                    <span>End date</span>
                    <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => {
                        const v = e.target.value;
                        if (startDate && v && new Date(v).getTime() < new Date(startDate).getTime()) {
                            toast.error('End date cannot be earlier than Start date');
                            setEndDate(startDate);
                            return;
                        }
                        setEndDate(v);
                    }}
                    placeholder="End date"
                    aria-label="End date"
                    className="border px-3 rounded-md text-sm h-10"
                />
                </label>
                <button
                    onClick={applyFilter}
                    className="bg-purple-600 text-white px-4 rounded-md text-sm cursor-pointer h-10"
                >
                    Apply Filter
                </button>
                <button
                    onClick={() => {
                        setStartDate('');
                        setEndDate('');
                        setAppliedStartDate('');
                        setAppliedEndDate('');
                        fetchLogs(page, pageSize, '', '');
                    }}
                    className="bg-gray-300 text-gray-800 px-4 rounded-md text-sm cursor-pointer h-10"
                >
                    Reset
                </button>
                <div className="flex items-center gap-2 ml-auto">
                    <label className="text-sm text-gray-600 dark:text-gray-300">Per page:</label>
                    <select value={pageSize} onChange={(e) => { setPage(1); setPageSize(parseInt(e.target.value)); }} className="border px-2 py-2 rounded-md text-sm">
                        <option value={15}>15</option>
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={250}>250</option>
                        <option value={500}>500</option>
                    </select>
                    <button onClick={exportCsv} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm cursor-pointer">Export CSV</button>
                </div>
            </div>

            {loading && (
                <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden mb-2">
                    <div className="h-full w-full bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 animate-pulse" />
                </div>
            )}

            <CustomTable
                columns={columns}
                data={activityLogs}
                selectedRows={selectedLogs}
                toggleAllRows={() => { }}
                toggleRowSelection={() => { }}
                handleSort={handleSort}
                getSortIcon={getSortIconFor}
                page={page}
                totalPages={totalPages}
                setPage={setPage}
                getRowId={(row) => row._id}
                showSelection={false}
            />
        </main>
    );
}
