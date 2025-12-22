'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useClients, ClientFilters } from '@/hooks/useClients';
import { cn } from '@/lib/utils';
import {
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  User,
  MapPin,
  Phone,
  Building,
  MoreHorizontal,
  Archive,
  Eye,
  Edit,
} from 'lucide-react';
import type { Client, ClientWithDetails } from '@/types';
import ClientModal from '@/components/features/clients/ClientModal';

const statusColors = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  archived: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
};

export default function ClientsPage() {
  const [filters, setFilters] = useState<ClientFilters>({
    page: 1,
    per_page: 20,
    status: 'active',
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithDetails | null>(null);

  const { data, isLoading, error, refetch } = useClients(filters);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }));
  };

  const handleStatusChange = (status: ClientFilters['status']) => {
    setFilters((prev) => ({ ...prev, status, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const getClientDisplayName = (client: Client) => {
    return client.full_name || client.user?.name || 'Unknown Client';
  };

  const getClientInitials = (client: Client) => {
    const name = getClientDisplayName(client);
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clients</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your client roster and their information
          </p>
        </div>
        <button
          onClick={() => {
            setEditingClient(null);
            setShowClientModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients by name, phone, or address..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
          </form>

          {/* Status Tabs */}
          <div className="flex items-center gap-2">
            {(['active', 'inactive', 'archived', 'all'] as const).map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize',
                  filters.status === status
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                {status}
              </button>
            ))}
          </div>

          {/* More Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              showFilters
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Facility
                </label>
                <select
                  value={filters.facility_id || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      facility_id: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="">All Facilities</option>
                  {/* Facilities will be populated from API */}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Case Manager
                </label>
                <select
                  value={filters.case_manager_id || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      case_manager_id: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="">All Case Managers</option>
                  {/* Case managers will be populated from API */}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load clients. Please try again.
          </p>
        </div>
      ) : isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
          </div>
        </div>
      ) : !data?.data || data.data.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <User className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No clients found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {filters.search
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first client'}
          </p>
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </Link>
        </div>
      ) : (
        <>
          {/* Clients Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.data.map((client) => (
              <div
                key={client.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-700 dark:text-violet-400 font-semibold">
                      {getClientInitials(client)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {getClientDisplayName(client)}
                      </h3>
                      <span
                        className={cn(
                          'inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full capitalize',
                          statusColors[client.status]
                        )}
                      >
                        {client.status}
                      </span>
                    </div>
                  </div>

                  {/* Actions Menu */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActionMenuOpen(actionMenuOpen === client.id ? null : client.id)
                      }
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {actionMenuOpen === client.id && (
                      <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                        <Link
                          href={`/clients/${client.id}`}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Eye className="w-4 h-4" />
                          View Profile
                        </Link>
                        <button
                          onClick={() => {
                            setEditingClient(client as ClientWithDetails);
                            setShowClientModal(true);
                            setActionMenuOpen(null);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                          <Archive className="w-4 h-4" />
                          Archive
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Client Info */}
                <div className="space-y-2 text-sm">
                  {client.address && (
                    <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        {client.address.city}, {client.address.state}
                      </span>
                    </div>
                  )}
                  {client.user?.phone && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <span>{client.user.phone}</span>
                    </div>
                  )}
                  {client.facility && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Building className="w-4 h-4 flex-shrink-0" />
                      <span>{client.facility.name}</span>
                    </div>
                  )}
                </div>

                {/* View Profile Link */}
                <Link
                  href={`/clients/${client.id}`}
                  className="mt-4 block w-full text-center py-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                >
                  View Profile
                </Link>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data.last_page > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-4 py-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(data.current_page - 1) * data.per_page + 1} to{' '}
                {Math.min(data.current_page * data.per_page, data.total)} of{' '}
                {data.total} clients
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(data.current_page - 1)}
                  disabled={data.current_page === 1}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {data.current_page} of {data.last_page}
                </span>
                <button
                  onClick={() => handlePageChange(data.current_page + 1)}
                  disabled={data.current_page === data.last_page}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Client Modal */}
      <ClientModal
        isOpen={showClientModal}
        onClose={() => {
          setShowClientModal(false);
          setEditingClient(null);
        }}
        client={editingClient}
        onSuccess={() => {
          refetch();
          setShowClientModal(false);
          setEditingClient(null);
        }}
      />
    </div>
  );
}
