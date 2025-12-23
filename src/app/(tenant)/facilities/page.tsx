"use client";

import {
  Building,
  Plus,
  Search,
  Shield,
  Users,
  MapPin,
  Phone,
  TrendingUp,
  ExternalLink,
  ArrowRight,
  Filter,
  Loader2,
  LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useFacilities } from "@/hooks/useFacilities";
import { cn } from "@/lib/utils";
import Link from "next/link";

// Facility type
interface FacilityAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface Facility {
  id: number;
  name: string;
  status?: "active" | "inactive" | "paused" | string;
  email?: string | null;
  phone?: string | null;
  fax?: string | null;
  address?: FacilityAddress | null;
  vaccine_required?: boolean;
  created_at?: string;
  clients_count?: number | null;
}

// Helper to render the address
function renderFacilityAddress(facility: Facility) {
  const addressObj = facility.address;
  if (!addressObj || typeof addressObj !== "object") {
    return "No address provided";
  }

  const { street, city, state, zip } = addressObj;

  if (!street && !city && !state && !zip) {
    return "No address provided";
  }

  let address = street || "";
  if (city) address += (address ? ", " : "") + city;
  if (state) address += (address ? ", " : "") + state;
  if (zip) address += (address ? " " : "") + zip;

  return address || "No address provided";
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
    yellow:
      "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400",
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

// Facility Card Component
function FacilityCard({ facility }: { facility: Facility }) {
  const statusConfig = {
    active: {
      color:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
      label: "Active",
    },
    inactive: {
      color:
        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
      label: "Inactive",
    },
    paused: {
      color:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
      label: "Paused",
    },
  };

  const status =
    statusConfig[facility.status as keyof typeof statusConfig] ||
    statusConfig.active;

  return (
    <Link
      href={`/facilities/${facility.id}`}
      className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-lg transition-all duration-200"
    >
      {/* Card Header */}
      <div className="p-6 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg">
              <Building className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  {facility.name}
                </h3>
                <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={cn(
                    "px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                    status.color
                  )}
                >
                  {status.label}
                </span>
                {facility.vaccine_required && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 font-medium">
                    <Shield className="w-3 h-3" />
                    Vaccine Required
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6 space-y-4">
        {/* Address */}
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {renderFacilityAddress(facility)}
            </p>
          </div>
        </div>

        {/* Phone */}
        {facility.phone && (
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {facility.phone}
            </p>
          </div>
        )}

        {/* Clients Count */}
        <div className="flex items-center gap-3 pt-2">
          <Users className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {facility.clients_count || 0} Client
              {facility.clients_count !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              currently assigned
            </p>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-end text-sm font-medium text-violet-600 dark:text-violet-400 group-hover:text-violet-700 dark:group-hover:text-violet-300">
          View Details
          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

export default function FacilitiesPage() {
  const { data: facilities, isLoading, error } = useFacilities();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Filter facilities
  const filteredFacilities = useMemo(() => {
    if (!Array.isArray(facilities)) return [];

    return facilities.filter((f: Facility) => {
      // Search filter
      const q = search.toLowerCase();
      const name = (f.name ?? "").toLowerCase();
      const city = (f.address?.city ?? "").toLowerCase();
      const state = (f.address?.state ?? "").toLowerCase();
      const matchesSearch =
        name.includes(q) || city.includes(q) || state.includes(q);

      // Status filter
      const matchesStatus = filterStatus === "all" || f.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [facilities, search, filterStatus]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!Array.isArray(facilities))
      return { total: 0, active: 0, clients: 0, vaccineRequired: 0 };

    const active = facilities.filter(
      (f: Facility) => f.status === "active"
    ).length;
    const clients = facilities.reduce(
      (sum: number, f: Facility) => sum + (f.clients_count || 0),
      0
    );
    const vaccineRequired = facilities.filter(
      (f: Facility) => f.vaccine_required
    ).length;

    return {
      total: facilities.length,
      active,
      clients,
      vaccineRequired,
    };
  }, [facilities]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-violet-600 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          Loading facilities...
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
            Error Loading Facilities
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Unable to load facilities information
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Facilities
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage client facilities and locations
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-colors shadow-sm">
          <Plus className="w-5 h-5" />
          Add Facility
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Facilities"
          value={stats.total}
          icon={Building}
          color="violet"
        />
        <StatCard
          label="Active"
          value={stats.active}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="Total Clients"
          value={stats.clients}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Vaccine Required"
          value={stats.vaccineRequired}
          icon={Shield}
          color="yellow"
        />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search facilities by name, city, or state..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-200 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 appearance-none cursor-pointer min-w-[180px]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="paused">Paused Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Facilities Grid */}
      {filteredFacilities.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredFacilities.map((facility: Facility) => (
            <FacilityCard key={facility.id} facility={facility} />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-16">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
              <Building className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {search || filterStatus !== "all"
                ? "No facilities found"
                : "No facilities yet"}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              {search || filterStatus !== "all"
                ? "Try adjusting your search or filters to find what you're looking for."
                : "Get started by adding your first facility location."}
            </p>
            {!search && filterStatus === "all" && (
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-colors shadow-sm">
                <Plus className="w-5 h-5" />
                Add Your First Facility
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
