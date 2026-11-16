import { z } from "zod";

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const agentHistoryItemSchema = z.object({
  sender: z.enum(["user", "ai"]),
  text: z.string().trim().min(1).max(2000),
});

export const copilotRequestSchema = z.object({
  message: z.string().trim().min(1, "Savol matni boʻsh boʻlishi mumkin emas").max(2000),
  entityId: z.string().regex(UUID_REGEX, "Notoʻgʻri korxona ID").optional(),
  history: z.array(agentHistoryItemSchema).max(12).optional(),
});

export const proposedJournalLineSchema = z.object({
  account_code: z.string().trim().min(3).max(20),
  account_name: z.string().trim().min(1).max(200),
  debit_amount: z.number().nonnegative().max(1_000_000_000_000_000),
  credit_amount: z.number().nonnegative().max(1_000_000_000_000_000),
  memo: z.string().trim().max(300).optional(),
});

export const journalProposalPayloadSchema = z
  .object({
    entry_date: z.string().regex(DATE_REGEX, "Sana YYYY-MM-DD formatida boʻlishi shart"),
    description: z.string().trim().min(3).max(500),
    lines: z.array(proposedJournalLineSchema).min(2).max(20),
  })
  .superRefine((val, ctx) => {
    let debit = 0;
    let credit = 0;
    for (let i = 0; i < val.lines.length; i++) {
      const l = val.lines[i];
      if (l.debit_amount > 0 && l.credit_amount > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${i + 1}-qatorda ham Debet, ham Kredit bir vaqtda > 0 boʻlishi mumkin emas`,
        });
      }
      if (l.debit_amount <= 0 && l.credit_amount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${i + 1}-qatorda Debet yoki Kredit qiymati 0 dan katta boʻlishi shart`,
        });
      }
      debit += l.debit_amount;
      credit += l.credit_amount;
    }
    if (Math.abs(debit - credit) > 0.005) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Balans buzilgan: Debet (${debit}) ≠ Kredit (${credit})`,
      });
    }
  });

export const reverseEntryPayloadSchema = z.object({
  entry_id: z.string().regex(UUID_REGEX, "Notoʻgʻri provodka ID"),
  entry_number: z.string().trim().min(1).max(60).optional(),
  reason: z.string().trim().min(3, "Storno sababi kamida 3 ta belgi boʻlishi shart").max(300),
});

export const exceptionPayloadSchema = z.object({
  exception_id: z.string().regex(UUID_REGEX),
  decision: z.enum(["approve", "reject"]),
});

export const transactionPayloadSchema = z.object({
  transaction_id: z.string().regex(UUID_REGEX),
  status: z.enum(["posted", "rejected"]),
});

export const contractPayloadSchema = z.object({
  number: z.string().trim().min(1).max(60),
  type: z.enum(["Xizmat ko'rsatish", "Yetkazib berish", "Ijara", "Boshqa"]),
  counterparty: z.string().trim().min(2).max(200),
  counterparty_stir: z.string().trim().regex(/^\d{9}$/, "STIR 9 xonali raqam boʻlishi shart"),
  amount: z.number().nonnegative().max(1_000_000_000_000_000),
  start_date: z.string().regex(DATE_REGEX),
  end_date: z.string().regex(DATE_REGEX),
  description: z.string().trim().max(500).optional(),
});

export const inventoryPayloadSchema = z.object({
  sku: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(200),
  category: z.string().trim().min(2).max(100),
  quantity: z.number().nonnegative().max(1_000_000_000),
  unit: z.string().trim().min(1).max(30),
  unit_price: z.number().nonnegative().max(1_000_000_000_000_000),
});

export const employeePayloadSchema = z.object({
  full_name: z.string().trim().min(3).max(150),
  position: z.string().trim().min(2).max(120),
  department: z.string().trim().min(2).max(100),
  salary: z.number().positive().max(1_000_000_000_000),
  pinfl: z.string().trim().regex(/^\d{14}$/, "JShShIR 14 xonali raqam boʻlishi shart"),
  hire_date: z.string().regex(DATE_REGEX),
});

export const closePeriodPayloadSchema = z.object({
  from_date: z.string().regex(DATE_REGEX),
  to_date: z.string().regex(DATE_REGEX),
  closing_date: z.string().regex(DATE_REGEX),
});

export const agentExecuteRequestSchema = z.object({
  entityId: z.string().regex(UUID_REGEX, "Notoʻgʻri korxona ID"),
  decision: z.enum(["approve", "reject"]),
  modelUsed: z.string().trim().min(1).max(80).default("firmus-agent"),
  proposal: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("journal_entry"),
      title: z.string().trim().min(1).max(200),
      summary: z.string().trim().max(500).optional(),
      amount: z.string().trim().optional(),
      accounts: z.string().trim().optional(),
      targetId: z.string().optional(),
      payload: journalProposalPayloadSchema,
    }),
    z.object({
      type: z.literal("reverse_entry"),
      title: z.string().trim().min(1).max(200),
      summary: z.string().trim().max(500).optional(),
      targetId: z.string().regex(UUID_REGEX),
      payload: reverseEntryPayloadSchema,
    }),
    z.object({
      type: z.literal("exception"),
      title: z.string().trim().min(1).max(200),
      summary: z.string().trim().max(500).optional(),
      amount: z.string().trim().optional(),
      accounts: z.string().trim().optional(),
      targetId: z.string().regex(UUID_REGEX),
      payload: exceptionPayloadSchema.optional(),
    }),
    z.object({
      type: z.literal("transaction"),
      title: z.string().trim().min(1).max(200),
      summary: z.string().trim().max(500).optional(),
      amount: z.string().trim().optional(),
      accounts: z.string().trim().optional(),
      targetId: z.string().regex(UUID_REGEX),
      payload: transactionPayloadSchema.optional(),
    }),
    z.object({
      type: z.literal("contract"),
      title: z.string().trim().min(1).max(200),
      summary: z.string().trim().max(500).optional(),
      amount: z.string().trim().optional(),
      payload: contractPayloadSchema,
    }),
    z.object({
      type: z.literal("inventory_item"),
      title: z.string().trim().min(1).max(200),
      summary: z.string().trim().max(500).optional(),
      amount: z.string().trim().optional(),
      payload: inventoryPayloadSchema,
    }),
    z.object({
      type: z.literal("employee"),
      title: z.string().trim().min(1).max(200),
      summary: z.string().trim().max(500).optional(),
      amount: z.string().trim().optional(),
      payload: employeePayloadSchema,
    }),
    z.object({
      type: z.literal("close_period"),
      title: z.string().trim().min(1).max(200),
      summary: z.string().trim().max(500).optional(),
      payload: closePeriodPayloadSchema,
    }),
  ]),
});

export type AgentActionProposal = z.infer<typeof agentExecuteRequestSchema>["proposal"];
export type AgentExecuteRequest = z.infer<typeof agentExecuteRequestSchema>;
export type AgentHistoryItem = z.infer<typeof agentHistoryItemSchema>;
