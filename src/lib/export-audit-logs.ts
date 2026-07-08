/**
 * Export audit logs to Excel and PDF formats
 * Supports full logs and role-segregated exports
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AuditLog {
  id?: string;
  userRole?: 'admin' | 'judge';
  action: string;
  module?: string;
  userEmail: string;
  timestamp: any;
  description: string;
  affectedResourceId?: string;
  affectedCount?: number;
  errorMessage?: string;
  status: 'success' | 'failure';
  metadata?: Record<string, any>;
}

/**
 * Format timestamp for export
 */
function formatTimestamp(timestamp: any): string {
  try {
    const dateObj = timestamp?.toDate?.() || new Date(timestamp);
    return new Intl.DateTimeFormat('en-ZA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(dateObj);
  } catch {
    return 'Invalid date';
  }
}

/**
 * Export audit logs to Excel (CSV format)
 */
export async function exportAuditLogsToExcel(
  logs: AuditLog[],
  filename: string = 'audit-logs.csv'
): Promise<void> {
  try {
    // Prepare CSV headers
    const headers = [
      'Date & Time',
      'User Email',
      'Role',
      'Module',
      'Action',
      'Status',
      'Description',
      'Affected Resource ID',
      'Affected Count',
      'Error Message',
    ];

    // Prepare CSV rows
    const rows = logs.map((log) => [
      formatTimestamp(log.timestamp),
      log.userEmail || '-',
      log.userRole?.toUpperCase() || '-',
      log.module || '-',
      log.action.replace(/_/g, ' '),
      log.status.toUpperCase(),
      log.description,
      log.affectedResourceId || '-',
      log.affectedCount?.toString() || '-',
      log.errorMessage || '-',
    ]);

    // Create CSV content
    const csvContent = [
      headers.map((h) => `"${h}"`).join(','),
      ...rows.map((r) => r.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Add BOM for UTF-8 encoding in Excel
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });

    // Download
    downloadFile(blob, filename);
  } catch (error) {
    console.error('[Export] Failed to export to Excel:', error);
    throw new Error('Failed to export audit logs to Excel');
  }
}

/**
 * Export audit logs to PDF with formatted table
 */
export async function exportAuditLogsToPDF(
  logs: AuditLog[],
  filename: string = 'audit-logs.pdf',
  title: string = 'Audit Logs'
): Promise<void> {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // Add title
    doc.setFontSize(16);
    doc.text(title, 14, 22);

    // Add metadata
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const now = new Date();
    const exportDate = new Intl.DateTimeFormat('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(now);
    doc.text(`Generated: ${exportDate}`, 14, 30);
    doc.text(`Total records: ${logs.length}`, 14, 36);

    // Prepare table data
    const tableData = logs.map((log) => [
      formatTimestamp(log.timestamp),
      log.userEmail || '-',
      log.userRole?.toUpperCase() || '-',
      log.module || '-',
      log.action.replace(/_/g, ' '),
      log.status.toUpperCase(),
      log.description.substring(0, 40) + (log.description.length > 40 ? '...' : ''),
      log.affectedCount?.toString() || '-',
    ]);

    // Add table
    autoTable(doc, {
      startY: 42,
      head: [['Timestamp', 'User', 'Role', 'Module', 'Action', 'Status', 'Description', 'Count']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [50, 50, 50],
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 50, right: 14, bottom: 14, left: 14 },
      didDrawPage: (data) => {
        // Footer
        const pageCount = (doc as any).internal.getPages().length;
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.getHeight();
        const pageWidth = pageSize.getWidth();

        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      },
    });

    // Download
    downloadFile(doc.output('blob'), filename, 'application/pdf');
  } catch (error) {
    console.error('[Export] Failed to export to PDF:', error);
    throw new Error('Failed to export audit logs to PDF');
  }
}

/**
 * Export segregated audit logs (by role)
 */
export async function exportSegregatedAuditLogs(
  adminLogs: AuditLog[],
  judgeLogs: AuditLog[],
  format: 'excel' | 'pdf' = 'excel'
): Promise<void> {
  try {
    const timestamp = new Date().toISOString().slice(0, 10);
    
    if (format === 'excel') {
      // Export admin logs
      await exportAuditLogsToExcel(
        adminLogs,
        `audit-logs-admin-${timestamp}.csv`
      );
      
      // Export judge logs
      await exportAuditLogsToExcel(
        judgeLogs,
        `audit-logs-judges-${timestamp}.csv`
      );
    } else {
      // Export admin logs to PDF
      await exportAuditLogsToPDF(
        adminLogs,
        `audit-logs-admin-${timestamp}.pdf`,
        'Admin Audit Logs'
      );
      
      // Export judge logs to PDF
      await exportAuditLogsToPDF(
        judgeLogs,
        `audit-logs-judges-${timestamp}.pdf`,
        'Judge Audit Logs'
      );
    }
  } catch (error) {
    console.error('[Export] Failed to export segregated logs:', error);
    throw new Error('Failed to export segregated audit logs');
  }
}

/**
 * Helper function to trigger download
 */
function downloadFile(blob: Blob, filename: string, mimeType?: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  if (mimeType) {
    link.type = mimeType;
  }
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate audit report with summary statistics
 */
export function generateAuditSummary(logs: AuditLog[]): {
  totalActions: number;
  successCount: number;
  failureCount: number;
  actionsByModule: Record<string, number>;
  actionsByUser: Record<string, number>;
  actionsByRole: Record<string, number>;
} {
  return {
    totalActions: logs.length,
    successCount: logs.filter((l) => l.status === 'success').length,
    failureCount: logs.filter((l) => l.status === 'failure').length,
    actionsByModule: logs.reduce(
      (acc, log) => {
        const module = log.module || 'Unknown';
        acc[module] = (acc[module] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
    actionsByUser: logs.reduce(
      (acc, log) => {
        const user = log.userEmail || 'Unknown';
        acc[user] = (acc[user] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
    actionsByRole: logs.reduce(
      (acc, log) => {
        const role = log.userRole || 'Unknown';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  };
}
