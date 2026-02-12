'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Agent } from '@/services/agentService';

interface AgentViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    agent: Agent | null;
}

export default function AgentViewModal({ isOpen, onClose, agent }: AgentViewModalProps) {
    if (!isOpen || !agent) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-all"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Header */}
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Agent Details</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Information for {agent.firstName} {agent.lastName}</p>
                    </div>

                    {/* Agent Details */}
                    <div className="space-y-4">
                        {/* First Name and Last Name */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">First Name</p>
                                <p className="text-gray-900 dark:text-white font-medium">{agent.firstName}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Last Name</p>
                                <p className="text-gray-900 dark:text-white font-medium">{agent.lastName}</p>
                            </div>
                        </div>

                        {/* Email Address */}
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Email Address</p>
                            <a
                                href={`mailto:${agent.email}`}
                                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                            >
                                {agent.email}
                            </a>
                        </div>

                        {/* Phone Number */}
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Phone Number</p>
                            {agent.phone ? (
                                <a
                                    href={`tel:${agent.phone}`}
                                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                >
                                    {agent.phone}
                                </a>
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400 font-medium">Not provided</p>
                            )}
                        </div>

                        {/* Status */}
                        {/* <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Status</p>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${agent.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                <span className="text-gray-900 dark:text-white font-medium capitalize">{agent.status}</span>
                            </div>
                        </div> */}

                        {/* Created */}
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Created</p>
                            <p className="text-gray-900 dark:text-white font-medium">
                                {new Date(agent.createdAt).toLocaleDateString('en-US', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    year: 'numeric'
                                })}
                            </p>
                        </div>

                        {/* Departments */}
                        {agent.categoryIds && agent.categoryIds.length > 0 && (
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Departments</p>
                                <div className="flex flex-wrap gap-2">
                                    {agent.categoryIds.map((category: string | { _id: string, name: string }) => (
                                        <span
                                            key={typeof category === 'string' ? category : category._id}
                                            className="inline-flex px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium"
                                        >
                                            {typeof category === 'string' ? category : category.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end mt-6">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm bg-gray-100 cursor-pointer dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
