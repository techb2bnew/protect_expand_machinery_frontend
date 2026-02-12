'use client';

import React, { useEffect, useState } from 'react';
import { Search, Users, Activity, Mail, Calendar, Plus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import AddCustomerModal from './CustomerModal';
import ViewCustomerModal from './ViewCustomerModal';
import ConfirmDialog from '../ui/ConfirmDialog';
import CustomTable, { TableColumn } from '../ui/CustomTable';
import { TableSkeletonLoader, StatsSkeletonLoader } from '../ui/Loader';
import ExportButton, { ExportColumn } from '../ui/ExportButton';
import customerService, { Customer, ApiCustomer, CustomerFormData } from '@/services/customerService';
import toast from '@/utils/toast';

const statCards = [
  { key: 'totalCustomers', title: 'Total Customers', color: 'from-red-700 to-red-900', icon: Users },
  { key: 'activeCustomers', title: 'Active Customers', color: 'from-cyan-700 to-blue-900', icon: Activity },
  { key: 'newToday', title: 'New Today', color: 'from-green-700 to-emerald-900', icon: Mail },
  { key: 'newThisMonth', title: 'New This Month', color: 'from-blue-700 to-indigo-900', icon: Calendar },
] as const;

export default function CustomerDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; phoneNumber?: string } | null>(null);
  const [stats, setStats] = useState<Record<string, { value: number; change: number }>>({});
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(15);
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
  const [totalPages, setTotalPages] = useState<number>(1);
  const [sortField, setSortField] = useState<'name' | 'email' | 'phone' | 'createdAt' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Define columns for the table
  const columns: TableColumn<Customer>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (value) => (
        <span className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white">{value as string}</span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      hidden: 'md',
      render: (value) => (
        <a
          href={`mailto:${value as string}`}
          className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:underline cursor-pointer transition-colors"
          title={`Send email to ${value as string}`}
        >
          {value as string}
        </a>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      sortable: true,
      render: (value) => {
        const phoneValue = value as string;
        return (
          <a
            href={`tel:${phoneValue || ''}`}
            className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:underline cursor-pointer transition-colors inline-flex items-center gap-1"
            title={`Call ${phoneValue || ''}`}
          >
            {phoneValue || ''}
          </a>
        );
      },
    },
    {
      key: 'isActive',
      label: 'Account Status',
      sortable: false,
      hidden: 'lg',
      render: (value, row) => {
        const isActive = value as boolean;
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
              title={isActive ? 'Deactivate customer' : 'Activate customer'}
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
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      hidden: 'lg',
      render: (value) => (
        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">{value as string}</span>
      ),
    },
  ];

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch customers
      const data = await customerService.fetchCustomers(page, limit, searchQuery);
      const mapped = data.customers.map((c: ApiCustomer) => customerService.mapToCustomer(c));
      setCustomers(mapped);
      setTotalPages(data.totalPages || 1);

      // Fetch stats
      const statsData = await customerService.fetchStats();
      setStats(statsData);
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, searchQuery]);

  // Handle sorting
  const handleSort = (field: string) => {
    const sortableField = field as 'name' | 'email' | 'phone' | 'createdAt';
    if (sortField === sortableField) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(sortableField);
      setSortDirection('asc');
    }
  };

  // Get sort icon for a field
  const getSortIcon = (field: string) => {
    const sortableField = field as 'name' | 'email' | 'phone' | 'createdAt';
    if (sortField !== sortableField) {
      return <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4 opacity-40" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" />
      : <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" />;
  };

  // Filter and sort customers
  const filteredCustomers = customers
    .filter((customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery)
    )
    .sort((a, b) => {
      if (!sortField) return 0;

      // Handle date sorting specially
      if (sortField === 'createdAt') {
        // Convert DD/MM/YYYY to Date for comparison
        const parseDate = (dateStr: string) => {
          const [day, month, year] = dateStr.split('/');
          return new Date(`${year}-${month}-${day}`).getTime();
        };
        const aDate = parseDate(a[sortField]);
        const bDate = parseDate(b[sortField]);

        if (aDate < bDate) return sortDirection === 'asc' ? -1 : 1;
        if (aDate > bDate) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      } else {
        // String comparison (case-insensitive)
        const aValue = a[sortField].toLowerCase();
        const bValue = b[sortField].toLowerCase();

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }
    });

  const toggleCustomerSelection = (id: string) => {
    setSelectedCustomers(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const toggleAllCustomers = () => {
    setSelectedCustomers(prev =>
      prev.length === filteredCustomers.length ? [] : filteredCustomers.map(c => c.id)
    );
  };

  const handleAddCustomer = async (data: CustomerFormData) => {
    try {
      setError(null);
      setFieldErrors(null);
      await customerService.addCustomer(data);
      fetchCustomers();
      setIsModalOpen(false);
      toast.success('Customer added successfully!');
    } catch (e: unknown) {
      const error = e as Error;
      if (error.message && /email/i.test(error.message)) {
        setFieldErrors({ email: error.message });
      } else if (error.message && /phone/i.test(error.message)) {
        setFieldErrors({ phoneNumber: error.message });
      } else {
        setError(error.message || 'Failed to add customer');
        toast.error(error.message || 'Failed to add customer');
      }
    }
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsEditOpen(true);
  };

  const handleOpenView = (customer: Customer) => {
    setViewingCustomer(customer);
    setIsViewOpen(true);
  };

  const handleUpdateCustomer = async (data: CustomerFormData) => {
    if (!editingCustomer) return;
    try {
      setError(null);
      setFieldErrors(null);
      await customerService.updateCustomer(editingCustomer.id, data);
      fetchCustomers();
      setIsEditOpen(false);
      setEditingCustomer(null);
      toast.success('Customer updated successfully!');
    } catch (e: unknown) {
      const error = e as Error;
      if (error.message && /email/i.test(error.message)) {
        setFieldErrors({ email: error.message });
      } else if (error.message && /phone/i.test(error.message)) {
        setFieldErrors({ phoneNumber: error.message });
      } else {
        setError(error.message || 'Failed to update customer');
        toast.error(error.message || 'Failed to update customer');
      }
    }
  };

  const handleDeleteCustomer = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Customer',
      message: `Are you sure you want to delete ${customer?.name || 'this customer'}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          setError(null);
          await customerService.deleteCustomer(customerId);
          fetchCustomers();
          toast.success('Customer deleted successfully!');
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        } catch (e: unknown) {
          setError((e as Error).message || 'Failed to delete customer');
          toast.error((e as Error).message || 'Failed to delete customer');
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });
  };

  // Define export columns
  const exportColumns: ExportColumn<Customer>[] = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    {
      key: 'isActive',
      label: 'Status',
      render: (value) => value ? 'Active' : 'Inactive'
    },
    { key: 'createdAt', label: 'Created At' },
  ];

  const handleToggleStatus = async (customer: Customer) => {
    const newStatus = !customer.isActive;
    const action = newStatus ? 'activate' : 'deactivate';

    setConfirmDialog({
      isOpen: true,
      title: `${newStatus ? 'Activate' : 'Deactivate'} Customer`,
      message: `Are you sure you want to ${action} ${customer.name}?`,
      onConfirm: async () => {
        try {
          setError(null);
          if (newStatus) {
            await customerService.activateCustomer(customer.id);
          } else {
            await customerService.deactivateCustomer(customer.id);
          }
          fetchCustomers();
          toast.success(`Customer ${action}d successfully!`);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        } catch (e: unknown) {
          setError((e as Error).message || `Failed to ${action} customer`);
          toast.error((e as Error).message || `Failed to ${action} customer`);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
      type: newStatus ? 'info' : 'warning',
      confirmText: newStatus ? 'Activate' : 'Deactivate',
      cancelText: 'Cancel'
    });
  };

  return (
    <>
      <main className="flex-1 overflow-auto pt-2 pb-4 px-4 sm:pt-3 sm:pb-6 sm:px-6 bg-gray-50 dark:bg-gray-900">
        {/* Page Header */}
        <div className="mb-3 sm:mb-4">
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-1.5">
            Customer Management
          </h2>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Manage customer accounts and customer data with ease</p>
        </div>
        {/* Stats Grid */}
        {loading && Object.keys(stats).length === 0 ? (
          <StatsSkeletonLoader />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {statCards.map((card, index) => (
              <div
                key={index}
                className={`group bg-gradient-to-br ${card.color} rounded-2xl p-6 text-white relative overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-2xl hover:shadoumpurple-500/20 hover:scale-[1.02]`}
              >
                <div className="relative z-10 transition-transform duration-300 group-hover:scale-105">
                  <p className="text-white/80 text-sm mb-1 font-semibold uppercase tracking-wide">{card.title}</p>
                  <p className="text-4xl font-bold mb-2 text-white">{stats[card.key]?.value ?? '—'}</p>
                  <p className="text-white/60 text-xs mt-1">Last updated: Today</p>
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 transition-all duration-300 group-hover:opacity-50 group-hover:scale-110">
                  <card.icon className="w-16 h-16 text-white" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search and Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 mb-4">
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-4 items-center">
            <div className="relative flex-1 w-full lg:flex-[2]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 text-sm sm:text-base"
              />
            </div>
            <div className="flex gap-2 sm:gap-3 flex-wrap w-full lg:w-auto lg:flex-shrink-0">
              {/* <button
                onClick={() => setIsModalOpen(true)}
                className="cursor-pointer flex-1 lg:flex-none px-3 sm:px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl font-medium text-sm sm:text-base whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Customer</span>
                <span className="sm:hidden">Add</span>
              </button> */}
              <ExportButton
                data={filteredCustomers}
                selectedIds={selectedCustomers}
                columns={exportColumns}
                entityName="customer"
                requireSelection={true}
                getRowId={(row) => row.id}
                filename="customers"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 text-sm sm:text-base">{error}</div>
        )}

        {loading && customers.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <TableSkeletonLoader rows={5} cols={4} />
          </div>
        ) : !loading && customers.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-10 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
              No records available
            </p>
          </div>
        ) : (
          <CustomTable
            columns={columns}
            data={filteredCustomers}
            selectedRows={selectedCustomers}
            toggleAllRows={toggleAllCustomers}
            toggleRowSelection={toggleCustomerSelection}
            handleSort={handleSort}
            getSortIcon={getSortIcon}
            onView={handleOpenView}
            onEdit={handleOpenEdit}
            onDelete={handleDeleteCustomer}
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            getRowId={(row) => row.id}
            limit={limit}
            setLimit={setLimit}
          />
        )}

        <AddCustomerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleAddCustomer}
          externalErrors={fieldErrors || undefined}
        />

        <AddCustomerModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSubmit={handleUpdateCustomer}
          title="Edit Customer"
          externalErrors={fieldErrors || undefined}
          submitLabel="Save Changes"
          isEdit={true}
          initialData={editingCustomer ? {
            firstName: editingCustomer.name.split(' ')[0] ?? '',
            lastName: editingCustomer.name.split(' ').slice(1).join(' ') ?? '',
            email: editingCustomer.email,
            phoneNumber: editingCustomer.phone,
          } : undefined}
        />

        <ViewCustomerModal
          isOpen={isViewOpen}
          onClose={() => setIsViewOpen(false)}
          customer={viewingCustomer}
        />

        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          type={confirmDialog.type}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
        />
      </main>
    </>
  );
}