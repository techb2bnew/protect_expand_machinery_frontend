import React from 'react';
import { X } from 'lucide-react';
import { Customer } from '@/services/customerService';

type ViewCustomerModalProps = {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer | null;
};

const ViewCustomerModal = ({ isOpen, onClose, customer }: ViewCustomerModalProps) => {
    if (!isOpen || !customer) return null;


    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4">
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Customer Details</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            View customer information
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 pb-6">
                    <div className="space-y-6">
                        {/* Personal Information */}
                        <div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">First Name</label>
                                    <p className="text-gray-900 dark:text-white font-medium">
                                        {customer.name.split(' ')[0] || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Last Name</label>
                                    <p className="text-gray-900 dark:text-white font-medium">
                                        {customer.name.split(' ').slice(1).join(' ') || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Email Address</label>
                                    <a href={`mailto:${customer.email}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">{customer.email}</a>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Phone Number</label>
                                    <a 
                                        href={`tel:${customer.phone || ''}`} 
                                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                    >
                                        {customer.phone || 'N/A'}
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${customer.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                    <p className={`text-sm font-medium ${customer.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {customer.isActive ? 'Active' : 'Inactive'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Created Date */}
                        <div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Created</label>
                                <p className="text-gray-900 dark:text-white font-medium">
                                    {customer.createdAt}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end px-6 pt-2 pb-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ViewCustomerModal;