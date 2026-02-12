import React from 'react';

export interface TableColumn<T = unknown> {
  key: string;
  label: string;
  sortable?: boolean;
  hidden?: 'md' | 'lg';
  render?: (value: unknown, row: T) => React.ReactNode;
  customHeader?: React.ReactNode; // For custom header content like dropdowns
  customCell?: (row: T, index: number) => React.ReactNode; // For custom cell content
}

interface CustomTableProps<T = unknown> {
  columns: TableColumn<T>[];
  data: T[];
  selectedRows: string[];
  toggleAllRows: () => void;
  toggleRowSelection: (id: string) => void;
  handleSort?: (field: string) => void;
  getSortIcon?: (field: string) => React.ReactNode;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (id: string) => void;
  page: number;
  totalPages: number;
  setPage: (page: number | ((prev: number) => number)) => void;
  getRowId: (row: T) => string;
  showSelection?: boolean;
  limit?: number;
  setLimit?: (limit: number) => void;
}

const CustomTable = <T,>({
  columns,
  data,
  selectedRows,
  toggleAllRows,
  toggleRowSelection,
  handleSort,
  getSortIcon,
  onView,
  onEdit,
  onDelete,
  page,
  totalPages,
  setPage,
  getRowId,
  showSelection = true,
  limit,
  setLimit,
}: CustomTableProps<T>) => {
  return (
    <>
      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                {showSelection && (
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === data.length && data.length > 0}
                      onChange={toggleAllRows}
                      className="cursor-pointer w-4 h-4 text-purple-600 border-gray-300 dark:border-gray-600 rounded focus:ring-purple-500"
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`${column.hidden === 'md' ? 'hidden md:table-cell' : column.hidden === 'lg' ? 'hidden lg:table-cell' : ''} px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-900 dark:text-white ${column.sortable && handleSort && !column.customHeader ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors select-none' : ''
                      }`}
                    onClick={() => column.sortable && handleSort && !column.customHeader ? handleSort(column.key) : undefined}
                  >
                    {column.customHeader ? (
                      column.customHeader
                    ) : (
                      <div className="flex items-center gap-2">
                        {column.label}
                        {column.sortable && getSortIcon && getSortIcon(column.key)}
                      </div>
                    )}
                  </th>
                ))}
                {(onView || onEdit || onDelete) && (
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.map((row) => {
                const rowId = getRowId(row);
                return (
                  <tr key={rowId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    {showSelection && (
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(rowId)}
                          onChange={() => toggleRowSelection(rowId)}
                          className="cursor-pointer w-4 h-4 text-purple-600 border-gray-300 dark:border-gray-600 rounded focus:ring-purple-500"
                        />
                      </td>
                    )}
                    {columns.map((column) => {
                      const cellValue = row[column.key as keyof T];
                      const dataIndex = data.findIndex(r => getRowId(r) === rowId);

                      if (column.customCell) {
                        return (
                          <td
                            key={column.key}
                            className={`${column.hidden === 'md' ? 'hidden md:table-cell' : column.hidden === 'lg' ? 'hidden lg:table-cell' : ''} px-3 sm:px-6 py-3 sm:py-4`}
                          >
                            {column.customCell(row, dataIndex)}
                          </td>
                        );
                      }

                      return (
                        <td
                          key={column.key}
                          className={`${column.hidden === 'md' ? 'hidden md:table-cell' : column.hidden === 'lg' ? 'hidden lg:table-cell' : ''} px-3 sm:px-6 py-3 sm:py-4`}
                        >
                          {column.render ? (
                            column.render(cellValue, row)
                          ) : (
                            <span className="text-xs sm:text-sm text-gray-900 dark:text-white">
                              {cellValue as React.ReactNode}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    {(onView || onEdit || onDelete) && (
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-1 sm:gap-2">
                          {onView && (
                            <button
                              className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors cursor-pointer"
                              title="View"
                              onClick={() => onView(row)}
                            >
                              <svg
                                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </button>
                          )}
                          {onEdit && (
                            <button
                              className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors cursor-pointer"
                              title="Edit"
                              onClick={() => onEdit(row)}
                            >
                              <svg
                                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                          )}
                          {onDelete && (
                            <button
                              className="p-1.5 sm:p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                              title="Delete"
                              onClick={() => onDelete(rowId)}
                            >
                              <svg
                                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500 dark:text-red-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
        <div className="flex items-center gap-3">
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </div>
          {limit !== undefined && setLimit && (
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1); // Reset to first page when changing limit
                }}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                <option value={15}>15</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className={`px-3 py-1.5 sm:py-2 rounded-lg border cursor-pointer dark:border-gray-700 text-xs sm:text-sm ${page <= 1
              ? 'text-gray-300 dark:text-gray-600'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className={`px-3 py-1.5 sm:py-2 rounded-lg border cursor-pointer dark:border-gray-700 text-xs sm:text-sm ${page >= totalPages
              ? 'text-gray-300 dark:text-gray-600'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
};

export default CustomTable;