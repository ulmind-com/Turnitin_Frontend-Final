import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore, type AuthUser } from "@/lib/auth-store";
import { useEffect } from "react";

export function useCurrentUser() {
  const token = useAuthStore((s) => s.accessToken);
  const setUser = useAuthStore((s) => s.setUser);

  const query = useQuery({
    queryKey: ["me"],
    enabled: !!token,
    queryFn: async () => {
      const { data } = await api.get<AuthUser>("/auth/me");
      return data;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.data) setUser(query.data);
  }, [query.data, setUser]);

  return query;
}
