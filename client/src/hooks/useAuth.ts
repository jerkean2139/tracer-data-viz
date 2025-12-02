import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  const isAuthenticated = !!user && !error;

  return {
    user: user || null,
    isLoading,
    isAuthenticated,
    isAdmin: user?.role === "admin",
    isPartner: user?.role === "partner",
    isAgent: user?.role === "agent",
  };
}
