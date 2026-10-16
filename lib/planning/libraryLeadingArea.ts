/** Describe recorded set totals only; no target, balance or recovery inference. */
export function libraryLeadingArea<T extends { body: string; sets: number }>(rows: readonly T[]) {
  const recorded = rows.filter(row => Number.isSafeInteger(row.sets) && row.sets > 0);
  const maximum = recorded.reduce((highest, row) => Math.max(highest, row.sets), 0);
  const leaders = recorded.filter(row => row.sets === maximum);
  const uniqueLeader = leaders.length === 1 ? leaders[0] : null;
  const label = uniqueLeader ? `${uniqueLeader.body} has the most recorded sets`
    : leaders.length > 1 ? `${leaders.length} areas tied at ${maximum.toLocaleString()} recorded sets`
    : "Log sets to compare regions";
  return { uniqueLeader, label, maximum, tied: leaders.length > 1 };
}
