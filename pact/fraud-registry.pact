;; ========================================================
;; KADENA FRAUD TRACER - ON-CHAIN REGISTRY
;; ========================================================
;; This module anchors off-chain heuristics and cross-chain
;; trace data onto the Kadena blockchain for public auditability.

(namespace "free")

(module fraud-registry GOVERNANCE

  ;; -------------------------------
  ;; 1. Governance & Capabilities
  ;; -------------------------------
  (defcap GOVERNANCE ()
    @doc "Only the admin keyset can upgrade this module."
    (enforce-keyset "free.admin-keyset"))

  (defcap ANCHOR_REPORT (case-id:string target-wallet:string)
    @doc "Capability for anchoring a new trace report."
    @event true)

  ;; -------------------------------
  ;; 2. Schema & Tables
  ;; -------------------------------
  (defschema trace-report
    @doc "Immutable schema for anchoring fraud investigations."
    case-id:string
    target-wallet:string
    chain-origin:string      ;; e.g., "Ethereum", "Kadena", "BSC"
    total-stolen:decimal     ;; Estimated value at risk
    risk-level:string        ;; "critical", "warning", "safe"
    timestamp:time
    attester-account:string  ;; The investigator/system logging the report
  )

  (deftable reports-table:{trace-report})

  ;; -------------------------------
  ;; 3. Core Functions (Write)
  ;; -------------------------------
  (defun anchor-case:string
    (
      case-id:string
      target-wallet:string
      chain-origin:string
      total-stolen:decimal
      risk-level:string
      attester-account:string
    )
    @doc "Anchors a new cross-chain fraud trace onto Kadena."
    
    ;; Require the attester to sign the transaction
    (enforce-keyset (read-keyset 'attester-keyset))
    
    (with-capability (ANCHOR_REPORT case-id target-wallet)
      (insert reports-table case-id
        { "case-id": case-id
        , "target-wallet": target-wallet
        , "chain-origin": chain-origin
        , "total-stolen": total-stolen
        , "risk-level": risk-level
        , "timestamp": (at 'block-time (chain-data))
        , "attester-account": attester-account
        }
      )
      (format "Case {} successfully anchored on Kadena." [case-id])
    )
  )

  ;; -------------------------------
  ;; 4. Public Audit Functions (Read)
  ;; -------------------------------
  (defun get-case-details:object{trace-report} (case-id:string)
    @doc "Public audit trail: Retrieve details of a specific fraud case."
    (read reports-table case-id)
  )

  (defun get-all-cases:[object{trace-report}] ()
    @doc "Returns a list of all anchored fraud cases for the public dashboard."
    (select reports-table (constantly true))
  )
)

;; -------------------------------
;; 5. Table Instantiation
;; -------------------------------
(if (read-msg "upgrade")
  ["upgrade complete"]
  [ (create-table reports-table) ]
)