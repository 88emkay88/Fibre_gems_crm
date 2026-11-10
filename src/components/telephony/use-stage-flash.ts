import { useEffect, useRef, useState } from "react";
import type { Customer } from "./types";
import { stageForCustomer } from "./pipeline-stages";

const FLASH_MS = 2000;

export function useStageFlash(customers: Customer[]) {
  const stageById = useRef(new Map<string, string>());
  const [flashIds, setFlashIds] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    const moved: string[] = [];
    for (const c of customers) {
      const stageId = stageForCustomer(c).id;
      const previous = stageById.current.get(c.id);
      if (previous && previous !== stageId) moved.push(c.id);
      stageById.current.set(c.id, stageId);
    }
    if (moved.length === 0) return;
    setFlashIds(new Set(moved));
    const timer = setTimeout(() => setFlashIds(new Set()), FLASH_MS);
    return () => clearTimeout(timer);
  }, [customers]);

  return flashIds;
}
