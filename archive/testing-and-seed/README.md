# Archived Testing & Demo Seed Scripts

Ushbu papkada loyihani haqiqiy (real) foydalanuvchi va ishchi maʼlumotlarga moslash uchun ishchi katalogdan olingan test va demo seed fayllari saqlanadi:

- `supabase/seed.sql` — dastlabki demo korxonalar (`ORIENT AGRO EXPORT` va b.), xodimlar va tranzaksiyalar toʻplami
- `scripts/seed-auth-users.mjs` — soxta test hisoblarini (`@firmus.uz`, `@othercorp.uz`) yaratuvchi skript
- `scripts/test-*.mjs` — integratsiya/RLS/buxgalteriya test skriptlari (bular test hisoblarini talab qilgani uchun alohida arxivlandi)

Ishchi bazani toza saqlash uchun bular production bazaga qayta ishga tushirilmasligi tavsiya etiladi.
Sof funksiya va parser unit-testlari `tests/unit/` ichida `pnpm test` (`vitest run`) orqali bazaga tegmagan holda ishlaydi.
