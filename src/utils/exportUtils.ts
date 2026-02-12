/**
 * Utility functions for exporting data to CSV
 */

export interface ExportData {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Header mapping interface
 */
interface CSVHeader {
  label: string;
  key: string;
}

/**
 * Converts data array to CSV string
 */
export function convertToCSV(
  data: ExportData[],
  headers: CSVHeader[]
): string {
  if (data.length === 0) return '';

  // Header row (labels)
  const headerRow = headers.map(h => `"${h.label}"`).join(',');

  // Data rows
  const rows = data.map(item =>
    headers.map(h => {
      const value = item[h.key];
      const cellValue = value ?? '';
      return `"${String(cellValue).replace(/"/g, '""')}"`;
    }).join(',')
  );

  return [headerRow, ...rows].join('\n');
}

/**
 * Downloads CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], {
    type: 'text/csv;charset=utf-8;'
  });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports data array to CSV file
 */
export function exportToCSV(
  data: ExportData[],
  filename: string,
  headers: CSVHeader[]
): void {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const csvContent = convertToCSV(data, headers);
  downloadCSV(csvContent, filename);
}

/**
 * Ticket export interface
 */
export interface TicketExportData extends ExportData {
  ticketNumber: string;
  customer: string;
  description: string;
  status: string;
  category: string;
  equipment: string;
  assignedAgent: string;
  createdDate: string;
}

/**
 * Export tickets to CSV
 */
export function exportTicketsToCSV(
  tickets: Array<{
    ticketNumber: string;
    customer?: { name?: string };
    description: string;
    status: string;
    categoryId?: { name?: string };
    equipmentId?: { name?: string };
    assignedAgent?: { name?: string };
    createdAt: string;
  }>,
  filename?: string
): void {
  if (tickets.length === 0) {
    throw new Error('No tickets to export');
  }

  // ✅ HEADER MAPPING (MOST IMPORTANT PART)
  const headers = [
    { label: 'Ticket Number', key: 'ticketNumber' },
    { label: 'Customer', key: 'customer' },
    { label: 'Description', key: 'description' },
    { label: 'Status', key: 'status' },
    { label: 'Category', key: 'category' },
    { label: 'Equipment', key: 'equipment' },
    { label: 'Assigned Agent', key: 'assignedAgent' },
    { label: 'Created Date', key: 'createdDate' }
  ];

  // CSV data
  const exportData: TicketExportData[] = tickets.map(ticket => ({
    ticketNumber: ticket.ticketNumber,
    customer: ticket.customer?.name || 'N/A',
    description: ticket.description || '',
    status: ticket.status,
    category: ticket.categoryId?.name || 'N/A',
    equipment: ticket.equipmentId?.name || 'N/A',
    assignedAgent: ticket.assignedAgent?.name || 'Unassigned',
    createdDate: new Date(ticket.createdAt).toLocaleDateString()
  }));

  const defaultFilename = `tickets_export_${new Date()
    .toISOString()
    .split('T')[0]}.csv`;

  exportToCSV(exportData, filename || defaultFilename, headers);
}
