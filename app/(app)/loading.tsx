import React from "react";

export default function AppLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-56 rounded-lg bg-muted" />
          <div className="h-4 w-80 max-w-full rounded-md bg-muted/70" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 rounded-lg bg-muted" />
          <div className="h-9 w-36 rounded-lg bg-muted" />
        </div>
      </div>

      {/* KPI cards row skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-border bg-card p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-8 w-8 rounded-lg bg-muted/70" />
            </div>
            <div className="h-7 w-32 rounded bg-muted" />
            <div className="h-3 w-20 rounded bg-muted/60" />
          </div>
        ))}
      </div>

      {/* Main content area skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-44 rounded bg-muted" />
            <div className="h-8 w-24 rounded-md bg-muted/70" />
          </div>
          <div className="space-y-3 pt-2">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="h-12 w-full rounded-lg bg-muted/60" />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="h-5 w-36 rounded bg-muted" />
          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-14 w-full rounded-lg bg-muted/60" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
