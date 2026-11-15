/**
 * 1C:Enterprise Exporter for Uzbekistan Accounting
 * Generates:
 * 1. 1CClientBankExchange (kl_to_1c.txt) for banking statements import into 1C
 * 2. EnterpriseData XML for accounting journal entries / double-entry ledger
 */

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
  }>,
  entityInfo = {
    name: 'OOO "ORIENT AGRO EXPORT"',
    inn: "308554433",
    account: "20208000700123456001",
    bank: "Kapitalbank ATB",
  }
): string {
  const today = new Date().toISOString().split("T")[0].split("-").reverse().join(".");
  const startDate = transactions[transactions.length - 1]?.date.split("-").reverse().join(".") || today;
  const endDate = transactions[0]?.date.split("-").reverse().join(".") || today;

  let txt = `1CClientBankExchange\r\n`;
  txt += `ВерсияФормата=1.02\r\n`;
  txt += `Кодировка=Windows\r\n`;
  txt += `Отправитель=FIRMUS AI Automation Cloud\r\n`;
  txt += `Получатель=1С:Предприятие 8.3\r\n`;
  txt += `ДатаСоздания=${today}\r\n`;
  txt += `ВремяСоздания=${new Date().toTimeString().split(" ")[0]}\r\n`;
  txt += `ДатаНачала=${startDate}\r\n`;
  txt += `ДатаКонца=${endDate}\r\n`;
  txt += `РасчСчет=${entityInfo.account}\r\n`;
  txt += `СекцияРасчСчет\r\n`;
  txt += `ДатаНачала=${startDate}\r\n`;
  txt += `ДатаКонца=${endDate}\r\n`;
  txt += `НачальныйОстаток=1157650000.00\r\n`;
  txt += `РасчСчет=${entityInfo.account}\r\n`;
  txt += `КонецРасчСчет\r\n`;

  transactions.forEach((tx, idx) => {
    const formattedDate = tx.date.split("-").reverse().join(".");
    const num = idx + 101;

    txt += `СекцияДокумент=Платежное поручение\r\n`;
    txt += `Номер=${num}\r\n`;
    txt += `Дата=${formattedDate}\r\n`;
    txt += `Сумма=${tx.amount.toFixed(2)}\r\n`;

    if (tx.type === "income") {
      // Payer is Counterparty, Receiver is Us
      txt += `Плательщик=${tx.counterparty}\r\n`;
      txt += `ПлательщикИНН=${tx.counterpartyStir || "300000000"}\r\n`;
      txt += `ПлательщикРасчСчет=20208000000000000000\r\n`;
      txt += `Получатель=${entityInfo.name}\r\n`;
      txt += `ПолучательИНН=${entityInfo.inn}\r\n`;
      txt += `ПолучательРасчСчет=${entityInfo.account}\r\n`;
    } else {
      // Payer is Us, Receiver is Counterparty
      txt += `Плательщик=${entityInfo.name}\r\n`;
      txt += `ПлательщикИНН=${entityInfo.inn}\r\n`;
      txt += `ПлательщикРасчСчет=${entityInfo.account}\r\n`;
      txt += `Получатель=${tx.counterparty}\r\n`;
      txt += `ПолучательИНН=${tx.counterpartyStir || "300000000"}\r\n`;
      txt += `ПолучательРасчСчет=20208000000000000000\r\n`;
    }

    txt += `НазначениеПлатежа=${tx.description}\r\n`;
    txt += `ВидОплаты=Электронно\r\n`;
    txt += `Очередность=1\r\n`;
    txt += `КонецДокумента\r\n`;
  });

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
    xml += `    <Operation id="${je.entryNumber}">\n`;
    xml += `      <Number>${je.entryNumber}</Number>\n`;
    xml += `      <Date>${je.date}</Date>\n`;
    xml += `      <Comment>${escapeXml(je.description)}</Comment>\n`;
    xml += `      <Amount>${je.totalDebit}</Amount>\n`;
    xml += `      <Lines>\n`;

    je.lines.forEach((l, idx) => {
      xml += `        <Line num="${idx + 1}">\n`;
      xml += `          <AccountCode>${l.accountCode}</AccountCode>\n`;
      xml += `          <AccountName>${escapeXml(l.accountName)}</AccountName>\n`;
      xml += `          <Debit>${l.debit}</Debit>\n`;
      xml += `          <Credit>${l.credit}</Credit>\n`;
      xml += `          <Memo>${escapeXml(l.memo || "")}</Memo>\n`;
      xml += `        </Line>\n`;
    });

    xml += `      </Lines>\n`;
    xml += `    </Operation>\n`;
  });

  xml += `  </Body>\n`;
  xml += `</EnterpriseData>`;

  return xml;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
