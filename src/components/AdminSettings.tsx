/**
 * Enhanced Admin Settings Panel
 * 
 * Features:
 * - Real-time Firebase connection status
 * - Segregated audit logs (Admin vs Judge)
 * - Export to Excel and PDF
 * - Summary statistics
 * - Responsive mobile-friendly UI
 * - Module filtering
 */

import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useTrackInteraction } from '@/hooks/useTrackInteraction';
import {
  exportAuditLogsToExcel,
  exportAuditLogsToPDF,
  generateAuditSummary,
} from '@/lib/export-audit-logs';
import { ChangePassword } from '@/components/ChangePassword';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  XCircle,
  Shield,
  Download,
  Loader2,
  Activity,
  TrendingUp,
} from 'lucide-react';

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

export function AdminSettings() {
  useTrackInteraction({
    module: 'settings',
    action: 'ACCESSED_SETTINGS',
    description: 'Opened admin settings panel',
    trackImmediately: true,
  });

  const [systemStatus, setSystemStatus] = useState<'online' | 'offline'>('offline');
  const [responseTime, setResponseTime] = useState(0);
  const [lastPing, setLastPing] = useState<Date | null>(null);
  const [adminLogs, setAdminLogs] = useState<AuditLog[]>([]);
  const [judgeLogs, setJudgeLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [selectedModule, setSelectedModule] = useState<string>('all');

  // Check Firebase connection health
  useEffect(() => {
    const checkConnection = async () => {
      const start = performance.now();
      try {
        const testRef = doc(db, 'system', 'health');
        await getDoc(testRef);
        const end = performance.now();
        setResponseTime(Math.round(end - start));
        setSystemStatus('online');
        setLastPing(new Date());
      } catch (error) {
        setSystemStatus('offline');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  // Load audit logs
  useEffect(() => {
    const loadLogs = async () => {
      try {
        const logsQuery = query(collection(db, 'audit_logs_extended'), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(logsQuery);
        const allLogs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as AuditLog));

        const admin = allLogs.filter((log) => log.userRole === 'admin');
        const judge = allLogs.filter((log) => log.userRole === 'judge');

        setAdminLogs(admin);
        setJudgeLogs(judge);
      } catch (error) {
        console.error('[Settings] Failed to load audit logs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, []);

  // Filter logs by module
  const filteredAdminLogs =
    selectedModule === 'all' ? adminLogs : adminLogs.filter((log) => log.module === selectedModule);
  const filteredJudgeLogs =
    selectedModule === 'all' ? judgeLogs : judgeLogs.filter((log) => log.module === selectedModule);

  // Get unique modules
  const modules = Array.from(
    new Set([...adminLogs, ...judgeLogs].map((log) => log.module).filter(Boolean))
  );

  // Handle exports
  const handleExportAdminLogs = async (format: 'excel' | 'pdf') => {
    setExporting(format);
    try {
      const filename = `audit-logs-admin-${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'csv' : 'pdf'}`;
      if (format === 'excel') {
        await exportAuditLogsToExcel(filteredAdminLogs, filename);
      } else {
        await exportAuditLogsToPDF(filteredAdminLogs, filename, 'Admin Audit Logs');
      }
    } catch (error) {
      console.error('[Settings] Export failed:', error);
    } finally {
      setExporting(null);
    }
  };

  const handleExportJudgeLogs = async (format: 'excel' | 'pdf') => {
    setExporting(format);
    try {
      const filename = `audit-logs-judges-${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'csv' : 'pdf'}`;
      if (format === 'excel') {
        await exportAuditLogsToExcel(filteredJudgeLogs, filename);
      } else {
        await exportAuditLogsToPDF(filteredJudgeLogs, filename, 'Judge Audit Logs');
      }
    } catch (error) {
      console.error('[Settings] Export failed:', error);
    } finally {
      setExporting(null);
    }
  };

  // Summary statistics
  const adminSummary = generateAuditSummary(adminLogs);
  const judgeSummary = generateAuditSummary(judgeLogs);

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* System Status Card */}
      <Card className="p-4 md:p-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h3 className="text-lg font-bold font-serif">System Status</h3>
            <p className="text-sm text-muted-foreground">Real-time Firebase connectivity</p>
          </div>
          <Shield className="h-6 w-6 text-primary/60 shrink-0" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status */}
          <div className="rounded-lg border border-primary/15 p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">CONNECTION STATUS</p>
            <div className="flex items-center gap-2">
              {systemStatus === 'online' ? (
                <>
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-sm font-semibold text-green-700">Online</p>
                </>
              ) : (
                <>
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <p className="text-sm font-semibold text-red-700">Offline</p>
                </>
              )}
            </div>
          </div>

          {/* Response Time */}
          <div className="rounded-lg border border-primary/15 p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">RESPONSE TIME</p>
            <p className="text-2xl font-bold text-primary">{responseTime}ms</p>
            <p className="text-xs text-muted-foreground mt-1">Last updated: {lastPing?.toLocaleTimeString() || '-'}</p>
          </div>

          {/* Current User */}
          <div className="rounded-lg border border-primary/15 p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">LOGGED IN AS</p>
            <p className="text-sm font-semibold text-foreground break-all">{auth.currentUser?.email || '-'}</p>
          </div>
        </div>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Admin Statistics */}
        <Card className="p-4 md:p-6 border-blue-200/50 bg-blue-50/20">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              Admin Activity
            </h4>
            <Badge variant="outline">{adminSummary.totalActions}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Successful</p>
              <p className="text-lg font-bold text-green-600">{adminSummary.successCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Failed</p>
              <p className="text-lg font-bold text-red-600">{adminSummary.failureCount}</p>
            </div>
          </div>
        </Card>

        {/* Judge Statistics */}
        <Card className="p-4 md:p-6 border-purple-200/50 bg-purple-50/20">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              Judge Activity
            </h4>
            <Badge variant="outline">{judgeSummary.totalActions}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Successful</p>
              <p className="text-lg font-bold text-green-600">{judgeSummary.successCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Failed</p>
              <p className="text-lg font-bold text-red-600">{judgeSummary.failureCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Audit Logs Tabs */}
      <Card className="p-4 md:p-6">
        <div className="mb-6">
          <h3 className="text-lg font-bold font-serif mb-2">Account Settings</h3>
          <p className="text-sm text-muted-foreground">Manage your account and security settings</p>
        </div>

        <Tabs defaultValue="password" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="password">Change Password</TabsTrigger>
            <TabsTrigger value="admin">Admin Logs</TabsTrigger>
            <TabsTrigger value="judge">Judge Logs</TabsTrigger>
          </TabsList>

          {/* Password Change Tab */}
          <TabsContent value="password" className="space-y-4">
            <ChangePassword />
          </TabsContent>

          {/* Admin Logs Tab */}
          <TabsContent value="admin" className="space-y-3">
            <div className="flex gap-2 mb-4 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExportAdminLogs('excel')}
                disabled={exporting !== null || loading || filteredAdminLogs.length === 0}
              >
                {exporting === 'excel' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExportAdminLogs('pdf')}
                disabled={exporting !== null || loading || filteredAdminLogs.length === 0}
              >
                {exporting === 'pdf' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </>
                )}
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredAdminLogs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-primary/20 py-8 text-center">
                <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No admin logs found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredAdminLogs.map((log) => (
                  <AuditLogEntry key={log.id} log={log} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Judge Logs Tab */}
          <TabsContent value="judge" className="space-y-3">
            <div className="flex gap-2 mb-4 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExportJudgeLogs('excel')}
                disabled={exporting !== null || loading || filteredJudgeLogs.length === 0}
              >
                {exporting === 'excel' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExportJudgeLogs('pdf')}
                disabled={exporting !== null || loading || filteredJudgeLogs.length === 0}
              >
                {exporting === 'pdf' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </>
                )}
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredJudgeLogs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-primary/20 py-8 text-center">
                <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No judge logs found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredJudgeLogs.map((log) => (
                  <AuditLogEntry key={log.id} log={log} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

/**
 * Single Audit Log Entry Component
 */
function AuditLogEntry({ log }: { log: AuditLog }) {
  const formatTimestamp = (timestamp: any): string => {
    try {
      const dateObj = timestamp?.toDate?.() || new Date(timestamp);
      return new Intl.DateTimeFormat('en-ZA', {
        month: 'short',
        day: 'numeric',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(dateObj);
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="rounded-lg border border-primary/10 bg-white p-3 hover:shadow-sm transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-sm font-semibold capitalize truncate">
              {log.action.toLowerCase().replace(/_/g, ' ')}
            </p>
            {log.status === 'success' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 shrink-0">
                <CheckCircle2 className="h-3 w-3" />
                Success
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 shrink-0">
                <XCircle className="h-3 w-3" />
                Failed
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground truncate">{log.userEmail}</p>
          <p className="text-xs text-foreground/70 mt-1 line-clamp-2">{log.description}</p>

          {log.module && (
            <p className="text-xs text-muted-foreground mt-1">
              Module: <span className="font-medium">{log.module}</span>
            </p>
          )}

          {log.affectedCount !== undefined && (
            <p className="text-xs text-muted-foreground">
              Affected: <span className="font-semibold">{log.affectedCount}</span>
            </p>
          )}
        </div>

        <p className="text-xs text-muted-foreground shrink-0 sm:text-right">
          {formatTimestamp(log.timestamp)}
        </p>
      </div>

      {log.errorMessage && (
        <div className="mt-2 rounded bg-red-50 border border-red-200 p-2">
          <p className="text-xs text-red-700 font-mono break-all">{log.errorMessage}</p>
        </div>
      )}
    </div>
  );
}

