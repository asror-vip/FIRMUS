"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { BusinessEntity, UserRole, Workspace } from "./types";
import { mockBusinessEntities, mockWorkspaces } from "./entities";
import { supabase } from "@/lib/supabase/client";
import { fetchBusinessEntities } from "@/lib/services/supabase-service";

interface AppStateContextType {
  user: any | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace;
  setCurrentWorkspaceId: (id: string) => void;

  entities: BusinessEntity[];
  currentEntity: BusinessEntity;
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

  handleSignOut: () => Promise<void>;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>(mockWorkspaces);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>("ws-1");

  const [entities, setEntities] = useState<BusinessEntity[]>(mockBusinessEntities);
  const [currentEntityId, setCurrentEntityId] = useState<string>("11111111-1111-1111-1111-111111111111");

  const [currentRole, setCurrentRole] = useState<UserRole>("chief_accountant");
  const [language, setLanguageState] = useState<"uz" | "ru" | "en">("uz");
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // 1. Fetch real Supabase Auth session & real business entities
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (isMounted && authUser) {
          setUser(authUser);

          // Get role from user metadata or team_members
          const metaRole = authUser.user_metadata?.role as UserRole;
          if (metaRole) {
            setCurrentRole(metaRole);
          } else {
            const { data: member } = await supabase
              .from("team_members")
              .select("role")
              .eq("user_id", authUser.id)
              .maybeSingle();

            if (member?.role) {
              setCurrentRole(member.role as UserRole);
            }
          }

          // Fetch real business entities from Supabase
          const realEntities = await fetchBusinessEntities();
          if (isMounted && realEntities && realEntities.length > 0) {
            setEntities(realEntities as BusinessEntity[]);

            // Verify currentEntityId is valid
            const savedEntity = localStorage.getItem("firmus_entity");
            if (savedEntity && realEntities.some((e: any) => e.id === savedEntity)) {
              setCurrentEntityId(savedEntity);
            } else {
              setCurrentEntityId(realEntities[0].id);
              try {
                localStorage.setItem("firmus_entity", realEntities[0].id);
              } catch {}
            }
          }
        }
      } catch (err) {
        console.error("Error initializing session in AppStateProvider:", err);
      }
    }

    initSession();

    // Listen to Auth State Changes
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
  }, []);

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

  const setEntityWithPersistence = (id: string) => {
    setCurrentEntityId(id);
    try {
      localStorage.setItem("firmus_entity", id);
    } catch {}
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/login";
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
    workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0];
  const currentEntity =
    entities.find((e) => e.id === currentEntityId) || entities[0];

  const toggleAiDrawer = () => setIsAiDrawerOpen((prev) => !prev);

  return (
    <AppStateContext.Provider
      value={{
        user,
        workspaces,
        currentWorkspace,
        setCurrentWorkspaceId,

        entities,
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
