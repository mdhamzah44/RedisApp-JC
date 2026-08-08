import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext } from "react";

import type { SessionUser } from "./auth.server";
import { getMe, signOut } from "./auth.functions";
import {
  listAddresses,
  listConversations,
  listOrders,
  type Address,
  type ConversationView,
  type OrderView,
} from "./account.functions";

/** Signed-in user, refetched whenever an auth action succeeds. */
export function useSessionUser() {
  return useQuery<SessionUser | null>({
    queryKey: ["session"],
    queryFn: () => getMe(),
    staleTime: 30_000,
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => signOut(),
    onSuccess: async () => {
      await qc.cancelQueries();
      qc.clear();
      await qc.invalidateQueries({ queryKey: ["session"] });
    },
  });
}

export function useAddresses(enabled = true) {
  return useQuery<Address[]>({
    queryKey: ["addresses"],
    queryFn: () => listAddresses(),
    enabled,
  });
}

export function useOrders(enabled = true) {
  return useQuery<OrderView[]>({
    queryKey: ["orders"],
    queryFn: () => listOrders(),
    enabled,
    refetchInterval: enabled ? 60_000 : false,
  });
}

export function useConversations(enabled = true) {
  return useQuery<ConversationView[]>({
    queryKey: ["conversations"],
    queryFn: () => listConversations(),
    enabled,
    // Near-realtime: the Seller Hub replies land within a minute.
    refetchInterval: enabled ? 15_000 : false,
  });
}

/** Opens the global sign-in dialog from anywhere in the tree. */
export const AuthDialogContext = createContext<(open?: boolean) => void>(() => {});
export const useAuthDialog = () => useContext(AuthDialogContext);
