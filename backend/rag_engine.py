"""
RAG Engine — ChromaDB persistent local knowledge store.

Responsibilities:
  - Ingest the fixed knowledge base (Ai1 corpus + demo contradictions) into
    semantic chunks with structured metadata.
  - Retrieve the top-k chunks for a user query using cosine-distance search.
  - Provide helper utilities for the demo test cases.
"""

from __future__ import annotations

import io
import json
import os

os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"

import re
import time
from pathlib import Path
from typing import Optional

import chromadb
from chromadb.config import Settings
from dotenv import load_dotenv
from google import genai

# Automatically locate and load .env from project root or backend folder
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)
load_dotenv()  # Fallback to default search

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

CHROMA_PERSIST_DIR = str(Path(__file__).parent.parent / "local_knowledge_store")
COLLECTION_NAME = "epistemic_knowledge_base"
EMBED_MODEL = "gemini-embedding-2"
TOP_K = 5

# ---------------------------------------------------------------------------
# Knowledge base — fixed corpus (Ai1 + contradiction + gap documents)
# ---------------------------------------------------------------------------

KNOWLEDGE_BASE: list[dict] = [
    # ── Ai1: Core verified facts ────────────────────────────────────────────
    {
        "source_id": "Ai1",
        "chunk_index": 0,
        "verbatim_text": (
            "The Gemini 3.8 Flash model supports a context window of 1 million tokens "
            "and is optimised for agentic and multimodal tasks. It was released in 2026 "
            "and represents Google DeepMind's flagship fast-inference model."
        ),
    },
    {
        "source_id": "Ai1",
        "chunk_index": 1,
        "verbatim_text": (
            "ChromaDB is an open-source, AI-native vector database designed for "
            "embedding-based retrieval. It supports persistent local mode via a "
            "filesystem-backed store and uses cosine similarity as its default distance "
            "metric for nearest-neighbour search."
        ),
    },
    {
        "source_id": "Ai1",
        "chunk_index": 2,
        "verbatim_text": (
            "The RAG (Retrieval-Augmented Generation) paradigm grounds large language "
            "model answers in retrieved external documents rather than solely relying on "
            "parametric weights, thereby reducing hallucination and enabling source "
            "attribution for every claim."
        ),
    },
    {
        "source_id": "Ai1",
        "chunk_index": 3,
        "verbatim_text": (
            "Epistemic calibration refers to the degree to which an AI system's "
            "expressed confidence accurately reflects its true probability of being "
            "correct. A well-calibrated model does not overstate certainty when evidence "
            "is ambiguous or absent."
        ),
    },
    {
        "source_id": "Ai1",
        "chunk_index": 4,
        "verbatim_text": (
            "Apple Human Interface Guidelines (HIG) recommend using translucent "
            "materials (vibrancy + blur) to create visual hierarchy, spring-physics "
            "animations with stiffness ~300-350 and damping ~28-35 for natural motion, "
            "and a clear semantic colour system: green for success, amber/orange for "
            "warnings, red for errors."
        ),
    },
    {
        "source_id": "Ai1",
        "chunk_index": 5,
        "verbatim_text": (
            "FastAPI is a modern, high-performance Python web framework built on top of "
            "Starlette and Pydantic. It provides automatic OpenAPI documentation "
            "generation, async request handling, and native support for Server-Sent "
            "Events (SSE) and WebSocket streaming."
        ),
    },
    {
        "source_id": "Ai1",
        "chunk_index": 6,
        "verbatim_text": (
            "Dual-agent verification prevents self-referential confirmation bias by "
            "ensuring the agent that generates an answer is never the same agent that "
            "audits it. This architectural pattern is analogous to maker-checker "
            "workflows in financial systems and peer-review in academic publishing."
        ),
    },
    {
        "source_id": "Ai1",
        "chunk_index": 7,
        "verbatim_text": (
            "Next.js 14 introduced the App Router as the production-recommended routing "
            "paradigm, replacing the legacy Pages Router. The App Router supports React "
            "Server Components, nested layouts, streaming with Suspense, and "
            "parallel/intercepting routes."
        ),
    },
    # ── Ai2: Document that intentionally CONTRADICTS Ai1 on a specific datum ─
    {
        "source_id": "Ai2",
        "chunk_index": 0,
        "verbatim_text": (
            "The Gemini 3.8 Flash model was released in late 2025, not 2026, and its "
            "maximum context window is 500,000 tokens — half the figure cited in some "
            "earlier technical briefs that have since been corrected."
        ),
    },
    {
        "source_id": "Ai2",
        "chunk_index": 1,
        "verbatim_text": (
            "ChromaDB natively supports cosine similarity for nearest-neighbour vector search. "
            "Collections configured with cosine similarity compute distances between normalized embeddings, "
            "enabling accurate semantic retrieval across local knowledge stores."
        ),
    },
    # ── Ai3: General AI ethics supplement ───────────────────────────────────
    {
        "source_id": "Ai3",
        "chunk_index": 0,
        "verbatim_text": (
            "Responsible AI deployment requires transparency, fairness, and "
            "accountability. Transparency means users should be informed when they are "
            "interacting with an AI system. Fairness requires equal treatment across "
            "demographic groups. Accountability requires clear ownership of AI decisions."
        ),
    },
    {
        "source_id": "Ai3",
        "chunk_index": 1,
        "verbatim_text": (
            "Hallucination in large language models is defined as the generation of "
            "factually incorrect, fabricated, or contextually inconsistent content "
            "presented with unwarranted confidence. Mitigation techniques include "
            "retrieval augmentation, chain-of-thought prompting, and adversarial "
            "cross-checking."
        ),
    },
]

# ---------------------------------------------------------------------------
# ChromaDB client & collection helpers
# ---------------------------------------------------------------------------

_chroma_client: Optional[chromadb.PersistentClient] = None
_collection: Optional[chromadb.Collection] = None
_genai_client: Optional[genai.Client] = None


def _get_genai_client() -> genai.Client:
    global _genai_client
    if _genai_client is None:
        api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        if api_key and "your_api_key" not in api_key:
            _genai_client = genai.Client(api_key=api_key)
        else:
            _genai_client = genai.Client()
    return _genai_client


def _get_chroma_collection() -> chromadb.Collection:
    """Return the ChromaDB collection, initialising the client if needed."""
    global _chroma_client, _collection
    if _collection is not None:
        return _collection

    os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
    _chroma_client = chromadb.PersistentClient(
        path=CHROMA_PERSIST_DIR,
        settings=Settings(anonymized_telemetry=False),
    )
    _collection = _chroma_client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )
    return _collection


# ---------------------------------------------------------------------------
# Embedding helper
# ---------------------------------------------------------------------------

def _embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed texts using the Gemini embedding model, one at a time, or fallback to local ONNX."""
    try:
        api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        if not api_key or "your_api_key" in api_key:
            raise ValueError("No valid GEMINI_API_KEY provided")
        client = _get_genai_client()
        embeddings = []
        for text in texts:
            response = client.models.embed_content(
                model=EMBED_MODEL,
                contents=text,
            )
            # response.embeddings is a list; take the first (and only) entry
            if hasattr(response, "embeddings") and response.embeddings:
                embeddings.append(list(response.embeddings[0].values))
            elif hasattr(response, "embedding"):
                embeddings.append(list(response.embedding.values))
            else:
                raise ValueError(f"Unexpected embed_content response shape: {response}")
        print(f"[RAG] Gemini embeddings generated: {len(embeddings)} vectors, dim={len(embeddings[0])}")
        return embeddings
    except Exception as exc:
        print(f"[RAG] Using Chroma local ONNX embedding (Gemini embedding unavailable: {exc})")
        from chromadb.utils import embedding_functions
        ef = embedding_functions.DefaultEmbeddingFunction()
        embeddings = ef(texts)
        return [list(map(float, emb)) for emb in embeddings]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def ingest_knowledge_base(force_reingest: bool = False) -> int:
    """
    Ingest KNOWLEDGE_BASE into ChromaDB.

    Args:
        force_reingest: If True, delete existing documents and re-embed.

    Returns:
        Number of documents ingested.
    """
    collection = _get_chroma_collection()

    existing = collection.count()
    if existing > 0 and not force_reingest:
        print(f"[RAG] Collection already contains {existing} docs — skipping ingest.")
        return existing

    if force_reingest and existing > 0:
        ids_to_delete = collection.get()["ids"]
        if ids_to_delete:
            collection.delete(ids=ids_to_delete)
        print("[RAG] Cleared existing documents for re-ingest.")

    texts = [doc["verbatim_text"] for doc in KNOWLEDGE_BASE]
    embeddings = _embed_texts(texts)

    ids = [f"{doc['source_id']}_chunk_{doc['chunk_index']}" for doc in KNOWLEDGE_BASE]
    metadatas = [
        {
            "source_id": doc["source_id"],
            "chunk_index": doc["chunk_index"],
            "verbatim_text": doc["verbatim_text"],
        }
        for doc in KNOWLEDGE_BASE
    ]

    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=texts,
        metadatas=metadatas,
    )

    print(f"[RAG] Ingested {len(KNOWLEDGE_BASE)} documents into ChromaDB.")
    return len(KNOWLEDGE_BASE)


def retrieve_chunks(query: str, top_k: int = TOP_K) -> list[dict]:
    """
    Retrieve the top-k most relevant chunks for a query.

    Args:
        query:  Natural-language user query.
        top_k:  Maximum number of chunks to return.

    Returns:
        List of chunk dicts with keys: source_id, chunk_index, verbatim_text, distance.
    """
    collection = _get_chroma_collection()

    if collection.count() == 0:
        ingest_knowledge_base()

    query_embedding = _embed_texts([query])[0]

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count()),
        include=["metadatas", "distances"],
    )

    chunks: list[dict] = []
    for meta, dist in zip(results["metadatas"][0], results["distances"][0]):
        chunks.append(
            {
                "source_id": meta["source_id"],
                "chunk_index": meta["chunk_index"],
                "verbatim_text": meta["verbatim_text"],
                "distance": round(dist, 4),
            }
        )

    return chunks


def extract_text_from_file(filename: str, raw_content: bytes) -> str:
    """Extract plain text from .txt or .pdf files."""
    ext = Path(filename).suffix.lower()
    if ext == ".txt":
        return raw_content.decode("utf-8", errors="replace")
    elif ext == ".pdf":
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(raw_content))
            pages = []
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    pages.append(t)
            extracted = "\n\n".join(pages).strip()
            if extracted:
                return extracted
        except Exception as e:
            print(f"[RAG] pypdf extraction notice: {e}")
        # Fallback regex extraction if needed
        matches = re.findall(rb"\((.*?)\)\s*Tj", raw_content)
        if matches:
            return " ".join(m.decode("latin-1", errors="ignore") for m in matches)
        return raw_content.decode("latin-1", errors="replace")
    else:
        return raw_content.decode("utf-8", errors="replace")


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 60) -> list[str]:
    """Break text into manageable, overlapping semantic chunks."""
    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    chunks = []
    current_chunk = ""
    for p in paragraphs:
        if not current_chunk:
            current_chunk = p
        elif len(current_chunk) + len(p) + 1 <= chunk_size:
            current_chunk += " " + p
        else:
            chunks.append(current_chunk)
            overlap_prefix = current_chunk[-overlap:] if len(current_chunk) > overlap else ""
            current_chunk = (overlap_prefix + " " + p).strip()
    if current_chunk:
        chunks.append(current_chunk)

    if not chunks and text:
        step = max(chunk_size - overlap, 50)
        chunks = [text[i:i + chunk_size].strip() for i in range(0, len(text), step)]
    return [c for c in chunks if c]


def ingest_uploaded_document(filename: str, raw_content: bytes) -> dict:
    """
    Dynamically ingest an uploaded PDF/TXT document into ChromaDB.
    Chunks the document, computes embeddings, and appends to the collection immediately.
    """
    collection = _get_chroma_collection()

    text = extract_text_from_file(filename, raw_content)
    if not text.strip():
        raise ValueError(f"Could not extract readable text from '{filename}'.")

    chunks = chunk_text(text)
    if not chunks:
        raise ValueError(f"Document '{filename}' produced no readable chunks.")

    embeddings = _embed_texts(chunks)

    sanitized = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", filename)
    ts = int(time.time() * 1000)

    ids = [f"up_{sanitized}_{ts}_c{i}" for i in range(len(chunks))]
    metadatas = [
        {
            "source_id": filename,
            "chunk_index": i,
            "verbatim_text": chunk,
        }
        for i, chunk in enumerate(chunks)
    ]

    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadatas,
    )

    print(f"[RAG] Ingested uploaded document '{filename}': {len(chunks)} chunks. Total collection count: {collection.count()}.")
    return {
        "filename": filename,
        "chunks_ingested": len(chunks),
        "total_documents": collection.count(),
    }


def get_collection_stats() -> dict:
    """Return basic stats about the knowledge base collection."""
    collection = _get_chroma_collection()
    return {
        "collection_name": COLLECTION_NAME,
        "document_count": collection.count(),
        "persist_dir": CHROMA_PERSIST_DIR,
    }


# ---------------------------------------------------------------------------
# Quick smoke-test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=== RAG Engine smoke-test ===")
    n = ingest_knowledge_base()
    print(f"Ingested: {n}")
    print(json.dumps(get_collection_stats(), indent=2))

    query = "What is the context window size of Gemini 3.8 Flash?"
    chunks = retrieve_chunks(query)
    print(f"\nTop chunks for: '{query}'")
    for c in chunks:
        print(f"  [{c['source_id']}#{c['chunk_index']}] dist={c['distance']} | {c['verbatim_text'][:80]}...")
