# ADR 0001: Modular Monolith Architecture in Go with Chi Router

## Context
AUVRIO requires a high-performance, robust, and maintainable backend capable of processing financial transactions, managing complex multi-tenant access control, and executing real-time data ingestion from systems like Didox and 1C. 

Microservices introduce excessive operational complexity, distributed transaction hurdles, and network serialization latency during initial development. Conversely, an unstructured monolith leads to tight coupling and spaghetti dependencies.

## Decision
We adopt a **Modular Monolith** architecture implemented in **Go (Golang)** using the lightweight **Chi** HTTP router:
1. **Single Codebase**: API services and background worker processes share the same repository and domain modules.
2. **Clear Boundaries**: Every business module (`tenancy`, `accounting`, `ingestion`, `integrations`, `ai`) exposes clean Go interfaces and possesses strict package boundaries.
3. **Chi Router**: Selected for its minimal footprint, 100% compatibility with standard library `net/http`, idiomatic middleware chaining, and zero memory allocations overhead.
4. **pgx and sqlc**: Database operations use `pgxpool` with type-safe SQL queries generated via `sqlc`, avoiding runtime ORM overhead.

## Consequences
- **Positive**: High throughput, low memory footprint, simple single-binary deployment, compile-time type safety, and painless local developer experience.
- **Negative**: Developers must maintain discipline against bypassing module interfaces. Circular dependencies are strictly prevented by Go's compiler.
