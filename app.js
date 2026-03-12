import {
  load as loadModel,
  onStatus,
  indexEntries,
  search as semanticSearch,
} from "./semantic-search.js";

function journal() {
  return {
    entries: [],
    search: "",
    selectedTags: [],

    // Semantic search state
    semanticMode: false,
    modelStatus: "idle", // idle | loading | ready | error
    embeddings: null, // Map<id, vec>
    semanticResults: null, // [{id, score}] or null

    async init() {
      try {
        const res = await fetch("data/entries.json");
        const data = await res.json();
        this.entries = data.entries || [];
      } catch (e) {
        console.error("Failed to load entries:", e);
        this.entries = [];
      }

      onStatus((status) => {
        this.modelStatus = status;
      });
    },

    async enableSemantic() {
      this.semanticMode = true;
      if (this.modelStatus === "ready") return;

      try {
        await loadModel();
        this.embeddings = await indexEntries(this.entries);
      } catch (e) {
        console.error("Semantic search failed to load:", e);
        this.modelStatus = "error";
        this.semanticMode = false;
      }
    },

    disableSemantic() {
      this.semanticMode = false;
      this.semanticResults = null;
    },

    toggleSemantic() {
      if (this.semanticMode) {
        this.disableSemantic();
      } else {
        this.enableSemantic();
      }
    },

    async doSemanticSearch() {
      if (
        !this.semanticMode ||
        this.modelStatus !== "ready" ||
        !this.embeddings ||
        !this.search.trim()
      ) {
        this.semanticResults = null;
        return;
      }
      this.semanticResults = await semanticSearch(this.search, this.embeddings);
    },

    get allTags() {
      const counts = {};
      for (const entry of this.entries) {
        for (const tag of entry.tags) {
          counts[tag] = (counts[tag] || 0) + 1;
        }
      }
      return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    },

    get filtered() {
      let result = this.entries;

      if (this.selectedTags.length > 0) {
        result = result.filter((entry) =>
          this.selectedTags.every((tag) => entry.tags.includes(tag))
        );
      }

      // Semantic ranking mode
      if (
        this.semanticMode &&
        this.semanticResults &&
        this.search.trim()
      ) {
        const idOrder = new Map(
          this.semanticResults.map((r, i) => [r.id, i])
        );
        const scoreMap = new Map(
          this.semanticResults.map((r) => [r.id, r.score])
        );
        result = result
          .filter((e) => scoreMap.has(e.id) && scoreMap.get(e.id) > 0.15)
          .sort((a, b) => (idOrder.get(a.id) ?? 999) - (idOrder.get(b.id) ?? 999));
        return result;
      }

      // Text search fallback
      if (this.search.trim()) {
        const q = this.search.toLowerCase();
        result = result.filter((entry) => {
          const haystack = [
            entry.source.title,
            entry.summary,
            entry.reason,
            ...entry.tags,
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(q);
        });
      }

      return result;
    },

    /** Get semantic score for an entry (for display) */
    scoreFor(entryId) {
      if (!this.semanticResults) return null;
      const r = this.semanticResults.find((r) => r.id === entryId);
      return r ? r.score : null;
    },

    toggleTag(tag) {
      const idx = this.selectedTags.indexOf(tag);
      if (idx === -1) {
        this.selectedTags.push(tag);
      } else {
        this.selectedTags.splice(idx, 1);
      }
    },
  };
}

// Expose globally for Alpine
window.journal = journal;
