"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { BusinessEntity, UserRole, Workspace } from "./types";
import { mockBusinessEntities, mockWorkspaces } from "./entities";

interface AppStateContextType {
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
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [workspaces] = useState<Workspace[]>(mockWorkspaces);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>("ws-1");

  const [entities] = useState<BusinessEntity[]>(mockBusinessEntities);
  const [currentEntityId, setCurrentEntityId] = useState<string>("ent-alfa");

  const [currentRole, setCurrentRole] = useState<UserRole>("chief_accountant");
  const [language, setLanguageState] = useState<"uz" | "ru" | "en">("uz");
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Load persisted language from localStorage safely
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("firmus_lang") || localStorage.getItem("auvrio_lang");
      if (savedLang === "uz" || savedLang === "ru" || savedLang === "en") {
        setLanguageState(savedLang);
      }
      const savedEntity = localStorage.getItem("firmus_entity") || localStorage.getItem("auvrio_entity");
      if (savedEntity) {
        setCurrentEntityId(savedEntity);
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
        workspaces,
        currentWorkspace,
        setCurrentWorkspaceId,
        entities,
        currentEntity,
        setCurrentEntityId,
        currentRole,
        setCurrentRole,
        language,
        setLanguage,
        isAiDrawerOpen,
        setIsAiDrawerOpen,
        toggleAiDrawer,
        isSearchOpen,
        setIsSearchOpen,
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
