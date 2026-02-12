import React, { useState, useEffect } from 'react';
import { X, Upload, XCircle } from 'lucide-react';

type CreateTicketForm = {
  customerId: string;
  description: string;
  categoryId: string;
  equipmentId: string;
  serialNumber: string;
  controlChoice: string;
  equipmentModel: string;
  modelNo: string;
  attachments: File[];
};

type CreateTicketModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTicketForm) => Promise<void>;
  categories: { _id: string; name: string }[];
  customers: { _id: string; name: string; email: string }[];
  equipment: { _id: string; name: string; serialNumber: string }[];
  loading?: boolean;
};

const CreateTicketModal = ({
  isOpen,
  onClose,
  onSubmit,
  categories,
  customers,
  equipment,
  loading = false
}: CreateTicketModalProps) => {
  const [formData, setFormData] = useState<CreateTicketForm>({
    customerId: '',
    description: '',
    categoryId: '',
    equipmentId: '',
    serialNumber: '',
    controlChoice: '',
    equipmentModel: '',
    modelNo: '',
    attachments: []
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateTicketForm, string>>>({});
  const [previewFiles, setPreviewFiles] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        customerId: '',
        description: '',
        categoryId: '',
        equipmentId: '',
        serialNumber: '',
        controlChoice: '',
        equipmentModel: '',
        modelNo: '',
        attachments: []
      });
      setErrors({});
      setPreviewFiles([]);
    }
  }, [isOpen]);

  // Get selected category name
  const selectedCategory = categories.find(cat => cat._id === formData.categoryId);
  const categoryName = selectedCategory?.name || '';

  // Helper functions to determine which fields to show
  const isApplicationsSupport = categoryName.toLowerCase().includes('applications support');
  const isServiceSupport = categoryName.toLowerCase().includes('service support');
  const isPartsSupport = categoryName.toLowerCase().includes('parts support');
  const isSalesSupport = categoryName.toLowerCase().includes('sales support');


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // If category is changing, reset conditional fields
    if (name === 'categoryId') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        equipmentId: '',
        serialNumber: '',
        controlChoice: '',
        equipmentModel: '',
        modelNo: ''
      } as CreateTicketForm));
      // Clear related errors
      setErrors(prev => ({
        ...prev,
        equipmentId: '',
        serialNumber: '',
        controlChoice: '',
        equipmentModel: '',
        modelNo: ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      } as CreateTicketForm));
    }

    if (errors[name as keyof CreateTicketForm]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length + formData.attachments.length > 5) {
        setErrors(prev => ({
          ...prev,
          attachments: 'Maximum 5 files allowed'
        }));
        return;
      }

      const validFiles = files.filter(file => {
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          setErrors(prev => ({
            ...prev,
            attachments: 'File size should be less than 5MB'
          }));
          return false;
        }
        return true;
      });

      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...validFiles]
      }));

      // Create preview URLs
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewFiles(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });

      if (errors.attachments) {
        setErrors(prev => ({ ...prev, attachments: '' }));
      }
    }
  };

  const removeFile = (index: number) => {
    setFormData(prev => {
      const newAttachments = prev.attachments.filter((_, i) => i !== index);
      return { ...prev, attachments: newAttachments };
    });
    setPreviewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors: Partial<Record<keyof CreateTicketForm, string>> = {};

    if (!formData.customerId.trim()) {
      newErrors.customerId = 'Customer is required';
    }

    if (!formData.categoryId.trim()) {
      newErrors.categoryId = 'Category is required';
    }

    // Description validation - required for all except Sales Support
    if (!isSalesSupport) {
      if (!formData.description.trim()) {
        newErrors.description = 'Description is required';
      } else if (formData.description.trim().length < 10) {
        newErrors.description = 'Description must be at least 10 characters';
      }
    } else {
      // For Sales Support, description is optional but if provided should be at least 10 chars
      if (formData.description.trim() && formData.description.trim().length < 10) {
        newErrors.description = 'Description must be at least 10 characters';
      }
    }

    // Applications Support: Equipment Model and Control
    if (isApplicationsSupport) {
      if (!formData.equipmentModel.trim()) {
        newErrors.equipmentModel = 'Equipment Model is required';
      }
      if (!formData.controlChoice.trim()) {
        newErrors.controlChoice = 'Control Choice is required';
      }
    }

    // Service Support: Model No., Serial No. and Control
    if (isServiceSupport) {
      if (!formData.modelNo.trim()) {
        newErrors.modelNo = 'Model No. is required';
      }
      if (!formData.serialNumber.trim()) {
        newErrors.serialNumber = 'Serial Number is required';
      }
      if (!formData.controlChoice.trim()) {
        newErrors.controlChoice = 'Control Choice is required';
      }
    }

    // Parts Support: Model No. and Serial No.
    if (isPartsSupport) {
      if (!formData.modelNo.trim()) {
        newErrors.modelNo = 'Model No. is required';
      }
      if (!formData.serialNumber.trim()) {
        newErrors.serialNumber = 'Serial Number is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      await onSubmit(formData);
    }
  };

  const handleCancel = () => {
    setFormData({
      customerId: '',
      description: '',
      categoryId: '',
      equipmentId: '',
      serialNumber: '',
      controlChoice: '',
      equipmentModel: '',
      modelNo: '',
      attachments: []
    });
    setErrors({});
    setPreviewFiles([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 sticky top-0 bg-white dark:bg-gray-800 z-10 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Create New Ticket</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Fill in the ticket details below</p>
          </div>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="cursor-pointer text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        <div className="px-6 pb-6">
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Customer <span className="text-red-500">*</span>
            </label>
            <select
              name="customerId"
              value={formData.customerId}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 ${errors.customerId ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              disabled={loading}
            >
              <option value="">Select a customer</option>
              {customers.map((customer) => (
                <option key={customer._id} value={customer._id}>
                  {customer.name} ({customer.email})
                </option>
              ))}
            </select>
            {errors.customerId && (
              <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.customerId}</p>
            )}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              name="categoryId"
              value={formData.categoryId}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 ${errors.categoryId ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              disabled={loading}
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.categoryId}</p>
            )}
          </div>

          {/* Applications Support: Equipment Model and Control */}
          {isApplicationsSupport && (
            <>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Equipment Model <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="equipmentModel"
                  value={formData.equipmentModel}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 ${errors.equipmentModel ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="Enter equipment model"
                  disabled={loading}
                />
                {errors.equipmentModel && (
                  <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.equipmentModel}</p>
                )}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Control Choices <span className="text-red-500">*</span>
                </label>
                <select
                  name="controlChoice"
                  value={formData.controlChoice}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 ${errors.controlChoice ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  disabled={loading}
                >
                  <option value="">Select control choice</option>
                  <option value="Fanuc">Fanuc</option>
                  <option value="Mitsubishi">Mitsubishi</option>
                  <option value="Syntec">Syntec</option>
                  <option value="Fagor">Fagor</option>
                  <option value="Siemens">Siemens</option>
                </select>
                {errors.controlChoice && (
                  <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.controlChoice}</p>
                )}
              </div>
            </>
          )}

          {/* Service Support: Model No., Serial No. and Control */}
          {isServiceSupport && (
            <>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Model No. <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="modelNo"
                  value={formData.modelNo}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 ${errors.modelNo ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="Enter model number"
                  disabled={loading}
                />
                {errors.modelNo && (
                  <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.modelNo}</p>
                )}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Serial No. <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="serialNumber"
                  value={formData.serialNumber}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 ${errors.serialNumber ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="Enter serial number"
                  disabled={loading}
                />
                {errors.serialNumber && (
                  <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.serialNumber}</p>
                )}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Control Choices <span className="text-red-500">*</span>
                </label>
                <select
                  name="controlChoice"
                  value={formData.controlChoice}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 ${errors.controlChoice ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  disabled={loading}
                >
                  <option value="">Select control choice</option>
                  <option value="Fanuc">Fanuc</option>
                  <option value="Mitsubishi">Mitsubishi</option>
                  <option value="Syntec">Syntec</option>
                  <option value="Fagor">Fagor</option>
                  <option value="Siemens">Siemens</option>
                </select>
                {errors.controlChoice && (
                  <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.controlChoice}</p>
                )}
              </div>
            </>
          )}

          {/* Parts Support: Model No. and Serial No. */}
          {isPartsSupport && (
            <>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Model No. <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="modelNo"
                  value={formData.modelNo}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 ${errors.modelNo ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="Enter model number"
                  disabled={loading}
                />
                {errors.modelNo && (
                  <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.modelNo}</p>
                )}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Serial No. <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="serialNumber"
                  value={formData.serialNumber}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 ${errors.serialNumber ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  placeholder="Enter serial number"
                  disabled={loading}
                />
                {errors.serialNumber && (
                  <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.serialNumber}</p>
                )}
              </div>
            </>
          )}

          {/* Description - shown for all except Sales Support (where it's optional) */}
          {!isSalesSupport && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 ${errors.description ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                placeholder="Describe the issue or request..."
                disabled={loading}
              />
              {errors.description && (
                <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.description}</p>
              )}
            </div>
          )}

          {/* Description for Sales Support - optional */}
          {isSalesSupport && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 ${errors.description ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                placeholder="Describe the issue or request... (Optional)"
                disabled={loading}
              />
              {errors.description && (
                <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.description}</p>
              )}
            </div>
          )}

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Attachments (Optional, Max 5 files, 5MB each)
            </label>
            <div className="flex items-center gap-2">
              <label className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Upload className="w-4 h-4" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Upload Files</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={loading || formData.attachments.length >= 5}
                />
              </label>
              {formData.attachments.length > 0 && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formData.attachments.length} file(s) selected
                </span>
              )}
            </div>
            {errors.attachments && (
              <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.attachments}</p>
            )}
            {previewFiles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {previewFiles.map((preview, index) => (
                  <div key={index} className="relative">
                    {preview.startsWith('data:image') ? (
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center">
                        <span className="text-xs text-gray-600 dark:text-gray-400">File</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      disabled={loading}
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="cursor-pointer px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="cursor-pointer px-4 py-2 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition-all shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                'Create Ticket'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTicketModal;

