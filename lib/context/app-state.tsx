"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BusinessEntity, UserRole, Workspace } from "@/lib/types/accounting";
import { supabase } from "@/lib/supabase/client";
import { fetchBusinessEntities, fetchWorkspaces } from "@/lib/services/supabase-service";

const EMPTY_WORKSPACE: Workspace = {
  id: "",
  name: "Ishchi maydon",
  type: "accounting_firm",
  ownerName: "",
  currentPlan: "professional",
  entitiesCount: 0,
  membersCount: 1,
};

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

  language: "uz" | "ru" | "en";
  setLanguage: (lang: "uz" | "ru" | "en") => void;

  isAiDrawerOpen: boolean;
  setIsAiDrawerOpen: (open: boolean) => void;
  toggleAiDrawer: () => void;

  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;

  refreshContext: () => Promise<void>;
  handleSignOut: () => Promise<void>;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>("");

  const [entities, setEntities] = useState<BusinessEntity[]>([]);
  const [currentEntityId, setCurrentEntityId] = useState<string>("");

  const [currentRole, setCurrentRole] = useState<UserRole>("accountant");
  const [language, setLanguageState] = useState<"uz" | "ru" | "en">("uz");
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  const syncRoleForWorkspace = useCallback(async (authUser: any, wsId: string) => {
    if (!authUser || !wsId) return;
    const { data: member } = await supabase
      .from("team_members")
      .select("role")
      .eq("workspace_id", wsId)
      .or(`user_id.eq.${authUser.id},email.ilike.${authUser.email || ""}`)
      .maybeSingle();

    if (member?.role) {
      setCurrentRole(member.role as UserRole);
    } else if (authUser.user_metadata?.role) {
      setCurrentRole(authUser.user_metadata.role as UserRole);
    }
  }, []);

  const loadWorkspaceAndEntities = useCallback(
    async (authUser: any) => {
      try {
        const [realWorkspaces, realEntities] = await Promise.all([
          fetchWorkspaces(),
          fetchBusinessEntities(),
        ]);

        const safeWorkspaces = (realWorkspaces || []) as Workspace[];
        setWorkspaces(safeWorkspaces);

        let matchedWsId = "";
        if (safeWorkspaces.length > 0) {
          const savedWs = typeof window !== "undefined" ? localStorage.getItem("firmus_workspace") : null;
          const matchedWs = safeWorkspaces.find((w) => w.id === savedWs) || safeWorkspaces[0];
          matchedWsId = matchedWs.id;
          setCurrentWorkspaceId(matchedWsId);
          await syncRoleForWorkspace(authUser, matchedWsId);
        } else {
          setCurrentWorkspaceId("");
        }

        const safeEntities = (realEntities || []) as BusinessEntity[];
        setEntities(safeEntities);

        const scopedEntities = matchedWsId
          ? safeEntities.filter((e) => !e.workspaceId || e.workspaceId === matchedWsId)
          : safeEntities;

        if (scopedEntities.length > 0) {
          const savedEntity = typeof window !== "undefined" ? localStorage.getItem("firmus_entity") : null;
          const matchedEntity = scopedEntities.find((e) => e.id === savedEntity) || scopedEntities[0];
          setCurrentEntityId(matchedEntity.id);
          try {
            localStorage.setItem("firmus_entity", matchedEntity.id);
          } catch {}
        } else {
          setCurrentEntityId("");
        }
      } catch (err) {
        console.error("Error loading workspace/entities in AppStateProvider:", err);
      }
    },
    [syncRoleForWorkspace]
  );

  const refreshContext = useCallback(async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (authUser) {
      setUser(authUser);
      await loadWorkspaceAndEntities(authUser);
    }
  }, [loadWorkspaceAndEntities]);

  // 1. Fetch real Supabase Auth session, workspaces & business entities
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (isMounted && authUser) {
          setUser(authUser);
          await loadWorkspaceAndEntities(authUser);
        }
      } catch (err) {
        console.error("Error initializing session in AppStateProvider:", err);
      }
    }

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadWorkspaceAndEntities]);

  // 2. Load persisted language from localStorage safely
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("firmus_lang") || localStorage.getItem("auvrio_lang");
      if (savedLang === "uz" || savedLang === "ru" || savedLang === "en") {
        setLanguageState(savedLang);
      }
    } catch {}
  }, []);

  const setLanguage = (lang: "uz" | "ru" | "en") => {
    setLanguageState(lang);
    try {
      localStorage.setItem("firmus_lang", lang);
    } catch {}
  };

  const setWorkspaceWithPersistence = (id: string) => {
    setCurrentWorkspaceId(id);
    try {
      localStorage.setItem("firmus_workspace", id);
    } catch {}
    if (user) {
      syncRoleForWorkspace(user, id);
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
  };

  const setEntityWithPersistence = (id: string) => {
    setCurrentEntityId(id);
    try {
      localStorage.setItem("firmus_entity", id);
    } catch {}
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/login");
  };

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

  const currentWorkspace =
    workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0] || EMPTY_WORKSPACE;

  const workspaceEntities = currentWorkspace.id
    ? entities.filter((e) => !e.workspaceId || e.workspaceId === currentWorkspace.id)
    : entities;
  const visibleEntities = workspaceEntities;

  const currentEntity =
    visibleEntities.find((e) => e.id === currentEntityId) || visibleEntities[0];

  const toggleAiDrawer = () => setIsAiDrawerOpen((prev) => !prev);

  return (
    <AppStateContext.Provider
      value={{
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

        refreshContext,
        handleSignOut,
      }}
    >
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
