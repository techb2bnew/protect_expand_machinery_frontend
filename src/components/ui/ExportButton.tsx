'use client';

import React from 'react';
import { Download } from 'lucide-react';
import toast from '@/utils/toast';

export interface ExportColumn<T = unknown> {
  key: string;
  label: string;
  render?: (value: unknown, row: T) => string | number;
}

export interface ExportButtonProps<T = unknown> {
  data: T[];
  selectedIds?: string[];
  columns: ExportColumn<T>[];
  filename?: string;
  entityName?: string;
  requireSelection?: boolean;
  className?: string;
  buttonText?: string;
  disabled?: boolean;
  getRowId?: (row: T) => string;
}

function ExportButton<T = Record<string, unknown>>({
  data,
  selectedIds = [],
  columns,
  filename,
  entityName = 'data',
  requireSelection = false,
  className = '',
  buttonText = 'Export',
  disabled = false,
  getRowId,
}: ExportButtonProps<T>) {

  const handleExport = () => {
    try {
      let dataToExport: T[];

      // 🔒 Case 1: selection is required but nothing selected
      // if (requireSelection && selectedIds.length === 0) {
      //   toast.error(`Please select at least one ${entityName} to export`);
      //   return;
      // }

      // ✅ Case 2: some rows selected → export only selected
      if (selectedIds.length > 0) {
        if (!getRowId) {
          toast.error('getRowId function is required when using selection');
          return;
        }

        dataToExport = data.filter(item =>
          selectedIds.includes(getRowId(item))
        );
      }
      // ✅ Case 3: nothing selected → export ALL
      else {
        dataToExport = data;
      }

      if (!dataToExport || dataToExport.length === 0) {
        toast.error(`No ${entityName} to export`);
        return;
      }

      // 🧾 CSV HEADER
      const header = columns.map(col => `"${col.label}"`).join(',');

      // 📄 CSV ROWS
      const rows = dataToExport.map(row =>
        columns.map(col => {
          const rawValue = (row as Record<string, unknown>)[col.key];
          const value = col.render
            ? col.render(rawValue, row)
            : rawValue ?? '';

          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      );

      const csvContent = [header, ...rows].join('\n');

      // ⬇️ DOWNLOAD
      const blob = new Blob([csvContent], {
        type: 'text/csv;charset=utf-8;',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      const dateStr = new Date().toISOString().split('T')[0];
      const finalFilename =
        filename || `${entityName}_${dateStr}.csv`;

      link.href = url;
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(
        `${dataToExport.length} ${entityName}(s) exported successfully`
      );
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export ${entityName}`);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled}
      className={`cursor-pointer flex-1 lg:flex-none px-3 sm:px-4 py-2.5
        bg-white dark:bg-gray-800
        border border-gray-300 dark:border-gray-600
        text-gray-700 dark:text-gray-300
        hover:bg-gray-50 dark:hover:bg-gray-700
        rounded-xl transition-all duration-200
        flex items-center justify-center gap-2
        shadow-sm font-medium text-sm sm:text-base
        whitespace-nowrap
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}`}
    >
      <Download className="w-4 h-4" />
      {buttonText}
    </button>
  );
}

export default ExportButton;
