"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[280px] w-full">
          {cashFlowData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(val) => `${(val / 1000000).toFixed(0)}m`}
                />
                <Tooltip formatter={(val: any) => [`${Number(val).toLocaleString(intlLocale)} ${currencyLabel}`]} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="income" name={incomeLabel} fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name={expenseLabel} fill="#4F46E5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {emptyLabel}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default CashflowChart;
