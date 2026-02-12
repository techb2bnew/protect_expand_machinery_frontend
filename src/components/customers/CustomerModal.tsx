import React, { useState } from 'react';
import { X } from 'lucide-react';

type AddCustomerForm = {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    password: string;
};

type AddCustomerModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: AddCustomerForm) => void;
    initialData?: Partial<AddCustomerForm>;
    title?: string;
    submitLabel?: string;
    isEdit?: boolean;
    externalErrors?: Partial<Record<keyof AddCustomerForm, string>>;
};

const CustomerModal = ({ isOpen, onClose, onSubmit, initialData, title, submitLabel, isEdit = false, externalErrors }: AddCustomerModalProps) => {
    const [formData, setFormData] = useState<AddCustomerForm>({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        password: ''
    });

    const [errors, setErrors] = useState<Partial<Record<keyof AddCustomerForm, string>>>({});

    React.useEffect(() => {
        if (isOpen) {
            setFormData({
                firstName: initialData?.firstName ?? '',
                lastName: initialData?.lastName ?? '',
                email: initialData?.email ?? '',
                phoneNumber: initialData?.phoneNumber ?? '',
                password: initialData?.password ?? '',
            });
            setErrors({});
        }
    }, [isOpen, initialData]);

    React.useEffect(() => {
        if (externalErrors) {
            setErrors(prev => ({ ...prev, ...externalErrors }));
        }
    }, [externalErrors]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        // For phone number, only allow digits and limit to 15 digits
        if (name === 'phoneNumber') {
            const digitsOnly = value.replace(/\D/g, '');
            if (digitsOnly.length <= 15) {
                setFormData(prev => ({
                    ...prev,
                    [name]: digitsOnly
                }) as AddCustomerForm);
            }
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }) as AddCustomerForm);
        }

        if (errors[name as keyof AddCustomerForm]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors: Partial<Record<keyof AddCustomerForm, string>> = {};

        if (!formData.firstName.trim()) {
            newErrors.firstName = 'First name is required';
        }

        // if (!formData.lastName.trim()) {
        //     newErrors.lastName = 'Last name is required';
        // }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email is invalid';
        }

        if (!formData.phoneNumber.trim()) {
            newErrors.phoneNumber = 'Phone number is required';
        } else {
            const phoneDigits = formData.phoneNumber.replace(/\D/g, '');
            if (phoneDigits.length < 10 || phoneDigits.length > 15) {
                newErrors.phoneNumber = 'Phone number must be between 10 and 15 digits';
            }
        }

        // Password is only required for new customers (not edit mode)
        if (!isEdit) {
            if (!formData.password.trim()) {
                newErrors.password = 'Password is required';
            } else if (formData.password.length < 6) {
                newErrors.password = 'Password must be at least 6 characters';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validateForm()) {
            // Do not clear form here; parent will close modal on success
            onSubmit(formData);
        }
    };

    const handleCancel = () => {
        setFormData({
            firstName: '',
            lastName: '',
            email: '',
            phoneNumber: '',
            password: ''
        });
        setErrors({});
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
                <div className="flex items-center justify-between px-6 pt-6 pb-4">
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{title ?? 'Add New Customer'}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter the customer information below</p>
                    </div>
                    <button
                        onClick={handleCancel}
                        className="cursor-pointer text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="px-6 pb-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                First Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 ${errors.firstName ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                placeholder="Enter first name"
                            />
                            {errors.firstName && (
                                <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.firstName}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Last Name 
                            </label>
                            <input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 ${errors.lastName ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                                placeholder="Enter last name"
                            />
                            {errors.lastName && (
                                <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.lastName}</p>
                            )}
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="tel"
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleChange}
                            className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 ${errors.phoneNumber ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                            placeholder="Enter 10-15 digit phone number"
                            maxLength={15}
                        />
                        {errors.phoneNumber && (
                            <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.phoneNumber}</p>
                        )}
                    </div>

                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 ${errors.email ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                            placeholder="Enter email address"
                        />
                        {errors.email && (
                            <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.email}</p>
                        )}
                    </div>

                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Password {!isEdit && <span className="text-red-500">*</span>}
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 ${errors.password ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                            placeholder="Enter password"
                        />
                        {errors.password && (
                            <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.password}</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            onClick={handleCancel}
                            className="cursor-pointer px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="cursor-pointer px-4 py-2 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition-all shadow-lg font-medium"
                        >
                            {submitLabel ?? 'Add Customer'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerModal;
