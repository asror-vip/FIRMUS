"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export interface CashflowDataPoint {
  date: string;
  income: number;
  expense: number;
}

interface CashflowChartProps {
  cashFlowData: CashflowDataPoint[];
  title: string;
  subtitle: string;
  emptyLabel: string;
  incomeLabel: string;
  expenseLabel: string;
  currencyLabel: string;
  intlLocale: string;
}

export function CashflowChart({
  cashFlowData,
  title,
  subtitle,
  emptyLabel,
  incomeLabel,
  expenseLabel,
  currencyLabel,
  intlLocale,
}: CashflowChartProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
      <div className="p-4 pb-3 border-b border-border/50">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <div className="p-4 pt-3">
        <div className="h-[280px] w-full">
          {cashFlowData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.4)" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(val) => `${(val / 1000000).toFixed(0)}m`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border) / 0.6)",
                    borderRadius: "0.75rem",
                    fontSize: "11px",
                  }}
                  formatter={(val: any) => [`${Number(val).toLocaleString(intlLocale)} ${currencyLabel}`]}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="income" name={incomeLabel} fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name={expenseLabel} fill="#F43F5E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {emptyLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CashflowChart;
