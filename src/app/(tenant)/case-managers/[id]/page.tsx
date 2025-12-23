"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Edit2,
  Search,
  Loader2,
  Calendar,
  Users,
  TrendingUp,
  Mail,
  Phone,
  Clock,
  ExternalLink,
  ArrowRight,
  SortAsc,
  type LucideIcon,
} from "lucide-react";
import { useCaseManagerById } from "@/hooks/useCaseManagers";
import { cn } from "@/lib/utils";

// Types for the component - simplified and optimized
interface ClientWithUnits {
  id: number;
  client_id: string;
  name: string;
  status: number;
  upcoming_appointments_count: number;
  specialities: Array<{
    id: number;
    name: string;
    short_name: string;
    current_balance: number;
  }>;
}

// Helper to get initials from name
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

// Stats Card Component
function StatCard({
  label,
  value,
  icon: Icon,
  color = "violet",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: "violet" | "blue" | "green";
}) {
  const colorClasses = {
    violet:
      "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400",
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    green:
      "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "p-3 rounded-lg",
            colorClasses[color as keyof typeof colorClasses] ||
              colorClasses.violet
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

// Optimized Client Card Component
function ClientCard({ client }: { client: ClientWithUnits }) {
  const totalUnits = useMemo(() => {
    return client.specialities.reduce(
      (sum, spec) => sum + (spec.current_balance || 0),
      0
    );
  }, [client.specialities]);

  const isActive = client.status === 1;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-violet-300 dark:hover:border-violet-700 transition-all duration-200 hover:shadow-lg">
      {/* Card Header */}
      <div className="p-6 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg">
                <span className="text-lg font-bold text-white">
                  {getInitials(client.name)}
                </span>
              </div>
              {isActive && (
                <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
              )}
            </div>
            <div>
              <Link
                href={`/clients/${client.id}`}
                className="group inline-flex items-center gap-2"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  {client.name}
                </h3>
                <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ID: {client.client_id}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold",
              isActive
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            )}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6 space-y-6">
        {/* Services & Units */}
        {client.specialities && client.specialities.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Services & Units
              </h4>
              <span className="text-sm font-bold text-violet-600 dark:text-violet-400">
                {totalUnits} total units
              </span>
            </div>
            <div className="space-y-3">
              {client.specialities.map((speciality) => {
                const remaining = speciality.current_balance;
                return (
                  <div
                    key={speciality.id}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 relative group cursor-pointer">
                        <span title={speciality.name || ""}>{speciality.short_name}</span>
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {remaining} units
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className={cn(
                          "h-2 rounded-full transition-all duration-300",
                          remaining > 50
                            ? "bg-green-500"
                            : remaining > 20
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        )}
                        style={{
                          width: `${Math.min((remaining / 100) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming Appointments Count */}
        {client.upcoming_appointments_count > 0 && (
          <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-4 border border-violet-100 dark:border-violet-800">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {client.upcoming_appointments_count} Upcoming{" "}
                  {client.upcoming_appointments_count === 1
                    ? "Session"
                    : "Sessions"}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  View client profile for details
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <Link
          href={`/clients/${client.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
        >
          View Profile
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href={`/appointments/new?client_id=${client.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <Calendar className="w-4 h-4" />
          Schedule
        </Link>
      </div>
    </div>
  );
}

// Main Page Component
export default function CaseManagerDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const { data: caseManager, isLoading, error } = useCaseManagerById(id);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "units" | "status">("name");

  // Get clients directly from the new response structure
  const clients = useMemo<ClientWithUnits[]>(() => {
    if (!caseManager?.clients) return [];
    return caseManager.clients as ClientWithUnits[];
  }, [caseManager]);

  // Filter and sort clients
  const filteredAndSortedClients = useMemo(() => {
    let filtered = clients;

    // Apply search filter
    const search = searchTerm.toLowerCase().trim();
    if (search) {
      filtered = clients.filter((client) => {
        const name = client.name.toLowerCase();
        const clientId = String(client.client_id).toLowerCase();

        // Check if name or client ID matches
        if (name.includes(search) || clientId.includes(search)) {
          return true;
        }

        // Check if any speciality name matches
        return client.specialities.some((spec) =>
          spec.name.toLowerCase().includes(search)
        );
      });
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "units": {
          const getTotalUnits = (client: ClientWithUnits) =>
            client.specialities.reduce(
              (sum, spec) => sum + spec.current_balance,
              0
            );
          return getTotalUnits(b) - getTotalUnits(a);
        }
        case "status":
          return (b.status === 1 ? 1 : 0) - (a.status === 1 ? 1 : 0);
        default:
          return 0;
      }
    });
  }, [clients, searchTerm, sortBy]);

  // Calculate stats
  const stats = useMemo(() => {
    const activeClients = clients.filter((c) => c.status === 1).length;
    const upcomingAppointments = clients.reduce(
      (sum, c) => sum + c.upcoming_appointments_count,
      0
    );
    const totalUnits = clients.reduce(
      (sum, client) =>
        sum +
        client.specialities.reduce(
          (unitSum, spec) => unitSum + spec.current_balance,
          0
        ),
      0
    );

    return {
      total: clients.length,
      active: activeClients,
      appointments: upcomingAppointments,
      units: totalUnits,
    };
  }, [clients]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-violet-600 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          Loading case manager details...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Data
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Unable to load case manager information
          </p>
        </div>
      </div>
    );
  }

  if (!caseManager) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Case Manager Not Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            The requested case manager could not be found
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 rounded-2xl border border-violet-100 dark:border-gray-700 p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start lg:items-between gap-6">
          <div className="flex items-start gap-6">
            <div className="relative">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">
                  {getInitials(caseManager.name || "")}
                </span>
              </div>
              <div className="absolute -bottom-2 -right-2 h-6 w-6 bg-green-500 border-4 border-white dark:border-gray-800 rounded-full" />
            </div>
            <div className="space-y-3">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {caseManager.name}
                </h1>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold",
                      caseManager.status
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                    )}
                  >
                    {caseManager.status ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                {caseManager.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{caseManager.email}</span>
                  </div>
                )}
                {caseManager.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{caseManager.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => alert("Edit modal coming soon")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-xl font-medium transition-all shadow-sm hover:shadow"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Clients"
          value={stats.total}
          icon={Users}
          color="violet"
        />
        <StatCard
          label="Active Clients"
          value={stats.active}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="Upcoming Sessions"
          value={stats.appointments}
          icon={Calendar}
          color="blue"
        />
        <StatCard
          label="Total Units"
          value={stats.units}
          icon={TrendingUp}
          color="violet"
        />
      </div>

      {/* Clients Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        {/* Section Header with Filters */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Assigned Clients
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {filteredAndSortedClients.length} of {clients.length} clients
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, ID, or service..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ✕
                  </button>
                )}
              </div>
              {/* Sort */}
              <div className="relative">
                <SortAsc className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "name" | "units" | "status")
                  }
                  className="pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-200 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 appearance-none cursor-pointer"
                >
                  <option value="name">Sort by Name</option>
                  <option value="units">Sort by Units</option>
                  <option value="status">Sort by Status</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Clients Grid */}
        <div className="p-6">
          {filteredAndSortedClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-gray-100 dark:bg-gray-700 p-4 mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No clients found
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-sm">
                {searchTerm
                  ? "Try adjusting your search terms or clear the search to see all clients."
                  : "This case manager has no assigned clients yet."}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAndSortedClients.map((client) => (
                <ClientCard key={client.id} client={client} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
