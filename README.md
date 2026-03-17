# Kadena Trace: Hybrid Fraud & Forensics System

A hybrid fraud and scam tracing MVP built for the Kadena ecosystem. This system combines off-chain graph heuristics to visualize stolen asset flows with on-chain Kadena Pact smart contracts to immutably anchor investigation data.

## 🏗 Architecture Diagram (Hybrid by Design)

This project adheres to a strict separation of computational logic (Off-Chain) and integrity guarantees (On-Chain).

```text
[ User Interface (Next.js/React Flow) ]
        │                       ▲
 (1. Input Wallet)        (4. Render Graph)
        ▼                       │
[ Off-Chain Engine (Node.js API) ] ◄─────► [ Blockchain Indexer / Heuristics ]
        │                                    - Fan-out detection
 (2. Generate Report)                        - Bridge/Mixer identification
        ▼                                    - Volumetric risk scoring
[ Kadena Blockchain ]
        │
[ fraud-registry.pact ]
  - Immutable Case IDs
  - Timestamped anchoring
  - Wallet Risk Attestations