"use client";

import "./ProfileAvailabilityGrid.css";

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
const AVAILABILITY_DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const AVAILABILITY_FIRST_HOUR = 0;
const AVAILABILITY_HOUR_LABELS = Array.from({length: 24}, (_, hour) => `${hour % 12 || 12}:00 ${hour >= 12 ? "PM" : "AM"}`);

/* A WEEK OF HOURS YOU DRAG OVER.
 *
 * Ported from the shared Sound Fitness website member/admin picker.
 * Seven day columns, twenty-four hour rows, and three ways to work it: tap a cell,
 * drag along a row or a column, or drive the cursor with the pad and the arrow
 * keys. Written for the free assessment, where somebody says when they are
 * usually free; reused unchanged by the admin availability page, where the
 * coach says the same thing about themselves. A straight drag paints one row
 * or column; a diagonal drag paints the full rectangle between its corners.
 *
 * THE VALUE IS A LIST OF STRINGS, "Monday 9:00 AM". That shape is the
 * assessment's - it is submitted as prose and read by a human - and it is kept
 * here rather than improved so the two callers share one component instead of
 * one component and a translation layer. Callers wanting structure convert at
 * their own edge; see parseAvailabilityValue.
 */

/* Built from the shared axes so the labels the grid RENDERS and the labels
   the string format is PARSED from cannot drift into disagreeing - which
   would break silently, as a stored hour that simply never lights up. */
const availabilityDays = AVAILABILITY_DAY_LABELS.map((label) => ({
  short: label.slice(0, 3),
  label,
}));
const availabilityHours = AVAILABILITY_HOUR_LABELS;

export const AVAILABILITY_DAYS = availabilityDays;
export const AVAILABILITY_HOURS = availabilityHours;
export { AVAILABILITY_FIRST_HOUR };

type AvailabilityDragAxis = "row" | "column" | "rectangle";

type AvailabilityDragState = {
  pointerId: number;
  originX: number;
  originY: number;
  startDayIndex: number;
  startHourIndex: number;
  axis: AvailabilityDragAxis | null;
  shouldSelect: boolean;
  touched: Set<string>;
};

type AvailabilityTimeBand =
  "pre-dawn" | "morning" | "afternoon" | "evening" | "night";

type AvailabilityCursor = {
  dayIndex: number;
  hourIndex: number;
};

type AvailabilityJoystickDirection = "up" | "right" | "down" | "left";

function availabilityTimeBand(hourIndex: number): AvailabilityTimeBand {
  return hourIndex < 6 ? "pre-dawn" : hourIndex < 12 ? "morning" : hourIndex < 17 ? "afternoon" : hourIndex < 21 ? "evening" : "night";
}

function availabilityTimeBandLabel(hourIndex: number) {
  const bandStarts: Partial<Record<number, string>> = { 0: "Pre-dawn", 6: "Morning", 12: "Afternoon", 17: "Evening", 21: "Night" };

  return bandStarts[hourIndex];
}

export function availabilityValue(day: string, hour: string) {
  return `${day} ${hour}`;
}

/* The conversion between these strings and the stored weekly rule lives in
   lib/weekly-hours-values, not here, because this file imports a stylesheet
   and a guardrail cannot import a stylesheet. Re-exported so no caller had to
   learn that. */


export function AvailabilityGrid({
  value,
  onChange,
  label = "Best one-hour windows to connect",
  wide = false,
  leading,
  trailing,
}: {
  value: string[];
  /* AN UPDATER, NOT A VALUE, and this is not a style preference. A drag
     commits up to sixteen cells synchronously in a single pointermove tick
     (see commitAvailabilityDragRange). Handed `onChange(next)` computed from
     the `value` prop, every one of those calls would read the same stale array
     and the last would win, so a drag across a row would select one cell and
     look like a flaky grid. Passing the updater through means each call sees
     what the one before it wrote. */
  onChange: (updater: (current: string[]) => string[]) => void;
  label?: string;
  /* THE CALLER SAYS WHETHER THERE IS ROOM. Off, the week is seven fixed
     columns that scroll sideways - right in a form column, right on a phone.
     On, the day columns stretch to whatever they have been given, which is
     only worth asking for inside a dialog that has taken the window. The grid
     cannot work this out for itself: it has no idea how much of its parent's
     width is actually spare. */
  wide?: boolean;
  /* ROOM ON EITHER SIDE OF THE PAD. Joey: "lets condense the controls - put
     save and clear to the left of controls." The pad is drawn here because
     it drives the cursor, which is this component's state; what a caller
     wants beside it (a save button, a status line) is the caller's. Two
     slots, so the row under the table is one row rather than the pad and
     then a second row of buttons under that. */
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  const locale = "en-US";
  const t = (text: string) => text;
  const localizedDays = availabilityDays.map((day, dayIndex) => ({
    ...day,
    localizedLabel: new Intl.DateTimeFormat(locale, { weekday: "long" }).format(
      new Date(2024, 0, 7 + dayIndex),
    ),
    localizedShort: new Intl.DateTimeFormat(locale, {
      weekday: "short",
    }).format(new Date(2024, 0, 7 + dayIndex)),
  }));
  const [cursor, setCursor] = useState<AvailabilityCursor>({
    dayIndex: 0,
    hourIndex: 0,
  });
  const [joystickDirection, setJoystickDirection] =
    useState<AvailabilityJoystickDirection | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<AvailabilityDragState | null>(null);
  /* Mirrors `cursor` so moveCursor can read a fresh position inside one
     synchronous handler chain. Holding an arrow key repeats faster than React
     re-renders; without this each repeat would move from the same origin. */
  const cursorRef = useRef<AvailabilityCursor>({ dayIndex: 0, hourIndex: 0 });
  const joystickResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (joystickResetRef.current) {
        clearTimeout(joystickResetRef.current);
      }
    },
    [],
  );

  function setValue(item: string, shouldSelect: boolean) {
    onChange((current) => {
      const hasValue = current.includes(item);

      if (hasValue === shouldSelect) {
        /* The same reference, so React skips the render. A drag calls this once
           per cell per pointermove and most of those are already correct. */
        return current;
      }

      return shouldSelect
        ? [...current, item]
        : current.filter((entry) => entry !== item);
    });
  }

  function toggle(item: string) {
    onChange((current) =>
      current.includes(item)
        ? current.filter((entry) => entry !== item)
        : [...current, item],
    );
  }

  function commitDragValue(item: string, shouldSelect: boolean) {
    const dragState = dragRef.current;

    if (dragState?.touched.has(item)) {
      return;
    }

    dragState?.touched.add(item);
    setValue(item, shouldSelect);
  }

  function commitDragRange(dayIndex: number, hourIndex: number) {
    const dragState = dragRef.current;

    if (!dragState?.axis) {
      return;
    }

    if (dragState.axis === "rectangle") {
      const firstDay = Math.min(dragState.startDayIndex, dayIndex);
      const lastDay = Math.max(dragState.startDayIndex, dayIndex);
      const firstHour = Math.min(dragState.startHourIndex, hourIndex);
      const lastHour = Math.max(dragState.startHourIndex, hourIndex);

      for (let hour = firstHour; hour <= lastHour; hour += 1) {
        for (let day = firstDay; day <= lastDay; day += 1) {
          commitDragValue(
            availabilityValue(
              availabilityDays[day].label,
              availabilityHours[hour],
            ),
            dragState.shouldSelect,
          );
        }
      }

      return;
    }

    if (dragState.axis === "row") {
      if (hourIndex !== dragState.startHourIndex) {
        return;
      }

      const start = Math.min(dragState.startDayIndex, dayIndex);
      const end = Math.max(dragState.startDayIndex, dayIndex);

      for (let index = start; index <= end; index += 1) {
        commitDragValue(
          availabilityValue(
            availabilityDays[index].label,
            availabilityHours[dragState.startHourIndex],
          ),
          dragState.shouldSelect,
        );
      }

      return;
    }

    if (dayIndex !== dragState.startDayIndex) {
      return;
    }

    const start = Math.min(dragState.startHourIndex, hourIndex);
    const end = Math.max(dragState.startHourIndex, hourIndex);

    for (let index = start; index <= end; index += 1) {
      commitDragValue(
        availabilityValue(
          availabilityDays[dragState.startDayIndex].label,
          availabilityHours[index],
        ),
        dragState.shouldSelect,
      );
    }
  }

  /* The pointer is captured by the cell it went down on, so every move event
     arrives at that one button whatever it is over. The cell actually under
     the finger has to be read from the document. */
  function commitSlotFromPoint(event: ReactPointerEvent<HTMLButtonElement>) {
    const dragState = dragRef.current;

    if (!dragState) {
      return;
    }

    const slot = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLButtonElement>(".sf-availability-slot");

    if (!slot?.dataset.availabilityValue) {
      return;
    }

    const dayIndex = Number(slot.dataset.dayIndex);
    const hourIndex = Number(slot.dataset.hourIndex);

    if (!Number.isFinite(dayIndex) || !Number.isFinite(hourIndex)) {
      return;
    }

    commitDragRange(dayIndex, hourIndex);
  }

  function handlePointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    item: string,
    selected: boolean,
    dayIndex: number,
    hourIndex: number,
  ) {
    if (event.button !== 0) {
      return;
    }

    setCursorPosition(dayIndex, hourIndex, false);
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });

    const shouldSelect = !selected;

    dragRef.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      startDayIndex: dayIndex,
      startHourIndex: hourIndex,
      axis: null,
      shouldSelect,
      touched: new Set([item]),
    };

    setValue(item, shouldSelect);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const dragState = dragRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    const deltaX = event.clientX - dragState.originX;
    const deltaY = event.clientY - dragState.originY;
    const horizontalMovement = Math.abs(deltaX);
    const verticalMovement = Math.abs(deltaY);
    const strongestMovement = Math.max(horizontalMovement, verticalMovement);

    /* Straight drags keep their existing row/column paint behavior. Once the
       pointer has deliberately crossed both a day and a time boundary, the
       gesture becomes a rectangle and paints every cell inside it. The mode
       only upgrades—it never flips back while the pointer is down—so a small
       hand wobble cannot collapse a block into one row. */
    if (
      dragState.axis !== "rectangle" &&
      horizontalMovement >= 8 &&
      verticalMovement >= 8
    ) {
      dragState.axis = "rectangle";
    } else if (!dragState.axis && strongestMovement >= 8) {
      dragState.axis =
        horizontalMovement >= verticalMovement ? "row" : "column";
    }

    if (dragState.axis) {
      commitSlotFromPoint(event);
    }
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLButtonElement>) {
    const dragState = dragRef.current;

    if (dragState?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  function setCursorPosition(
    dayIndex: number,
    hourIndex: number,
    shouldScroll = true,
  ) {
    const nextCursor: AvailabilityCursor = {
      dayIndex: Math.max(0, Math.min(dayIndex, availabilityDays.length - 1)),
      hourIndex: Math.max(0, Math.min(hourIndex, availabilityHours.length - 1)),
    };

    cursorRef.current = nextCursor;
    setCursor(nextCursor);

    if (!shouldScroll) {
      return;
    }

    window.requestAnimationFrame(() => {
      const slot = gridRef.current?.querySelector<HTMLElement>(
        `[data-day-index="${nextCursor.dayIndex}"][data-hour-index="${nextCursor.hourIndex}"]`,
      );

      slot?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    });
  }

  function pulseJoystick(direction: AvailabilityJoystickDirection) {
    if (joystickResetRef.current) {
      clearTimeout(joystickResetRef.current);
    }

    setJoystickDirection(direction);
    joystickResetRef.current = setTimeout(() => {
      setJoystickDirection(null);
      joystickResetRef.current = null;
    }, 190);
  }

  function moveCursor(
    dayDelta: number,
    hourDelta: number,
    direction: AvailabilityJoystickDirection,
  ) {
    const current = cursorRef.current;

    pulseJoystick(direction);
    setCursorPosition(
      current.dayIndex + dayDelta,
      current.hourIndex + hourDelta,
    );
  }

  function toggleCursorValue() {
    const day = availabilityDays[cursor.dayIndex];
    const hour = availabilityHours[cursor.hourIndex];

    if (!day || !hour) {
      return;
    }

    toggle(availabilityValue(day.label, hour));
  }

  function handleSlotKeyDown(event: React.KeyboardEvent, item?: string) {
    if (item && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      toggle(item);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveCursor(0, -1, "up");
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveCursor(1, 0, "right");
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveCursor(0, 1, "down");
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveCursor(-1, 0, "left");
    }
  }

  const cursorDay = availabilityDays[cursor.dayIndex];
  const cursorHour = availabilityHours[cursor.hourIndex];
  const cursorValue =
    cursorDay && cursorHour
      ? availabilityValue(cursorDay.label, cursorHour)
      : "";
  const cursorSelected = Boolean(cursorValue && value.includes(cursorValue));
  const cursorLabel =
    cursorDay && cursorHour
      ? `${localizedDays[cursor.dayIndex]?.localizedLabel ?? cursorDay.label} ${t("at")} ${cursorHour}`
      : "";

  const directionalControls = (
<div
          className="sf-availability-pad"
          data-direction={joystickDirection ?? "center"}
          role="group"
          aria-label={t("Availability directional controls")}
        >
          <div className="sf-availability-pad__base">
            <button
              type="button"
              className="sf-availability-pad__direction sf-availability-pad__direction--up"
              aria-label={t("Highlight earlier time")}
              data-sf-tooltip={t("Earlier time")}
              disabled={cursor.hourIndex === 0}
              onClick={() => moveCursor(0, -1, "up")}
            >
              <ChevronUp className="size-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="sf-availability-pad__direction sf-availability-pad__direction--right"
              aria-label={t("Highlight next day")}
              data-sf-tooltip={t("Next day")}
              disabled={cursor.dayIndex === availabilityDays.length - 1}
              onClick={() => moveCursor(1, 0, "right")}
            >
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="sf-availability-pad__direction sf-availability-pad__direction--down"
              aria-label={t("Highlight later time")}
              data-sf-tooltip={t("Later time")}
              disabled={cursor.hourIndex === availabilityHours.length - 1}
              onClick={() => moveCursor(0, 1, "down")}
            >
              <ChevronDown className="size-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="sf-availability-pad__direction sf-availability-pad__direction--left"
              aria-label={t("Highlight previous day")}
              data-sf-tooltip={t("Previous day")}
              disabled={cursor.dayIndex === 0}
              onClick={() => moveCursor(-1, 0, "left")}
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="sf-availability-pad__select"
              data-selected={cursorSelected ? "true" : "false"}
              data-time-band={availabilityTimeBand(cursor.hourIndex)}
              aria-label={`${cursorSelected ? t("Remove") : t("Select")} ${cursorLabel}`}
              aria-pressed={cursorSelected}
              data-sf-tooltip={`${cursorSelected ? t("Remove") : t("Select")} ${cursorLabel}`}
              onClick={toggleCursorValue}
              onKeyDown={(event) => handleSlotKeyDown(event)}
            >
              {/* A MARK, NOT A WORD. Joey: "remove is icon." The word made
                  the middle of the cross the widest thing in the row; a tick
                  and a cross say the same in a square, and both names stay on
                  the button for anybody listening - see aria-label. */}
              {cursorSelected ? (
                <X className="size-4" aria-hidden="true" />
              ) : (
                <Check className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <span className="sr-only" aria-live="polite">
            {cursorLabel} {t("highlighted")}
          </span>
        </div>
  );

  return (
    <div
      className="sf-availability-grid-wrap mt-3"
      data-wide={wide ? "true" : undefined}
    >
      <div
        ref={gridRef}
        className="sf-availability-grid"
        data-profile-orbiter-scroll-area="true"
        data-dashboard-orbiter-local-scroll="true"
        role="group"
        aria-label={t(label)}
      >
        <div className="sf-availability-grid__inner">
          <div className="sf-availability-grid__corner">{directionalControls}</div>
          {/* THE DAY THE CURSOR IS IN, lit at the top of its column. Joey:
              "make it clear which row and column are highlighted, not just the
              cell." One square in a grid of a hundred and twelve tells you
              where you are only if you can already find it; the header and the
              hour label are where the eye goes to read the answer. */}
          {localizedDays.map((day, dayIndex) => (
            <div
              key={day.label}
              className="sf-availability-grid__day"
              data-on-axis={cursor.dayIndex === dayIndex ? "true" : undefined}
            >
              {day.localizedShort}
            </div>
          ))}

          {availabilityHours.map((hour, hourIndex) => (
            <Fragment key={hour}>
              <div
                className="sf-availability-grid__time"
                data-on-axis={
                  cursor.hourIndex === hourIndex ? "true" : undefined
                }
                data-time-band={availabilityTimeBand(hourIndex)}
                data-band-start={
                  availabilityTimeBandLabel(hourIndex) ? "true" : undefined
                }
              >
                {/* "5:00 AM" ON ONE LINE. Joey: "improve the time column
                    styling and reduce height by putting the AM/PM on the
                    same row." The label used to wrap - "5:00" over "AM" -
                    because the column is narrower than the words at that
                    weight, and a wrapped label was what set every row's
                    height. The clock and its meridiem are two spans now so
                    the AM can be small, which is also what stops it
                    wrapping; the row is as tall as a cell, not as tall as
                    two lines of text. */}
                <span className="sf-availability-grid__hour">
                  {hour.slice(0, hour.indexOf(" "))}
                  <small>{hour.slice(hour.indexOf(" ") + 1)}</small>
                </span>
                {availabilityTimeBandLabel(hourIndex) ? (
                  <span className="sf-availability-grid__band-label">
                    {t(availabilityTimeBandLabel(hourIndex) ?? "")}
                  </span>
                ) : null}
              </div>
              {availabilityDays.map((day, dayIndex) => {
                const item = availabilityValue(day.label, hour);
                const selected = value.includes(item);
                const isCursor =
                  cursor.dayIndex === dayIndex &&
                  cursor.hourIndex === hourIndex;

                return (
                  <button
                    key={item}
                    type="button"
                    aria-label={`${localizedDays[dayIndex].localizedLabel} ${t("at")} ${hour}`}
                    aria-pressed={selected}
                    data-availability-value={item}
                    data-day-index={dayIndex}
                    data-hour-index={hourIndex}
                    data-joystick-active={isCursor ? "true" : undefined}
                    data-time-band={availabilityTimeBand(hourIndex)}
                    data-band-start={
                      availabilityTimeBandLabel(hourIndex) ? "true" : undefined
                    }
                    className="sf-availability-slot"
                    aria-current={isCursor ? "true" : undefined}
                    onFocus={() =>
                      setCursorPosition(dayIndex, hourIndex, false)
                    }
                    onPointerDown={(event) =>
                      handlePointerDown(
                        event,
                        item,
                        selected,
                        dayIndex,
                        hourIndex,
                      )
                    }
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerEnd}
                    onPointerCancel={handlePointerEnd}
                    onLostPointerCapture={handlePointerEnd}
                    onKeyDown={(event) => handleSlotKeyDown(event, item)}
                  >
                    <span aria-hidden="true">
                      {selected ? <Check className="size-3.5" /> : null}
                    </span>
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      <div
        className="sf-availability-grid-controls"
        style={!leading && !trailing ? { display: "none" } : undefined}
        aria-label={t("Availability cell controls")}
      >
        {leading ? (
          <div className="sf-availability-grid-controls__leading">
            {leading}
          </div>
        ) : null}
        {trailing ? (
          <div className="sf-availability-grid-controls__trailing">
            {trailing}
          </div>
        ) : null}
      </div>
    </div>
  );
}
