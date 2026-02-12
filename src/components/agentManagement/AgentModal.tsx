'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Check } from 'lucide-react';
import agentService from '@/services/agentService';

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AgentFormData) => Promise<void>;
  initialData?: AgentFormData;
  isEdit?: boolean;
}

export interface AgentFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password?: string;
  status?: 'online' | 'offline';
  categoryId?: string[];
}

export default function AgentModal({ isOpen, onClose, onSubmit, initialData, isEdit = false }: AgentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstNameError, setFirstNameError] = useState<string>('');
  const [lastNameError, setLastNameError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string>('');
  const [departmentError, setDepartmentError] = useState<string>('');
  const [categories, setCategories] = useState<{ _id: string, name: string }[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<AgentFormData>(initialData || {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    status: 'offline',
    categoryId: [],
  });

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      // Handle both formats: array of IDs or array of category objects
      let categoryIds: string[] = [];
      if (initialData.categoryId) {
        categoryIds = initialData.categoryId.map((cat: string | { _id: string }) =>
          typeof cat === 'string' ? cat : cat._id
        );
      }

      setFormData({
        ...initialData,
        categoryId: categoryIds
      });
    }
  }, [initialData]);

  // Fetch categories when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const categoryList = await agentService.getCategoryList();
      setCategories(categoryList);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const toggleCategory = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      categoryId: prev.categoryId?.includes(categoryId)
        ? prev.categoryId.filter(id => id !== categoryId)
        : [...(prev.categoryId || []), categoryId]
    }));
    setDepartmentError(''); // Clear error when user selects a department
  };

  const getSelectedCategories = (): { _id: string, name: string }[] => {
    if (!formData.categoryId || formData.categoryId.length === 0) {
      return [];
    }
    return formData.categoryId
      .map(id => categories.find(cat => cat._id === id))
      .filter((cat): cat is { _id: string, name: string } => cat !== undefined);
  };

  const removeCategory = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      categoryId: prev.categoryId?.filter(id => id !== categoryId) || []
    }));
  };

  // First Name validation
  const validateFirstName = (firstName: string) => {
    if (!firstName.trim()) {
      setFirstNameError('First name is required');
      return false;
    }
    setFirstNameError('');
    return true;
  };

  // Last Name validation
  const validateLastName = (lastName: string) => {
    if (!lastName.trim()) {
      setLastNameError('Last name is required');
      return false;
    }
    setLastNameError('');
    return true;
  };

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  // Password validation
  const validatePassword = (password: string) => {
    if (!isEdit) { // Only required for new agents
      if (!password.trim()) {
        setPasswordError('Password is required');
        return false;
      }
      if (password.length < 6) {
        setPasswordError('Password must be at least 6 characters');
        return false;
      }
    }
    setPasswordError('');
    return true;
  };

  // Phone validation (10-15 digits)
  const validatePhone = (phone: string) => {
    if (!phone.trim()) {
      setPhoneError('Phone number is required');
      return false;
    }
    const phoneDigits = phone.replace(/\D/g, ''); // Remove non-digits
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      setPhoneError('Phone number must be between 10 and 15 digits');
      return false;
    }
    setPhoneError('');
    return true;
  };

  // Department validation
  const validateDepartment = (categoryId: string[]) => {
    if (!categoryId || categoryId.length === 0) {
      setDepartmentError('Department is required');
      return false;
    }
    setDepartmentError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields and show errors immediately
    const isFirstNameValid = validateFirstName(formData.firstName);
    const isLastNameValid = validateLastName(formData.lastName);
    const isEmailValid = validateEmail(formData.email);
    const isPasswordValid = validatePassword(formData.password || '');
    const isPhoneValid = validatePhone(formData.phone);
    const isDepartmentValid = validateDepartment(formData.categoryId || []);

    // If any validation fails, show errors and return
    if (!isFirstNameValid || !isLastNameValid || !isEmailValid || !isPasswordValid || !isPhoneValid || !isDepartmentValid) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        categoryId: [],
      });
      setFirstNameError('');
      setLastNameError('');
      setEmailError('');
      setPasswordError('');
      setPhoneError('');
      setDepartmentError('');
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to create agent');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      categoryId: [],
    });
    setError(null);
    setFirstNameError('');
    setLastNameError('');
    setEmailError('');
    setPasswordError('');
    setPhoneError('');
    setDepartmentError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop with Blur */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-all"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {isEdit ? 'Edit Agent' : 'Create New Agent'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isEdit ? `Update information for ${formData.firstName} ${formData.lastName}` : 'Add a new agent to the support team. They will receive credentials via email.'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* First Name and Last Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => {
                    setFormData({ ...formData, firstName: e.target.value });
                    if (e.target.value.trim()) {
                      setFirstNameError('');
                    }
                  }}
                  onBlur={(e) => validateFirstName(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-900 dark:text-white transition-all ${firstNameError
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                    }`}
                  placeholder="Enter first name"
                />
                {firstNameError && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{firstNameError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => {
                    setFormData({ ...formData, lastName: e.target.value });
                    if (e.target.value.trim()) {
                      setLastNameError('');
                    }
                  }}
                  onBlur={(e) => validateLastName(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-900 dark:text-white transition-all ${lastNameError
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                    }`}
                  placeholder="Enter last name"
                />
                {lastNameError && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{lastNameError}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setEmailError('');
                }}
                onBlur={(e) => validateEmail(e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-900 dark:text-white transition-all ${emailError
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
                  }`}
                placeholder="agent@example.com"
              />
              {emailError && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{emailError}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password {!isEdit && <span className="text-red-500">*</span>}
              </label>
              <input
                type="password"
                value={formData.password || ''}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  setPasswordError('');
                }}
                onBlur={(e) => validatePassword(e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-900 dark:text-white transition-all ${passwordError
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
                  }`}
                placeholder={isEdit ? "Leave blank to keep current password" : "Enter password"}
              />
              {passwordError && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordError}</p>
              )}
              {isEdit && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Leave blank to keep the current password
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  // Only allow digits
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 15) {
                    setFormData({ ...formData, phone: value });
                    setPhoneError('');
                  }
                }}
                onBlur={(e) => validatePhone(e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-900 dark:text-white transition-all ${phoneError
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
                  }`}
                placeholder="Enter 10-15 digit phone number"
                maxLength={15}
              />
              {phoneError && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{phoneError}</p>
              )}
              {!phoneError && formData.phone && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {formData.phone.length}/10-15 digits
                </p>
              )}
            </div>

            {/* Department Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Department <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={toggleDropdown}
                  disabled={loadingCategories}
                  className={`w-full min-h-[48px] px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-900 dark:text-white transition-all text-left flex items-center justify-between ${departmentError
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                    } ${loadingCategories ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                >
                  <div className="flex flex-wrap gap-2 flex-1">
                    {loadingCategories ? (
                      <span className="text-gray-500 dark:text-gray-400">Loading categories...</span>
                    ) : getSelectedCategories().length > 0 ? (
                      getSelectedCategories().map((category) => (
                        <span
                          key={category._id}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium"
                        >
                          {category.name}
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCategory(category._id);
                            }}
                            className="ml-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </span>
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">Select Departments</span>
                    )}
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''} ml-2 flex-shrink-0`} />
                </button>

                {isDropdownOpen && !loadingCategories && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {categories.map((category) => (
                      <div
                        key={category._id}
                        onClick={() => toggleCategory(category._id)}
                        className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <span className="text-gray-900 dark:text-white">{category.name}</span>
                        {formData.categoryId?.includes(category._id) && (
                          <Check className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {departmentError && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{departmentError}</p>
              )}
              {!departmentError && formData.categoryId && formData.categoryId.length > 0 && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {formData.categoryId.length} department(s) selected
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Agent' : 'Create Agent')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

