---
name: prompt-engineer
version: 1.0.0
description: Prompt engineering for reliable LLM outputs, including task framing, context selection, structured outputs, tool-use prompts, eval-driven iteration, prompt caching, and safe rationale handling.
author: skillregistry
license: MIT
agents:
  - cursor
  - claude-code
  - gemini-cli
categories:
  - ai-ml
tags:
  - prompting
  - llm
  - evals
---

# Prompt Engineer

Design prompts as testable interfaces. Be explicit about task, constraints, inputs, output schema, and failure behavior. Do not request hidden chain-of-thought; ask for concise rationale or decision summaries when useful.

## Workflow

1. Define the task and success criteria.
2. Separate stable instructions from variable user/data context.
3. Provide only relevant context and label it clearly.
4. Specify output format with JSON Schema/Zod when machine parsing matters.
5. Include few-shot examples only when they reduce ambiguity.
6. Run prompts against representative eval cases and revise based on failures.

## Prompt Template

```text
Role: You are a backend code reviewer.

Task: Identify correctness, security, and test coverage issues.

Rules:
- Lead with findings.
- Cite file and line.
- Do not speculate beyond evidence.

Input:
<diff>
{{diff}}
</diff>

Output:
JSON array of {severity, file, line, issue, recommendation}.
```

## Rules

- Put static instructions and schemas before variable context to improve prompt caching.
- Prefer structured outputs for downstream automation.
- Ask for assumptions and concise reasoning summaries, not private chain-of-thought.
- Keep tool instructions separate from user content.
- Use delimiters for untrusted retrieved/context text.
- Validate model output before acting on it.
- Maintain small eval sets for every production prompt.

## Verification

```bash
pnpm test
pnpm evals
```

Track pass/fail cases, latency, token usage, refusal/format failures, and regression examples.

## Resources

- **[OpenAI Prompting Guide](https://platform.openai.com/docs/guides/prompting)** - Official prompting guidance.
- **[OpenAI Prompt Caching](https://platform.openai.com/docs/guides/prompt-caching)** - Prompt structure for latency/cost.
- **[OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)** - Schema-constrained outputs.
- **[OpenAI Evals](https://platform.openai.com/docs/guides/evals)** - Evaluation-driven iteration.

## Principles

1. Prompts are contracts.
2. Context should be relevant and labeled.
3. Structured output needs validation.
4. Evals are stronger than vibes.
5. Do not expose or require hidden reasoning.
