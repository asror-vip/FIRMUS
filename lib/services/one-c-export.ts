import { getTashkentTodayIso } from "@/lib/format/date";

/**
 * 1C:Enterprise Exporter for Uzbekistan Accounting
 * Generates:
 * 1. 1CClientBankExchange (kl_to_1c.txt) for banking statements import into 1C
 * 2. EnterpriseData XML for accounting journal entries / double-entry ledger (strictly Draft / Posted=false)
 */

function sanitizeClientBankField(val?: string | null): string {
  if (!val) return "";
  return String(val).replace(/[\r\n]+/g, " ").trim();
}

function getTashkentTimeString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function generate1CClientBankText(
  transactions: Array<{
    id: string;
    date: string;
    amount: number;
    type: "income" | "expense";
    counterparty: string;
    counterpartyStir?: string;
    description: string;
    accountCode?: string;
    documentNumber?: string;
  }>,
  entityInfo: {
    name: string;
    inn: string;
    account: string;
    bank: string;
    openingBalance?: number;
  } = {
    name: "Kompaniya",
    inn: "",
    account: "",
    bank: "",
    openingBalance: 0,
  },
  options: {
    encoding?: "utf-8" | "windows-1251";
  } = {}
): string {
  const today = getTashkentTodayIso().split("-").reverse().join(".");
  const startDate =
    sanitizeClientBankField(transactions[transactions.length - 1]?.date.split("-").reverse().join(".")) || today;
  const endDate =
    sanitizeClientBankField(transactions[0]?.date.split("-").reverse().join(".")) || today;
  const openingBal = Number(entityInfo.openingBalance || 0).toFixed(2);
  const safeAccount = sanitizeClientBankField(entityInfo.account);
  const safeEntityName = sanitizeClientBankField(entityInfo.name);
  const safeEntityInn = sanitizeClientBankField(entityInfo.inn);
  const encodingLabel = options.encoding === "windows-1251" ? "Windows" : "UTF-8";

  let txt = `1CClientBankExchange\r\n`;
  txt += `ВерсияФормата=1.02\r\n`;
  txt += `Кодировка=${encodingLabel}\r\n`;
  txt += `Отправитель=FIRMUS AI Automation Cloud\r\n`;
  txt += `Получатель=1С:Предприятие 8.3\r\n`;
  txt += `ДатаСоздания=${today}\r\n`;
  txt += `ВремяСоздания=${getTashkentTimeString()}\r\n`;
  txt += `ДатаНачала=${startDate}\r\n`;
  txt += `ДатаКонца=${endDate}\r\n`;
  txt += `РасчСчет=${safeAccount}\r\n`;
  txt += `СекцияРасчСчет\r\n`;
  txt += `ДатаНачала=${startDate}\r\n`;
  txt += `ДатаКонца=${endDate}\r\n`;
  txt += `НачальныйОстаток=${openingBal}\r\n`;
  txt += `РасчСчет=${safeAccount}\r\n`;
  txt += `КонецРасчСчет\r\n`;

  transactions.forEach((tx, idx) => {
    const formattedDate = sanitizeClientBankField(tx.date.split("-").reverse().join(".")) || today;
    const num = sanitizeClientBankField(tx.documentNumber || String(idx + 101));
    const counterparty = sanitizeClientBankField(tx.counterparty);
    const counterpartyStir = sanitizeClientBankField(tx.counterpartyStir || "");
    const description = sanitizeClientBankField(tx.description);
    const amountStr = Number(tx.amount || 0).toFixed(2);

    txt += `СекцияДокумент=Платежное поручение\r\n`;
    txt += `Номер=${num}\r\n`;
    txt += `Дата=${formattedDate}\r\n`;
    txt += `Сумма=${amountStr}\r\n`;

    if (tx.type === "income") {
      // Payer is Counterparty, Receiver is Us
      txt += `Плательщик=${counterparty}\r\n`;
      txt += `ПлательщикИНН=${counterpartyStir}\r\n`;
      txt += `ПлательщикРасчСчет=\r\n`;
      txt += `Получатель=${safeEntityName}\r\n`;
      txt += `ПолучательИНН=${safeEntityInn}\r\n`;
      txt += `ПолучательРасчСчет=${safeAccount}\r\n`;
    } else {
      // Payer is Us, Receiver is Counterparty
      txt += `Плательщик=${safeEntityName}\r\n`;
      txt += `ПлательщикИНН=${safeEntityInn}\r\n`;
      txt += `ПлательщикРасчСчет=${safeAccount}\r\n`;
      txt += `Получатель=${counterparty}\r\n`;
      txt += `ПолучательИНН=${counterpartyStir}\r\n`;
      txt += `ПолучательРасчСчет=\r\n`;
    }

    txt += `НазначениеПлатежа=${description}\r\n`;
    txt += `ВидОплаты=Электронно\r\n`;
    txt += `Очередность=1\r\n`;
    txt += `КонецДокумента\r\n`;
  });

  txt += `КонецФайла\r\n`;

  return txt;
}

export function generate1CEnterpriseDataXml(
  journalEntries: Array<{
    entryNumber: string;
    date: string;
    description: string;
    totalDebit: number;
    lines: Array<{
      accountCode: string;
      accountName: string;
      debit: number;
      credit: number;
      memo?: string;
    }>;
  }>
): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<EnterpriseData xmlns="http://v8.1c.ru/edi/edi_stnd/EnterpriseData/1.8" formatVersion="1.8">\n`;
  xml += `  <Header CreationDate="${new Date().toISOString()}">\n`;
  xml += `    <Source>FIRMUS</Source>\n`;
  xml += `    <Destination>1C_Bukhgalteriya_Uzbekistan</Destination>\n`;
  xml += `  </Header>\n`;
  xml += `  <Body>\n`;

  journalEntries.forEach((je) => {
    const entryId = escapeXml(String(je.entryNumber || ""));
    const dateStr = escapeXml(String(je.date || ""));
    const totalDebit = Number(je.totalDebit || 0);
    xml += `    <Operation id="${entryId}">\n`;
    xml += `      <Number>${entryId}</Number>\n`;
    xml += `      <Date>${dateStr}</Date>\n`;
    xml += `      <Posted>false</Posted>\n`;
    xml += `      <Comment>${escapeXml(je.description || "")}</Comment>\n`;
    xml += `      <Amount>${totalDebit}</Amount>\n`;
    xml += `      <Lines>\n`;

    je.lines.forEach((l, idx) => {
      xml += `        <Line num="${idx + 1}">\n`;
      xml += `          <AccountCode>${escapeXml(String(l.accountCode || ""))}</AccountCode>\n`;
      xml += `          <AccountName>${escapeXml(String(l.accountName || ""))}</AccountName>\n`;
      xml += `          <Debit>${Number(l.debit || 0)}</Debit>\n`;
      xml += `          <Credit>${Number(l.credit || 0)}</Credit>\n`;
      xml += `          <Memo>${escapeXml(String(l.memo || ""))}</Memo>\n`;
      xml += `        </Line>\n`;
    });

    xml += `      </Lines>\n`;
    xml += `    </Operation>\n`;
  });

  xml += `  </Body>\n`;
  xml += `</EnterpriseData>`;

  return xml;
}

function escapeXml(unsafe?: string | null): string {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
