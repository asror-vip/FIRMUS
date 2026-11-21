"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { BusinessEntity, UserRole, Workspace } from "@/lib/types/accounting";
import { supabase } from "@/lib/supabase/client";
import { FEATURES } from "@/lib/config/features";
import { type Locale } from "@/lib/i18n/server-locale";
import { useLocale } from "@/lib/context/locale-context";
import {
  DEFAULT_STARTER_SNAPSHOT,
  type AiModelId,
  type SubscriptionSnapshot,
} from "@/lib/config/plans";
import {
  createWorkspaceRecord,
  fetchBusinessEntities,
  fetchWorkspaces,
} from "@/lib/services/workspace-context-service";
import { clearAllQueryCache } from "@/lib/cache/query-cache";
import { isPublicGuestRoute } from "@/lib/analytics/track-event";

const provisionLocks = new Map<string, Promise<void>>();

const EMPTY_WORKSPACE: Workspace = {
  id: "",
  name: "Ishchi maydon",
  type: "accounting_firm",
  ownerName: "",
  currentPlan: "starter",
  entitiesCount: 0,
  membersCount: 1,
};

function isAuthOrPublicPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    isPublicGuestRoute(pathname) ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms")
  );
}

interface AppStateContextType {
  user: any | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace;
  setCurrentWorkspaceId: (id: string) => void;

  entities: BusinessEntity[];
  currentEntity: BusinessEntity | undefined;
  setCurrentEntityId: (id: string) => void;

  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;

  language: Locale;
  setLanguage: (lang: Locale) => void;

  isAiDrawerOpen: boolean;
  setIsAiDrawerOpen: (open: boolean) => void;
  toggleAiDrawer: () => void;

  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;

  isContextReady: boolean;

  subscription: SubscriptionSnapshot;
  setSubscriptionSnapshot: (next: SubscriptionSnapshot) => void;
  refreshSubscription: () => Promise<void>;
  setPreferredAiModel: (modelId: AiModelId) => Promise<void>;

  refreshContext: () => Promise<void>;
  handleSignOut: () => Promise<void>;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({
  children,
  initialLocale = "uz",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const loadedUserIdRef = useRef<string | null>(null);
  const prevUserIdRef = useRef<string | null>(null);
  const subscriptionHydratedForUserRef = useRef<string | null>(null);

  const [user, setUser] = useState<any | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>("");

  const [entities, setEntities] = useState<BusinessEntity[]>([]);
  const [currentEntityId, setCurrentEntityId] = useState<string>("");

  const [currentRole, setCurrentRole] = useState<UserRole>("accountant");
  const { language, setLanguage } = useLocale();
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isContextReady, setIsContextReady] = useState<boolean>(false);
  const [subscription, setSubscription] = useState<SubscriptionSnapshot>(DEFAULT_STARTER_SNAPSHOT);

  const refreshSubscription = useCallback(async () => {
    try {
      const res = await fetch("/api/subscription", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as SubscriptionSnapshot;
        if (data?.planId) {
          setSubscription(data);
          if (loadedUserIdRef.current) {
            subscriptionHydratedForUserRef.current = loadedUserIdRef.current;
          }
        }
      }
    } catch {
      // Keep safe current snapshot if transient network error occurs
    }
  }, []);

  const setPreferredAiModel = useCallback(
    async (modelId: AiModelId) => {
      // Optimistic 0ms UI update so switching models feels instant
      let previousSnapshot: SubscriptionSnapshot | null = null;
      setSubscription((prev) => {
        previousSnapshot = prev;
        if (prev.preferredModel === modelId) return prev;
        return { ...prev, preferredModel: modelId };
      });

      try {
        const res = await fetch("/api/subscription", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferredModel: modelId }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (previousSnapshot) setSubscription(previousSnapshot);
          const fallbackError =
            language === "ru"
              ? "Не удалось переключить модель"
              : language === "en"
              ? "Failed to switch AI model"
              : "Modelni almashtirib boʻlmadi";
          throw new Error(data?.error || fallbackError);
        }
        setSubscription(data as SubscriptionSnapshot);
      } catch (err) {
        if (previousSnapshot) setSubscription(previousSnapshot);
        throw err;
      }
    },
    [language]
  );

  const syncRoleForWorkspace = useCallback(async (authUser: any, wsId: string) => {
    if (!FEATURES.teamMode || !authUser || !wsId) return;
    const { data: rpcRole, error: rpcErr } = await supabase.rpc("get_auth_user_role", {
      target_workspace_id: wsId,
    });
    if (!rpcErr && typeof rpcRole === "string" && rpcRole.trim()) {
      setCurrentRole(rpcRole.trim() as UserRole);
      return;
    }

    const { data: ws } = await supabase
      .from("workspaces")
      .select("owner_user_id")
      .eq("id", wsId)
      .maybeSingle();
    if (ws?.owner_user_id === authUser.id) {
      setCurrentRole("workspace_owner");
      return;
    }

    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("workspace_id", wsId)
      .eq("user_id", authUser.id)
      .eq("status", "active")
      .maybeSingle();

    setCurrentRole((member?.role as UserRole) || "viewer");
  }, []);

  const ensureSoloContext = useCallback(async (authUser: any) => {
    const existingLock = provisionLocks.get(authUser.id);
    if (existingLock) {
      await existingLock;
      return;
    }

    const promise = (async () => {
      try {
        let wsList = await fetchWorkspaces();
        if (!wsList || wsList.length === 0) {
          const createdWs = await createWorkspaceRecord("Shaxsiy maydon", "individual_company");
          wsList = [createdWs];
          try {
            localStorage.setItem("firmus_workspace", createdWs.id);
          } catch {}
        }

        // Do NOT auto-create a placeholder 000000000 business entity for new accounts;
        // let the user start with a clean empty Clients list and add their own real companies.
      } finally {
        provisionLocks.delete(authUser.id);
      }
    })();

    provisionLocks.set(authUser.id, promise);
    await promise;
  }, []);

  const loadWorkspaceAndEntities = useCallback(
    async (authUser: any) => {
      // Run subscription fetch in parallel only if not already hydrated for this user
      if (subscriptionHydratedForUserRef.current !== authUser.id) {
        void refreshSubscription();
      }

      try {
        let [realWorkspaces, realEntities] = await Promise.all([
          fetchWorkspaces(),
          fetchBusinessEntities(),
        ]);

        const savedWsId =
          typeof window !== "undefined" ? localStorage.getItem("firmus_workspace") : null;
        const candidateWs =
          (realWorkspaces || []).find((w: any) => w.id === savedWsId) || realWorkspaces?.[0];
        const hasScopedEntity = candidateWs
          ? (realEntities || []).some(
              (e: any) => !e.workspaceId || e.workspaceId === candidateWs.id
            )
          : false;

        if (!candidateWs || !hasScopedEntity) {
          await ensureSoloContext(authUser);
          [realWorkspaces, realEntities] = await Promise.all([
            fetchWorkspaces(),
            fetchBusinessEntities(),
          ]);
        }

        const safeWorkspaces = (realWorkspaces || []) as Workspace[];
        setWorkspaces(safeWorkspaces);

        let matchedWsId = "";
        if (safeWorkspaces.length > 0) {
          const savedWs =
            typeof window !== "undefined" ? localStorage.getItem("firmus_workspace") : null;
          const matchedWs = safeWorkspaces.find((w) => w.id === savedWs) || safeWorkspaces[0];
          matchedWsId = matchedWs.id;
          setCurrentWorkspaceId(matchedWsId);
          if (FEATURES.teamMode) {
            await syncRoleForWorkspace(authUser, matchedWsId);
          }
        } else {
          setCurrentWorkspaceId("");
        }

        const safeEntities = (realEntities || []) as BusinessEntity[];
        setEntities(safeEntities);

        const scopedEntities = matchedWsId
          ? safeEntities.filter((e) => !e.workspaceId || e.workspaceId === matchedWsId)
          : safeEntities;

        if (scopedEntities.length > 0) {
          const savedEntity =
            typeof window !== "undefined" ? localStorage.getItem("firmus_entity") : null;
          const matchedEntity =
            scopedEntities.find((e) => e.id === savedEntity) || scopedEntities[0];
          setCurrentEntityId(matchedEntity.id);
          try {
            localStorage.setItem("firmus_entity", matchedEntity.id);
          } catch {}
        } else {
          setCurrentEntityId("");
        }
      } catch (err) {
        console.error("Error loading workspace/entities in AppStateProvider:", err);
      } finally {
        setIsContextReady(true);
      }
    },
    [ensureSoloContext, refreshSubscription, syncRoleForWorkspace]
  );

  const refreshContext = useCallback(async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (authUser) {
      if (prevUserIdRef.current && prevUserIdRef.current !== authUser.id) {
        clearAllQueryCache();
        subscriptionHydratedForUserRef.current = null;
      }
      prevUserIdRef.current = authUser.id;
      setUser(authUser);
      loadedUserIdRef.current = authUser.id;
      await loadWorkspaceAndEntities(authUser);
    } else {
      if (prevUserIdRef.current !== null || loadedUserIdRef.current !== null) {
        clearAllQueryCache();
      }
      prevUserIdRef.current = null;
      loadedUserIdRef.current = null;
      subscriptionHydratedForUserRef.current = null;
      setUser(null);
    }
  }, [loadWorkspaceAndEntities]);

  // 1. Fetch Supabase Auth session, workspaces & business entities (short-circuit on auth/public pages)
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        if (isAuthOrPublicPath(pathname)) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const sessionUserId = session?.user?.id ?? null;
          if (prevUserIdRef.current && prevUserIdRef.current !== sessionUserId) {
            clearAllQueryCache();
            loadedUserIdRef.current = null;
            subscriptionHydratedForUserRef.current = null;
          }
          if (sessionUserId === null && prevUserIdRef.current !== null) {
            clearAllQueryCache();
          }
          prevUserIdRef.current = sessionUserId;
          if (isMounted) {
            setUser(session?.user ?? null);
            setIsContextReady(true);
          }
          return;
        }

        // On client-side navigations where the same user is already hydrated, avoid redundant getUser() RTT
        if (loadedUserIdRef.current) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user?.id === loadedUserIdRef.current) {
            if (isMounted) {
              setIsContextReady(true);
            }
            return;
          }
        }

        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (authUser) {
          if (prevUserIdRef.current && prevUserIdRef.current !== authUser.id) {
            clearAllQueryCache();
            subscriptionHydratedForUserRef.current = null;
          }
          prevUserIdRef.current = authUser.id;
          setUser(authUser);
          if (loadedUserIdRef.current !== authUser.id) {
            loadedUserIdRef.current = authUser.id;
            await loadWorkspaceAndEntities(authUser);
          } else {
            setIsContextReady(true);
          }
        } else {
          if (prevUserIdRef.current !== null || loadedUserIdRef.current !== null) {
            clearAllQueryCache();
          }
          prevUserIdRef.current = null;
          loadedUserIdRef.current = null;
          subscriptionHydratedForUserRef.current = null;
          setUser(null);
          setIsContextReady(true);
        }
      } catch (err) {
        console.error("Error initializing session in AppStateProvider:", err);
        if (isMounted) setIsContextReady(true);
      }
    }

    initSession();

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      const nextUserId = nextUser?.id ?? null;

      if (prevUserIdRef.current !== nextUserId) {
        if (prevUserIdRef.current !== null || nextUserId === null) {
          clearAllQueryCache();
        }
        if (nextUserId !== loadedUserIdRef.current) {
          loadedUserIdRef.current = null;
          subscriptionHydratedForUserRef.current = null;
        }
        prevUserIdRef.current = nextUserId;
      }

      if (nextUser) {
        setUser(nextUser);
      } else {
        loadedUserIdRef.current = null;
        subscriptionHydratedForUserRef.current = null;
        setUser(null);
      }
    });

    return () => {
      isMounted = false;
      authSub.unsubscribe();
    };
  }, [loadWorkspaceAndEntities, pathname]);

  // Language persistence is managed centrally by LocaleProvider (lib/context/locale-context.tsx)
  void initialLocale;

  const setEntityWithPersistence = useCallback((id: string) => {
    setCurrentEntityId(id);
    try {
      localStorage.setItem("firmus_entity", id);
    } catch {}
  }, []);

  const setWorkspaceWithPersistence = useCallback(
    (id: string) => {
      setCurrentWorkspaceId(id);
      try {
        localStorage.setItem("firmus_workspace", id);
      } catch {}
      if (user && FEATURES.teamMode) {
        void syncRoleForWorkspace(user, id);
      }
      // Switch active entity strictly to one belonging to this workspace
      const wsEntities = entities.filter((e) => !e.workspaceId || e.workspaceId === id);
      if (wsEntities.length > 0) {
        if (!wsEntities.some((e) => e.id === currentEntityId)) {
          setEntityWithPersistence(wsEntities[0].id);
        }
      } else {
        setCurrentEntityId("");
      }
    },
    [user, entities, currentEntityId, syncRoleForWorkspace, setEntityWithPersistence]
  );

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    loadedUserIdRef.current = null;
    prevUserIdRef.current = null;
    subscriptionHydratedForUserRef.current = null;
    clearAllQueryCache();
    setUser(null);
    setWorkspaces([]);
    setEntities([]);
    setCurrentWorkspaceId("");
    setCurrentEntityId("");
    setSubscription(DEFAULT_STARTER_SNAPSHOT);
    router.push("/login");
  }, [router]);

  const toggleAiDrawer = useCallback(() => {
    setIsAiDrawerOpen((prev) => !prev);
  }, []);

  // Send lightweight presence heartbeat while tab is visible so /admin shows accurate live Online status
  useEffect(() => {
    if (!user?.id) return;

    const ping = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void fetch("/api/presence", { method: "POST", keepalive: true }).catch(() => {});
    };

    ping();
    const interval = window.setInterval(ping, 120_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user?.id]);

  // Sync fresh server/DB state if browser Back/Forward restores a stale bfcache snapshot
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        router.refresh();
        void refreshContext();
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [router, refreshContext]);

  // Keyboard shortcut listener for ⌘K and AI drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setIsAiDrawerOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const currentWorkspace = useMemo(
    () =>
      workspaces.find((w) => w.id === currentWorkspaceId) ||
      workspaces[0] ||
      EMPTY_WORKSPACE,
    [workspaces, currentWorkspaceId]
  );

  const visibleEntities = useMemo(
    () =>
      currentWorkspace.id
        ? entities.filter((e) => !e.workspaceId || e.workspaceId === currentWorkspace.id)
        : entities,
    [entities, currentWorkspace.id]
  );

  const currentEntity = useMemo(
    () =>
      visibleEntities.find((e) => e.id === currentEntityId) || visibleEntities[0],
    [visibleEntities, currentEntityId]
  );

  const contextValue = useMemo<AppStateContextType>(
    () => ({
      user,
      workspaces,
      currentWorkspace,
      setCurrentWorkspaceId: setWorkspaceWithPersistence,

      entities: visibleEntities,
      currentEntity,
      setCurrentEntityId: setEntityWithPersistence,

      currentRole,
      setCurrentRole,

      language,
      setLanguage,

      isAiDrawerOpen,
      setIsAiDrawerOpen,
      toggleAiDrawer,

      isSearchOpen,
      setIsSearchOpen,

      isContextReady,

      subscription,
      setSubscriptionSnapshot: setSubscription,
      refreshSubscription,
      setPreferredAiModel,

      refreshContext,
      handleSignOut,
    }),
    [
      user,
      workspaces,
      currentWorkspace,
      setWorkspaceWithPersistence,
      visibleEntities,
      currentEntity,
      setEntityWithPersistence,
      currentRole,
      language,
      setLanguage,
      isAiDrawerOpen,
      toggleAiDrawer,
      isSearchOpen,
      isContextReady,
      subscription,
      refreshSubscription,
      setPreferredAiModel,
      refreshContext,
      handleSignOut,
    ]
  );

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }
  return context;
}
