// The three sample profiles used by the probes (and later by the one click demo).
export const PROFILES = [
  {
    id: "austin",
    who: "Newcomer in Austin who loves indie folk",
    location: "East Austin, Austin",
    city: "Austin",
    loves: [
      { query: "Bon Iver", type: "urn:entity:artist" },
      { query: "Fleet Foxes", type: "urn:entity:artist" },
      { query: "Phoebe Bridgers", type: "urn:entity:artist" },
      { query: "Inside Llewyn Davis", type: "urn:entity:movie" },
    ],
  },
  {
    id: "chicago",
    who: "Remote worker in Chicago who loves science fiction",
    location: "Logan Square, Chicago",
    city: "Chicago",
    loves: [
      { query: "Dune", type: "urn:entity:book" },
      { query: "The Expanse", type: "urn:entity:tv_show" },
      { query: "Arrival", type: "urn:entity:movie" },
      { query: "Project Hail Mary", type: "urn:entity:book" },
    ],
  },
  {
    id: "seattle",
    who: "Retiree in Seattle who loves jazz and crime novels",
    location: "Ballard, Seattle",
    city: "Seattle",
    loves: [
      { query: "Miles Davis", type: "urn:entity:artist" },
      { query: "John Coltrane", type: "urn:entity:artist" },
      { query: "The Thursday Murder Club", type: "urn:entity:book" },
      { query: "Agatha Christie", type: "urn:entity:person" },
    ],
  },
];

// Candidate place categories to look up in /v2/tags.
export const CATEGORY_QUERIES = [
  "record store", "book store", "music venue", "jazz club", "climbing gym", "board game cafe",
  "game store", "park", "community garden", "botanical garden", "library", "community center",
  "cafe", "coffee shop", "art studio", "museum", "comic book store", "yoga studio", "planetarium",
  "pottery", "dance studio", "performing arts", "bar",
];
