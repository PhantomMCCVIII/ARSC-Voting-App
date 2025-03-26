import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface User {
  id: number;
  name: string;
  isAdmin: boolean;
  schoolLevel?: string;
  gradeLevel?: number;
  hasVoted: boolean;
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);

  const { data: user, refetch } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });
        
        if (res.status === 401) {
          return null;
        }
        
        if (!res.ok) {
          throw new Error("Failed to fetch user");
        }
        
        return await res.json();
      } catch (error) {
        console.error("Error fetching user:", error);
        return null;
      }
    },
    staleTime: Infinity,
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      queryClient.setQueryData(["/api/auth/me"], null);
    },
  });

  const refreshUser = useCallback(() => {
    refetch();
  }, [refetch]);

  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  // Determine when loading is complete
  useEffect(() => {
    if (user !== undefined) {
      setIsLoading(false);
    }
  }, [user]);

  return {
    user: user || null,
    isAdmin: user?.isAdmin || false,
    isLoading,
    refreshUser,
    logout,
  };
}
