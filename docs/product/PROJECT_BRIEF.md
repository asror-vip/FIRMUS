# AUVRIO — Master Project Brief

## 1. Executive Summary

**AUVRIO** is an AI-powered Business Automation Software-as-a-Service (SaaS) platform engineered specifically for the Uzbekistan market, with native readiness for global expansion. AUVRIO addresses the operational friction in financial administration by serving as an intelligent operational nervous system for both individual businesses and multi-client accounting firms.

Unlike conventional chatbots, lightweight CRMs, or static dashboard systems, AUVRIO automates data ingestion, reconciles transactions against primary regulatory sources (such as Didox for electronic document management and 1C:Enterprise 8.3 for enterprise accounting), and provides a deterministic double-entry ledger verified by AI workflow coordination.

## 2. Core Value Proposition & Principles

- **Zero Redundant Data Entry**: Information retrieved from bank statements, electronic invoices (Didox), or ERP systems (1C) is automatically ingested, classified, matched, and routed without repetitive human input.
- **Deterministic Financial Truth**: Artificial intelligence (orchestrated exclusively via `gpt-6-luna`) coordinates processes, explains anomalies, and suggests resolutions. However, every financial balance, tax liability, and journal entry is strictly calculated, balanced, and validated by deterministic Go business logic.
- **Human-in-the-Loop Exception Center**: Routine operations execute automatically based on verified rules. Ambiguities, discrepancy thresholds, and legally significant filings are routed to certified accountants through an intuitive status-driven exception workflow.
- **Strict Multi-Tenancy**: Designed from day zero to support independent companies and multi-client accounting practices with isolated boundaries, entity assignments, and role-based permissions.

## 3. Target Audiences & Personas

### Persona A: Independent Company (SME / Enterprise)
- **Stakeholders**: General Director, Internal Accountant, Operations Manager.
- **Use Case**: One workspace containing their business entity. Automated banking, automated invoicing via Didox, real-time cash flow monitoring, and continuous compliance checks.

### Persona B: Accounting Firm (BPO / Multi-Client Practice)
- **Stakeholders**: Firm Managing Partner, Chief Accountant, Junior Accountants, External Auditor.
- **Use Case**: One workspace managing dozens or hundreds of distinct client `business_entities`. Staff are granted granular access to assigned companies only. Cross-company aggregation, bulk reconciliation, and unified workload distribution.

## 4. System Boundaries & Constraints

1. **AI Model Boundary**: Single-model architecture utilizing `gpt-6-luna` via the official OpenAI Go SDK and Responses API with strict tool/function calling. No multi-vendor LLM routing or uncontrolled code generation.
2. **Language & Runtime Boundary**: Pure Go (Golang) for all backend API, ingestion, accounting, and background worker pipelines. No Python in the core architecture. TypeScript / Next.js App Router for frontend presentation.
3. **Regulatory & Cryptographic Boundary**: E-IMZO digital signature keys and user passwords are never transmitted or stored on AUVRIO servers. Signing is performed strictly client-side.
4. **Financial Immutability**: Posted journal entries cannot be edited or deleted; corrections occur exclusively via reversed or adjusting entries.
