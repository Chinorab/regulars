// En dash (U+2013) and em dash (U+2014), built from code points so no source file has to
// contain the characters themselves (the copy lint bans them in source).
const DASHES = String.fromCharCode(0x2013, 0x2014);

export const DASH_RE = new RegExp(`[${DASHES}]`);
export const DASH_SPACED_RE = new RegExp(`\\s*[${DASHES}]\\s*`, "g");
