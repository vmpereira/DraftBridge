# Application Development Lifecycle: Skill Guide & Workflow Map

This guide outlines how and when to leverage each of the 18 installed skills across the entire lifecycle of developing an application—from initial product discovery to architecture, UI/UX design, implementation, code review, debugging, and documentation.

---

## Skill Directory & Status Overview

All requested skills were audited for security concerns (prompt injection, malicious scripts, secret exfiltration, supply chain vulnerabilities) and installed into `.agents/skills/`.

| Requested Skill | Canonical / Installed Name | Origin Repository | Security Audit | Role in SDLC |
| :--- | :--- | :--- | :--- | :--- |
| **`frontend-design`** | `frontend-design` | `anthropics/skills` | Safe | Visual identity, typography, CSS tokens, UI aesthetics |
| **`tdd`** | `tdd` | `mattpocock/skills` | Safe | Test-driven development (red $\rightarrow$ green at public seams) |
| **`improve-codebase-architecture`** | `improve-codebase-architecture` | `mattpocock/skills` | Safe | Deepening modules, hotspot scanning, visual HTML reports |
| **`documentation-writer`** | `documentation-writer` | `github/awesome-copilot` | Safe | Diátaxis documentation framework (Tutorial, How-to, Ref, Expl) |
| **`to-spec`** | `to-spec` | `mattpocock/skills` | Safe | Conversational synthesis to actionable spec |
| **`grill-me`** | `grill-me` (alias $\rightarrow$ `grilling`) | `mattpocock/skills` | Safe | Relentless interview to stress-test ideas |
| **`grill-with-docs`** | `grill-with-docs` | `mattpocock/skills` | Safe | Interview that updates domain glossary (`CONTEXT.md`) & ADRs |
| **`prototype`** | `prototype` | `mattpocock/skills` | Safe | Throwaway UI or logic state model exploration |
| **`codebase-design`** | `codebase-design` | `mattpocock/skills` | Safe | Deep modules, seam placement, adapter discipline |
| **`diagnosing-bugs`** | `diagnosing-bugs` | `mattpocock/skills` | Safe | 6-phase disciplined bug reproduction and fix loop |
| **`research`** | `research` | `mattpocock/skills` | Safe | Primary source technical investigation in background agent |
| **`loop-me`** | `loop-me` | `mattpocock/skills` | Safe | Specifying recurring human and AI automated workflows |
| **`grilling`** | `grilling` | `mattpocock/skills` | Safe | Frontier-based design tree interview |
| **`diagnose`** | `diagnose` (alias $\rightarrow$ `diagnosing-bugs`) | `mattpocock/skills` | Safe | Shorthand trigger for root-cause debugging |
| **`caveman`** | `caveman` | `mattpocock/skills` | Safe | Ultra-concise communication mode (~75% token reduction) |
| **`design-an-interface`** | `design-an-interface` (in `codebase-design`) | `mattpocock/skills` | Safe | "Design It Twice" multi-agent interface comparison |
| **`review`** | `review` (alias $\rightarrow$ `code-review`) | `mattpocock/skills` | Safe | Two-axis review: Standards compliance & Spec fidelity |
| **`decision-mapping`** | `decision-mapping` (alias $\rightarrow$ `wayfinder`) | `mattpocock/skills` | Safe | Mapping massive initiatives as decision tickets |
| *`domain-modeling`* | `domain-modeling` (companion) | `mattpocock/skills` | Safe | Companion to `grill-with-docs` & `wayfinder` |

---

## The End-to-End Development Lifecycle

```mermaid
flowchart TD
    subgraph Phase1["1. Discovery & Strategy"]
        A1["Unclear/Loose Idea"] --> B1["wayfinder (decision-mapping)"]
        A1 --> B2["grill-me / grilling"]
        B2 --> B3["research (Primary Sources)"]
        B2 --> B4["grill-with-docs & domain-modeling"]
        B2 --> B5["loop-me (Workflows)"]
    end

    subgraph Phase2["2. Architecture & Design"]
        C1["to-spec (Draft Specification)"]
        C2["codebase-design (Deep Modules & Seams)"]
        C3["design-an-interface (Design It Twice)"]
        C4["prototype (Throwaway Logic / UI)"]
        C5["frontend-design (Aesthetic System)"]
        Phase1 --> C1 --> C2 --> C3 --> C4 --> C5
    end

    subgraph Phase3["3. Implementation"]
        D1["tdd (Red-Green Loop at Seams)"]
        D2["caveman (Token-Efficient Iteration)"]
        Phase2 --> D1
        D2 -. Optional Speedup .-> D1
    end

    subgraph Phase4["4. Review & Architecture Refinement"]
        E1["code-review / review (Standards vs Spec)"]
        E2["improve-codebase-architecture (Deepening & HTML Scan)"]
        Phase3 --> E1 --> E2
    end

    subgraph Phase5["5. Hard Bugs & Maintenance"]
        F1["diagnosing-bugs / diagnose (Feedback Loop First)"]
    end

    subgraph Phase6["6. Documentation"]
        G1["documentation-writer (Diátaxis Framework)"]
        Phase4 --> G1
    end

    E1 -. Bug Detected .-> F1
    F1 -. Regression Test .-> D1
```

---

## Phase-by-Phase Execution Guide

### Phase 1: Discovery, Scoping & Requirements

When starting a project or a large feature, ambiguity is at its highest. Do not write production code yet.

1. **`wayfinder` (or `decision-mapping`)**
   - **When to reach for it**: A large, multifaceted epic or product concept arrives that cannot fit into a single agent conversation turn.
   - **What it does**: Charts the destination, creates a map with child decision tickets, and surfaces the "fog of war." It resolves one decision at a time, moving the frontier forward.
   - **Trigger**: `/wayfinder`, "plan this chunk of work", "map the decisions".

2. **`grill-me` / `grilling`**
   - **When to reach for it**: You have a plan, design, or hypothesis, but want to stress-test it against edge cases, trade-offs, and implicit assumptions.
   - **What it does**: Conducts a relentless, round-by-round interview with a structured design tree. Generates ranked choices and recommendations.
   - **Trigger**: `/grill-me`, "grill me on this design", "stress-test my idea".

3. **`grill-with-docs` & `domain-modeling`**
   - **When to reach for it**: Building features in a complex domain where terminology must be consistent across code, database schemas, and documentation.
   - **What it does**: Runs the grilling interview while simultaneously generating/updating ADRs (Architecture Decision Records) and your `CONTEXT.md` domain glossary.
   - **Trigger**: "grill with docs", "align domain terms", "record decisions as we talk".

4. **`research`**
   - **When to reach for it**: The plan depends on external constraints (API rate limits, SDK capabilities, cloud service nuances).
   - **What it does**: Spawns a background agent to inspect primary sources (official docs, repos, specs) and writes a sourced Markdown summary while you continue planning.
   - **Trigger**: `/research`, "research the Stripe v3 idempotency API", "investigate primary docs".

5. **`loop-me`**
   - **When to reach for it**: Designing autonomous agent workflows, cron jobs, or human-in-the-loop task routines.
   - **What it does**: Focuses grilling specifically on workflow triggers, push-right human checkpoints, and decision briefs.
   - **Trigger**: `/loop-me`, "design an automated workflow for X".

---

### Phase 2: Specification, Architecture & UI Identity

Once the core problem is clear, formalize the blueprint.

1. **`to-spec`**
   - **When to reach for it**: You have talked through a feature with the agent and are ready to lock down requirements into an engineering ticket or PRD.
   - **What it does**: Pure synthesis—no interview. Generates a comprehensive spec covering Problem Statement, Solution, User Stories, Implementation Decisions, Testing Seams, and Out of Scope items.
   - **Trigger**: `/to-spec`, "convert this conversation to a spec", "generate PRD".

2. **`codebase-design`**
   - **When to reach for it**: Defining module boundaries and public contracts.
   - **What it does**: Enforces "Deep Module" philosophy (small, simple interface hiding deep, complex behavior). Defines seams, adapters, leverage, and locality.
   - **Trigger**: `/codebase-design`, "design this module's interface", "where should the seam go?".

3. **`design-an-interface` (Ousterhout "Design It Twice")**
   - **When to reach for it**: Creating a critical API or core domain module where the first idea is rarely optimal.
   - **What it does**: Spawns 3+ parallel sub-agents with divergent constraints (e.g., minimalist entry point vs. maximum extension vs. common-caller optimization) to produce contrasting interface designs.
   - **Trigger**: `/design-an-interface`, "design it twice", "explore alternative module shapes".

4. **`prototype`**
   - **When to reach for it**: When paper design isn't enough to answer "does this state model feel right?" or "what should this UI look like?".
   - **What it does**: Produces throwaway code (single HTML logic simulators or transient UI variants switchable via URL params) to answer the question quickly without production baggage.
   - **Trigger**: `/prototype`, "build a quick spike", "prototype this state machine".

5. **`frontend-design`**
   - **When to reach for it**: Building the client interface, components, layouts, or landing pages.
   - **What it does**: Guides the agent away from generic AI tropes (cliché purple gradients, generic Inter font, uniform card grids) and toward distinctive typography scales, intentional color palettes, CSS token systems, and authentic editorial layout.
   - **Trigger**: "design the frontend", "style this interface", "make the visual identity distinctive".

---

### Phase 3: Construction & Implementation

1. **`tdd`**
   - **When to reach for it**: Writing code to satisfy the spec or implementing non-trivial business logic.
   - **What it does**: Disciplined red $\rightarrow$ green cycle testing strictly at public seams. Prevents tautological tests, over-mocking internal collaborators, and horizontal slicing.
   - **Trigger**: `/tdd`, "implement with TDD", "red-green-refactor", "write test first".

2. **`caveman` (Optional Communication Booster)**
   - **When to reach for it**: During intense, rapid back-and-forth debugging or implementation rounds where conversational filler wastes context tokens and slows down execution.
   - **What it does**: Drops articles, pleasantries, and hedging, compressing responses by ~75% while maintaining 100% technical and code accuracy. Automatically reverts for critical safety warnings.
   - **Trigger**: `/caveman`, "caveman mode", "be brief / save tokens". (Revert anytime with "normal mode").

---

### Phase 4: Verification, Code Review & Refactoring

1. **`code-review` (or `review`)**
   - **When to reach for it**: Feature branch or pull request is ready, before merging into main.
   - **What it does**: Spawns two isolated parallel sub-agents:
     - **Standards Axis**: Checks diff against repo standards and Martin Fowler code smells (Primitive Obsession, Feature Envy, Shotgun Surgery, etc.).
     - **Spec Axis**: Checks diff against the originating spec/issue for omissions, defects, or unrequested scope creep.
   - **Trigger**: `/code-review`, "review since main", "review this PR against the spec".

2. **`improve-codebase-architecture`**
   - **When to reach for it**: Periodically (e.g., sprint end, after major feature landing) or when noticing architectural friction or navigation difficulty.
   - **What it does**: Analyzes commit history hotspots, identifies shallow modules leaking complexity, generates an interactive HTML report in `%TEMP%` with Tailwind/Mermaid before/after architecture diagrams, and grills through deepening the selected candidate.
   - **Trigger**: `/improve-codebase-architecture`, "audit codebase architecture", "find deepening opportunities".

---

### Phase 5: Debugging & Production Incidents

1. **`diagnosing-bugs` (or `diagnose`)**
   - **When to reach for it**: A stubborn bug, flake, race condition, or performance regression appears.
   - **What it does**: Follows an uncompromising 6-phase scientific loop:
     1. *Phase 1*: Build a tight, deterministic, agent-runnable feedback loop that goes red on this specific bug (tests, curl, CLI fixture, headless script).
     2. *Phase 2*: Reproduce and minimize to the smallest load-bearing scenario.
     3. *Phase 3*: Generate 3–5 ranked, falsifiable hypotheses.
     4. *Phase 4*: Targeted instrumentation (tagging logs e.g. `[DEBUG-xxxx]`, strictly redacting all credentials as `<REDACTED>`).
     5. *Phase 5*: Write a permanent regression test at the proper seam and apply the fix.
     6. *Phase 6*: Complete cleanup of all debug logs.
   - **Trigger**: `/diagnose`, "diagnose this bug", "debug this failure", "reproduce this regression".

---

### Phase 6: Documentation & Handover

1. **`documentation-writer`**
   - **When to reach for it**: Preparing documentation for users, contributors, or internal developers.
   - **What it does**: Applies the proven **Diátaxis framework** to write structured, purpose-built docs across 4 quadrants:
     - **Tutorials**: Practical learning lessons for newcomers.
     - **How-to Guides**: Recipes solving specific operational problems.
     - **Reference**: Information-oriented technical specs and API descriptions.
     - **Explanation**: Conceptual discussions clarifying architecture and design decisions.
   - **Trigger**: "write documentation for X", "create a Diataxis tutorial", "write API reference".

---

## Quick Reference Matrix: "What Should I Run Right Now?"

| If your immediate situation is... | Use this Skill |
| :--- | :--- |
| "I have a big, fuzzy idea and don't know where to start" | `wayfinder` |
| "I have a plan, but I want you to poke holes in it" | `grill-me` |
| "We need to agree on terms and document architecture decisions as we talk" | `grill-with-docs` |
| "I need to know how an external API or framework actually works" | `research` |
| "I want to automate a recurring workflow or process" | `loop-me` |
| "Turn our discussion into an engineering-ready ticket/spec" | `to-spec` |
| "How should this module be partitioned so it's easy to test and maintain?" | `codebase-design` |
| "Show me 3 radically different ways to design this interface" | `design-an-interface` |
| "Let's test if this UI layout or state machine feels right before coding" | `prototype` |
| "Make this app look professional and distinct, not like an AI template" | `frontend-design` |
| "Build this feature or fix this bug using tests first" | `tdd` |
| "Save tokens and cut conversational fluff during coding" | `caveman` |
| "Check my branch/PR against coding standards and the spec" | `code-review` |
| "Our codebase feels tangled and hard to navigate—how do we deepen it?" | `improve-codebase-architecture` |
| "Something is broken/throwing an error/running slow" | `diagnosing-bugs` |
| "Write user guides, tutorials, or API references" | `documentation-writer` |
