import { localDate } from "./dates";

/** Calendar milestones from today; clamp month-end anniversaries to the last day. */
export function goalDateMilestones(today: Date, count: number) {
  const fortnight = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);
  return [
    {date: localDate(fortnight), label: "2 weeks", short: "2W"},
    ...Array.from({length: count}, (_, index) => {
      const month = new Date(today.getFullYear(), today.getMonth() + index + 1, 1);
      const day = Math.min(today.getDate(), new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate());
      return {date: localDate(new Date(month.getFullYear(), month.getMonth(), day)), label: `${index + 1} month${index ? "s" : ""}`, short: `${index + 1}M`};
    }),
  ];
}
