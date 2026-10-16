// Tier category sets and tag groups (research.md sections 6 to 8, from probes 02, 04, 05).

const C = (s: string) => `urn:tag:category:place:${s}`;

export type TierKey = "show_up" | "come_back" | "join_in";

export const TIER_CATEGORIES: Record<TierKey, string[]> = {
  show_up: [
    C("record_store"),
    C("book_store"),
    C("park"),
    C("botanical_garden"),
    C("museum"),
    C("library"),
    C("live_music_venue"),
    C("jazz_club"),
  ],
  come_back: [
    C("cafe"),
    C("coffee_shop"),
    C("comic_book_store"),
    C("game_store"),
    C("rock_climbing_gym"),
    C("yoga_studio"),
  ],
  join_in: [
    C("board_game_club"),
    C("community_garden"),
    C("community_center"),
    C("cultural_center"),
    C("art_studio"),
    C("pottery_classes"),
    C("dance_school"),
    C("rock_climbing_gym"),
  ],
};

// Category or genre suffixes that make a place primarily a drinking venue.
export const DRINKING_SUFFIXES = [
  "bar",
  "pub",
  "brewery",
  "brewpub",
  "night_club",
  "cocktail_bar",
  "wine_bar",
  "beer_garden",
  "beer_hall",
  "sports_bar",
  "lounge",
  "dive_bar",
];
export const DRINKING_TAGS = DRINKING_SUFFIXES.map(C);

export const TASTE_TAG_TYPES = ["urn:tag:genre:music", "urn:tag:genre:qloo", "urn:tag:keyword:qloo"];
export const ROOM_TAG_TYPES = ["urn:tag:ambience:qloo"];

export const ACCESS_STEP_FREE = "urn:tag:accessibility:place:wheelchair_accessible_entrance";

export const CATEGORY_LABEL: Record<string, string> = {
  record_store: "Record store",
  book_store: "Bookstore",
  used_book_store: "Used bookstore",
  comic_book_store: "Comic shop",
  park: "Park",
  city_park: "Park",
  botanical_garden: "Botanical garden",
  museum: "Museum",
  library: "Library",
  live_music_venue: "Live music venue",
  jazz_club: "Jazz club",
  cafe: "Cafe",
  coffee_shop: "Coffee shop",
  game_store: "Game store",
  rock_climbing_gym: "Climbing gym",
  yoga_studio: "Yoga studio",
  board_game_club: "Board game club",
  community_garden: "Community garden",
  community_center: "Community center",
  cultural_center: "Cultural center",
  art_studio: "Art studio",
  pottery_classes: "Pottery classes",
  dance_school: "Dance school",
};
