"use client";

import React, { useState } from "react";
import { mockEmployees } from "@/lib/mock/employees";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared/status-pill";
import { Money } from "@/components/shared/money";
import { Users, Plus, DollarSign, Download, CheckCircle2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function EmployeesPage() {
  const { t } = useTranslation();
  const [isPayrollRunning, setIsPayrollRunning] = useState(false);

  const totalPayroll = mockEmployees.reduce((acc, curr) => acc + curr.salary, 0);

  const handleRunPayroll = () => {
    setIsPayrollRunning(true);
    toast.info("Noyabr oyi ish haqi hisob-kitobi (6710, JShDS, INPS) shakllanmoqda...");
    setTimeout(() => {
      setIsPayrollRunning(false);
      toast.success(
        `Noyabr oyi ish haqi reyestri muvaffaqiyatli shakllantirildi! Jami: ${totalPayroll.toLocaleString()} soʻm (Bankka to'lov vedomosti tayyor)`
      );
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {t.pages.employees.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.pages.employees.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={() => toast.success(t.common.export)}
          >
            <Download className="h-3.5 w-3.5" />
            {t.common.export} (Excel)
          </Button>

          <Button
            size="sm"
            className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleRunPayroll}
            disabled={isPayrollRunning}
          >
            <DollarSign className="h-3.5 w-3.5" />
            {isPayrollRunning ? t.common.loading : t.pages.employees.monthlyPayroll}
          </Button>
        </div>
      </div>

      {/* Row 1: Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <span className="text-xs font-semibold text-muted-foreground">{t.pages.employees.totalEmployees}</span>
          <div className="text-2xl font-bold font-mono text-foreground mt-1">
            {mockEmployees.length}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{t.statuses.active}</p>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-semibold text-muted-foreground">{t.pages.employees.monthlyPayroll}</span>
          <div className="text-2xl font-bold font-mono text-foreground mt-1">
            <Money amount={totalPayroll} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Oklad</p>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-semibold text-muted-foreground">{t.nav.tax}</span>
          <div className="text-2xl font-bold font-mono text-primary mt-1">
            <Money amount={totalPayroll * 0.24} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{t.pages.tax.vatPayable}</p>
        </Card>
      </div>

      {/* Employees Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">{t.pages.employees.title}</CardTitle>
          <CardDescription>{t.pages.employees.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.nav.team}</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">{t.pages.employees.monthlyPayroll}</TableHead>
                <TableHead>PINFL</TableHead>
                <TableHead>{t.common.date}</TableHead>
                <TableHead>{t.common.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockEmployees.map((emp) => (
                <TableRow key={emp.id} className="hover:bg-muted/50">
                  <TableCell className="font-semibold text-xs text-foreground">
                    {emp.fullName}
                  </TableCell>
                  <TableCell className="text-xs text-foreground">{emp.position}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{emp.department}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-foreground">
                    <Money amount={emp.salary} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {emp.pinfl}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {emp.startDate}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={emp.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
