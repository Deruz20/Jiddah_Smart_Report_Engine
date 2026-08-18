export interface StudentRecord {
  id?: string | number;
  no?: number;
  name?: string;
  arabicName?: string;
  total?: number | null;
  rank?: number | string;
  remark?: string;
  [key: string]: any; // To allow arbitrary subject marks like 'quran', 'MATH'
}

/**
 * Computes Standard Competition Rankings for student report records.
 * - Sorts by total score descending.
 * - Students with the same score get the same rank.
 * - Skips rank numbers after ties (e.g., 1, 2, 3, 3, 5).
 * - Keeps empty/absent records at the bottom with '-' rank.
 */
export function computeStandardRankings<T extends StudentRecord>(students: T[]): T[] {
  const activeStudents: T[] = [];
  const emptyStudents: T[] = [];

  students.forEach((student) => {
    const totalVal = student.total;
    if (totalVal !== null && totalVal !== undefined && !isNaN(Number(totalVal))) {
      activeStudents.push({ ...student, total: Number(totalVal) });
    } else {
      emptyStudents.push({ ...student, rank: "-", remark: "-" });
    }
  });

  // Sort descending by total score
  activeStudents.sort((a, b) => (b.total as number) - (a.total as number));

  // Standard Competition Ranking logic
  let currentRank = 1;
  const rankedStudents = activeStudents.map((student, index) => {
    if (index > 0 && student.total! < (activeStudents[index - 1].total as number)) {
      currentRank = index + 1;
    }
    return {
      ...student,
      rank: currentRank,
    };
  });

  return [...rankedStudents, ...emptyStudents];
}
