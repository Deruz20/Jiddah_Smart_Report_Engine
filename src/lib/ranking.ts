export interface StudentRecord {
  id?: string | number;
  no?: number;
  name?: string;
  arabicName?: string;
  total?: number | null;
  average?: number | null;
  aggregate?: number | null;
  rank?: number | string;
  remark?: string;
  [key: string]: any; // To allow arbitrary subject marks like 'quran', 'MATH'
}

export type RankingMethod = 'standard' | 'dense' | 'ordinal' | 'fractional';
export type RankingBasis = 'total_score' | 'average' | 'aggregates';
export type RankingScope = 'class' | 'stream' | 'level';
export type RankingTiebreak = 'none' | 'english' | 'math' | 'alphabetical';

export interface RankingPreferences {
  method?: RankingMethod;
  basis?: RankingBasis;
  scope?: RankingScope;
  tiebreak?: RankingTiebreak;
  show_rank?: boolean;
}

/**
 * Computes Standard Competition Rankings for student report records.
 * - Default Ugandan UNEB standard: 1, 2, 2, 4 (skips positions on ties).
 * - Sorts by total score descending.
 * - Students with the same score get the same rank.
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

  // Standard Competition Ranking logic (1, 2, 2, 4)
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

/**
 * Computes Configurable Rankings based on school preferences:
 * - method: 'standard' (1, 2, 2, 4) | 'dense' (1, 2, 2, 3) | 'ordinal' (1, 2, 3, 4) | 'fractional' (1, 2.5, 2.5, 4)
 * - basis: 'total_score' | 'average' | 'aggregates' (lower is better for aggregates)
 * - tiebreak: 'none' | 'english' | 'math' | 'alphabetical'
 * - show_rank: true | false (if false, all ranks are hidden as '-')
 * 
 * Default preference produces output 100% identical to computeStandardRankings.
 */
export function computeConfigurableRankings<T extends StudentRecord>(
  students: T[],
  preferences?: RankingPreferences
): T[] {
  const method = preferences?.method ?? 'standard';
  const basis = preferences?.basis ?? 'total_score';
  const tiebreak = preferences?.tiebreak ?? 'none';
  const showRank = preferences?.show_rank ?? true;

  if (!showRank) {
    return students.map((s) => ({ ...s, rank: '-' }));
  }

  // Exact default fast-path: 100% backward compatible
  if (method === 'standard' && basis === 'total_score' && tiebreak === 'none') {
    return computeStandardRankings(students);
  }

  const activeStudents: (T & { _sortVal: number })[] = [];
  const emptyStudents: T[] = [];

  students.forEach((student) => {
    let sortVal = student.total;
    if (basis === 'average' && student.average !== undefined) {
      sortVal = student.average;
    } else if (basis === 'aggregates' && student.aggregate !== undefined) {
      sortVal = student.aggregate;
    }

    if (sortVal !== null && sortVal !== undefined && !isNaN(Number(sortVal))) {
      activeStudents.push({ ...student, _sortVal: Number(sortVal) });
    } else {
      emptyStudents.push({ ...student, rank: '-', remark: '-' });
    }
  });

  // Sort order: For aggregates, lower is better. For total/average, higher is better.
  const isAscending = basis === 'aggregates';
  activeStudents.sort((a, b) => {
    const diff = isAscending ? a._sortVal - b._sortVal : b._sortVal - a._sortVal;
    if (diff !== 0) return diff;

    // Optional tiebreaks
    if (tiebreak === 'english' && a.english !== undefined && b.english !== undefined) {
      return Number(b.english) - Number(a.english);
    }
    if (tiebreak === 'math' && a.math !== undefined && b.math !== undefined) {
      return Number(b.math) - Number(a.math);
    }
    if (tiebreak === 'alphabetical' && a.name && b.name) {
      return String(a.name).localeCompare(String(b.name));
    }
    return 0;
  });

  const areEqual = (a: any, b: any): boolean => {
    if (a._sortVal !== b._sortVal) return false;
    if (tiebreak === 'english' && a.english !== undefined && b.english !== undefined) {
      return Number(a.english) === Number(b.english);
    }
    if (tiebreak === 'math' && a.math !== undefined && b.math !== undefined) {
      return Number(a.math) === Number(b.math);
    }
    if (tiebreak === 'alphabetical' && a.name && b.name) {
      return String(a.name) === String(b.name);
    }
    return true;
  };

  if (method === 'ordinal') {
    const ranked = activeStudents.map((student, index) => {
      const { _sortVal, ...rest } = student;
      return { ...rest, rank: index + 1 } as unknown as T;
    });
    return [...ranked, ...emptyStudents];
  }

  if (method === 'dense') {
    let denseRank = 1;
    const ranked = activeStudents.map((student, index) => {
      if (index > 0 && !areEqual(student, activeStudents[index - 1])) {
        denseRank++;
      }
      const { _sortVal, ...rest } = student;
      return { ...rest, rank: denseRank } as unknown as T;
    });
    return [...ranked, ...emptyStudents];
  }

  if (method === 'fractional') {
    let i = 0;
    const rankMap = new Map<any, number>();
    while (i < activeStudents.length) {
      let j = i;
      while (j < activeStudents.length && areEqual(activeStudents[i], activeStudents[j])) {
        j++;
      }
      // Positions are (i + 1) to j
      let sumPositions = 0;
      for (let p = i + 1; p <= j; p++) {
        sumPositions += p;
      }
      const avgRank = sumPositions / (j - i);
      for (let k = i; k < j; k++) {
        rankMap.set(activeStudents[k], avgRank);
      }
      i = j;
    }

    const ranked = activeStudents.map((student) => {
      const { _sortVal, ...rest } = student;
      return { ...rest, rank: rankMap.get(student)! } as unknown as T;
    });
    return [...ranked, ...emptyStudents];
  }

  // Default standard 1, 2, 2, 4
  let currentRank = 1;
  const ranked = activeStudents.map((student, index) => {
    if (index > 0 && !areEqual(student, activeStudents[index - 1])) {
      currentRank = index + 1;
    }
    const { _sortVal, ...rest } = student;
    return { ...rest, rank: currentRank } as unknown as T;
  });
  return [...ranked, ...emptyStudents];
}
