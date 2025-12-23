import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type { CaseManager, CaseManagerDetailResponse } from "@/types";

export const caseManagerKeys = {
  all: ["case-managers"] as const,
  list: () => [...caseManagerKeys.all, "list"] as const,
  detail: (id: number) => [...caseManagerKeys.all, "detail", id] as const,
};

interface CaseManagerListResponse {
  success?: boolean;
  data?: CaseManager[];
  // Direct array response fallback
}

interface CaseManagerCreateResponse {
  success: boolean;
  caseManager: CaseManager;
  message?: string;
}

// Fetch case managers list
async function fetchCaseManagers(): Promise<CaseManager[]> {
  const response = await api.get<CaseManagerListResponse | CaseManager[]>(
    "/tenant-api/case-managers"
  );
  // Handle both array response and wrapped response
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data.data || [];
}

// Fetch case manager by ID with related data
async function fetchCaseManagerById(id: number) {
  const response = await api.get<CaseManagerDetailResponse>(
    `/tenant-api/case-managers/${id}`
  );
  // Return the case_manager object which includes clients
  return response.data.data.case_manager;
}

// Create case manager
async function createCaseManager(data: {
  name: string;
  email: string;
  phone?: string;
}): Promise<CaseManager> {
  const response = await api.post<CaseManagerCreateResponse>(
    "/tenant-api/case-managers",
    {
      ...data,
      status: true,
    }
  );
  return response.data.caseManager;
}

// Hook: Fetch case managers
export function useCaseManagers() {
  return useQuery({
    queryKey: caseManagerKeys.list(),
    queryFn: fetchCaseManagers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook: Fetch case manager by ID with related data
export function useCaseManagerById(id: string | number) {
  const numericId = typeof id === "string" ? parseInt(id, 10) : id;

  return useQuery({
    queryKey: caseManagerKeys.detail(numericId),
    queryFn: () => fetchCaseManagerById(numericId),
    enabled: !isNaN(numericId) && numericId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook: Create case manager
export function useCreateCaseManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCaseManager,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caseManagerKeys.all });
    },
  });
}

// Hook: Search case managers
export function useCaseManagerSearch(
  query: string,
  caseManagers: CaseManager[] = []
) {
  if (!query || query.length < 2) return [];

  return caseManagers.filter(
    (cm) =>
      cm.user?.name?.toLowerCase().includes(query.toLowerCase()) ||
      cm.user?.email?.toLowerCase().includes(query.toLowerCase())
  );
}
