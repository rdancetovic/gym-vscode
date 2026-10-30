# Complex AI Project: Gym Reservation API — Assessment Handoff

## Purpose

This is an **individual progress assessment** for DEV, SDET, QA, BA, PM, and Product Support.

The common project is an extension of the Gym Class Reservation application with a REST API. Each role does its own work for this project, using the project-control method from the lectures: requirements, a plan, bounded tasks, AI Review, and Human Review.

The assessment looks at **how you control AI-assisted work**, not at how much work the AI tool produces. It is not a test of your professional role skill.

---

## Common Rules

- The assessment is individual. You may ask colleagues for help. Help does not lower your score, but you must be able to explain and own your work.
- Choose your **working AI tool**: Claude Code or GitHub Copilot. Use **the other tool as the reviewing AI tool** for AI Review.
- You have **up to one week**.
- The assessment ends with an **individual live review**. It is not a pass or fail decision. You receive recommendations for further learning, and your Team Lead learns about your progress.
- Techniques from later lectures are not required and give no extra credit.

---

## Starting Point

Your Team Lead tells you your starting point.

---

## Required Common Work

1. Prepare the project at your starting point.
2. Place `BRD.md` and `BRD-Extension.md` in the project. Product Support also places `Support-Case.md`.
3. Use Git as your Team Lead instructs.
4. Create or update the guidance file (`CLAUDE.md` or `AGENTS.md`). If your starting point already has a guidance file or requirements, check them and update what is no longer true.
5. Create `REQUIREMENTS.md` from both BRDs. Check it before you rely on it.
6. Create `PLAN.md` and `TASKS.md` for your role's work.
7. Work through the tasks with the Tasking Loop.
8. Record your prompts in `PROMPTS.md`.
9. Keep the complete project for the live review.

---

## Project Files

| File | Purpose |
|---|---|
| guidance file (`CLAUDE.md` or `AGENTS.md`) | How we work here. It should tell your working AI tool to read the project-control files at the start of each session and to follow the Tasking Loop. |
| `REQUIREMENTS.md` | What the work must achieve, from both BRDs. `BRD-Extension.md` applies when it conflicts with `BRD.md`. |
| `PLAN.md` | The route through the work and its dependencies. DEV and SDET: also the parallel-session analysis. |
| `TASKS.md` | Bounded tasks with acceptance criteria and stopping points, the task state, and the review record of each task. |
| `PROMPTS.md` | The prompts you used. AI answers and comments are not required. |

You approve every change of `REQUIREMENTS.md`, `PLAN.md`, and `TASKS.md` before the AI tool edits them. This includes task-status changes.

---

## Working Through Tasks

The Tasking Loop takes your work from one task to the next:

> **Framing Prompt → AI Session Loop → AI Review → Human Review → next task**

### AI Review

AI Review is required for every task. You do it with the reviewing AI tool.

- Start AI Review after the work on the task has stopped, in a separate review session.
- In the review request, give the reviewing tool the evidence it needs:
  - the requirement;
  - the source documents the task uses (for example, the BRDs or `Support-Case.md`);
  - the task and its acceptance criteria;
  - the changed files and their changes;
  - the results of the checks you did;
  - any dependency or configuration changes.
- The reviewing tool gets the project context through this request. A second guidance file is not required.
- The reviewing tool reports findings with their evidence, states when the evidence is not enough, and does not change files.

### Human Review

You decide whether the task is accepted.

- Perform finding classification (Confirm, Reject, Narrow, Escalate) on each AI Review finding, after you check its evidence.
- Inspect the real work yourself: the requirement and acceptance criteria, the changed files, what the checks really prove, and any already accepted work that the changes can affect.
- Decide the outcome: **accept, redesign, or escalate**.

Only accepted work becomes the basis for the next task.

After **redesign**, the work returns to the same task, and the task passes AI Review and Human Review again. After **escalate**, tasks that depend on it wait until the issue is resolved.

### Review Record

For every task, record in `TASKS.md`, in any format:

- the AI Review findings;
- the finding classification (Confirm, Reject, Narrow, Escalate) of each finding;
- the Human Review outcome.

The prompts and templates document of the lecture "AI Review and Human Review" may help you. Its templates are not required.

### Other Points

- A new AI session that re-grounds from the project files is allowed but not required.
- The number and size of tasks follow the real work. More tasks or longer documents give no extra credit.

---

## Checking and Refinement

- The AI tool's statement that a task is done is a claim, not acceptance.
- Check after every AI change, not only at the end of a task.
- Check the real result in a way that fits your role.
- When a check finds a gap, refine that task from the evidence.
- Do not create problems on purpose to show more iterations.
- A passing test proves only what that test checks.

---

## Role Assignments

Non-DEV roles do not need a running API.

### DEV

Build the extension described in both BRDs: the API with its four operations, file storage, and a front-end that uses the API. If your starting point is a new, empty project, build the whole application.

Write the **parallel-session analysis** in `PLAN.md`. Running parallel sessions is optional.

### SDET

Write:

- a short **test analysis**: the areas you considered for automation, the subset you selected, and why;
- an **automated-test design specification** for the subset: test cases, test data, expected results from `REQUIREMENTS.md`, and technical assumptions.

The subset includes at least one API operation with its negative and boundary cases, and the storage behavior after a restart. The test framework and the document format are your choice.

The assignment is test design only.

Write the **parallel-session analysis** in `PLAN.md`. Running parallel sessions is optional.

### QA

Write a **manual test design** for the extension:

- the API operations, with negative, boundary, and error cases;
- the changed user-interface behavior: data comes from the API, availability does not reset after a page refresh, data remains after a restart, and a cancellation returns places to the session;
- a few regression tests for the original reservation flow.

The assignment is test design only.

### BA

Write a **requirements clarification and improvement proposal** for the extension: selected issues, a proposed clarification or change for each, and why it improves the requirements.

Changes that `BRD-Extension.md` makes on purpose are not issues.

### PM

Write a **compact delivery plan** for the extension, for a small team (DEV, SDET, QA, BA): phases, tasks, dependencies, review checkpoints, risks, and open questions. Do not include effort estimates.

Keep the delivery plan separate from your own `PLAN.md` and `TASKS.md`.

### Product Support

Investigate the case in `Support-Case.md` and write a **response, a clarification request, or an escalation**, as you would enter it into the support platform.

---

## Evidence to Keep

- the complete project folder: the BRDs, the guidance file, `REQUIREMENTS.md`, `PLAN.md`, `TASKS.md`, `PROMPTS.md`, and your role deliverables;
- the Git history, as your Team Lead requires;
- Product Support: also `Support-Case.md` and your final outcome.

Not required: screenshots, chat exports, or activity logs.

---

## Live Review

Be ready to:

- explain **any task** from `TASKS.md` that the reviewer chooses: from the requirement through the Framing Prompt, AI work, AI Review, finding classification (Confirm, Reject, Narrow, Escalate), and Human Review to acceptance;
- show your plan (DEV and SDET: explain the parallel-session analysis);
- explain your guidance file and `REQUIREMENTS.md`;
- show your role deliverables and name known limitations;
- DEV: run the application and show the main flow, a cancellation, and the data after a restart.

> **Ask AI only for code you can build yourself or test yourself.**
>
> **Ask AI only for work you can understand, verify, explain, and own.**

---

## Submission

The submission location, the deadline, and the review schedule are provided separately.
