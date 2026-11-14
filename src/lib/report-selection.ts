export type StudentCompletionFilter = 'all' | 'complete' | 'incomplete'
export type StudentCompletionStatus = 'complete' | 'incomplete' | 'unknown'

/**
 * Toggle selection for all currently visible IDs while preserving any checked IDs
 * outside the active filter/search subset.
 */
export function toggleSelectAllPreservingOthers(
  visibleIds: string[],
  selectedIds: string[]
): string[] {
  if (visibleIds.length === 0) return selectedIds
  const selectedSet = new Set(selectedIds)
  const allVisibleSelected = visibleIds.every((id) => selectedSet.has(id))

  if (allVisibleSelected) {
    const visibleSet = new Set(visibleIds)
    return selectedIds.filter((id) => !visibleSet.has(id))
  }

  const next = [...selectedIds]
  for (const id of visibleIds) {
    if (!selectedSet.has(id)) {
      selectedSet.add(id)
      next.push(id)
    }
  }
  return next
}

/**
 * Toggle a single item or an inclusive Shift+Click range across the ordered visible list,
 * preserving checked items outside the active filter.
 */
export function applyRangeSelection(
  orderedVisibleIds: string[],
  selectedIds: string[],
  targetId: string,
  anchorIndex: number | null,
  shiftKey: boolean
): { nextSelected: string[]; nextAnchorIndex: number } {
  const targetIndex = orderedVisibleIds.indexOf(targetId)
  if (targetIndex === -1) {
    return {
      nextSelected: selectedIds,
      nextAnchorIndex: anchorIndex ?? -1,
    }
  }

  const selectedSet = new Set(selectedIds)
  const shouldSelect = !selectedSet.has(targetId)

  if (
    shiftKey &&
    anchorIndex !== null &&
    anchorIndex >= 0 &&
    anchorIndex < orderedVisibleIds.length
  ) {
    const start = Math.min(anchorIndex, targetIndex)
    const end = Math.max(anchorIndex, targetIndex)
    const rangeIds = orderedVisibleIds.slice(start, end + 1)

    if (shouldSelect) {
      const next = [...selectedIds]
      for (const id of rangeIds) {
        if (!selectedSet.has(id)) {
          selectedSet.add(id)
          next.push(id)
        }
      }
      return { nextSelected: next, nextAnchorIndex: targetIndex }
    }

    const rangeSet = new Set(rangeIds)
    return {
      nextSelected: selectedIds.filter((id) => !rangeSet.has(id)),
      nextAnchorIndex: targetIndex,
    }
  }

  if (shouldSelect) {
    return {
      nextSelected: [...selectedIds, targetId],
      nextAnchorIndex: targetIndex,
    }
  }

  return {
    nextSelected: selectedIds.filter((id) => id !== targetId),
    nextAnchorIndex: targetIndex,
  }
}

function hasRecordedPhaseScore(subject: any, phase: string): boolean {
  if (!subject || typeof subject !== 'object') return false
  const normalizedPhase = phase.toLowerCase()
  const val =
    normalizedPhase === 'bot'
      ? subject.bot_score ?? subject.score
      : normalizedPhase === 'mot'
        ? subject.mot_score ?? subject.score
        : subject.eot_score ?? subject.score
  return typeof val === 'number' && !Number.isNaN(val)
}

/**
 * Determine whether a generated report payload has complete recorded marks
 * for its active curriculum track and exam phase.
 */
export function getReportCompletionStatus(reportData: any): StudentCompletionStatus {
  if (!reportData || typeof reportData !== 'object') return 'unknown'
  const phase = String(reportData.score_type || 'eot').toLowerCase()

  const tracks: any[][] = []
  if (Array.isArray(reportData.circular?.subjects) && reportData.circular.subjects.length > 0) {
    tracks.push(reportData.circular.subjects)
  }
  if (Array.isArray(reportData.theology?.subjects) && reportData.theology.subjects.length > 0) {
    tracks.push(reportData.theology.subjects)
  }

  if (tracks.length === 0) return 'incomplete'

  const allRecorded = tracks.every((subjects) =>
    subjects.every((subj) => hasRecordedPhaseScore(subj, phase))
  )
  return allRecorded ? 'complete' : 'incomplete'
}

export function filterEnrollmentsByCompletion<T extends { enrollment_id: string }>(
  enrollments: T[],
  statusMap: Record<string, StudentCompletionStatus>,
  filter: StudentCompletionFilter
): T[] {
  if (filter === 'all') return enrollments
  return enrollments.filter((e) => statusMap[e.enrollment_id] === filter)
}

