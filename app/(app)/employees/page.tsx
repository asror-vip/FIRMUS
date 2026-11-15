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

export default function EmployeesPage() {
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
            Xodimlar & Mehnat Haqi (Payroll)
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Shtatlar jadvali, ish haqi hisob-kitoblari va JShDS/INPS ajratmalari
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={() => toast.success("Xodimlar reyestri eksport qilindi")}
          >
            <Download className="h-3.5 w-3.5" />
            Eksport (Excel)
          </Button>

          <Button
            size="sm"
            className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleRunPayroll}
            disabled={isPayrollRunning}
          >
            <DollarSign className="h-3.5 w-3.5" />
            {isPayrollRunning ? "Hisoblanmoqda..." : "Ish haqini hisoblash"}
          </Button>
        </div>
      </div>

      {/* Row 1: Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <span className="text-xs font-semibold text-muted-foreground">Xodimlar soni</span>
          <div className="text-2xl font-bold font-mono text-foreground mt-1">
            {mockEmployees.length} nafar
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Barcha xodimlar rasmiy bandlikda</p>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-semibold text-muted-foreground">Oylik Mehnat Haqi Jamgʻarmasi</span>
          <div className="text-2xl font-bold font-mono text-foreground mt-1">
            <Money amount={totalPayroll} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Oklad stavkalari boʻyicha</p>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-semibold text-muted-foreground">Soliqlar (JShDS 12% + Ijtimoiy 12%)</span>
          <div className="text-2xl font-bold font-mono text-primary mt-1">
            <Money amount={totalPayroll * 0.24} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Budjetga toʻlanishi zarur summa</p>
        </Card>
      </div>

      {/* Employees Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Xodimlar Roʻyxati</CardTitle>
          <CardDescription>Lavozimlar, departamentlar va maoshlar</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>F.I.Sh</TableHead>
                <TableHead>Lavozim</TableHead>
                <TableHead>Departament</TableHead>
                <TableHead className="text-right">Oylik Maosh</TableHead>
                <TableHead>JShSHIR (PINFL)</TableHead>
                <TableHead>Ishga kirgan sana</TableHead>
                <TableHead>Holat</TableHead>
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
                    <StatusPill status={emp.status === "active" ? "active" : "pending"} label="Faol" />
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
