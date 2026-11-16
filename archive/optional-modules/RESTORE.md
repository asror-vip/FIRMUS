# Arxivlangan Qoʻshimcha ERP Modullari (FIRMUS Optional Modules Archive)

Ushbu papkada loyihaning boshlangʻich «Sodda Zero-PII Buxgalter» (Google Login + Bank ↔ 1C AI Solishtirish + 21-BHMS Bosh kitob + AI Auditor + Soliq/Moliya) versiyasini yengil va OʻRQ-547 qonuniga mos saqlash uchun vaqtincha chetga olingan qoʻshimcha ERP modullari saqlanadi.

## Arxivdagi modullar roʻyxati

### Sahifalar (`app/(app)/*`)
- `banking/page.tsx` — Koʻp bankli alohida hisobvaraqlar oynasi
- `documents/page.tsx` — Didox E-SF hujjatlar ombori va lokal E-IMZO imzolash
- `contracts/page.tsx` — Shartnomalar reyestri
- `inventory/page.tsx` — Omborxona va tovarlar (SKU)
- `employees/page.tsx` — Xodimlar va HR/Oylik hisobi *(OʻRQ-547 PII: JShShIR/oylik saqlaydi)*
- `integrations/page.tsx` — Tashqi Didox / 1C OData API sozlamalari
- `reports/page.tsx` — Qoʻshimcha hisobot shablonlari
- `team/page.tsx` — Buxgalteriya firmasi jamoasi va RBAC *(OʻRQ-547 PII: telefon/email)*
- `billing/page.tsx` — SaaS tariflar va obuna sahifasi

### API Endpointlar va Servislar
- `app/api/auth/phone-otp/send/route.ts` va `verify/route.ts` + `lib/services/eskiz-sms.ts` — Eskiz.uz SMS OTP *(OʻRQ-547 PII: telefon raqam)*
- `app/api/integrations/test/route.ts` — Integratsiya URL tekshiruvchi API
- `lib/services/eimzo-client.ts` — Brauzer `CAPIWS` lokal E-IMZO integratsiyasi

### Eski statik/mock yordamchilar
- `lib/config/modules.ts`
- `lib/mock/{accounting,banking,billing,contracts,documents,employees,entities,exceptions,finance,integrations,inventory,notifications,tax,team,transactions}.ts`

## Qanday qilib qayta tiklash mumkin?

Istalgan modulni loyihaga qaytarish uchun:
1. Mos faylni `archive/optional-modules/...` dan asosiy joyiga (`app/...` yoki `lib/...`) nusxalab oling;
2. `components/shell/sidebar.tsx` va `components/shell/command-palette.tsx` ga shu sahifa havolasini qoʻshing;
3. `OʻRQ-547 PII` belgili modullar (`employees`, `team`, `eskiz-sms`) yoqilganda server Oʻzbekiston hududidagi VPS (Toshkent DC) da joylashtirilishi tavsiya etiladi.
