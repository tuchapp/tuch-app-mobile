import { useState } from "react";
import { deriveSchedule, type DayCode } from "../utils/utils";
import type { AccountabilityFrequency } from "../types/api-types";

interface UseAccountabilityDaysOptions {
  initialDays?: DayCode[];
  initialFrequency?: AccountabilityFrequency | "";
}

export function useAccountabilityDays({
  initialDays = [],
  initialFrequency = "",
}: UseAccountabilityDaysOptions = {}) {
  const [selectedDays, setSelectedDays] = useState<DayCode[]>(initialDays);
  const [frequency, setFrequency] = useState<AccountabilityFrequency | "">(initialFrequency);

  function toggleDay(code: DayCode) {
    setSelectedDays((prev) =>
      prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code]
    );
  }

  function resetSchedule(days: DayCode[] = [], freq: AccountabilityFrequency | "" = "") {
    setSelectedDays(days);
    setFrequency(freq);
  }

  const { sortedDays, customSchedule, effectiveFrequency } = deriveSchedule(
    selectedDays,
    frequency
  );

  return {
    selectedDays,
    setSelectedDays,
    frequency,
    setFrequency,
    toggleDay,
    resetSchedule,
    sortedDays,
    customSchedule,
    effectiveFrequency,
  };
}
