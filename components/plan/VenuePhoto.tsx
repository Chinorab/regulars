"use client";

import Image from "next/image";
import { useState } from "react";

// Qloo image URLs occasionally 404. On error the card falls back to the honest placeholder.
export function VenuePhoto({ src, alt, fallbackClass }: { src?: string; alt: string; fallbackClass?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className={fallbackClass}>No photo listed</span>;
  return <Image src={src} alt={alt} fill sizes="(max-width: 1000px) 100vw, 760px" loading="eager" onError={() => setFailed(true)} />;
}
