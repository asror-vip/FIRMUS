"use client";

import React, { useState } from "react";
import { mockTeamMembers } from "@/lib/mock/team";
import { mockBusinessEntities } from "@/lib/mock/entities";
import { TeamMember, UserRole } from "@/lib/mock/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/shared/status-pill";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, UserPlus, Shield, Check, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function TeamPage() {
  const { t } = useTranslation();
  const [members, setMembers] = useState<TeamMember[]>(mockTeamMembers);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("accountant");

  const rolesCatalog = [
    { role: "Workspace Owner", desc: "Barcha korxonalar, obuna, jamoa va tizim sozlamalarini toʻliq boshqarish." },
    { role: "Bosh buxgalter", desc: "Barcha moliyaviy provodkalar, hisobotlarni tasdiqlash va Didox/1C sinxronizatsiyasi." },
    { role: "Buxgalter", desc: "Faqat oʻziga biriktirilgan mijoz korxonalarining tranzaksiyalarini kiritish va tahrirlash." },
    { role: "Auditor", desc: "Faqat oʻqish (Read-only) huquqi. Hech qanday maʼlumotni oʻzgartira olmaydi." },
    { role: "Bosh direktor", desc: "Oʻz korxonasining moliyaviy koʻrsatkichlari (P&L, Balans) va yirik toʻlovlarni tasdiqlash." },
  ];

  const handleInvite = () => {
    if (!inviteName || !inviteEmail) {
      toast.error("Iltimos, ism va elektron pochtani kiriting");
      return;
    }
    const newMember: TeamMember = {
      id: `usr-${Date.now()}`,
      name: inviteName,
      email: inviteEmail,
      phone: "+998 90 000-00-00",
      role: inviteRole,
      assignedEntityIds: ["ent-alfa"],
      status: "invited",
      lastActive: "Taklif yuborildi",
    };
    setMembers((prev) => [...prev, newMember]);
    toast.success(`${inviteName} ga taklifnoma xati yuborildi!`);
    setIsInviteOpen(false);
    setInviteName("");
    setInviteEmail("");
  };

  const handleToggleAssignment = (memberId: string, entityId: string) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== memberId) return m;
        const has = m.assignedEntityIds.includes(entityId);
        const updated = has
          ? m.assignedEntityIds.filter((id) => id !== entityId)
          : [...m.assignedEntityIds, entityId];
        return { ...m, assignedEntityIds: updated };
      })
    );
    toast.success("Korxona biriktiruvi yangilandi!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {t.pages.team.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.pages.team.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => setIsInviteOpen(true)}
          >
            <UserPlus className="h-3.5 w-3.5" />
            {t.pages.team.inviteMember}
          </Button>
        </div>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Jamoa Aʼzolari</CardTitle>
          <CardDescription>Barcha foydalanuvchilar va ularning rollari</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ism-familiya</TableHead>
                <TableHead>Aloqa</TableHead>
                <TableHead>Roli</TableHead>
                <TableHead>Biriktirilgan Korxonalar</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead>Oxirgi faollik</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id} className="hover:bg-muted/50">
                  <TableCell className="font-semibold text-xs text-foreground">
                    {m.name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div>{m.email}</div>
                    <div className="text-[10px]">{m.phone}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="indigo" className="text-[10px] capitalize">
                      {m.role.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {m.assignedEntityIds.length} ta korxona
                  </TableCell>
                  <TableCell>
                    <StatusPill status={m.status === "active" ? "active" : "pending"} label={m.status === "active" ? "Faol" : "Taklif qilingan"} />
                  </TableCell>
                  <TableCell className="text-[11px] text-muted-foreground">
                    {m.lastActive}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Entity Assignments Matrix (Members × Entities) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Korxonalarni Buxgalterlarga Biriktirish Matritsasi
          </CardTitle>
          <CardDescription>
            Qaysi buxgalter qaysi mijoz korxonasining maʼlumotlarini koʻra olishini belgilang
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-56">Buxgalter / Xodim</TableHead>
                {mockBusinessEntities.map((ent) => (
                  <TableHead key={ent.id} className="text-center font-medium">
                    {ent.tradeName || ent.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium text-xs text-foreground">
                    {m.name}
                    <span className="text-[10px] text-muted-foreground block">
                      {m.role.replace("_", " ")}
                    </span>
                  </TableCell>
                  {mockBusinessEntities.map((ent) => {
                    const isAssigned = m.assignedEntityIds.includes(ent.id);
                    return (
                      <TableCell key={ent.id} className="text-center">
                        <Checkbox
                          checked={isAssigned}
                          onCheckedChange={() => handleToggleAssignment(m.id, ent.id)}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role Catalog Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {rolesCatalog.map((r, i) => (
          <div key={i} className="p-3.5 rounded-xl border border-border bg-card text-xs space-y-1">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-indigo-500" />
              {r.role}
            </span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {r.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Invite Member Modal */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Jamoaga Yangi Aʼzo Taklif Qilish</DialogTitle>
            <DialogDescription>
              Elektron pochta manziliga AUVRIO ga kirish taklifnomasi yuboriladi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div>
              <label className="font-medium text-foreground block mb-1">F.I.Sh:</label>
              <Input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Masalan: Jamshid Fayziyev"
                className="text-xs h-8"
              />
            </div>

            <div>
              <label className="font-medium text-foreground block mb-1">Email manzili:</label>
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="jamshid@buxgalter.uz"
                type="email"
                className="text-xs h-8"
              />
            </div>

            <div>
              <label className="font-medium text-foreground block mb-1">Roli:</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
                className="w-full h-8 rounded-lg border border-input bg-card px-3 text-xs text-foreground"
              >
                <option value="accountant">Buxgalter (Mijozlar hisoboti)</option>
                <option value="chief_accountant">Bosh buxgalter (Tasdiqlash huquqi)</option>
                <option value="auditor">Auditor (Faqat oʻqish)</option>
                <option value="company_director">Direktor</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs w-full"
              onClick={handleInvite}
            >
              Taklifnomani Yuborish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
