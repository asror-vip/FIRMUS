"use client";

import React, { useState, useEffect, useCallback } from "react";
import { fetchEmployees, createEmployee, createJournalEntryRecord } from "@/lib/services/supabase-service";
import { employeeSchema, getFirstZodError } from "@/lib/validations/accounting";
import { maskPinfl } from "@/lib/utils/privacy";
import { useAppState } from "@/lib/mock/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { StatusPill } from "@/components/shared/status-pill";
import { Money } from "@/components/shared/money";
import { Users, Plus, DollarSign, Download, CheckCircle2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function EmployeesPage() {
  const { currentEntity, currentRole } = useAppState();
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPayrollRunning, setIsPayrollRunning] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newEmp, setNewEmp] = useState({
    fullName: "",
    position: "",
    department: "Moliya",
    salary: "",
    pinfl: "",
    hireDate: new Date().toISOString().split("T")[0],
  });

  const loadEmployees = useCallback(async () => {
    if (!currentEntity?.id) {
      setEmployees([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await fetchEmployees(currentEntity.id);
      const mapped = (data || []).map((d: any) => ({
        id: d.id,
        fullName: d.name || d.fullName,
        position: d.position,
        department: d.department,
        salary: d.salary,
        pinfl: d.pinfl,
        startDate: d.hireDate || d.startDate,
        status: d.status,
      }));
      setEmployees(mapped);
    } catch (err) {
      console.error("Error loading employees:", err);
      toast.error("Xodimlarni yuklashda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  }, [currentEntity?.id]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const totalPayroll = employees.reduce((acc, curr) => acc + (curr.salary || 0), 0);

  const handleRunPayroll = async () => {
    if (totalPayroll <= 0) {
      toast.error("Ish haqi hisoblash uchun faol xodimlar boʻlishi kerak");
      return;
    }
    setIsPayrollRunning(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const monthTag = today.slice(0, 7);

      const res = await createJournalEntryRecord({
        entityId: currentEntity?.id,
        entryNumber: `JE-PAY-${monthTag}-${Math.floor(100 + Math.random() * 900)}`,
        entryDate: today,
        description: `${monthTag} oyi uchun xodimlar ish haqi hisoblandi (6710 schyot va JShDS 12%)`,
        debitAccountCode: "9420",
        debitAccountName: "Maʼmuriy xarajatlar",
        creditAccountCode: "6710",
        creditAccountName: "Mehnat haqi boʻyicha xodimlar bilan hisob-kitoblar",
        amount: totalPayroll,
        sourceType: "payroll",
        idempotencyKey: `idem-payroll-${currentEntity?.id}-${monthTag}-${employees.length}-${Math.round(totalPayroll)}`,
      });

      if (res?.idempotent) {
        toast.info(`Ushbu tarkib (${employees.length} xodim) uchun ${monthTag} ish haqi provodkasi allaqachon Bosh kitobda mavjud.`);
      } else {
        toast.success(
          `Ish haqi vedomosti shakllantirildi va Bosh kitobga (Dt 9420 / Kt 6710) ${totalPayroll.toLocaleString()} soʻm provodka tushirildi!`
        );
      }
    } catch (err: any) {
      toast.error("Ish haqi provodkasini saqlashda xatolik: " + err.message);
    } finally {
      setIsPayrollRunning(false);
    }
  };

  const handleExport = () => {
    const headers = ["ID", "F.I.O", "Lavozim", "Bo'lim", "Oylik (UZS)", "PINFL", "Ishga kirgan sana", "Holat"];
    const rows = employees.map((emp) => [
      emp.id,
      `"${(emp.fullName || "").replace(/"/g, '""')}"`,
      `"${(emp.position || "").replace(/"/g, '""')}"`,
      emp.department,
      emp.salary,
      emp.pinfl,
      emp.startDate,
      emp.status,
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `firmus_employees_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Xodimlar roʻyxati CSV formatida yuklab olindi");
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = employeeSchema.safeParse({
      fullName: newEmp.fullName,
      position: newEmp.position,
      department: newEmp.department,
      salary: newEmp.salary,
      pinfl: newEmp.pinfl,
      hireDate: newEmp.hireDate,
    });
    if (!parsed.success) {
      toast.error(getFirstZodError(parsed.error));
      return;
    }

    setIsSubmitting(true);
    try {
      await createEmployee({
        entityId: currentEntity?.id,
        fullName: parsed.data.fullName,
        position: parsed.data.position,
        department: parsed.data.department,
        salary: parsed.data.salary,
        pinfl: parsed.data.pinfl,
        hireDate: parsed.data.hireDate,
      });

      await loadEmployees();
      toast.success("Yangi xodim Supabase maʼlumotlar bazasiga muvaffaqiyatli qoʻshildi!");
      setIsAddOpen(false);
      setNewEmp({
        fullName: "",
        position: "",
        department: "Moliya",
        salary: "",
        pinfl: "",
        hireDate: new Date().toISOString().split("T")[0],
      });
    } catch (err: any) {
      toast.error("Xodim qoʻshishda xatolik: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
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
            onClick={handleExport}
          >
            <Download className="h-3.5 w-3.5" />
            {t.common.export} (Excel)
          </Button>

          {currentRole !== "viewer" && currentRole !== "auditor" && (
            <>
              <Button
                size="sm"
                className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => setIsAddOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                {t.pages.employees.addEmployee}
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
            </>
          )}
        </div>
      </div>

      {/* Row 1: Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <span className="text-xs font-semibold text-muted-foreground">{t.pages.employees.totalEmployees}</span>
          <div className="text-2xl font-bold font-mono text-foreground mt-1">
            {employees.length}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{t.statuses.active}</p>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-semibold text-muted-foreground">{t.pages.employees.monthlyPayroll}</span>
          <div className="text-2xl font-bold font-mono text-foreground mt-1">
            <Money amount={totalPayroll} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Oklad fondi</p>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-semibold text-muted-foreground">JShDS va Ijtimoiy soliq (taxminiy)</span>
          <div className="text-2xl font-bold font-mono text-primary mt-1">
            <Money amount={totalPayroll * 0.24} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">12% JShDS + 12% Ijtimoiy soliq</p>
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
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                    {isLoading
                      ? "Xodimlar roʻyxati yuklanmoqda..."
                      : "Ushbu korxonada xodimlar kiritilmagan."}
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((emp) => (
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
                    {maskPinfl(emp.pinfl)}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {emp.startDate}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={emp.status} />
                  </TableCell>
                </TableRow>
              ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Employee Modal Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {t.pages.employees.addEmployee}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Yangi xodimni shtat jadvaliga kiritish va Supabase bazasiga saqlash.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateEmployee} className="space-y-3 pt-2 text-xs">
            <div>
              <Label className="text-[11px] font-medium text-foreground">Toʻliq F.I.O *</Label>
              <Input
                placeholder="Karimov Anvar Shavkatovich"
                value={newEmp.fullName}
                onChange={(e) => setNewEmp({ ...newEmp, fullName: e.target.value })}
                className="h-8 text-xs mt-1"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-medium text-foreground">Lavozimi *</Label>
                <Input
                  placeholder="Katta buxgalter"
                  value={newEmp.position}
                  onChange={(e) => setNewEmp({ ...newEmp, position: e.target.value })}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-foreground">Boʻlim *</Label>
                <select
                  value={newEmp.department}
                  onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value })}
                  className="w-full h-8 text-xs mt-1 rounded-md border border-input bg-background px-2"
                >
                  <option value="Moliya">Moliya va Buxgalteriya</option>
                  <option value="IT va Rivojlantirish">IT va Rivojlantirish</option>
                  <option value="Logistika">Logistika va Ombor</option>
                  <option value="Savdo">Savdo va Marketing</option>
                  <option value="HR">Kadrlar boʻlimi (HR)</option>
                  <option value="Maʼmuriyat">Maʼmuriyat</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-medium text-foreground">Oylik maoshi (UZS) *</Label>
                <Input
                  type="number"
                  placeholder="12000000"
                  value={newEmp.salary}
                  onChange={(e) => setNewEmp({ ...newEmp, salary: e.target.value })}
                  className="h-8 text-xs font-mono mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-foreground">JShShIR (PINFL - 14 ta) *</Label>
                <Input
                  placeholder="30101901234567"
                  maxLength={14}
                  value={newEmp.pinfl}
                  onChange={(e) => setNewEmp({ ...newEmp, pinfl: e.target.value })}
                  className="h-8 text-xs font-mono mt-1"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-medium text-foreground">Ishga qabul sanasi *</Label>
              <Input
                type="date"
                value={newEmp.hireDate}
                onChange={(e) => setNewEmp({ ...newEmp, hireDate: e.target.value })}
                className="h-8 text-xs mt-1"
                required
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setIsAddOpen(false)}
                disabled={isSubmitting}
              >
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saqlanmoqda..." : "Xodimni saqlash"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
