# Execute BASE PRP

Implement a feature using the PRP file.

## PRP File: $ARGUMENTS

## Execution Process

1. **Load PRP**
   - Read the specified PRP file
   - Understand all context and requirements
   - Follow all instructions in the PRP and extend the research if needed
   - Ensure you have all needed context to implement the PRP fully
   - Perform additional web searches and codebase exploration as needed

2. **ULTRATHINK**
   - Think hard before you execute the plan. Create a comprehensive plan addressing all requirements.
   - Break down complex tasks into smaller, manageable steps using your todo tools.
   - Use the TodoWrite tool to create and track your implementation plan.
   - Identify implementation patterns from existing code to follow.

3. **Execute the plan**
   - Execute the PRP
   - Implement all the code

4. **Validate**
   - Run each validation command
   - Fix any failures
   - Re-run until all pass

5. **Complete**
   - Ensure all checklist items are done
   - Run final validation suite
   - Report completion status
   - Read the PRP again to ensure you have implemented everything

6. **Reference the PRP**
   - You can always reference the PRP again if needed

> **Note**: If validation fails, use error patterns in the PRP to fix and retry.

---

## Role‑Aware Execution Addendum

> **Why** – A PRP is rarely executed by a single agent. The cross‑functional **Squad Orchestrator** and six specialised roles (PO, SA, Backend, Front‑end, DevOps, QA) collaborate to satisfy Definition‑of‑Ready/Definition‑of‑Done gates and Lean‑Agile flow.

### RACI‑style matrix (✓ = primary responsibility)

| Step           | Orchestrator                                              | Product Owner                                         | App Architect                                            | Backend Eng                                         | Front‑end Eng                                   | DevOps Eng                                       | QA Eng                                               |
| -------------- | --------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------- |
| 1 Load PRP     | ✓ ensures context completeness fileciteturn0file0      | ✓ clarifies business value & AC fileciteturn0file6 | ✓ reviews NFR/architecture impacts fileciteturn0file1 |                                                     |                                                 |                                                  |                                                      |
| 2 ULTRATHINK   | ✓ facilitates planning & WIP limits fileciteturn0file0 | ✓ confirms scope vs. roadmap fileciteturn0file6    | ✓ drafts/upgrades ADRs fileciteturn0file1             | ✓ identifies service patterns fileciteturn0file2 | ✓ identifies UI patterns fileciteturn0file5  | ✓ plans pipeline hooks fileciteturn0file4     | ✓ designs test strategy fileciteturn0file3        |
| 3 Execute Plan | ✓ monitors flow & blockers fileciteturn0file0          |                                                       | ✓ guides design reviews fileciteturn0file1            | ✓ implement APIs fileciteturn0file2              | ✓ implement UI/UX fileciteturn0file5         | ✓ provision infra / CI‑CD fileciteturn0file4  | ✓ create & run automated tests fileciteturn0file3 |
| 4 Validate     | ✓ enforces DoD gates fileciteturn0file0                | ✓ signs off demo fileciteturn0file6                | ✓ confirms NFR budgets fileciteturn0file1             | ✓ fixes backend defects fileciteturn0file2       | ✓ fixes front‑end defects fileciteturn0file5 | ✓ monitors pipeline health fileciteturn0file4 | ✓ certifies release quality fileciteturn0file3    |
| 5 Complete     | ✓ compiles Squad‑Health report fileciteturn0file0      | ✓ releases feature flag                               | ✓ finalises ADR                                          | ✓ merges code                                       | ✓ merges code                                   | ✓ deploys to production fileciteturn0file4    | ✓ posts defect‑escape watch fileciteturn0file3    |

### Practical Usage

* **TodoWrite integration** – prefix each role’s todo with `[ROLE]` and reference the PRP task ID. The orchestrator consolidates into the Kanban board.
* **Ceremonies hooks** – The Orchestrator schedules architecture sync (step 2) and bug‑bash (step 4) to ensure cross‑discipline alignment.
* **Escalation policy** – Any role escalates risks per its Operating Constraints (see role docs above); the Orchestrator triages.

> **Tip** — Keep artefact naming consistent: `ADR-###`, `TEST-###`, `PIPE-###` so traceability tooling can auto‑link story ↔ code ↔ docs.
