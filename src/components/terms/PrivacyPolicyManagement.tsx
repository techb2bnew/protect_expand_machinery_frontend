'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Edit, X, Save } from 'lucide-react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { termsService, TermsAndConditions, TermsFormData } from '@/services/termsService';
import toast from '@/utils/toast';
import { TableSkeletonLoader } from '../ui/Loader';
import { useAuth } from '@/contexts/AuthContext';

// Type assertion for ClassicEditor compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Editor = ClassicEditor as any;

export default function PrivacyPolicyManagement() {
  const router = useRouter();
  const { logout } = useAuth();
  const [privacyPolicy, setPrivacyPolicy] = useState<TermsAndConditions | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState<TermsFormData>({ content: '' });
  const [error, setError] = useState<string | null>(null);

  // Helper function to check if error is authentication related
  const isAuthError = (errorMessage: string): boolean => {
    const authErrorKeywords = ['Invalid token', 'token', 'unauthorized', 'authentication', 'login'];
    return authErrorKeywords.some(keyword => 
      errorMessage.toLowerCase().includes(keyword.toLowerCase())
    );
  };

  // Helper function to handle authentication errors
  const handleAuthError = () => {
    logout();
    router.push('/');
  };

  // Fetch privacy policy
  const fetchPrivacyPolicy = async () => {
    try {
      setLoading(true);
      const response = await termsService.getAllTerms('privacy_policy');
      if (response.data && response.data.length > 0) {
        setPrivacyPolicy(response.data[0]);
        setFormData({ content: response.data[0].content });
      } else {
        setPrivacyPolicy(null);
        setFormData({ content: '' });
      }
    } catch (err) {
      const error = err as Error;
      // Don't show authentication errors, redirect to login instead
      if (isAuthError(error.message)) {
        handleAuthError();
        return;
      }
      toast.error(error.message || 'Failed to fetch privacy policy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrivacyPolicy();
  }, []);

  // Handle save (create or update)
  const handleSave = async () => {
    try {
      setError(null);
      if (!formData.content.trim()) {
        setError('Content is required');
        return;
      }

      if (privacyPolicy) {
        // Update existing
        await termsService.updateTerms(formData, 'privacy_policy');
        toast.success('Privacy Policy updated successfully!');
      } else {
        // Create new
        await termsService.createTerms(formData, 'privacy_policy');
        toast.success('Privacy Policy created successfully!');
      }

      await fetchPrivacyPolicy();
      setIsEditOpen(false);
    } catch (err) {
      const error = err as Error;
      // Don't show authentication errors on page, redirect to login instead
      if (isAuthError(error.message)) {
        handleAuthError();
        return;
      }
      // Only show non-authentication errors
      setError(error.message || 'Failed to save privacy policy');
      toast.error(error.message || 'Failed to save privacy policy');
    }
  };


  return (
    <>
      <div className="p-4 md:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Shield className="w-8 h-8" />
                Privacy Policy Management
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Manage Privacy Policy that is displayed in the mobile app
              </p>
            </div>
            {!isEditOpen && (
              <button
                onClick={() => {
                  if (privacyPolicy) {
                    setFormData({ content: privacyPolicy.content });
                  }
                  setIsEditOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium cursor-pointer"
              >
                <Edit className="w-4 h-4" />
                {privacyPolicy ? 'Edit Privacy Policy' : 'Create Privacy Policy'}
              </button>
            )}
          </div>

          {/* Privacy Policy Display/Edit */}
          {loading ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <TableSkeletonLoader />
            </div>
          ) : isEditOpen ? (
            /* Edit Mode */
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {privacyPolicy ? 'Edit Privacy Policy' : 'Create Privacy Policy'}
                </h2>
                <button
                  onClick={() => {
                    setIsEditOpen(false);
                    if (privacyPolicy) {
                      setFormData({ content: privacyPolicy.content });
                    } else {
                      setFormData({ content: '' });
                    }
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content <span className="text-red-500">*</span>
                  </label>
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                    <CKEditor
                      editor={Editor}
                      data={formData.content}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onChange={(event: any, editor: any) => {
                        const data = editor.getData();
                        setFormData({ content: data });
                      }}
                      config={{
                        toolbar: [
                          'heading', '|',
                          'bold', 'italic', 'link', '|',
                          'bulletedList', 'numberedList', '|',
                          'blockQuote', 'insertTable', '|',
                          'undo', 'redo'
                        ],
                        heading: {
                          options: [
                            { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
                            { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
                            { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
                            { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' }
                          ]
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setIsEditOpen(false);
                    if (privacyPolicy) {
                      setFormData({ content: privacyPolicy.content });
                    } else {
                      setFormData({ content: '' });
                    }
                    setError(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {privacyPolicy ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          ) : privacyPolicy ? (
            /* View Mode */
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <div
                  className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
                  dangerouslySetInnerHTML={{ __html: privacyPolicy.content }}
                />
              </div>
            </div>
          ) : (
            /* No Privacy Policy */
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No Privacy Policy found</p>
                <p className="text-sm mb-6">Create your Privacy Policy to get started</p>
                <button
                  onClick={() => {
                    setFormData({ content: '' });
                    setIsEditOpen(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium inline-flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Create Privacy Policy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

