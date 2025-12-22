'use client';

import { useState, useMemo } from 'react';
import { FileText, Plus, Eye, Edit, Download, Trash2, Check, Clock, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/client';
import { Modal } from '@/components/ui/Modal';
import type { Client, DSHSReport, DSHSReportType, DSHSReportStatus, Speciality } from '@/types';
import DSHSReportModal from './DSHSReportModal';

interface DSHSReportsSectionProps {
  client: Client;
  isAdmin?: boolean;
  currentUserName?: string;
}

const REPORT_TYPE_LABELS: Record<DSHSReportType, { short: string; full: string }> = {
  specialized_habilitation: { short: 'SH', full: 'Specialized Habilitation' },
  community_engagement: { short: 'CE', full: 'Community Engagement' },
  staff_family_consultation: { short: 'SFC', full: 'Staff and Family Consultation' },
};

// Speciality ID mapping for report types
const REPORT_SPECIALITY_MAP: Record<DSHSReportType, number> = {
  specialized_habilitation: 3,
  community_engagement: 1,
  staff_family_consultation: 4,
};

const STATUS_STYLES: Record<DSHSReportStatus, string> = {
  draft: 'border-gray-300 text-gray-700 bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:bg-gray-800/30',
  submitted: 'border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:bg-amber-900/30',
  approved: 'border-green-300 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-300 dark:bg-green-900/30',
  rejected: 'border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-300 dark:bg-red-900/30',
};

export default function DSHSReportsSection({ client, isAdmin = false, currentUserName = '' }: DSHSReportsSectionProps) {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DSHSReport | null>(null);
  const [createModalType, setCreateModalType] = useState<DSHSReportType | null>(null);
  const [isInitialPlan, setIsInitialPlan] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch DSHS reports
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['dshs-reports', client.id],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: DSHSReport[] }>(`/tenant-api/dshs-reports/client/${client.id}`);
      // Extract the data array from the wrapped response
      return response.data.data || [];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (reportId: number) => {
      await api.delete(`/tenant-api/dshs-reports/${reportId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dshs-reports', client.id] });
    },
  });

  // Submit for approval mutation
  const submitMutation = useMutation({
    mutationFn: async (reportId: number) => {
      await api.post(`/tenant-api/dshs-reports/${reportId}/submit`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dshs-reports', client.id] });
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (reportId: number) => {
      await api.post(`/tenant-api/dshs-reports/${reportId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dshs-reports', client.id] });
    },
  });

  // Check if client has a specific speciality
  const hasSpeciality = (specialityId: number): boolean => {
    return client.specialities?.some(s => s.id === specialityId) || false;
  };

  // Check if the system has reportable specialities for this client
  const hasReportableSpecialities = useMemo(() => {
    const reportableIds = [1, 3, 4]; // CE, SH, SFC
    return client.specialities?.some(s => reportableIds.includes(s.id)) || false;
  }, [client.specialities]);

  const openCreateModal = (type: DSHSReportType, initial: boolean = false) => {
    setCreateModalType(type);
    setIsInitialPlan(initial);
    setIsEditing(false);
    setSelectedReport(null);
    setShowCreateModal(true);
  };

  const openEditModal = (report: DSHSReport) => {
    setSelectedReport(report);
    setCreateModalType(report.type);
    setIsInitialPlan(report.is_initial);
    setIsEditing(true);
    setShowCreateModal(true);
  };

  const openViewModal = (report: DSHSReport) => {
    setSelectedReport(report);
    setShowViewModal(true);
  };

  const handleDelete = async (report: DSHSReport) => {
    if (window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      deleteMutation.mutate(report.id);
    }
  };

  const handleSubmitForApproval = async (report: DSHSReport) => {
    if (window.confirm('Are you sure you want to submit this report for approval?')) {
      submitMutation.mutate(report.id);
    }
  };

  const handleApprove = async (report: DSHSReport) => {
    if (window.confirm('Are you sure you want to approve this report?')) {
      approveMutation.mutate(report.id);
    }
  };

  const handleDownloadPDF = (reportId: number) => {
    window.open(`/api/dshs-reports/${reportId}/pdf`, '_blank');
  };

  const canViewReport = (report: DSHSReport) => {
    return report.submitted_by === currentUserName || isAdmin;
  };

  const canEditReport = (report: DSHSReport) => {
    if (report.status === 'draft') {
      return report.submitted_by === currentUserName || isAdmin;
    }
    if (report.status === 'submitted' && isAdmin) {
      return true;
    }
    return false;
  };

  const canDeleteReport = (report: DSHSReport) => {
    return report.status === 'draft' && (report.submitted_by === currentUserName || isAdmin);
  };

  const canSubmitForApproval = (report: DSHSReport) => {
    return report.status === 'draft' && (report.submitted_by === currentUserName || isAdmin);
  };

  const canApprove = (report: DSHSReport) => {
    return report.status === 'submitted' && isAdmin;
  };

  const formatDateRange = (report: DSHSReport) => {
    if (report.is_initial && report.initial_plan_date) {
      return `Plan Date: ${report.initial_plan_date}`;
    }
    return `${report.start_date} to ${report.end_date}`;
  };

  const filteredReports = reports.filter(report => canViewReport(report));

  if (!hasReportableSpecialities) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">DSHS Reports</h2>
        </div>
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">DSHS Reports Not Available</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            DSHS reporting functionality is only available for Specialized Habilitation and Community Engagement services.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This client has services which are not supported by the system for DSHS reporting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
      {/* Header with Create Buttons */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">DSHS Reports</h2>

        <div className="flex flex-wrap gap-2 justify-center">
          {/* Regular Reports */}
          {hasSpeciality(3) && (
            <button
              onClick={() => openCreateModal('specialized_habilitation', false)}
              className="inline-flex items-center px-3 py-1.5 border border-violet-500 text-xs font-medium rounded-md shadow-sm text-violet-700 bg-white hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create SH Report
            </button>
          )}
          {hasSpeciality(1) && (
            <button
              onClick={() => openCreateModal('community_engagement', false)}
              className="inline-flex items-center px-3 py-1.5 border border-violet-500 text-xs font-medium rounded-md shadow-sm text-violet-700 bg-white hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create CE Report
            </button>
          )}
          {hasSpeciality(4) && (
            <button
              onClick={() => openCreateModal('staff_family_consultation', false)}
              className="inline-flex items-center px-3 py-1.5 border border-violet-500 text-xs font-medium rounded-md shadow-sm text-violet-700 bg-white hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create SFC Report
            </button>
          )}

          {/* Initial Plans */}
          {hasSpeciality(3) && (
            <button
              onClick={() => openCreateModal('specialized_habilitation', true)}
              className="inline-flex items-center px-3 py-1.5 border border-violet-600 text-xs font-medium rounded-md shadow-sm text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              Create Initial SH Plan
            </button>
          )}
          {hasSpeciality(1) && (
            <button
              onClick={() => openCreateModal('community_engagement', true)}
              className="inline-flex items-center px-3 py-1.5 border border-violet-600 text-xs font-medium rounded-md shadow-sm text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              Create Initial CE Plan
            </button>
          )}
          {hasSpeciality(4) && (
            <button
              onClick={() => openCreateModal('staff_family_consultation', true)}
              className="inline-flex items-center px-3 py-1.5 border border-violet-600 text-xs font-medium rounded-md shadow-sm text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              Create Initial SFC Plan
            </button>
          )}
        </div>
      </div>

      {/* Reports Table */}
      <div className="px-6 py-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        ) : filteredReports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date Range
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Submitted By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="px-2 py-1 text-xs rounded-full border border-violet-300 text-violet-700 bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:bg-violet-900/30">
                          {REPORT_TYPE_LABELS[report.type].short}
                        </span>
                        {report.is_initial && (
                          <span className="ml-2 px-2 py-1 text-xs rounded-full bg-violet-600 text-white">
                            Initial
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDateRange(report)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={cn('px-2 py-1 text-xs rounded-full border capitalize', STATUS_STYLES[report.status])}>
                          {report.status}
                        </span>
                        {report.status === 'approved' && (
                          <Check className="ml-2 w-4 h-4 text-green-600 dark:text-green-400" />
                        )}
                        {report.status === 'submitted' && (
                          <Clock className="ml-2 w-4 h-4 text-amber-600 dark:text-amber-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {report.submitted_by || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {/* View */}
                        <button
                          onClick={() => openViewModal(report)}
                          className="rounded-full p-1 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900 transition-colors"
                          title="View Report"
                        >
                          <Eye className="w-5 h-5" />
                        </button>

                        {/* Edit */}
                        {canEditReport(report) && (
                          <button
                            onClick={() => openEditModal(report)}
                            className="rounded-full p-1 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900 transition-colors"
                            title="Edit Report"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                        )}

                        {/* Submit for Approval */}
                        {canSubmitForApproval(report) && (
                          <button
                            onClick={() => handleSubmitForApproval(report)}
                            className="rounded-full p-1 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900 transition-colors"
                            title="Submit for Approval"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                        )}

                        {/* Approve */}
                        {canApprove(report) && (
                          <button
                            onClick={() => handleApprove(report)}
                            className="rounded-full p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900 transition-colors"
                            title="Approve Report"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                        )}

                        {/* Download PDF */}
                        <button
                          onClick={() => handleDownloadPDF(report.id)}
                          className="rounded-full p-1 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900 transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-5 h-5" />
                        </button>

                        {/* Delete */}
                        {canDeleteReport(report) && (
                          <button
                            onClick={() => handleDelete(report)}
                            className="rounded-full p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 transition-colors"
                            title="Delete Report"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <span className="text-gray-500 dark:text-gray-400 text-lg font-medium">No reports found</span>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Create a new report using the buttons above
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && createModalType && (
        <DSHSReportModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedReport(null);
          }}
          client={client}
          reportType={createModalType}
          isInitial={isInitialPlan}
          isEditing={isEditing}
          existingReport={selectedReport}
          isAdmin={isAdmin}
          currentUserName={currentUserName}
          onSuccess={() => {
            setShowCreateModal(false);
            setSelectedReport(null);
            queryClient.invalidateQueries({ queryKey: ['dshs-reports', client.id] });
          }}
        />
      )}

      {/* View Modal */}
      {showViewModal && selectedReport && (
        <Modal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedReport(null);
          }}
          title={`${selectedReport.is_initial ? 'Initial ' : ''}${REPORT_TYPE_LABELS[selectedReport.type].full} ${selectedReport.is_initial ? 'Plan' : 'Report'}`}
          size="xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <span className={cn('inline-block mt-1 px-2 py-1 text-xs rounded-full border capitalize', STATUS_STYLES[selectedReport.status])}>
                  {selectedReport.status}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date Range</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{formatDateRange(selectedReport)}</p>
              </div>
            </div>

            {selectedReport.waiver_participant_name && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Waiver Participant</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{selectedReport.waiver_participant_name}</p>
              </div>
            )}

            {selectedReport.provider_name && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Provider</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{selectedReport.provider_name}</p>
              </div>
            )}

            {selectedReport.goals && selectedReport.goals.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Goals</label>
                {selectedReport.goals.map((goal, index) => (
                  <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md mb-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Goal {index + 1}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{goal.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* CE-specific fields */}
            {selectedReport.type === 'community_engagement' && !selectedReport.is_initial && (
              <>
                {selectedReport.engagement_goals && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Engagement Goals</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{selectedReport.engagement_goals}</p>
                  </div>
                )}
                {selectedReport.activities_summary && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Activities Summary</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{selectedReport.activities_summary}</p>
                  </div>
                )}
                {selectedReport.future_plans && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Future Plans</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{selectedReport.future_plans}</p>
                  </div>
                )}
              </>
            )}

            {selectedReport.referral_recommendations && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Referral Recommendations</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{selectedReport.referral_recommendations}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => handleDownloadPDF(selectedReport.id)}
                className="inline-flex items-center px-4 py-2 border border-violet-500 text-sm font-medium rounded-md text-violet-700 bg-white hover:bg-violet-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedReport(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
