import React from "react";
import { VectorStamp, DEFAULT_STAMP_CONFIG, StampConfig } from "./StampGenerator";

interface SchoolStampProps {
  date: string | null;
  config?: Partial<StampConfig>;
}

export const SchoolStamp: React.FC<SchoolStampProps> = ({ date, config }) => {
  const mergedConfig: StampConfig = {
    ...DEFAULT_STAMP_CONFIG,
    ...(config || {}),
    date: date || DEFAULT_STAMP_CONFIG.date,
  };

  return <VectorStamp config={mergedConfig} date={date || undefined} />;
};
