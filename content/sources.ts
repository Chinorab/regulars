// Every figure shown on the site comes from one of these sources, quoted only with numbers the
// source itself states (constitution II, FR-025). Read on 2026-10-16.

export type Source = { id: string; publisher: string; title: string; url: string; date: string };

export const SOURCES = {
  nature: {
    id: "nature",
    publisher: "ScienceDaily, on a Tulane University study in Nature Communications",
    title: "Loneliness may steal nearly 6 years of good health",
    url: "https://www.sciencedaily.com/releases/2026/10/261006234514.htm",
    date: "October 2026",
  },
  lancet: {
    id: "lancet",
    publisher: "CU Boulder Today, on a RECETAS study in Lancet Regional Health",
    title: "Can a prescription for nature help cure the loneliness epidemic?",
    url: "https://www.colorado.edu/today/2026/10/13/can-prescription-nature-help-cure-loneliness-epidemic",
    date: "October 13, 2026",
  },
  congress: {
    id: "congress",
    publisher: "Washingtonian",
    title: "Congress and science could make the future less lonely",
    url: "https://washingtonian.com/2026/10/15/congress-and-science-could-make-the-future-less-lonely/",
    date: "October 15, 2026",
  },
} satisfies Record<string, Source>;

export type Fact = { figure: string; text: string; source: Source };

// Figures and wording checked against each article.
export const FACTS: Fact[] = [
  {
    figure: "1 in 3",
    text: "Americans feel lonely on a regular basis.",
    source: SOURCES.lancet,
  },
  {
    figure: "Nearly 6 years",
    text: "of life free from mental disorders were lost with loneliness and social isolation, in a study that followed 277,489 adults aged 40 to 69.",
    source: SOURCES.nature,
  },
  {
    figure: "17%",
    text: "lower loneliness scores on average after one year, among 320 lonely older adults in Barcelona given a weekly nature prescription. Going with a group worked significantly better for those who started out lowest.",
    source: SOURCES.lancet,
  },
];
