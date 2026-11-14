"use client";

import React from "react";
import { AdminMarksEntryClient } from "./AdminMarksEntryClient";
import type { TermData } from "@/types/models";

interface MarksEntryClientProps {
  terms: TermData[];
}

export function MarksEntryClient({ terms }: MarksEntryClientProps) {
  return <AdminMarksEntryClient terms={terms} />;
}
