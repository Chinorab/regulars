import type { Day, TierKey } from "@/lib/plan/types";

// Fixed text for the printed patient sheet. Place names, addresses and hours stay as Qloo
// returned them; only this wording changes with the language (FR-019).
export type SheetLang = "en" | "es";

export const SHEET_COPY: Record<
  SheetLang,
  {
    title: (name: string) => string;
    intro: string;
    madeWith: (worker: string, date: string) => string;
    tier: Record<TierKey, { weeks: string; verb: string; tip: string }>;
    tryThis: string;
    visit: (n: number) => string;
    hours: string;
    hoursMissing: string;
    stepFreeYes: string;
    stepFreeUnknown: string;
    daytimeUnknown: string;
    talk: (worker: string, phone: string) => string;
    footer: string;
    noPlace: string;
    days: Record<Day, string>;
    closed: string;
    to: string;
  }
> = {
  en: {
    title: (n) => `${n}, your next six weeks`,
    intro: "Three places near you where people who enjoy the same things already go. Go at your own pace. Tick a box each time you go.",
    madeWith: (w, d) => (w ? `Made with ${w} on ${d}` : `Made on ${d}`),
    tier: {
      show_up: { weeks: "Weeks 1 and 2", verb: "Go and look around.", tip: "Sit wherever you like. You can leave whenever you want." },
      come_back: { weeks: "Weeks 3 and 4", verb: "Go back.", tip: "Go at the same time of week. A nod to a familiar face is enough." },
      join_in: { weeks: "Weeks 5 and 6", verb: "Join in.", tip: "Ask one small question, and learn one name." },
    },
    tryThis: "Try this:",
    visit: (n) => `Visit ${n}`,
    hours: "Hours",
    hoursMissing: "Hours not listed. Call ahead.",
    stepFreeYes: "Wheelchair accessible entrance listed.",
    stepFreeUnknown: "Call ahead to check the entrance.",
    daytimeUnknown: "Call ahead to check daytime hours.",
    talk: (w, p) => (w && p ? `Want to talk about how it went? Call ${w} at ${p}.` : w ? `Want to talk about how it went? Tell ${w}.` : "Want to talk about how it went? Tell the person who gave you this sheet."),
    footer: "Places chosen with taste data from Qloo. Nothing about you is stored.",
    noPlace: "No place matched every need. Ask about other options.",
    days: { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" },
    closed: "closed",
    to: "to",
  },
  es: {
    title: (n) => `${n}, tus próximas seis semanas`,
    intro: "Tres lugares cerca de ti donde ya van personas con gustos parecidos a los tuyos. Ve a tu ritmo. Marca una casilla cada vez que vayas.",
    madeWith: (w, d) => (w ? `Preparado con ${w} el ${d}` : `Preparado el ${d}`),
    tier: {
      show_up: { weeks: "Semanas 1 y 2", verb: "Ve y observa.", tip: "Siéntate donde quieras. Puedes irte cuando quieras." },
      come_back: { weeks: "Semanas 3 y 4", verb: "Vuelve.", tip: "Ve a la misma hora de la semana. Saludar con la cabeza a una cara conocida es suficiente." },
      join_in: { weeks: "Semanas 5 y 6", verb: "Participa.", tip: "Haz una pregunta sencilla y aprende un nombre." },
    },
    tryThis: "Prueba esto:",
    visit: (n) => `Visita ${n}`,
    hours: "Horario",
    hoursMissing: "Horario no indicado. Llama antes de ir.",
    stepFreeYes: "Entrada accesible en silla de ruedas indicada.",
    stepFreeUnknown: "Llama antes para confirmar el acceso.",
    daytimeUnknown: "Llama antes para confirmar el horario de día.",
    talk: (w, p) => (w && p ? `¿Quieres contar cómo te fue? Llama a ${w} al ${p}.` : w ? `¿Quieres contar cómo te fue? Díselo a ${w}.` : "¿Quieres contar cómo te fue? Díselo a quien te dio esta hoja."),
    footer: "Lugares elegidos con datos de gustos de Qloo. No se guarda nada sobre ti.",
    noPlace: "Ningún lugar cumplía todas las necesidades. Pregunta por otras opciones.",
    days: { monday: "lun", tuesday: "mar", wednesday: "mié", thursday: "jue", friday: "vie", saturday: "sáb", sunday: "dom" },
    closed: "cerrado",
    to: "a",
  },
};
