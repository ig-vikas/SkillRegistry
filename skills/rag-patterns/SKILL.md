---
name: rag-patterns
version: 1.0.0
description: Retrieval-augmented generation architecture with ingestion, chunking, embeddings, hybrid retrieval, reranking, citations, freshness, evaluation, and hallucination controls.
author: skillregistry
license: MIT
agents:
  - cursor
categories:
  - ai-ml
  - database
tags:
  - rag
  - retrieval
  - embeddings
---

# RAG Patterns

Build RAG systems that retrieve relevant evidence, cite sources, and fail gracefully when evidence is missing. Do not treat vector search alone as a complete RAG system.

## Workflow

1. Define answerable question types and source corpus.
2. Ingest documents with stable IDs, metadata, timestamps, and permissions.
3. Chunk by document structure where possible; preserve provenance.
4. Generate embeddings with model/dimension metadata.
5. Retrieve with vector, keyword, or hybrid search depending on corpus.
6. Rerank top candidates before generation for high-stakes answers.
7. Generate with citations and explicit “not found” behavior.
8. Evaluate retrieval recall and answer faithfulness separately.

## Retrieval Pipeline

```text
query -> rewrite/classify -> retrieve top 50 -> filter ACL/freshness
      -> rerank top 10 -> build context with citations -> generate
      -> validate citations / abstain if insufficient evidence
```

## Rules

- Store source URI, title, chunk ID, offsets/page, created/updated time, and access scope.
- Do not mix embedding models/dimensions in one vector index.
- Use hybrid retrieval when exact names, IDs, or keywords matter.
- Rerank before sending context to the LLM when precision matters.
- Keep context chunks short enough for targeted citation.
- Apply authorization filters before generation.
- Evaluate with known-answer questions and adversarial no-answer questions.

## Verification

Measure:

- Retrieval recall@k
- Reranker precision
- Citation correctness
- Answer faithfulness
- No-answer abstention rate
- Latency and token cost

## Resources

- **[OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)** - Embedding generation guidance.
- **[LanceDB Vector Search](https://docs.lancedb.com/search/vector-search)** - Local vector retrieval.
- **[Searching for Best Practices in RAG](https://arxiv.org/abs/2407.01219)** - Empirical RAG pipeline study.
- **[BEIR Benchmark](https://github.com/beir-cellar/beir)** - Retrieval evaluation framework.

## Principles

1. Retrieval and generation are separate systems.
2. Provenance is required for trust.
3. ACL filtering happens before generation.
4. RAG must know when not to answer.
5. Evaluate retrieval, not just final text.
