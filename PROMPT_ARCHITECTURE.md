# Prompt Architecture — AI Student Document Audit Assistant

This document describes the prompt design strategy used when building this application with an AI coding assistant. It is written as part of the capstone project submission to document how the prompts were structured, what decisions were made deliberately, and what problems came up along the way.

---

## Why document prompt architecture at all?

When you are building something with an AI assistant, the quality of what comes out depends almost entirely on how clearly you communicate what you want — and, just as importantly, what you do not want. Vague prompts produce vague results. Prompts that say "build me a document audit tool" without any constraints tend to produce over-engineered solutions: frameworks, databases, server components, or features that sound useful but are not actually needed.

The prompts for this project were structured in three layers. Each layer serves a different purpose. They also include a set of guardrails, a persona definition, and some inline examples that were used to steer the system away from common failure modes.

---

## The Three Prompt Layers

### Layer 1 — Role and Context

**What it does:** Establishes who the AI is acting as, what kind of project this is, and what the broader situation looks like before any specific task is given.

**Example from this project:**

> "Build a very lightweight MVP web application called 'AI Student Document Audit Assistant'. This is for university students in Indonesia who need to check whether their administrative documents are complete based on a provided requirement list."

**Why it matters:** Without this layer, an AI assistant will make default assumptions about the tech stack, the target user, the language, and the complexity level. In this project, stating "university students in Indonesia" immediately scoped the language to Indonesian, ruled out enterprise-style UIs, and made it clear that the user base would not necessarily be technical. Stating "very lightweight MVP" ruled out frameworks, build tools, and server-side logic before they could be suggested.

This layer also handles the tone of the application interface. Because the context specified real students trying to complete administrative tasks, the assistant was less likely to produce generic or overly formal copy for button labels and status messages.

---

### Layer 2 — Task and Requirements

**What it does:** Specifies what the system should actually build, including the feature list, the user interface structure, and the expected behaviour of the audit logic.

**Example from this project:**

> "Create a simple responsive Indonesian-language interface with: requirement input, available-document input, an Audit button, and result sections for Overall Status, Completed Documents, Missing Documents, Potential Issues, and Recommended Actions."

And later, when extending the logic:

> "Add support for ambiguous requirements. Example: Requirement: 'Transkrip Nilai — IPK minimal 3.00'. Available document: 'Transkrip Nilai'. The system must NOT assume the requirement is satisfied. Mark it as 'Belum dapat ditentukan' because the IPK value is not available."

**Why it matters:** This layer is where most of the ambiguity lives. Listing result sections explicitly (Completed, Missing, Potential Issues, Recommended Actions) prevents the assistant from collapsing everything into a single pass/fail output. Providing a concrete example of the ambiguous-requirement case was critical — without it, the most natural implementation would have treated "document present" as "requirement satisfied", which is wrong for conditioned requirements.

The example in the second quote above is a **few-shot example** embedded in the requirement. It shows one specific input, one expected output, and the reasoning: the system must not assume the condition is met because the value needed to verify it was not provided. This single example shaped the entire `classifyRequirement` function in [`app.js`](app.js).

---

### Layer 3 — Constraints and Output

**What it does:** Lists what the system must not do, what technologies are off-limits, and what properties the output must have.

**Examples from this project:**

> "Do not use React, Node.js, Python, Docker, databases, external libraries, or large models."

> "Do not invent requirements or claim official document verification."

> "Keep the project lightweight and easy to run directly in a browser."

And later:

> "Keep the existing design and functionality intact."
> "Do not add frameworks, servers, databases, or external dependencies."
> "Preserve the existing demo dataset and existing test cases."

**Why it matters:** Constraint layers are the most important thing to get right because AI systems are generally biased toward adding features, adding abstraction, and adding complexity. Without explicit constraints:

- A "document audit tool" prompt will probably suggest a backend with a database and authentication.
- A "make this more realistic" prompt will probably suggest calling an external API or a large language model.
- A "preserve existing test cases" instruction without being explicit about it will often result in demo data being silently reorganised.

Stating constraints positively ("easy to run directly in a browser") and negatively ("do not use Docker") both help. The negative constraints are especially useful because they close doors that the assistant would otherwise default to opening.

---

## Persona

The persona used across all prompts in this project was implicitly: **a careful, minimal engineer who prefers the simplest solution that works**. This was reinforced through the constraint layer (no frameworks, no build tools, no dependencies) and through explicit instructions in the task layer ("produce the minimal change that solves the problem").

One thing that helped was framing requirements as student-facing rather than system-facing. Saying "help university students check whether their documents are complete" keeps the persona focused on the actual person using the tool, which makes it easier to write output text that sounds natural rather than robotic.

---

## Guardrails

These are instructions that prevent specific failure modes. Several were used throughout the project:

**Against over-claiming:**
> "Do not claim that the application can verify the authenticity of documents."
> "Do not claim that it uses a real university database."
> "Do not invent requirements or claim official document verification."

These guardrails exist because document-checking tools have an obvious failure mode: the system might produce output that sounds authoritative. A student who sees "✅ Terpenuhi" next to every item might assume their submission is guaranteed to be accepted. The guardrails push the design toward informative rather than decisive language, and toward making the disclaimer prominent in the UI.

**Against hallucinated features:**
> "Do not invent technologies or features that are not actually present in the project."

This was used in the README prompt. Without it, an AI writing documentation for a project it helped build might add notes about features that were discussed but not implemented, or describe the logic in a way that sounds more sophisticated than it is.

**Against scope creep:**
> "Do not add unnecessary features or redesign the entire interface."
> "Keep the existing design and functionality intact."

These appear in every follow-up prompt after the initial build. Each incremental change prompt repeated the constraint that the existing code should not be touched beyond what was explicitly requested.

---

## Few-Shot Examples

A few-shot example is a concrete input-output pair embedded in the prompt that shows the AI what the expected behaviour looks like, without having to describe it in abstract terms.

The most important few-shot example in this project was for the ambiguous-requirement feature:

> **Requirement:** `Transkrip Nilai — IPK minimal 3.00`
> **Available document:** `Transkrip Nilai`
> **Expected output:** Mark as "Belum dapat ditentukan" — do not assume the requirement is satisfied.

This example defined the core design decision of the audit logic: the system should refuse to claim a conditioned requirement is satisfied unless it has a verifiable reason to do so. Without this example, the natural implementation would have been: document name matches → completed. The example makes clear that matching the name is not enough.

A second implicit few-shot example was used for the condition-resolution feature:

> **Requirement:** `Transkrip Nilai — IPK minimal 3.00`
> **Document catatan:** `IPK 3.45`
> **Expected output:** Terpenuhi (3.45 ≥ 3.00)

This established that the notes field could resolve ambiguity in one direction (satisfied or not_satisfied), and that the system should still default to "unknown" if no recognisable value is present.

---

## Chaining and Reasoning Flow

The project was built in stages, with each prompt building on the output of the previous one. This is sometimes called prompt chaining. The flow looked roughly like this:

```
1. Initial build prompt
   → Plain HTML/CSS/JS app with textarea-based input and basic audit logic

2. Ambiguous-requirement extension prompt
   → Added parseRequirement(), classifyRequirement(), renderAmbiguousList()
   → Added DEMO-007 and the beasiswa_kondisi preset

3. Structured document input prompt
   → Replaced textarea with per-document cards (nama, format, tanggal, catatan)
   → Added resolveConditionFromCatatan(), extractRequiredFormat()
   → Added format-mismatch detection and condition-failed classification

4. Documentation prompt (README)
   → Written after the code was stable, grounded in the actual implementation

5. This file + TEST_SCENARIOS.md
   → Written last, after reviewing all code and the README
```

Each stage included a review step — read the existing files before writing anything, confirm the current state, then describe only the delta. This is important because chained prompts can easily drift: if you describe what you want without confirming the current state first, the AI may implement something that conflicts with what is already there.

The instruction "do not modify index.html, style.css, app.js, or data/demo_cases.json" in the final documentation prompts is a concrete example of using constraints to enforce chain integrity — making sure the documentation stage cannot accidentally break the implementation stage.

---

## Privacy and Responsible AI Considerations

Several design decisions in this project were directly influenced by responsible-AI thinking, and the prompts reflected this.

**Epistemic honesty — refusing to over-claim**

The most important responsible-AI decision in this project is that the system refuses to call a requirement satisfied when it does not have enough information to know. This is not just a feature — it is a design principle. A system that says "yes, you're fine" when it cannot actually verify the condition is worse than no system at all, because it gives the student false confidence.

This principle was stated explicitly in the ambiguous-requirement prompt:
> "Do not invent missing information. Do not claim a requirement is satisfied when its condition cannot be verified."

**No personal data**

The document-info form asks for document names, file formats, dates, and notes. It does not ask for a student ID, full name, date of birth, email address, or any identifier that could be used to track or identify a person. This was specified in the prompt:
> "Do not require users to enter sensitive personal information."

Because everything runs client-side and nothing is ever sent to a server, there is no data collection even if a user does type personal information into a notes field.

**Disclaimer placement**

The disclaimer in the UI was specified as part of the initial prompt ("Do not invent requirements or claim official document verification") and is visible before any interaction — not buried in a footer or behind a link. A student should not be able to use the tool without seeing that the results are informational only.

**Audit trail transparency**

The Potensi Masalah and Rekomendasi Tindakan sections exist specifically to make the audit reasoning visible. Rather than just showing a final verdict, the system shows which documents triggered each outcome and why. This makes it easier for a student to understand and cross-check the result, rather than trusting a black box.
