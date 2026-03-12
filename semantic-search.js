/**
 * Semantic search powered by Transformers.js with WebGPU acceleration.
 * Computes embeddings in-browser and ranks entries by cosine similarity.
 */

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";
const DB_NAME = "semantic-search";
const DB_STORE = "embeddings";
const DB_VERSION = 1;

let pipeline = null;
let extractor = null;

/** Status callback — set by the app to update UI */
let _onStatus = () => {};
export function onStatus(fn) {
  _onStatus = fn;
}

/** Open (or create) the IndexedDB cache */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(db, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const req = tx.objectStore(DB_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    const req = tx.objectStore(DB_STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Build a searchable text blob from an entry */
function entryText(entry) {
  return [
    entry.source.title,
    entry.summary,
    entry.reason,
    entry.tags.join(", "),
  ].join(". ");
}

/** Detect best available device */
async function pickDevice() {
  if (navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) return "webgpu";
    } catch (_) {
      /* fall through */
    }
  }
  return "wasm";
}

/** Load the embedding pipeline (called once) */
export async function load() {
  if (extractor) return;

  _onStatus("loading");

  const device = await pickDevice();
  console.log(`[semantic-search] using device: ${device}`);

  const { pipeline: createPipeline } = await import(
    "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/dist/transformers.min.js"
  );
  pipeline = createPipeline;

  extractor = await pipeline("feature-extraction", MODEL_NAME, {
    device,
    dtype: "fp32",
  });

  _onStatus("ready");
}

/** Compute embedding for a single string */
async function embed(text) {
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

/** Cosine similarity between two vectors */
function cosine(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // vectors are already normalized
}

/**
 * Compute and cache embeddings for all entries.
 * Returns a Map<entryId, Float64Array>.
 */
export async function indexEntries(entries) {
  const db = await openDB();
  const embeddings = new Map();

  for (const entry of entries) {
    const cached = await idbGet(db, entry.id);
    if (cached) {
      embeddings.set(entry.id, cached);
      continue;
    }
    const vec = await embed(entryText(entry));
    await idbPut(db, entry.id, vec);
    embeddings.set(entry.id, vec);
  }

  return embeddings;
}

/**
 * Rank entries by semantic similarity to query.
 * Returns entry IDs sorted by descending similarity, with scores.
 */
export async function search(query, embeddings) {
  const qVec = await embed(query);
  const scored = [];

  for (const [id, vec] of embeddings) {
    scored.push({ id, score: cosine(qVec, vec) });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored;
}
