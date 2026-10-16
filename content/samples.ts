import type { Day, Profile } from "@/lib/plan/types";

// Sample profiles are inputs only. Every lookup and plan they produce runs live against Qloo.
export type Sample = {
  id: string;
  who: string;
  short: string;
  loves: { query: string; kind?: string }[];
  location: string;
  budget: Profile["budget"];
  evenings: Day[];
  noAlcohol: boolean;
  socialEase: number;
};

export const SAMPLES: Sample[] = [
  {
    id: "austin",
    who: "a newcomer in East Austin who loves indie folk",
    short: "New in Austin, loves indie folk",
    loves: [
      { query: "Bon Iver", kind: "Artist" },
      { query: "Fleet Foxes", kind: "Artist" },
      { query: "Phoebe Bridgers", kind: "Artist" },
      { query: "Inside Llewyn Davis", kind: "Film" },
    ],
    location: "East Austin, Austin",
    budget: "u15",
    evenings: ["wednesday", "saturday"],
    noAlcohol: false,
    socialEase: 2,
  },
  {
    id: "chicago",
    who: "a remote worker in Logan Square who loves science fiction",
    short: "Works from home in Chicago, loves science fiction",
    loves: [
      { query: "Dune", kind: "Book" },
      { query: "The Expanse", kind: "TV series" },
      { query: "Arrival", kind: "Film" },
      { query: "Project Hail Mary", kind: "Book" },
    ],
    location: "Logan Square, Chicago",
    budget: "u15",
    evenings: ["tuesday", "thursday"],
    noAlcohol: true,
    socialEase: 2,
  },
  {
    id: "seattle",
    who: "a retiree in Ballard who loves jazz and crime novels",
    short: "Retired in Seattle, loves jazz and crime novels",
    loves: [
      { query: "Miles Davis", kind: "Artist" },
      { query: "John Coltrane", kind: "Artist" },
      { query: "The Thursday Murder Club", kind: "Book" },
      { query: "Agatha Christie", kind: "Person" },
    ],
    location: "Ballard, Seattle",
    budget: "free",
    evenings: ["monday", "wednesday", "friday"],
    noAlcohol: false,
    socialEase: 3,
  },
];
