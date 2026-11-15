"use client";

import React, { useState, useEffect } from "react";
import { mockTeamMembers } from "@/lib/mock/team";
import { mockBusinessEntities } from "@/lib/mock/entities";
import { fetchTeamMembers, createTeamMember } from "@/lib/services/supabase-service";
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
  const [isLoading, setIsLoading] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("accountant");

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetchTeamMembers()
      .then((data) => {
        if (isMounted && data && data.length > 0) {
          const mapped: TeamMember[] = data.map((d: any) => ({
            id: d.id,
            name: d.name,
            email: d.email,
            phone: "+998 90 123-45-67",
            role: d.role,
            assignedEntityIds: ["ent-alfa"],
            status: d.status,
            lastActive: "Faol",
          }));
          setMembers(mapped);
        }
      })
      .catch((err) => console.error("Error loading team members:", err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const rolesCatalog = [
    { role: "Workspace Owner", desc: "Barcha korxonalar, obuna, jamoa va tizim sozlamalarini toʻliq boshqarish." },
    { role: "Bosh buxgalter", desc: "Barcha moliyaviy provodkalar, hisobotlarni tasdiqlash va Didox/1C sinxronizatsiyasi." },
    { role: "Buxgalter", desc: "Faqat oʻziga biriktirilgan mijoz korxonalarining tranzaksiyalarini kiritish va tahrirlash." },
    { role: "Auditor", desc: "Faqat oʻqish (Read-only) huquqi. Hech qanday maʼlumotni oʻzgartira olmaydi." },
    { role: "Bosh direktor", desc: "Oʻz korxonasining moliyaviy koʻrsatkichlari (P&L, Balans) va yirik toʻlovlarni tasdiqlash." },
  ];

  const handleInvite = async () => {
    if (!inviteName || !inviteEmail) {
      toast.error("Iltimos, ism va elektron pochtani kiriting");
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await createTeamMember({
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
      });

      const newMember: TeamMember = {
        id: created.id,
        name: created.name,
        email: created.email,
        phone: "+998 90 000-00-00",
        role: created.role as UserRole,
        assignedEntityIds: ["ent-alfa"],
        status: created.status as any,
        lastActive: "Taklif yuborildi",
      };

      setMembers((prev) => [...prev, newMember]);
      toast.success(`${inviteName} ga taklifnoma yuborildi va Supabase bazasiga saqlandi!`);
      setIsInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
    } catch (err: any) {
      toast.error("Xatolik yuz berdi: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
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
          <CardTitle className="text-sm font-semibold">{t.pages.team.title}</CardTitle>
          <CardDescription>{t.pages.team.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.nav.team}</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>{t.pages.team.assignedCompanies}</TableHead>
                <TableHead>{t.common.status}</TableHead>
                <TableHead>Activity</TableHead>
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
                      {t.roles[m.role] || m.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {m.assignedEntityIds.length}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={m.status} />
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
            <DialogTitle>{t.pages.team.inviteMember}</DialogTitle>
            <DialogDescription>
              FIRMUS • {t.pages.team.subtitle}
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
