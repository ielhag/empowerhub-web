"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Building,
  Mail,
  Phone,
  MapPin,
  Shield,
  Users,
  Calendar,
  Download,
  FileText,
  Loader2,
  ChevronLeft,
  Edit2,
  Search,
  Filter,
  ExternalLink,
  TrendingUp,
  LucideIcon,
} from "lucide-react";
import { useFacilityById } from "@/hooks/useFacilities";
import { cn } from "@/lib/utils";

// Types
interface Client {
  id: number;
  client_id: string;
  name: string;
  status: number;
  phone?: string;
  upcoming_appointments_count: number;
  specialities: Array<{
    id: number;
    name: string;
    short_name: string;
  }>;
}

// Helper to get initials
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
  color?: string;
}) {
  const colorClasses = {
    violet:
      "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400",
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    green:
      "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
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

// Client Card Component
function ClientCard({ client }: { client: Client }) {
  const isActive = client.status === 1;

  return (
    <Link
      href={`/clients/${client.id}`}
      className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
              <span className="text-sm font-bold text-white">
                {getInitials(client.name)}
              </span>
            </div>
            {isActive && (
              <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                {client.name}
              </h3>
              <ExternalLink className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ID: {client.client_id}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "px-2.5 py-1 rounded-full text-xs font-semibold",
            isActive
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
          )}
        >
          {isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Services */}
      {client.specialities && client.specialities.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Services
          </p>
          <div className="flex flex-wrap gap-2">
            {client.specialities.map((spec) => (
              <span
                key={spec.id}
                className="px-2.5 py-1 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 rounded-lg text-xs font-medium"
              >
                {spec.short_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Appointments */}
      {client.upcoming_appointments_count > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="w-4 h-4" />
          <span>
            {client.upcoming_appointments_count} upcoming session
            {client.upcoming_appointments_count !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </Link>
  );
}

export default function FacilityDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const { data: facility, isLoading, error } = useFacilityById(id);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Get clients
  const clients = useMemo<Client[]>(() => {
    if (!facility?.clients) return [];
    return facility.clients as Client[];
  }, [facility]);

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      // Search filter
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        client.name.toLowerCase().includes(search) ||
        client.client_id.toLowerCase().includes(search);

      // Status filter
      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && client.status === 1) ||
        (filterStatus === "inactive" && client.status !== 1);

      return matchesSearch && matchesStatus;
    });
  }, [clients, searchTerm, filterStatus]);

  // Calculate stats
  const stats = useMemo(() => {
    const activeClients = clients.filter((c) => c.status === 1).length;
    const upcomingAppointments = clients.reduce(
      (sum, c) => sum + (c.upcoming_appointments_count || 0),
      0
    );

    return {
      total: clients.length,
      active: activeClients,
      appointments: upcomingAppointments,
    };
  }, [clients]);

  // Export functions
  const handleExportClients = () => {
    const csvContent = [
      [
        "Client ID",
        "Name",
        "Status",
        "Phone",
        "Services",
        "Upcoming Appointments",
      ],
      ...filteredClients.map((c) => [
        c.client_id,
        c.name,
        c.status === 1 ? "Active" : "Inactive",
        c.phone || "N/A",
        c.specialities.map((s) => s.short_name).join(", "),
        c.upcoming_appointments_count || 0,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${facility?.name}-clients-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();
  };

  const handleExportSchedule = () => {
    // This would export upcoming appointments for all clients
    alert(
      "Schedule export coming soon - will include all upcoming appointments for facility clients"
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-violet-600 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          Loading facility details...
        </p>
      </div>
    );
  }

  if (error || !facility) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Facility Not Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The requested facility could not be found
          </p>
          <Link
            href="/facilities"
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Facilities
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 rounded-2xl border border-violet-100 dark:border-gray-700 p-8 shadow-sm">
        <div className="flex items-start gap-4 mb-6">
          <Link
            href="/facilities"
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-6">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Building className="w-10 h-10 text-white" />
                </div>
                <div className="space-y-3">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {facility.name}
                    </h1>
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-semibold",
                          facility.status === "active"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                        )}
                      >
                        {facility.status === "active"
                          ? "Active"
                          : facility.status}
                      </span>
                      {facility.vaccine_required && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold">
                          <Shield className="w-3.5 h-3.5" />
                          Vaccine Required
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
                    {facility.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {[
                            facility.address.street,
                            facility.address.city,
                            facility.address.state,
                            facility.address.zip,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                    {facility.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{facility.phone}</span>
                      </div>
                    )}
                    {facility.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span>{facility.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => alert("Edit facility coming soon")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-xl font-medium transition-all shadow-sm"
              >
                <Edit2 className="w-4 h-4" />
                Edit Facility
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link
          href={`/facilities/${id}/schedule`}
          className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-lg transition-all group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Weekly Schedule
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                View Calendar
              </p>
            </div>
            <Calendar className="w-8 h-8 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
      </div>

      {/* Clients Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        {/* Section Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Clients at this Facility
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {filteredClients.length} of {clients.length} clients
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or ID..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-200 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 appearance-none cursor-pointer min-w-[160px]"
              >
                <option value="all">All Clients</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Clients Grid */}
        <div className="p-6">
          {filteredClients.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredClients.map((client) => (
                <ClientCard key={client.id} client={client} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No clients found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                {searchTerm || filterStatus !== "all"
                  ? "Try adjusting your filters to see more clients."
                  : "No clients are currently assigned to this facility."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
