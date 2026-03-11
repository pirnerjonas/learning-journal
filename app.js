function journal() {
  return {
    entries: [],
    search: "",
    selectedTags: [],

    async init() {
      try {
        const res = await fetch("data/entries.json");
        const data = await res.json();
        this.entries = data.entries || [];
      } catch (e) {
        console.error("Failed to load entries:", e);
        this.entries = [];
      }
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
