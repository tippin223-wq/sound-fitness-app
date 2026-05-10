"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type MouseEvent,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { loadWorkoutLogEntriesWithFallback } from "@/lib/data/workoutPersistence";
import {
  readWorkoutBuilderSelectedExercises,
  writeWorkoutBuilderSelectedExercises,
} from "@/lib/localData/workoutBuilderData";
import {
  prependExerciseStats,
  readCustomExercises,
  subscribeToLocalWorkoutData,
  writeCustomExercises,
} from "@/lib/localData/workoutData";
import {
  getExerciseCatalogWithLegacyFallback,
  getNormalizedExerciseCatalog,
  type NormalizedExerciseCatalogItem,
} from "@/lib/training/normalizedExerciseCatalog";
import {
  EXERCISE_MODIFIER_BY_ID as SEMANTIC_EXERCISE_MODIFIER_BY_ID,
  MOVEMENT_PATTERN_BY_ID as SEMANTIC_MOVEMENT_PATTERN_BY_ID,
  mapLegacyExerciseToExerciseSystem,
  semanticExerciseMatchesQuery,
  type ExerciseModifierId as SemanticExerciseModifierId,
  type IntegratedMovement as SemanticIntegratedMovement,
  type MovementPatternId as SemanticMovementPatternId,
} from "@/lib/exercise-system";
import { getCompatibleModifiersForMovement } from "@/lib/training/movementCompatibility";
import {
  CORE_MOVEMENT_BY_ID,
  EXERCISE_MODIFIER_BY_ID,
  EXERCISE_MODIFIER_CATEGORY_BY_ID,
  MOVEMENT_PATTERN_CATEGORY_BY_ID,
  MOVEMENT_PATTERN_BY_ID,
} from "@/lib/training/movementTaxonomy";
import { createExerciseVariation } from "@/lib/training/movementGeneration";
import { ROUTES } from "@/lib/routes";
import type {
  CoreMovementId,
  ExerciseCatalogItem,
  ExerciseModifier,
  ExerciseModifierCategoryId,
  ExerciseModifierId,
  LocalExerciseStatEntry,
  MovementPatternId,
} from "@/types";

type Exercise = {
  id: string;
  name: string;
  body: string;
  muscles: string;
  pattern: string;
  goal: string;
  equipment: string;
  level: string;
  image?: string;
  cue?: string;
  custom?: boolean;
};

type ExerciseLibraryViewMode = "detail" | "grid";
type ExerciseStatsMenuMode = "detail" | "grid";
type ExerciseLibrarySortMode =
  | "category"
  | "alpha"
  | "difficulty"
  | "body"
  | "recent"
  | "logged";

const viewModeLabels: Record<ExerciseLibraryViewMode, string> = {
  detail: "Detail View",
  grid: "Grid View",
};

const sortModeLabels: Record<ExerciseLibrarySortMode, string> = {
  category: "Category Order",
  alpha: "A-Z",
  difficulty: "Difficulty",
  body: "Body Region",
  recent: "Recently Used",
  logged: "Most Logged",
};

const difficultyOrder = ["Beginner", "Intermediate", "Advanced"];

function ViewModeIcon({ mode }: { mode: ExerciseLibraryViewMode }) {
  if (mode === "grid") {
    return (
      <span
        aria-hidden="true"
        className="grid h-4 w-4 grid-cols-2 gap-0.5"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <span
            key={index}
            className="rounded-[3px] border border-current/80 bg-current/20"
          />
        ))}
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-4 w-4 flex-col justify-center gap-1"
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <span
          key={index}
          className="h-0.5 rounded-full bg-current"
        />
      ))}
    </span>
  );
}

const exerciseLibraryDropdownOpenEvent =
  "sound-fitness:exercise-library-dropdown-open";

type ExerciseLibraryDropdownOpenDetail = {
  id: string;
  parentId?: string;
  keepOpenIds?: string[];
};

const announceExerciseLibraryDropdownOpen = (
  id: string,
  detail?: Omit<ExerciseLibraryDropdownOpenDetail, "id">,
) => {
  window.dispatchEvent(
    new CustomEvent<ExerciseLibraryDropdownOpenDetail>(
      exerciseLibraryDropdownOpenEvent,
      {
        detail: { id, ...detail },
      },
    ),
  );
};

const createFixedDropdownStyle = ({
  left,
  top,
  width,
  maxHeight,
  zIndex,
}: {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  zIndex: number;
}): CSSProperties => {
  const roundedLeft = Math.round(left);
  const roundedTop = Math.round(top);

  return {
    left: 0,
    top: 0,
    width: Math.round(width),
    maxHeight: Math.round(maxHeight),
    zIndex,
    transform: `translate3d(${roundedLeft}px, ${roundedTop}px, 0)`,
    willChange: "transform",
  };
};

const setStableFixedDropdownStyle = (
  setStyle: Dispatch<SetStateAction<CSSProperties | null>>,
  nextStyle: CSSProperties,
) => {
  setStyle((currentStyle) => {
    if (
      currentStyle &&
      currentStyle.transform === nextStyle.transform &&
      currentStyle.width === nextStyle.width &&
      currentStyle.maxHeight === nextStyle.maxHeight &&
      currentStyle.zIndex === nextStyle.zIndex
    ) {
      return currentStyle;
    }

    return nextStyle;
  });
};

const topFilterDropdownZIndex = 45;

const getTopNavigationSafeArea = () => {
  const baseMargin = 12;

  if (typeof document === "undefined") return baseMargin;

  const stickyHeaderBottom = Array.from(document.querySelectorAll("header"))
    .map((header) => {
      const style = window.getComputedStyle(header);
      const rect = header.getBoundingClientRect();
      const isTopNavigation =
        (style.position === "sticky" || style.position === "fixed") &&
        rect.top <= baseMargin &&
        rect.bottom > 0;

      return isTopNavigation ? rect.bottom : 0;
    })
    .reduce((maxBottom, bottom) => Math.max(maxBottom, bottom), 0);

  return Math.max(baseMargin, Math.ceil(stickyHeaderBottom) + 8);
};

const levelSegments = [
  {
    value: "Beginner",
    label: "Beginner",
    tone:
      "border-cyan-200/25 bg-cyan-300/10 text-cyan-100 hover:border-cyan-200/45 hover:bg-cyan-300/18",
    active:
      "border-cyan-200 bg-cyan-300 text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.28)]",
  },
  {
    value: "Intermediate",
    label: "Intermediate",
    tone:
      "border-emerald-200/25 bg-emerald-300/10 text-emerald-100 hover:border-emerald-200/45 hover:bg-emerald-300/18",
    active:
      "border-emerald-200 bg-emerald-300 text-slate-950 shadow-[0_0_28px_rgba(16,185,129,0.28)]",
  },
  {
    value: "Advanced",
    label: "Advanced",
    tone:
      "border-violet-200/25 bg-violet-300/10 text-violet-100 hover:border-violet-200/45 hover:bg-violet-300/18",
    active:
      "border-violet-200 bg-violet-300 text-slate-950 shadow-[0_0_30px_rgba(167,139,250,0.28)]",
  },
];

const normalizedCatalog = getNormalizedExerciseCatalog();

type FilterMenuOption = {
  value: string;
  label: string;
  group?: string;
  helper?: string;
};

type SearchSuggestion = {
  id: string;
  label: string;
  group: string;
  helper?: string;
  query: string;
  aliases?: string[];
};

const normalizeSuggestionText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getSearchSuggestionRank = (
  query: string,
  suggestion: SearchSuggestion,
) => {
  const normalizedQuery = normalizeSuggestionText(query);
  if (!normalizedQuery) return 4;

  const label = normalizeSuggestionText(suggestion.label);
  const aliases = (suggestion.aliases || []).map(normalizeSuggestionText);

  if (label === normalizedQuery) return 0;
  if (label.startsWith(normalizedQuery)) return 1;
  if (label.includes(normalizedQuery)) return 2;
  if (
    aliases.some(
      (alias) =>
        alias === normalizedQuery ||
        alias.startsWith(normalizedQuery) ||
        alias.includes(normalizedQuery),
    )
  ) {
    return 3;
  }

  return null;
};

const getRankedSearchSuggestions = (
  query: string,
  suggestions: SearchSuggestion[],
) =>
  suggestions
    .map((suggestion) => {
      const rank = getSearchSuggestionRank(query, suggestion);
      return rank === null ? null : { suggestion, rank };
    })
    .filter(
      (
        item,
      ): item is { suggestion: SearchSuggestion; rank: number } =>
        Boolean(item),
    )
    .sort(
      (left, right) =>
        left.rank - right.rank ||
        left.suggestion.group.localeCompare(right.suggestion.group) ||
        left.suggestion.label.localeCompare(right.suggestion.label),
    )
    .map(({ suggestion }) => suggestion);

function SearchInputWithSuggestions({
  value,
  onChange,
  suggestions,
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions: SearchSuggestion[];
}) {
  const dropdownId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lockedPanelWidthRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties | null>(null);
  const visibleSuggestions = useMemo(
    () => getRankedSearchSuggestions(value, suggestions).slice(0, 16),
    [value, suggestions],
  );

  const updatePanelPosition = () => {
    const trigger = inputRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 12;
    const safeTop = getTopNavigationSafeArea();
    const measuredWidth = Math.min(
      Math.max(rect.width, 720),
      viewportWidth - margin * 2,
    );
    const width = lockedPanelWidthRef.current ?? measuredWidth;
    lockedPanelWidthRef.current = width;
    const usableHeight = Math.max(160, viewportHeight - safeTop - margin);
    const minPanelHeight = Math.min(220, usableHeight);
    const panelMaxHeight = Math.min(420, usableHeight);
    const preferredTop = Math.max(rect.bottom + 8, safeTop);
    const top = Math.min(
      preferredTop,
      Math.max(safeTop, viewportHeight - minPanelHeight - margin),
    );
    const left = Math.min(
      Math.max(rect.left, margin),
      Math.max(margin, viewportWidth - width - margin),
    );
    const maxHeight = Math.max(
      minPanelHeight,
      Math.min(panelMaxHeight, viewportHeight - top - margin),
    );

    setStableFixedDropdownStyle(
      setPanelStyle,
      createFixedDropdownStyle({
        left,
        top,
        width,
        maxHeight,
        zIndex: topFilterDropdownZIndex,
      }),
    );
  };

  const openPanel = () => {
    announceExerciseLibraryDropdownOpen(dropdownId);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) {
      lockedPanelWidthRef.current = null;
      setPanelStyle(null);
      return;
    }

    updatePanelPosition();

    const closeWhenAnotherDropdownOpens = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string }>).detail;
      if (detail?.id !== dropdownId) setOpen(false);
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !inputRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    let animationFrame: number | null = null;
    const schedulePositionUpdate = (unlockWidth = false) => {
      if (unlockWidth) lockedPanelWidthRef.current = null;
      if (animationFrame !== null) return;

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        updatePanelPosition();
      });
    };
    const handleResize = () => schedulePositionUpdate(true);
    const handleScroll = () => schedulePositionUpdate();

    window.addEventListener(
      exerciseLibraryDropdownOpenEvent,
      closeWhenAnotherDropdownOpens,
    );
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener(
        exerciseLibraryDropdownOpenEvent,
        closeWhenAnotherDropdownOpens,
      );
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [dropdownId, open]);

  return (
    <div>
      <input
        ref={inputRef}
        placeholder="Search core movement, muscle, pattern, goal, equipment, or level..."
        value={value}
        onFocus={openPanel}
        onChange={(event) => {
          onChange(event.target.value);
          if (!open) openPanel();
        }}
        className="mt-3 min-h-[44px] w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
        aria-label="Search Exercise Library"
        aria-expanded={open}
      />

      {open && panelStyle
        ? createPortal(
            <div
              ref={panelRef}
              style={panelStyle}
              className="fixed overflow-hidden rounded-[26px] border border-cyan-100/20 bg-[radial-gradient(circle_at_15%_0%,rgba(34,211,238,0.18),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] p-2 shadow-[0_26px_90px_rgba(0,0,0,0.76),0_0_36px_rgba(34,211,238,0.14)] backdrop-blur-xl [scrollbar-color:rgba(34,211,238,0.38)_transparent]"
            >
              <div className="max-h-[inherit] overflow-y-auto pr-1 [scrollbar-width:thin]">
                {visibleSuggestions.length > 0 ? (
                  visibleSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => {
                        onChange(suggestion.query);
                        setOpen(false);
                      }}
                      className="mb-1 flex min-h-[42px] w-full items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-left text-sm font-bold text-slate-300 transition hover:bg-cyan-300/10 hover:text-white"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-white">
                          {suggestion.label}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100/45">
                          {[suggestion.group, suggestion.helper]
                            .filter(Boolean)
                            .join(" / ")}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
                        Search
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-bold text-slate-400">
                    No suggestions yet
                  </div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

type MovementTypeGroup =
  | "Lower Body Compound"
  | "Lower Body Isolation"
  | "Upper Push"
  | "Upper Pull"
  | "Arm Isolation"
  | "Core"
  | "Athletic"
  | "Mobility"
  | "Cervical Isolation"
  | "Integrated";

type MovementTypeOption = {
  value: string;
  label: string;
  group: MovementTypeGroup;
  coreMovementIds: CoreMovementId[];
  movementPatternIds: MovementPatternId[];
  count: number;
};

const movementTypeGroupOrder: MovementTypeGroup[] = [
  "Lower Body Compound",
  "Lower Body Isolation",
  "Upper Push",
  "Upper Pull",
  "Arm Isolation",
  "Core",
  "Athletic",
  "Mobility",
  "Cervical Isolation",
  "Integrated",
];

const movementTypeDefinitions: Array<
  Omit<MovementTypeOption, "count"> & { helper?: string }
> = [
  {
    value: "strength:chest-press",
    label: "Chest Press",
    group: "Upper Push",
    coreMovementIds: ["chest-press"],
    movementPatternIds: ["chest-press", "horizontal-push"],
  },
  {
    value: "upper-push:chest-fly",
    label: "Chest Fly",
    group: "Upper Push",
    coreMovementIds: ["chest-fly"],
    movementPatternIds: ["chest-fly"],
  },
  {
    value: "strength:row",
    label: "Row",
    group: "Upper Pull",
    coreMovementIds: ["row"],
    movementPatternIds: ["row", "horizontal-pull"],
  },
  {
    value: "strength:squat",
    label: "Squat",
    group: "Lower Body Compound",
    coreMovementIds: ["squat"],
    movementPatternIds: ["squat"],
  },
  {
    value: "strength:hinge",
    label: "Hinge",
    group: "Lower Body Compound",
    coreMovementIds: ["hinge"],
    movementPatternIds: ["hinge"],
  },
  {
    value: "strength:lunge",
    label: "Lunge",
    group: "Lower Body Compound",
    coreMovementIds: ["lunge"],
    movementPatternIds: ["lunge"],
  },
  {
    value: "strength:shoulder-press",
    label: "Shoulder Press",
    group: "Upper Push",
    coreMovementIds: ["shoulder-press"],
    movementPatternIds: ["shoulder-press", "vertical-push"],
  },
  {
    value: "upper:vertical-pull",
    label: "Vertical Pull",
    group: "Upper Pull",
    coreMovementIds: ["vertical-pull", "pulldown", "pull-up"],
    movementPatternIds: ["vertical-pull"],
  },
  {
    value: "upper:pullover",
    label: "Pullover",
    group: "Upper Pull",
    coreMovementIds: ["pullover"],
    movementPatternIds: ["pullover"],
  },
  {
    value: "upper:biceps-curl",
    label: "Curl",
    group: "Arm Isolation",
    coreMovementIds: ["curl", "biceps-curl"],
    movementPatternIds: ["curl", "elbow-flexion"],
  },
  {
    value: "upper:triceps-extension",
    label: "Triceps Extension",
    group: "Arm Isolation",
    coreMovementIds: ["triceps-extension"],
    movementPatternIds: ["triceps-extension", "elbow-extension"],
  },
  {
    value: "arm:wrist-flexion",
    label: "Wrist Flexion",
    group: "Arm Isolation",
    coreMovementIds: ["wrist-flexion"],
    movementPatternIds: ["wrist-flexion"],
  },
  {
    value: "arm:wrist-extension",
    label: "Wrist Extension",
    group: "Arm Isolation",
    coreMovementIds: ["wrist-extension"],
    movementPatternIds: ["wrist-extension"],
  },
  {
    value: "arm:wrist-rotation",
    label: "Wrist Rotation",
    group: "Arm Isolation",
    coreMovementIds: ["wrist-rotation"],
    movementPatternIds: ["wrist-rotation"],
  },
  {
    value: "upper:lateral-raise",
    label: "Lateral Raise",
    group: "Upper Push",
    coreMovementIds: ["lateral-raise"],
    movementPatternIds: ["lateral-raise", "shoulder-abduction"],
  },
  {
    value: "upper:rear-delt-raise",
    label: "Reverse Fly",
    group: "Upper Pull",
    coreMovementIds: ["reverse-fly", "rear-delt-raise"],
    movementPatternIds: ["reverse-fly", "scapular-retraction"],
  },
  {
    value: "upper:face-pull",
    label: "Face Pull",
    group: "Arm Isolation",
    coreMovementIds: ["face-pull"],
    movementPatternIds: ["scapular-retraction"],
  },
  {
    value: "upper:shrug",
    label: "Shrug",
    group: "Upper Pull",
    coreMovementIds: ["shrug"],
    movementPatternIds: ["scapular-retraction"],
  },
  {
    value: "lower:knee-extension",
    label: "Knee Extension",
    group: "Lower Body Isolation",
    coreMovementIds: ["knee-extension", "leg-extension"],
    movementPatternIds: ["knee-extension"],
  },
  {
    value: "lower:knee-flexion",
    label: "Knee Flexion",
    group: "Lower Body Isolation",
    coreMovementIds: ["knee-flexion", "leg-curl"],
    movementPatternIds: ["knee-flexion"],
  },
  {
    value: "lower:hip-thrust-bridge",
    label: "Hip Thrust / Bridge",
    group: "Lower Body Compound",
    coreMovementIds: ["hip-thrust-bridge", "hip-thrust-glute-bridge"],
    movementPatternIds: ["hip-thrust-bridge", "hip-extension"],
  },
  {
    value: "lower:calf-raise",
    label: "Calf Raise",
    group: "Lower Body Isolation",
    coreMovementIds: ["calf-raise"],
    movementPatternIds: ["calf-raise", "plantarflexion"],
  },
  {
    value: "lower:tibialis-raise",
    label: "Tibialis Raise",
    group: "Lower Body Isolation",
    coreMovementIds: ["tibialis-raise"],
    movementPatternIds: ["tibialis-raise", "dorsiflexion"],
  },
  {
    value: "lower:step-up",
    label: "Step-Up",
    group: "Lower Body Compound",
    coreMovementIds: ["step-up"],
    movementPatternIds: ["step-up", "step-gait-jump"],
  },
  {
    value: "lower:step-down",
    label: "Step-Down",
    group: "Lower Body Compound",
    coreMovementIds: ["step-down"],
    movementPatternIds: ["step-gait-jump"],
  },
  {
    value: "lower:split-squat",
    label: "Split Squat",
    group: "Lower Body Compound",
    coreMovementIds: ["split-squat"],
    movementPatternIds: ["lunge"],
  },
  {
    value: "core:rotation",
    label: "Rotation",
    group: "Core",
    coreMovementIds: ["rotation"],
    movementPatternIds: ["rotation"],
  },
  {
    value: "core:anti-rotation",
    label: "Anti-Rotation",
    group: "Core",
    coreMovementIds: ["anti-rotation"],
    movementPatternIds: ["anti-rotation"],
  },
  {
    value: "core:flexion",
    label: "Flexion",
    group: "Core",
    coreMovementIds: ["flexion"],
    movementPatternIds: ["flexion"],
  },
  {
    value: "core:brace",
    label: "Anti-Extension",
    group: "Core",
    coreMovementIds: ["anti-extension", "brace-plank"],
    movementPatternIds: ["anti-extension", "brace"],
  },
  {
    value: "core:anti-lateral-flexion",
    label: "Anti-Lateral Flexion",
    group: "Core",
    coreMovementIds: ["anti-lateral-flexion"],
    movementPatternIds: ["anti-lateral-flexion"],
  },
  {
    value: "core:carry",
    label: "Carry",
    group: "Athletic",
    coreMovementIds: ["carry"],
    movementPatternIds: ["carry"],
  },
  {
    value: "rehab:hip-abduction",
    label: "Hip Abduction",
    group: "Lower Body Isolation",
    coreMovementIds: ["hip-abduction"],
    movementPatternIds: ["hip-abduction"],
  },
  {
    value: "rehab:hip-adduction",
    label: "Hip Adduction",
    group: "Lower Body Isolation",
    coreMovementIds: ["hip-adduction"],
    movementPatternIds: ["hip-adduction"],
  },
  {
    value: "rehab:hip-external-rotation",
    label: "Hip External Rotation",
    group: "Lower Body Isolation",
    coreMovementIds: ["hip-external-rotation"],
    movementPatternIds: ["hip-external-rotation"],
  },
  {
    value: "rehab:hip-internal-rotation",
    label: "Hip Internal Rotation",
    group: "Lower Body Isolation",
    coreMovementIds: ["hip-internal-rotation"],
    movementPatternIds: ["hip-internal-rotation"],
  },
  {
    value: "arm:scapular-control",
    label: "Scapular Control",
    group: "Arm Isolation",
    coreMovementIds: ["scapular-control"],
    movementPatternIds: [
      "scapular-control",
      "scapular-retraction",
      "scapular-protraction",
    ],
  },
  {
    value: "rehab:shoulder-external-rotation",
    label: "Shoulder External Rotation",
    group: "Arm Isolation",
    coreMovementIds: ["shoulder-external-rotation"],
    movementPatternIds: ["shoulder-external-rotation"],
  },
  {
    value: "rehab:shoulder-internal-rotation",
    label: "Shoulder Internal Rotation",
    group: "Arm Isolation",
    coreMovementIds: ["shoulder-internal-rotation"],
    movementPatternIds: ["shoulder-internal-rotation"],
  },
  {
    value: "power:clean-pull",
    label: "Clean Pull",
    group: "Athletic",
    coreMovementIds: ["clean-pull"],
    movementPatternIds: ["olympic-pull-catch"],
  },
  {
    value: "power:high-pull",
    label: "High Pull",
    group: "Athletic",
    coreMovementIds: ["high-pull"],
    movementPatternIds: ["olympic-pull-catch"],
  },
  {
    value: "power:kettlebell-swing",
    label: "Kettlebell Swing",
    group: "Athletic",
    coreMovementIds: ["kettlebell-swing"],
    movementPatternIds: ["ballistic-hinge"],
  },
  {
    value: "power:kettlebell-clean",
    label: "Kettlebell Clean",
    group: "Athletic",
    coreMovementIds: ["kettlebell-clean"],
    movementPatternIds: ["olympic-pull-catch"],
  },
  {
    value: "power:kettlebell-snatch",
    label: "Kettlebell Snatch",
    group: "Athletic",
    coreMovementIds: ["kettlebell-snatch"],
    movementPatternIds: ["olympic-pull-catch"],
  },
  {
    value: "power:turkish-get-up",
    label: "Turkish Get-Up",
    group: "Athletic",
    coreMovementIds: ["turkish-get-up"],
    movementPatternIds: ["step-gait-jump"],
  },
  {
    value: "power:kettlebell-halo",
    label: "Kettlebell Halo",
    group: "Athletic",
    coreMovementIds: ["kettlebell-halo"],
    movementPatternIds: ["rotation"],
  },
  {
    value: "power:bottoms-up-press",
    label: "Bottoms-Up Press",
    group: "Athletic",
    coreMovementIds: ["bottoms-up-press"],
    movementPatternIds: ["vertical-push"],
  },
  {
    value: "power:jump-landing",
    label: "Jump",
    group: "Athletic",
    coreMovementIds: ["jump", "jump-landing"],
    movementPatternIds: ["jump", "step-gait-jump"],
  },
  {
    value: "power:medicine-ball-slam",
    label: "Throw",
    group: "Athletic",
    coreMovementIds: ["throw", "medicine-ball-slam"],
    movementPatternIds: ["throw", "ballistic-throw-slam"],
  },
  {
    value: "power:crawl",
    label: "Crawl",
    group: "Athletic",
    coreMovementIds: ["crawl"],
    movementPatternIds: ["crawl"],
  },
  {
    value: "power:sprint",
    label: "Sprint",
    group: "Athletic",
    coreMovementIds: ["sprint"],
    movementPatternIds: ["sprint"],
  },
  {
    value: "power:burpee",
    label: "Burpee",
    group: "Athletic",
    coreMovementIds: ["burpee"],
    movementPatternIds: ["locomotion-conditioning"],
  },
  {
    value: "power:sled-drive",
    label: "Sled Drive",
    group: "Athletic",
    coreMovementIds: ["sled-drive"],
    movementPatternIds: ["sled-drive"],
  },
  {
    value: "mobility:mobility-flow",
    label: "Mobility",
    group: "Mobility",
    coreMovementIds: ["mobility", "mobility-flow"],
    movementPatternIds: ["mobility", "mobility-flow"],
  },
  {
    value: "mobility:breathing-bracing",
    label: "Breathing / Bracing",
    group: "Mobility",
    coreMovementIds: ["breathing-bracing"],
    movementPatternIds: ["breathing-bracing"],
  },
  {
    value: "cervical:neck-flexion",
    label: "Neck Flexion",
    group: "Cervical Isolation",
    coreMovementIds: ["neck-flexion"],
    movementPatternIds: ["neck-flexion"],
  },
  {
    value: "cervical:neck-extension",
    label: "Neck Extension",
    group: "Cervical Isolation",
    coreMovementIds: ["neck-extension"],
    movementPatternIds: ["neck-extension"],
  },
  {
    value: "cervical:neck-rotation",
    label: "Neck Rotation",
    group: "Cervical Isolation",
    coreMovementIds: ["neck-rotation"],
    movementPatternIds: ["neck-rotation"],
  },
  {
    value: "integrated:movement",
    label: "Integrated Movement",
    group: "Integrated",
    coreMovementIds: ["integrated-movement"],
    movementPatternIds: ["integrated-movement"],
  },
];

const movementTypeGroupByCoreMovementId: Partial<
  Record<CoreMovementId, MovementTypeGroup>
> = {
  "chest-press": "Upper Push",
  "chest-fly": "Upper Push",
  row: "Upper Pull",
  squat: "Lower Body Compound",
  hinge: "Lower Body Compound",
  lunge: "Lower Body Compound",
  "shoulder-press": "Upper Push",
  "vertical-pull": "Upper Pull",
  pullover: "Upper Pull",
  pulldown: "Upper Pull",
  "pull-up": "Upper Pull",
  carry: "Athletic",
  crawl: "Athletic",
  jump: "Athletic",
  sprint: "Athletic",
  throw: "Athletic",
  rotation: "Core",
  "anti-rotation": "Core",
  flexion: "Core",
  "anti-extension": "Core",
  "anti-lateral-flexion": "Core",
  "brace-plank": "Core",
  "knee-extension": "Lower Body Isolation",
  "knee-flexion": "Lower Body Isolation",
  "leg-extension": "Lower Body Isolation",
  "leg-curl": "Lower Body Isolation",
  "hip-thrust-bridge": "Lower Body Compound",
  "hip-thrust-glute-bridge": "Lower Body Compound",
  "calf-raise": "Lower Body Isolation",
  "tibialis-raise": "Lower Body Isolation",
  "hip-abduction": "Lower Body Isolation",
  "hip-adduction": "Lower Body Isolation",
  "hip-internal-rotation": "Lower Body Isolation",
  "hip-external-rotation": "Lower Body Isolation",
  "biceps-curl": "Arm Isolation",
  curl: "Arm Isolation",
  "triceps-extension": "Arm Isolation",
  "wrist-flexion": "Arm Isolation",
  "wrist-extension": "Arm Isolation",
  "wrist-rotation": "Arm Isolation",
  "lateral-raise": "Upper Push",
  "reverse-fly": "Upper Pull",
  "rear-delt-raise": "Upper Pull",
  "face-pull": "Arm Isolation",
  "shoulder-internal-rotation": "Arm Isolation",
  "shoulder-external-rotation": "Arm Isolation",
  "scapular-control": "Arm Isolation",
  shrug: "Upper Pull",
  "step-up": "Lower Body Compound",
  "step-down": "Lower Body Compound",
  "split-squat": "Lower Body Compound",
  "clean-pull": "Athletic",
  "high-pull": "Athletic",
  "kettlebell-swing": "Athletic",
  "kettlebell-clean": "Athletic",
  "kettlebell-snatch": "Athletic",
  "turkish-get-up": "Athletic",
  "kettlebell-halo": "Athletic",
  "bottoms-up-press": "Athletic",
  "mobility-flow": "Mobility",
  mobility: "Mobility",
  "breathing-bracing": "Mobility",
  "neck-flexion": "Cervical Isolation",
  "neck-extension": "Cervical Isolation",
  "neck-rotation": "Cervical Isolation",
  "jump-landing": "Athletic",
  "medicine-ball-slam": "Athletic",
  burpee: "Athletic",
  "sled-drive": "Athletic",
  "integrated-movement": "Integrated",
};

const movementTypeGroupByPatternId: Partial<
  Record<MovementPatternId, MovementTypeGroup>
> = {
  "horizontal-push": "Upper Push",
  "horizontal-pull": "Upper Pull",
  "vertical-push": "Upper Push",
  "vertical-pull": "Upper Pull",
  squat: "Lower Body Compound",
  hinge: "Lower Body Compound",
  lunge: "Lower Body Compound",
  "step-up": "Lower Body Compound",
  "hip-thrust-bridge": "Lower Body Compound",
  gait: "Athletic",
  "knee-extension": "Lower Body Isolation",
  "knee-flexion": "Lower Body Isolation",
  "hip-extension": "Lower Body Compound",
  "hip-abduction": "Lower Body Isolation",
  "hip-adduction": "Lower Body Isolation",
  "hip-external-rotation": "Lower Body Isolation",
  "hip-internal-rotation": "Lower Body Isolation",
  "calf-raise": "Lower Body Isolation",
  "tibialis-raise": "Lower Body Isolation",
  plantarflexion: "Lower Body Isolation",
  dorsiflexion: "Lower Body Isolation",
  "chest-press": "Upper Push",
  "shoulder-press": "Upper Push",
  "chest-fly": "Upper Push",
  "lateral-raise": "Upper Push",
  row: "Upper Pull",
  pullover: "Upper Pull",
  "reverse-fly": "Upper Pull",
  curl: "Arm Isolation",
  "triceps-extension": "Arm Isolation",
  "elbow-flexion": "Arm Isolation",
  "elbow-extension": "Arm Isolation",
  "wrist-flexion": "Arm Isolation",
  "wrist-extension": "Arm Isolation",
  "wrist-rotation": "Arm Isolation",
  "shoulder-abduction": "Upper Push",
  "shoulder-external-rotation": "Arm Isolation",
  "shoulder-internal-rotation": "Arm Isolation",
  "scapular-control": "Arm Isolation",
  "scapular-retraction": "Upper Pull",
  "scapular-protraction": "Upper Push",
  "step-gait-jump": "Athletic",
  "ballistic-hinge": "Athletic",
  "ballistic-throw-slam": "Athletic",
  "olympic-pull-catch": "Athletic",
  "mobility-flow": "Mobility",
  "locomotion-conditioning": "Athletic",
  "sled-drive": "Athletic",
  rotation: "Core",
  "anti-rotation": "Core",
  flexion: "Core",
  "anti-extension": "Core",
  "anti-lateral-flexion": "Core",
  carry: "Athletic",
  crawl: "Athletic",
  jump: "Athletic",
  sprint: "Athletic",
  throw: "Athletic",
  brace: "Core",
  mobility: "Mobility",
  "breathing-bracing": "Mobility",
  "neck-flexion": "Cervical Isolation",
  "neck-extension": "Cervical Isolation",
  "neck-rotation": "Cervical Isolation",
  "integrated-movement": "Integrated",
};

const friendlyMovementPatternLabels: Partial<Record<MovementPatternId, string>> = {
  plantarflexion: "Calf Raise / Plantar Flexion",
  dorsiflexion: "Tibialis Raise",
  "calf-raise": "Calf Raise",
  "tibialis-raise": "Tibialis Raise",
  "hip-thrust-bridge": "Hip Thrust / Bridge",
  "chest-press": "Chest Press",
  "shoulder-press": "Shoulder Press",
  "chest-fly": "Chest Fly",
  "lateral-raise": "Lateral Raise",
  row: "Row",
  pullover: "Pullover",
  "reverse-fly": "Reverse Fly",
  curl: "Curl",
  "triceps-extension": "Triceps Extension",
  "hip-external-rotation": "Hip External Rotation",
  "hip-internal-rotation": "Hip Internal Rotation",
  "scapular-control": "Scapular Control",
  "scapular-retraction": "Reverse Fly / Scapular Retraction",
  "scapular-protraction": "Scapular Protraction",
  "shoulder-external-rotation": "Shoulder External Rotation",
  "shoulder-internal-rotation": "Shoulder Internal Rotation",
  "wrist-flexion": "Wrist Flexion",
  "wrist-extension": "Wrist Extension",
  "wrist-rotation": "Wrist Rotation",
  "breathing-bracing": "Breathing / Bracing",
  "neck-flexion": "Neck Flexion",
  "neck-extension": "Neck Extension",
  "neck-rotation": "Neck Rotation",
  flexion: "Flexion",
  "anti-extension": "Anti-Extension",
  "anti-lateral-flexion": "Anti-Lateral Flexion",
  crawl: "Crawl",
  jump: "Jump",
  sprint: "Sprint",
  throw: "Throw",
  mobility: "Mobility",
  "integrated-movement": "Integrated Movement",
};

const movementTypeMatchesItem = (
  option: Pick<MovementTypeOption, "coreMovementIds" | "movementPatternIds">,
  item: NormalizedExerciseCatalogItem,
) =>
  option.coreMovementIds.includes(item.coreMovementId) ||
  option.movementPatternIds.includes(item.movementPatternId);

const countMovementTypeItems = (
  option: Pick<MovementTypeOption, "coreMovementIds" | "movementPatternIds">,
) => {
  const matchedIds = new Set(
    normalizedCatalog.items
      .filter((item) => movementTypeMatchesItem(option, item))
      .map((item) => item.id),
  );

  return matchedIds.size;
};

const createMovementTypeOptions = (): MovementTypeOption[] => {
  const supportedDefinitions = movementTypeDefinitions.map((definition) => ({
    ...definition,
    count: countMovementTypeItems(definition),
  }));
  const coveredCoreMovementIds = new Set(
    supportedDefinitions.flatMap((option) => option.coreMovementIds),
  );
  const coveredPatternIds = new Set(
    supportedDefinitions.flatMap((option) => option.movementPatternIds),
  );
  const fallbackCoreOptions = normalizedCatalog.filterOptions.coreMovements
    .filter((option) => !coveredCoreMovementIds.has(option.id))
    .map<MovementTypeOption>((option) => ({
      value: `core:${option.id}`,
      label: CORE_MOVEMENT_BY_ID[option.id]?.label || option.label,
      group:
        movementTypeGroupByCoreMovementId[option.id] || "Arm Isolation",
      coreMovementIds: [option.id],
      movementPatternIds: [],
      count: option.count,
    }));
  const fallbackPatternOptions = normalizedCatalog.filterOptions.movementPatterns
    .filter((option) => !coveredPatternIds.has(option.id))
    .map<MovementTypeOption>((option) => ({
      value: `pattern:${option.id}`,
      label:
        friendlyMovementPatternLabels[option.id] ||
        MOVEMENT_PATTERN_BY_ID[option.id]?.label ||
        option.label,
      group: movementTypeGroupByPatternId[option.id] || "Arm Isolation",
      coreMovementIds: [],
      movementPatternIds: [option.id],
      count: option.count,
    }));

  return [
    ...supportedDefinitions,
    ...fallbackCoreOptions,
    ...fallbackPatternOptions,
  ].sort((left, right) => {
    const groupDelta =
      movementTypeGroupOrder.indexOf(left.group) -
      movementTypeGroupOrder.indexOf(right.group);

    return groupDelta || left.label.localeCompare(right.label);
  });
};

const movementTypeOptions = createMovementTypeOptions();
const movementTypeOptionByValue = new Map(
  movementTypeOptions.map((option) => [option.value, option]),
);
const movementTypeFilterOptions: FilterMenuOption[] = [
  {
    value: "All",
    label: "All Movement Types",
    group: "All",
    helper: `${movementTypeOptions.length} supported types`,
  },
  ...movementTypeOptions.map((option) => ({
    value: option.value,
    label: option.label,
    group: option.group,
    helper:
      option.count > 0
        ? `${option.count} movement${option.count === 1 ? "" : "s"}`
        : "No mapped exercises yet",
  })),
];

// Internal migration marker: system exercises now come from the normalized
// catalog service, converted back to the current Exercise shape for this page.
const normalizedSystemExercises =
  getExerciseCatalogWithLegacyFallback() as Exercise[];

const normalizedMetadataByExerciseId = new Map(
  normalizedCatalog.items.map((item) => [item.legacyExerciseId, item]),
);

const defaultImage =
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=900";

type BuilderSelectableExercise = Pick<
  Exercise,
  "id" | "name" | "body" | "pattern" | "goal" | "equipment"
> &
  Partial<Pick<Exercise, "muscles" | "level" | "image" | "cue">>;

const toBuilderCatalogExercise = (
  exercise: BuilderSelectableExercise,
): ExerciseCatalogItem => ({
  id: exercise.id,
  name: exercise.name,
  body: exercise.body,
  muscles: exercise.muscles || "",
  pattern: exercise.pattern,
  goal: exercise.goal,
  equipment: exercise.equipment,
  level: exercise.level || "",
  image: exercise.image || defaultImage,
  cue:
    exercise.cue ||
    "Move with control, own the position, and make every rep count.",
});

const baseGoals = [
  "Strength",
  "Hypertrophy",
  "Stability",
  "Mobility",
  "Recovery",
  "Power",
  "Conditioning",
];

const getUniqueOptions = (items: Exercise[], key: keyof Exercise) => {
  return [
    "All",
    ...Array.from(
      new Set(
        items
          .map((item) => item[key])
          .filter(Boolean)
          .map((value) => String(value)),
      ),
    ).sort(),
  ];
};

const labelize = (value: string) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getModifierLabel = (modifierId: string) =>
  EXERCISE_MODIFIER_BY_ID[modifierId as keyof typeof EXERCISE_MODIFIER_BY_ID]
    ?.label || labelize(modifierId.split(":").pop() || modifierId);

const getModifierCategoryLabel = (categoryId: ExerciseModifierCategoryId) =>
  categoryId === "apparatus"
    ? "Equipment"
    : EXERCISE_MODIFIER_CATEGORY_BY_ID[categoryId]?.label || labelize(categoryId);

const getMetadataForExercise = (exercise: Exercise) =>
  exercise.custom
    ? null
    : normalizedMetadataByExerciseId.get(exercise.id) || null;

const getModifierLabelsByCategory = (
  metadata: NormalizedExerciseCatalogItem | null,
  categoryId: ExerciseModifierCategoryId,
) =>
  (metadata?.modifiersByCategory[categoryId] || [])
    .map(getModifierLabel)
    .filter(Boolean);

const getModifierLabelsByCategoryFromIds = (
  modifierIds: ExerciseModifierId[],
  categoryId: ExerciseModifierCategoryId,
) =>
  modifierIds
    .filter((modifierId) => getModifierCategoryId(modifierId) === categoryId)
    .map(getModifierLabel)
    .filter(Boolean);

const getCompatibleModifierGroups = (
  metadata: NormalizedExerciseCatalogItem | null,
) => {
  if (!metadata) return [];

  const groups = getCompatibleModifiersForMovement(metadata.coreMovementId)
    .reduce<
      Partial<
        Record<
        ExerciseModifierCategoryId,
        {
          categoryId: ExerciseModifierCategoryId;
          label: string;
          displayOrder: number;
          modifiers: ExerciseModifier[];
        }
        >
      >
    >((acc, modifier) => {
      const category = EXERCISE_MODIFIER_CATEGORY_BY_ID[modifier.categoryId];

      if (!acc[modifier.categoryId]) {
        acc[modifier.categoryId] = {
          categoryId: modifier.categoryId,
          label: getModifierCategoryLabel(modifier.categoryId),
          displayOrder: category?.displayOrder || 999,
          modifiers: [],
        };
      }

      const group = acc[modifier.categoryId];
      if (group) group.modifiers.push(modifier);
      return acc;
    }, {});

  metadata.semanticVariations
    .flatMap((variation) => variation.modifierIds)
    .forEach((modifierId) => {
      const modifier = EXERCISE_MODIFIER_BY_ID[modifierId];
      if (!modifier) return;

      const category = EXERCISE_MODIFIER_CATEGORY_BY_ID[modifier.categoryId];

      if (!groups[modifier.categoryId]) {
        groups[modifier.categoryId] = {
          categoryId: modifier.categoryId,
          label: getModifierCategoryLabel(modifier.categoryId),
          displayOrder: category?.displayOrder || 999,
          modifiers: [],
        };
      }

      const group = groups[modifier.categoryId];
      if (
        group &&
        !group.modifiers.some((existing) => existing.id === modifier.id)
      ) {
        group.modifiers.push(modifier);
      }
    });

  return Object.values(groups)
    .filter(Boolean)
    .map((group) => ({
      ...group,
      modifiers: group.modifiers.sort(
        (a, b) => a.displayOrder - b.displayOrder,
      ),
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder);
};

const getModifierCategoryId = (modifierId: string) =>
  EXERCISE_MODIFIER_BY_ID[modifierId as keyof typeof EXERCISE_MODIFIER_BY_ID]
    ?.categoryId || null;

const getSelectedModifiersByCategory = (
  modifierIds: ExerciseModifierId[],
  categoryId: ExerciseModifierCategoryId,
) =>
  modifierIds
    .map((modifierId) => EXERCISE_MODIFIER_BY_ID[modifierId])
    .filter(
      (modifier): modifier is ExerciseModifier =>
        Boolean(modifier) && modifier.categoryId === categoryId,
    );

const equipmentLabelReplacements: Record<string, string> = {
  db: "Dumbbell",
  dumbell: "Dumbbell",
  dumbbell: "Dumbbell",
  kb: "Kettlebell",
  kettlebell: "Kettlebell",
  "kettle bell": "Kettlebell",
  "kettle bell ": "Kettlebell",
  "kettle-ball": "Kettlebell",
  "medicine ball": "Medicine Ball",
  "med ball": "Medicine Ball",
  bodyweight: "Bodyweight",
  barbell: "Barbell",
  machine: "Machine",
  cable: "Cable",
  band: "Band",
  "trap bar": "Trap Bar",
  trx: "TRX",
  landmine: "Landmine",
  box: "Box",
  sled: "Sled",
  "stability ball": "Stability Ball",
  suspension: "TRX",
  "suspension trainer": "TRX",
  "suspension training": "TRX",
};

const normalizeEquipmentLabel = (label: string) => {
  const normalizedKey = label.trim().toLowerCase().replace(/\s+/g, " ");
  return equipmentLabelReplacements[normalizedKey] || label.trim();
};

const getModifierDisplayLabel = (modifier: ExerciseModifier) =>
  modifier.categoryId === "apparatus"
    ? normalizeEquipmentLabel(modifier.label)
    : modifier.label;

const normalizeModifierDisplayKey = (label: string) =>
  label.trim().toLowerCase().replace(/\s+/g, " ");

const dedupeModifierOptionsByDisplayLabel = (modifiers: ExerciseModifier[]) => {
  const seen = new Set<string>();

  return modifiers.filter((modifier) => {
    const key = normalizeModifierDisplayKey(getModifierDisplayLabel(modifier));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getApparatusFilterLabelsForMetadata = (
  metadata: NormalizedExerciseCatalogItem | null,
) =>
  Array.from(
    new Set(
      [
        ...getModifierLabelsByCategory(metadata, "apparatus"),
        ...(metadata?.semanticVariations || []).flatMap((variation) =>
          getModifierLabelsByCategoryFromIds(variation.modifierIds, "apparatus"),
        ),
      ]
        .map(normalizeEquipmentLabel)
        .filter(Boolean),
    ),
  );

const positionLimbUsageModifierIds = new Set<ExerciseModifierId>([
  "limb-usage:standard-stance",
  "limb-usage:conventional-stance",
  "limb-usage:sumo-stance",
  "limb-usage:wide-stance",
]);

const modifierIds = (ids: string[]) => ids as ExerciseModifierId[];

type CardModifierControlDefinition = {
  key: string;
  label: string;
  categories: ExerciseModifierCategoryId[];
  optionIds?: ExerciseModifierId[];
  accent: "cyan" | "emerald" | "yellow" | "violet";
};

const cardModifierControlPresets: Partial<
  Record<CoreMovementId, CardModifierControlDefinition[]>
> = {
  squat: [
    {
      key: "squat-equipment",
      label: "Equipment",
      categories: ["apparatus"],
      optionIds: modifierIds([
        "apparatus:bodyweight",
        "apparatus:dumbbell",
        "apparatus:kettlebell",
        "apparatus:barbell",
        "apparatus:machine",
        "apparatus:smith-machine",
        "apparatus:landmine",
        "apparatus:trx",
        "apparatus:band",
        "apparatus:cable",
      ]),
      accent: "cyan",
    },
    {
      key: "squat-load-position",
      label: "Load Position",
      categories: ["angle-position"],
      optionIds: modifierIds([
        "angle-position:goblet",
        "angle-position:front-loaded",
        "angle-position:back-loaded",
        "angle-position:overhead",
      ]),
      accent: "emerald",
    },
    {
      key: "squat-stance",
      label: "Stance",
      categories: ["limb-usage"],
      optionIds: modifierIds([
        "limb-usage:standard-stance",
        "limb-usage:wide-stance",
        "limb-usage:sumo-stance",
        "limb-usage:staggered",
        "limb-usage:single-leg",
        "limb-usage:unilateral",
      ]),
      accent: "violet",
    },
  ],
  "chest-press": [
    {
      key: "chest-press-equipment",
      label: "Equipment",
      categories: ["apparatus"],
      optionIds: modifierIds([
        "apparatus:bodyweight",
        "apparatus:dumbbell",
        "apparatus:barbell",
        "apparatus:machine",
        "apparatus:cable",
        "apparatus:band",
        "apparatus:trx",
        "apparatus:landmine",
      ]),
      accent: "cyan",
    },
    {
      key: "chest-press-position-angle",
      label: "Position / Angle",
      categories: ["angle-position"],
      optionIds: modifierIds([
        "angle-position:floor",
        "angle-position:flat",
        "angle-position:incline",
        "angle-position:decline",
        "angle-position:hands-elevated",
        "angle-position:feet-elevated",
      ]),
      accent: "violet",
    },
    {
      key: "chest-press-grip-width",
      label: "Grip Width",
      categories: ["limb-usage"],
      optionIds: modifierIds([
        "limb-usage:standard-stance",
        "limb-usage:close-grip",
        "limb-usage:wide-grip",
        "limb-usage:neutral-grip",
      ]),
      accent: "emerald",
    },
  ],
  "chest-fly": [
    {
      key: "fly-equipment",
      label: "Equipment",
      categories: ["apparatus"],
      optionIds: modifierIds([
        "apparatus:dumbbell",
        "apparatus:cable",
        "apparatus:machine",
        "apparatus:band",
        "apparatus:trx",
      ]),
      accent: "cyan",
    },
    {
      key: "fly-position",
      label: "Position",
      categories: ["angle-position"],
      optionIds: modifierIds([
        "angle-position:flat",
        "angle-position:incline",
        "angle-position:decline",
        "angle-position:standing",
        "angle-position:bent-over",
        "angle-position:seated",
        "angle-position:chest-supported",
      ]),
      accent: "violet",
    },
    {
      key: "fly-angle-path",
      label: "Angle / Path",
      categories: ["limb-usage", "range-of-motion"],
      optionIds: modifierIds([
        "limb-usage:wide-grip",
        "limb-usage:close-grip",
        "range-of-motion:partial-rom",
        "range-of-motion:full-rom",
      ]),
      accent: "emerald",
    },
  ],
  "reverse-fly": [
    {
      key: "reverse-fly-equipment",
      label: "Equipment",
      categories: ["apparatus"],
      optionIds: modifierIds([
        "apparatus:dumbbell",
        "apparatus:cable",
        "apparatus:machine",
        "apparatus:band",
        "apparatus:trx",
      ]),
      accent: "cyan",
    },
    {
      key: "reverse-fly-position",
      label: "Position",
      categories: ["angle-position"],
      optionIds: modifierIds([
        "angle-position:flat",
        "angle-position:incline",
        "angle-position:decline",
        "angle-position:standing",
        "angle-position:bent-over",
        "angle-position:seated",
        "angle-position:chest-supported",
      ]),
      accent: "violet",
    },
    {
      key: "reverse-fly-angle-path",
      label: "Angle / Path",
      categories: ["direction", "limb-usage", "range-of-motion"],
      optionIds: modifierIds([
        "direction:reverse",
        "limb-usage:wide-grip",
        "limb-usage:close-grip",
        "range-of-motion:partial-rom",
        "range-of-motion:full-rom",
      ]),
      accent: "emerald",
    },
  ],
  "lateral-raise": [
    {
      key: "lateral-raise-equipment",
      label: "Equipment",
      categories: ["apparatus"],
      optionIds: modifierIds([
        "apparatus:dumbbell",
        "apparatus:cable",
        "apparatus:band",
        "apparatus:machine",
      ]),
      accent: "cyan",
    },
    {
      key: "lateral-raise-position",
      label: "Position",
      categories: ["angle-position"],
      optionIds: modifierIds([
        "angle-position:standing",
        "angle-position:seated",
        "angle-position:side-lying",
      ]),
      accent: "violet",
    },
    {
      key: "lateral-raise-angle-path",
      label: "Angle / Path",
      categories: ["direction", "range-of-motion"],
      optionIds: modifierIds([
        "direction:lateral",
        "range-of-motion:partial-rom",
        "range-of-motion:full-rom",
      ]),
      accent: "emerald",
    },
  ],
  row: [
    {
      key: "row-equipment",
      label: "Equipment",
      categories: ["apparatus"],
      optionIds: modifierIds([
        "apparatus:dumbbell",
        "apparatus:kettlebell",
        "apparatus:barbell",
        "apparatus:cable",
        "apparatus:machine",
        "apparatus:band",
        "apparatus:trx",
        "apparatus:landmine",
      ]),
      accent: "cyan",
    },
    {
      key: "row-position",
      label: "Position",
      categories: ["angle-position"],
      optionIds: modifierIds([
        "angle-position:bent-over",
        "angle-position:chest-supported",
        "angle-position:standing",
        "angle-position:split-stance",
        "angle-position:plank",
        "angle-position:seated",
      ]),
      accent: "violet",
    },
    {
      key: "row-grip-structure",
      label: "Grip / Structure",
      categories: ["limb-usage", "range-of-motion", "stability"],
      optionIds: modifierIds([
        "limb-usage:neutral-grip",
        "limb-usage:underhand-grip",
        "limb-usage:overhand-grip",
        "limb-usage:wide-grip",
        "limb-usage:close-grip",
        "limb-usage:single-arm",
        "limb-usage:alternating",
        "limb-usage:bilateral",
        "range-of-motion:dead-stop",
        "stability:balance-focused",
      ]),
      accent: "emerald",
    },
  ],
  hinge: [
    {
      key: "hinge-equipment",
      label: "Equipment",
      categories: ["apparatus"],
      optionIds: modifierIds([
        "apparatus:barbell",
        "apparatus:dumbbell",
        "apparatus:kettlebell",
        "apparatus:trap-bar",
        "apparatus:cable",
        "apparatus:band",
        "apparatus:machine",
        "apparatus:landmine",
      ]),
      accent: "cyan",
    },
    {
      key: "hinge-stance",
      label: "Stance",
      categories: ["limb-usage"],
      optionIds: modifierIds([
        "limb-usage:conventional-stance",
        "limb-usage:sumo-stance",
        "limb-usage:wide-stance",
        "limb-usage:staggered",
        "limb-usage:single-leg",
      ]),
      accent: "violet",
    },
    {
      key: "hinge-rom-tempo",
      label: "ROM / Tempo",
      categories: ["range-of-motion", "tempo", "load-behavior"],
      optionIds: modifierIds([
        "range-of-motion:dead-stop",
        "range-of-motion:deficit",
        "range-of-motion:full-rom",
        "tempo:slow-eccentric",
        "tempo:explosive",
        "load-behavior:ballistic",
      ]),
      accent: "emerald",
    },
  ],
  lunge: [
    {
      key: "lunge-equipment",
      label: "Equipment",
      categories: ["apparatus"],
      optionIds: modifierIds([
        "apparatus:bodyweight",
        "apparatus:dumbbell",
        "apparatus:kettlebell",
        "apparatus:barbell",
        "apparatus:landmine",
        "apparatus:band",
        "apparatus:cable",
        "apparatus:trx",
      ]),
      accent: "cyan",
    },
    {
      key: "lunge-direction",
      label: "Direction",
      categories: ["direction"],
      optionIds: modifierIds([
        "direction:reverse",
        "direction:forward",
        "direction:walking",
        "direction:lateral",
        "direction:crossover",
      ]),
      accent: "emerald",
    },
    {
      key: "lunge-position-stance",
      label: "Position / Stance",
      categories: ["angle-position", "limb-usage", "range-of-motion"],
      optionIds: modifierIds([
        "angle-position:split-stance",
        "angle-position:rear-foot-elevated",
        "limb-usage:unilateral",
        "limb-usage:alternating",
        "limb-usage:wide-stance",
        "range-of-motion:deficit",
      ]),
      accent: "violet",
    },
  ],
};

const defaultEquipmentControl: CardModifierControlDefinition = {
  key: "fallback-equipment",
  label: "Equipment",
  categories: ["apparatus"],
  accent: "cyan",
};

const defaultPositionControl: CardModifierControlDefinition = {
  key: "fallback-position",
  label: "Position",
  categories: ["angle-position", "limb-usage"],
  optionIds: modifierIds([
    "angle-position:floor",
    "angle-position:flat",
    "angle-position:incline",
    "angle-position:decline",
    "angle-position:standing",
    "angle-position:seated",
    "angle-position:bent-over",
    "angle-position:chest-supported",
    "angle-position:plank",
    "angle-position:supine",
    "angle-position:prone",
    "angle-position:side-lying",
    "angle-position:quadruped",
    "angle-position:split-stance",
    "angle-position:rear-foot-elevated",
    "angle-position:half-kneeling",
    "limb-usage:standard-stance",
    "limb-usage:conventional-stance",
    "limb-usage:sumo-stance",
    "limb-usage:wide-stance",
  ]),
  accent: "violet",
};

const getFallbackThirdControl = (
  coreMovementId?: CoreMovementId | null,
): CardModifierControlDefinition => {
  if (
    coreMovementId &&
    [
      "curl",
      "biceps-curl",
      "triceps-extension",
      "shoulder-press",
      "pulldown",
      "pull-up",
      "pullover",
    ].includes(coreMovementId)
  ) {
    return {
      key: "fallback-grip",
      label: "Grip / Structure",
      categories: ["limb-usage"],
      accent: "emerald",
    };
  }

  if (
    coreMovementId &&
    ["carry", "crawl", "jump", "sprint", "throw"].includes(coreMovementId)
  ) {
    return {
      key: "fallback-direction-structure",
      label: "Direction / Structure",
      categories: ["direction", "limb-usage", "load-behavior", "tempo"],
      accent: "emerald",
    };
  }

  if (
    coreMovementId &&
    [
      "leg-extension",
      "leg-curl",
      "knee-extension",
      "knee-flexion",
      "hip-abduction",
      "hip-adduction",
      "hip-internal-rotation",
      "hip-external-rotation",
      "calf-raise",
      "tibialis-raise",
      "wrist-flexion",
      "wrist-extension",
      "wrist-rotation",
    ].includes(coreMovementId)
  ) {
    return {
      key: "fallback-rom-tempo",
      label: "ROM / Tempo",
      categories: ["range-of-motion", "tempo"],
      accent: "emerald",
    };
  }

  return {
    key: "fallback-modifier",
    label: "Modifier",
    categories: ["direction", "limb-usage", "range-of-motion", "load-behavior"],
    accent: "emerald",
  };
};

const getGeneratedVariationName = (
  exercise: Exercise,
  metadata: NormalizedExerciseCatalogItem | null,
  selectedModifierIds: ExerciseModifierId[],
) => {
  if (!metadata) return exercise.name;

  try {
    return createExerciseVariation(
      {
        coreMovementId: metadata.coreMovementId,
        modifierIds: selectedModifierIds,
      },
      { apparatusLabel: "full" },
    ).displayName;
  } catch {
    return metadata.coreMovementLabel;
  }
};

const getSelectedEquipmentLabel = (
  exercise: Exercise,
  metadata: NormalizedExerciseCatalogItem | null,
  selectedModifierIds: ExerciseModifierId[],
) => {
  const selectedApparatus = getSelectedModifiersByCategory(
    selectedModifierIds,
    "apparatus",
  );
  const mappedApparatus = getModifierLabelsByCategory(metadata, "apparatus").map(
    normalizeEquipmentLabel,
  );

  return (
    selectedApparatus.map(getModifierDisplayLabel).join(", ") ||
    mappedApparatus.join(", ") ||
    exercise.equipment
  );
};

const normalizeGeneratedTitlePart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getPrimaryEquipmentPrefix = (equipmentLabel: string) =>
  equipmentLabel
    .split(/\s*,\s*|\s+or\s+|\s*\/\s*/i)
    .map((part) => part.trim())
    .find((part) => part && part.toLowerCase() !== "all") || "";

const semanticNameIncludesEquipment = (
  semanticVariationName: string,
  equipmentLabel: string,
) => {
  const semanticName = normalizeGeneratedTitlePart(semanticVariationName);
  const equipmentName = normalizeGeneratedTitlePart(equipmentLabel);
  if (!semanticName || !equipmentName) return false;

  const equipmentAliases: Record<string, string[]> = {
    "medicine ball": ["medicine ball", "med ball"],
    "stability ball": ["stability ball", "swiss ball"],
    trx: ["trx", "suspension", "suspension trainer", "suspension training"],
    suspension: ["suspension", "trx", "suspension trainer", "suspension training"],
  };
  const aliases = equipmentAliases[equipmentName] || [equipmentName];

  return aliases.some((alias) => {
    const normalizedAlias = normalizeGeneratedTitlePart(alias);
    return (
      semanticName === normalizedAlias ||
      semanticName.startsWith(`${normalizedAlias} `)
    );
  });
};

const semanticNameImpliesBodyweight = (semanticVariationName: string) => {
  const semanticName = normalizeGeneratedTitlePart(semanticVariationName);

  return [
    "air squat",
    "pull up",
    "chin up",
    "plank",
    "side plank",
    "crunch",
    "sit up",
    "reverse crunch",
    "hanging leg raise",
    "burpee",
    "bear crawl",
    "leopard crawl",
    "lateral crawl",
    "box jump",
    "broad jump",
    "depth jump",
    "single leg hop",
    "hill sprint",
    "shuttle sprint",
  ].some((bodyweightName) => semanticName.includes(bodyweightName));
};

const getGeneratedCardTitle = ({
  exercise,
  metadata,
  semanticVariationName,
  equipmentLabel,
}: {
  exercise: Exercise;
  metadata: NormalizedExerciseCatalogItem | null;
  semanticVariationName: string;
  equipmentLabel: string;
}) => {
  const semanticName = semanticVariationName.trim();
  const fallbackTitle = metadata?.coreMovementLabel || exercise.name;

  if (!semanticName) return fallbackTitle;

  const equipmentPrefix = getPrimaryEquipmentPrefix(equipmentLabel);
  if (
    !equipmentPrefix ||
    semanticNameIncludesEquipment(semanticName, equipmentPrefix) ||
    (normalizeGeneratedTitlePart(equipmentPrefix) === "bodyweight" &&
      semanticNameImpliesBodyweight(semanticName))
  ) {
    return semanticName;
  }

  return `${equipmentPrefix} ${semanticName}`;
};

const getSelectedGoalLabel = (
  exercise: Exercise,
  selectedModifierIds: ExerciseModifierId[],
) => {
  const selectedIntent = getSelectedModifiersByCategory(
    selectedModifierIds,
    "training-intent",
  );

  return selectedIntent.map((modifier) => modifier.label).join(", ") || exercise.goal;
};

type MovementArchitectureChipTone =
  | "movement"
  | "secondary"
  | "classification"
  | "equipment"
  | "position"
  | "stability"
  | "modifier"
  | "integrated"
  | "fallback";

type MovementArchitectureChip = {
  key: string;
  label: string;
  tone: MovementArchitectureChipTone;
};

const movementArchitectureChipClasses: Record<
  MovementArchitectureChipTone,
  string
> = {
  movement:
    "border-cyan-300/25 bg-cyan-400/12 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.08)]",
  secondary:
    "border-blue-300/25 bg-blue-400/12 text-blue-100 shadow-[0_0_16px_rgba(96,165,250,0.08)]",
  classification:
    "border-emerald-300/20 bg-emerald-400/10 text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.08)]",
  equipment:
    "border-cyan-300/25 bg-cyan-400/12 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.08)]",
  position:
    "border-violet-300/25 bg-violet-400/12 text-violet-100 shadow-[0_0_16px_rgba(167,139,250,0.08)]",
  stability:
    "border-teal-300/25 bg-teal-400/12 text-teal-100 shadow-[0_0_16px_rgba(45,212,191,0.08)]",
  modifier:
    "border-teal-300/25 bg-teal-400/12 text-teal-100 shadow-[0_0_16px_rgba(45,212,191,0.08)]",
  integrated:
    "border-yellow-300/30 bg-yellow-400/15 text-yellow-100 shadow-[0_0_18px_rgba(250,204,21,0.10)]",
  fallback:
    "border-white/10 bg-white/[0.035] text-slate-400",
};

type CategoryTheme = {
  surfaceClass: string;
  cardClass: string;
  overlayClass: string;
  accentClass: string;
  pillClass: string;
  hoverClass: string;
  tabClass: string;
  tabHoverClass: string;
};

const categoryThemeFallback: CategoryTheme = {
  surfaceClass:
    "bg-[linear-gradient(135deg,rgba(30,41,59,0.42),rgba(15,23,42,0.76),rgba(2,6,23,0.92))]",
  cardClass:
    "border-slate-300/15 shadow-[0_18px_58px_rgba(0,0,0,0.38),0_0_24px_rgba(148,163,184,0.055),inset_0_1px_0_rgba(255,255,255,0.16)]",
  overlayClass:
    "bg-[radial-gradient(circle_at_20%_0%,rgba(148,163,184,0.16),transparent_34%),linear-gradient(120deg,rgba(255,255,255,0.11)_0%,rgba(255,255,255,0.035)_42%,transparent_74%)]",
  accentClass:
    "bg-gradient-to-r from-transparent via-slate-300/50 to-transparent",
  pillClass:
    "border-slate-300/20 bg-slate-300/10 text-slate-200 shadow-[0_0_16px_rgba(148,163,184,0.08)]",
  hoverClass:
    "hover:border-slate-200/28 hover:shadow-[0_26px_86px_rgba(0,0,0,0.48),0_0_34px_rgba(148,163,184,0.12),inset_0_1px_0_rgba(255,255,255,0.20)]",
  tabClass:
    "bg-[linear-gradient(135deg,rgba(148,163,184,0.88),rgba(100,116,139,0.72))] text-slate-950 shadow-[0_0_24px_rgba(148,163,184,0.18),inset_0_1px_0_rgba(255,255,255,0.34)] ring-1 ring-slate-100/45",
  tabHoverClass:
    "hover:bg-[linear-gradient(135deg,rgba(148,163,184,0.18),rgba(15,23,42,0.88))] hover:text-slate-50 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:ring-slate-200/35",
};

const categoryThemes: Record<string, CategoryTheme> = {
  "lower body compound": {
    surfaceClass:
      "bg-[linear-gradient(135deg,rgba(6,78,59,0.34),rgba(15,23,42,0.76),rgba(2,6,23,0.92))]",
    cardClass:
      "border-emerald-300/22 shadow-[0_18px_58px_rgba(0,0,0,0.38),0_0_28px_rgba(16,185,129,0.10),inset_0_1px_0_rgba(255,255,255,0.16)]",
    overlayClass:
      "bg-[radial-gradient(circle_at_20%_0%,rgba(16,185,129,0.18),transparent_34%),linear-gradient(120deg,rgba(16,185,129,0.12)_0%,rgba(255,255,255,0.04)_42%,transparent_74%)]",
    accentClass:
      "bg-gradient-to-r from-transparent via-emerald-300/65 to-transparent",
    pillClass:
      "border-emerald-300/25 bg-emerald-400/12 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.10)]",
    hoverClass:
      "hover:border-emerald-200/36 hover:shadow-[0_26px_86px_rgba(0,0,0,0.50),0_0_36px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(255,255,255,0.22)]",
    tabClass:
      "bg-[linear-gradient(135deg,rgba(52,211,153,0.98),rgba(16,185,129,0.78))] text-slate-950 shadow-[0_0_26px_rgba(16,185,129,0.26),inset_0_1px_0_rgba(255,255,255,0.38)] ring-1 ring-emerald-100/70",
    tabHoverClass:
      "hover:bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(15,23,42,0.88))] hover:text-emerald-50 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:ring-emerald-200/35",
  },
  "lower body isolation": {
    surfaceClass:
      "bg-[linear-gradient(135deg,rgba(63,98,18,0.32),rgba(15,23,42,0.76),rgba(2,6,23,0.92))]",
    cardClass:
      "border-lime-300/22 shadow-[0_18px_58px_rgba(0,0,0,0.38),0_0_28px_rgba(190,242,100,0.10),inset_0_1px_0_rgba(255,255,255,0.16)]",
    overlayClass:
      "bg-[radial-gradient(circle_at_20%_0%,rgba(190,242,100,0.16),transparent_34%),linear-gradient(120deg,rgba(132,204,22,0.10)_0%,rgba(255,255,255,0.04)_42%,transparent_74%)]",
    accentClass:
      "bg-gradient-to-r from-transparent via-lime-300/65 to-transparent",
    pillClass:
      "border-lime-300/25 bg-lime-400/12 text-lime-100 shadow-[0_0_18px_rgba(190,242,100,0.10)]",
    hoverClass:
      "hover:border-lime-200/36 hover:shadow-[0_26px_86px_rgba(0,0,0,0.50),0_0_36px_rgba(190,242,100,0.14),inset_0_1px_0_rgba(255,255,255,0.22)]",
    tabClass:
      "bg-[linear-gradient(135deg,rgba(190,242,100,0.98),rgba(132,204,22,0.78))] text-slate-950 shadow-[0_0_26px_rgba(190,242,100,0.24),inset_0_1px_0_rgba(255,255,255,0.38)] ring-1 ring-lime-100/70",
    tabHoverClass:
      "hover:bg-[linear-gradient(135deg,rgba(190,242,100,0.16),rgba(15,23,42,0.88))] hover:text-lime-50 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:ring-lime-200/35",
  },
  "upper push": {
    surfaceClass:
      "bg-[linear-gradient(135deg,rgba(8,145,178,0.32),rgba(15,23,42,0.76),rgba(2,6,23,0.92))]",
    cardClass:
      "border-cyan-300/22 shadow-[0_18px_58px_rgba(0,0,0,0.38),0_0_28px_rgba(34,211,238,0.10),inset_0_1px_0_rgba(255,255,255,0.16)]",
    overlayClass:
      "bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.17),transparent_34%),linear-gradient(120deg,rgba(56,189,248,0.11)_0%,rgba(255,255,255,0.04)_42%,transparent_74%)]",
    accentClass:
      "bg-gradient-to-r from-transparent via-cyan-300/65 to-transparent",
    pillClass:
      "border-cyan-300/25 bg-cyan-400/12 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.10)]",
    hoverClass:
      "hover:border-cyan-200/36 hover:shadow-[0_26px_86px_rgba(0,0,0,0.50),0_0_36px_rgba(34,211,238,0.15),inset_0_1px_0_rgba(255,255,255,0.22)]",
    tabClass:
      "bg-[linear-gradient(135deg,rgba(34,211,238,0.98),rgba(56,189,248,0.78))] text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.26),inset_0_1px_0_rgba(255,255,255,0.38)] ring-1 ring-cyan-100/70",
    tabHoverClass:
      "hover:bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(15,23,42,0.88))] hover:text-cyan-50 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:ring-cyan-200/35",
  },
  "upper pull": {
    surfaceClass:
      "bg-[linear-gradient(135deg,rgba(91,33,182,0.31),rgba(15,23,42,0.76),rgba(2,6,23,0.92))]",
    cardClass:
      "border-violet-300/22 shadow-[0_18px_58px_rgba(0,0,0,0.38),0_0_28px_rgba(167,139,250,0.10),inset_0_1px_0_rgba(255,255,255,0.16)]",
    overlayClass:
      "bg-[radial-gradient(circle_at_20%_0%,rgba(167,139,250,0.17),transparent_34%),linear-gradient(120deg,rgba(139,92,246,0.11)_0%,rgba(255,255,255,0.04)_42%,transparent_74%)]",
    accentClass:
      "bg-gradient-to-r from-transparent via-violet-300/65 to-transparent",
    pillClass:
      "border-violet-300/25 bg-violet-400/12 text-violet-100 shadow-[0_0_18px_rgba(167,139,250,0.10)]",
    hoverClass:
      "hover:border-violet-200/36 hover:shadow-[0_26px_86px_rgba(0,0,0,0.50),0_0_36px_rgba(167,139,250,0.15),inset_0_1px_0_rgba(255,255,255,0.22)]",
    tabClass:
      "bg-[linear-gradient(135deg,rgba(167,139,250,0.98),rgba(139,92,246,0.78))] text-slate-950 shadow-[0_0_26px_rgba(167,139,250,0.25),inset_0_1px_0_rgba(255,255,255,0.38)] ring-1 ring-violet-100/70",
    tabHoverClass:
      "hover:bg-[linear-gradient(135deg,rgba(167,139,250,0.17),rgba(15,23,42,0.88))] hover:text-violet-50 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:ring-violet-200/35",
  },
  "arm isolation": {
    surfaceClass:
      "bg-[linear-gradient(135deg,rgba(146,64,14,0.30),rgba(15,23,42,0.76),rgba(2,6,23,0.92))]",
    cardClass:
      "border-amber-300/22 shadow-[0_18px_58px_rgba(0,0,0,0.38),0_0_28px_rgba(251,191,36,0.10),inset_0_1px_0_rgba(255,255,255,0.16)]",
    overlayClass:
      "bg-[radial-gradient(circle_at_20%_0%,rgba(251,191,36,0.16),transparent_34%),linear-gradient(120deg,rgba(245,158,11,0.10)_0%,rgba(255,255,255,0.04)_42%,transparent_74%)]",
    accentClass:
      "bg-gradient-to-r from-transparent via-amber-300/65 to-transparent",
    pillClass:
      "border-amber-300/25 bg-amber-400/12 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.10)]",
    hoverClass:
      "hover:border-amber-200/36 hover:shadow-[0_26px_86px_rgba(0,0,0,0.50),0_0_36px_rgba(251,191,36,0.14),inset_0_1px_0_rgba(255,255,255,0.22)]",
    tabClass:
      "bg-[linear-gradient(135deg,rgba(251,191,36,0.98),rgba(245,158,11,0.78))] text-slate-950 shadow-[0_0_26px_rgba(251,191,36,0.24),inset_0_1px_0_rgba(255,255,255,0.38)] ring-1 ring-amber-100/70",
    tabHoverClass:
      "hover:bg-[linear-gradient(135deg,rgba(251,191,36,0.17),rgba(15,23,42,0.88))] hover:text-amber-50 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:ring-amber-200/35",
  },
  core: {
    surfaceClass:
      "bg-[linear-gradient(135deg,rgba(159,18,57,0.30),rgba(15,23,42,0.76),rgba(2,6,23,0.92))]",
    cardClass:
      "border-rose-300/22 shadow-[0_18px_58px_rgba(0,0,0,0.38),0_0_28px_rgba(251,113,133,0.10),inset_0_1px_0_rgba(255,255,255,0.16)]",
    overlayClass:
      "bg-[radial-gradient(circle_at_20%_0%,rgba(251,113,133,0.16),transparent_34%),linear-gradient(120deg,rgba(244,63,94,0.10)_0%,rgba(255,255,255,0.04)_42%,transparent_74%)]",
    accentClass:
      "bg-gradient-to-r from-transparent via-rose-300/65 to-transparent",
    pillClass:
      "border-rose-300/25 bg-rose-400/12 text-rose-100 shadow-[0_0_18px_rgba(251,113,133,0.10)]",
    hoverClass:
      "hover:border-rose-200/36 hover:shadow-[0_26px_86px_rgba(0,0,0,0.50),0_0_36px_rgba(251,113,133,0.14),inset_0_1px_0_rgba(255,255,255,0.22)]",
    tabClass:
      "bg-[linear-gradient(135deg,rgba(251,113,133,0.98),rgba(244,63,94,0.78))] text-slate-950 shadow-[0_0_26px_rgba(251,113,133,0.24),inset_0_1px_0_rgba(255,255,255,0.38)] ring-1 ring-rose-100/70",
    tabHoverClass:
      "hover:bg-[linear-gradient(135deg,rgba(251,113,133,0.17),rgba(15,23,42,0.88))] hover:text-rose-50 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:ring-rose-200/35",
  },
  athletic: {
    surfaceClass:
      "bg-[linear-gradient(135deg,rgba(154,52,18,0.34),rgba(15,23,42,0.76),rgba(2,6,23,0.92))]",
    cardClass:
      "border-orange-300/24 shadow-[0_18px_58px_rgba(0,0,0,0.38),0_0_30px_rgba(251,146,60,0.12),inset_0_1px_0_rgba(255,255,255,0.16)]",
    overlayClass:
      "bg-[radial-gradient(circle_at_20%_0%,rgba(251,146,60,0.18),transparent_34%),linear-gradient(120deg,rgba(249,115,22,0.11)_0%,rgba(255,255,255,0.04)_42%,transparent_74%)]",
    accentClass:
      "bg-gradient-to-r from-transparent via-orange-300/70 to-transparent",
    pillClass:
      "border-orange-300/28 bg-orange-400/14 text-orange-100 shadow-[0_0_18px_rgba(251,146,60,0.12)]",
    hoverClass:
      "hover:border-orange-200/40 hover:shadow-[0_26px_86px_rgba(0,0,0,0.50),0_0_38px_rgba(251,146,60,0.16),inset_0_1px_0_rgba(255,255,255,0.22)]",
    tabClass:
      "bg-[linear-gradient(135deg,rgba(251,146,60,0.98),rgba(249,115,22,0.82))] text-slate-950 shadow-[0_0_28px_rgba(251,146,60,0.26),inset_0_1px_0_rgba(255,255,255,0.38)] ring-1 ring-orange-100/70",
    tabHoverClass:
      "hover:bg-[linear-gradient(135deg,rgba(251,146,60,0.18),rgba(15,23,42,0.88))] hover:text-orange-50 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:ring-orange-200/35",
  },
  mobility: {
    surfaceClass:
      "bg-[linear-gradient(135deg,rgba(15,118,110,0.31),rgba(15,23,42,0.76),rgba(2,6,23,0.92))]",
    cardClass:
      "border-teal-300/22 shadow-[0_18px_58px_rgba(0,0,0,0.38),0_0_28px_rgba(45,212,191,0.10),inset_0_1px_0_rgba(255,255,255,0.16)]",
    overlayClass:
      "bg-[radial-gradient(circle_at_20%_0%,rgba(45,212,191,0.17),transparent_34%),linear-gradient(120deg,rgba(20,184,166,0.11)_0%,rgba(255,255,255,0.04)_42%,transparent_74%)]",
    accentClass:
      "bg-gradient-to-r from-transparent via-teal-300/65 to-transparent",
    pillClass:
      "border-teal-300/25 bg-teal-400/12 text-teal-100 shadow-[0_0_18px_rgba(45,212,191,0.10)]",
    hoverClass:
      "hover:border-teal-200/36 hover:shadow-[0_26px_86px_rgba(0,0,0,0.50),0_0_36px_rgba(45,212,191,0.14),inset_0_1px_0_rgba(255,255,255,0.22)]",
    tabClass:
      "bg-[linear-gradient(135deg,rgba(45,212,191,0.98),rgba(20,184,166,0.78))] text-slate-950 shadow-[0_0_26px_rgba(45,212,191,0.24),inset_0_1px_0_rgba(255,255,255,0.38)] ring-1 ring-teal-100/70",
    tabHoverClass:
      "hover:bg-[linear-gradient(135deg,rgba(45,212,191,0.17),rgba(15,23,42,0.88))] hover:text-teal-50 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:ring-teal-200/35",
  },
  "cervical isolation": {
    surfaceClass:
      "bg-[linear-gradient(135deg,rgba(14,116,144,0.22),rgba(30,41,59,0.64),rgba(2,6,23,0.92))]",
    cardClass:
      "border-sky-200/20 shadow-[0_18px_58px_rgba(0,0,0,0.38),0_0_26px_rgba(125,211,252,0.09),inset_0_1px_0_rgba(255,255,255,0.16)]",
    overlayClass:
      "bg-[radial-gradient(circle_at_20%_0%,rgba(125,211,252,0.14),transparent_34%),linear-gradient(120deg,rgba(148,163,184,0.10)_0%,rgba(255,255,255,0.04)_42%,transparent_74%)]",
    accentClass:
      "bg-gradient-to-r from-transparent via-sky-200/60 to-transparent",
    pillClass:
      "border-sky-200/24 bg-sky-300/10 text-sky-100 shadow-[0_0_18px_rgba(125,211,252,0.09)]",
    hoverClass:
      "hover:border-sky-100/34 hover:shadow-[0_26px_86px_rgba(0,0,0,0.50),0_0_34px_rgba(125,211,252,0.13),inset_0_1px_0_rgba(255,255,255,0.22)]",
    tabClass:
      "bg-[linear-gradient(135deg,rgba(186,230,253,0.96),rgba(125,211,252,0.72))] text-slate-950 shadow-[0_0_24px_rgba(125,211,252,0.22),inset_0_1px_0_rgba(255,255,255,0.38)] ring-1 ring-sky-100/70",
    tabHoverClass:
      "hover:bg-[linear-gradient(135deg,rgba(125,211,252,0.15),rgba(15,23,42,0.88))] hover:text-sky-50 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:ring-sky-200/35",
  },
  integrated: {
    surfaceClass:
      "bg-[linear-gradient(135deg,rgba(113,63,18,0.30),rgba(76,29,149,0.24),rgba(2,6,23,0.92))]",
    cardClass:
      "border-yellow-200/26 shadow-[0_18px_58px_rgba(0,0,0,0.38),0_0_32px_rgba(250,204,21,0.12),inset_0_1px_0_rgba(255,255,255,0.18)]",
    overlayClass:
      "bg-[radial-gradient(circle_at_18%_0%,rgba(250,204,21,0.16),transparent_32%),radial-gradient(circle_at_82%_10%,rgba(167,139,250,0.14),transparent_34%),linear-gradient(120deg,rgba(250,204,21,0.08)_0%,rgba(139,92,246,0.08)_42%,transparent_76%)]",
    accentClass:
      "bg-gradient-to-r from-transparent via-yellow-200/70 to-violet-300/55",
    pillClass:
      "border-yellow-200/30 bg-[linear-gradient(135deg,rgba(250,204,21,0.16),rgba(167,139,250,0.12))] text-yellow-100 shadow-[0_0_20px_rgba(250,204,21,0.12)]",
    hoverClass:
      "hover:border-yellow-100/40 hover:shadow-[0_26px_86px_rgba(0,0,0,0.50),0_0_40px_rgba(250,204,21,0.16),inset_0_1px_0_rgba(255,255,255,0.22)]",
    tabClass:
      "bg-[linear-gradient(135deg,rgba(250,204,21,0.96),rgba(167,139,250,0.82))] text-slate-950 shadow-[0_0_30px_rgba(250,204,21,0.24),inset_0_1px_0_rgba(255,255,255,0.38)] ring-1 ring-yellow-100/70",
    tabHoverClass:
      "hover:bg-[linear-gradient(135deg,rgba(250,204,21,0.16),rgba(167,139,250,0.12),rgba(15,23,42,0.88))] hover:text-yellow-50 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:ring-yellow-200/35",
  },
};

const getCategoryTheme = (category?: string | null): CategoryTheme =>
  category
    ? categoryThemes[
        category.trim().toLowerCase() === "integrated movement"
          ? "integrated"
          : category.trim().toLowerCase()
      ] || categoryThemeFallback
    : categoryThemeFallback;

const getBodyRegionTheme = (region?: string | null): CategoryTheme => {
  const normalizedRegion = region?.trim().toLowerCase() || "";
  if (!normalizedRegion || normalizedRegion === "all") return categoryThemeFallback;

  if (/(neck|cervical)/.test(normalizedRegion)) {
    return getCategoryTheme("Cervical Isolation");
  }
  if (/(athletic|power|plyo|jump|sprint|throw|carry|crawl|full body)/.test(normalizedRegion)) {
    return getCategoryTheme("Athletic");
  }
  if (/(core|abs|oblique|anti|rotation|trunk)/.test(normalizedRegion)) {
    return getCategoryTheme("Core");
  }
  if (/(mobility|recovery|breath|bracing)/.test(normalizedRegion)) {
    return getCategoryTheme("Mobility");
  }
  if (/(arm|bicep|tricep|wrist|forearm|rotator|cuff)/.test(normalizedRegion)) {
    return getCategoryTheme("Arm Isolation");
  }
  if (/(back|pull|lat|trap|rhomboid|upper back|posterior shoulder|rear delt)/.test(normalizedRegion)) {
    return getCategoryTheme("Upper Pull");
  }
  if (/(chest|pec|push|shoulder|delt)/.test(normalizedRegion)) {
    return getCategoryTheme("Upper Push");
  }
  if (/(quad|calf|tibialis|adductor|abductor|knee|ankle)/.test(normalizedRegion)) {
    return getCategoryTheme("Lower Body Isolation");
  }
  if (/(leg|lower|glute|hamstring|hip|posterior chain)/.test(normalizedRegion)) {
    return getCategoryTheme("Lower Body Compound");
  }

  return categoryThemeFallback;
};

const getSemanticPatternLabel = (patternId: SemanticMovementPatternId) =>
  SEMANTIC_MOVEMENT_PATTERN_BY_ID[patternId]?.label || labelize(patternId);

const movementPatternCategoryLabels: Record<string, string> = {
  "lower-body-compound": "Lower Body Compound",
  "lower-body-isolation": "Lower Body Isolation",
  "upper-push": "Upper Push",
  "upper-pull": "Upper Pull",
  "arm-isolation": "Arm Isolation",
  core: "Core",
  athletic: "Athletic",
  mobility: "Mobility",
  "cervical-isolation": "Cervical Isolation",
  integrated: "Integrated",
};

const getMovementPatternCategoryLabel = (categoryId?: string | null) =>
  categoryId ? movementPatternCategoryLabels[categoryId] || labelize(categoryId) : "";

const getSemanticPatternCategoryLabel = (
  patternId: SemanticMovementPatternId,
) =>
  getMovementPatternCategoryLabel(
    SEMANTIC_MOVEMENT_PATTERN_BY_ID[patternId]?.group,
  );

const getMappedPatternCategoryLabel = (patternId: MovementPatternId) =>
  getMovementPatternCategoryLabel(MOVEMENT_PATTERN_CATEGORY_BY_ID[patternId]);

const getCardClassificationLabel = (
  metadata: NormalizedExerciseCatalogItem | null,
) => (metadata ? getMappedPatternCategoryLabel(metadata.movementPatternId) : "");

const getSemanticModifier = (modifierId: SemanticExerciseModifierId) =>
  SEMANTIC_EXERCISE_MODIFIER_BY_ID[modifierId];

const getSemanticModifierLabel = (modifierId: SemanticExerciseModifierId) =>
  getSemanticModifier(modifierId)?.label || labelize(modifierId.split(":").pop() || modifierId);

const positionAngleModifierSlugs = new Set([
  "incline",
  "decline",
  "flat",
  "floor",
  "hands-elevated",
  "feet-elevated",
  "seated",
  "standing",
  "half-kneeling",
  "split-stance",
  "tall-kneeling",
  "supine",
  "prone",
  "lying",
  "side-lying",
  "bent-over",
  "chest-supported",
  "bench-supported",
  "plank",
  "rear-foot-elevated",
  "front-foot-elevated",
  "preacher",
  "side-support",
  "quadruped",
]);

const modifierAnglePositionSlugs = new Set([
  "goblet",
  "front-loaded",
  "back-loaded",
  "overhead",
]);

const positionLimbUsageSlugs = new Set([
  "standard-stance",
  "conventional-stance",
  "sumo-stance",
  "wide-stance",
  "staggered",
  "single-leg",
]);

const getTrainingModifierChipTone = (
  modifierId: ExerciseModifierId,
): MovementArchitectureChipTone => {
  const modifier = EXERCISE_MODIFIER_BY_ID[modifierId];
  if (!modifier) return "fallback";

  if (modifier.categoryId === "apparatus") return "equipment";
  if (modifier.categoryId === "angle-position") {
    return modifierAnglePositionSlugs.has(modifier.slug) ? "modifier" : "position";
  }
  if (modifier.categoryId === "limb-usage") {
    return positionLimbUsageSlugs.has(modifier.slug) ? "position" : "modifier";
  }
  if (modifier.categoryId === "stability") return "stability";
  if (
    [
      "range-of-motion",
      "direction",
      "tempo",
      "load-behavior",
      "assistance-resistance",
      "training-intent",
    ].includes(modifier.categoryId)
  ) {
    return "modifier";
  }

  return "fallback";
};

const getSemanticModifierChipTone = (
  modifierId: SemanticExerciseModifierId,
): MovementArchitectureChipTone => {
  const categoryId = getSemanticModifier(modifierId)?.categoryId;

  if (categoryId === "equipment") return "equipment";
  if (categoryId === "stance" || categoryId === "bodyPosition") {
    return "position";
  }
  if (
    categoryId &&
    [
      "grip",
      "loadPosition",
      "structure",
      "direction",
      "angle",
      "rom",
      "tempo",
      "stability",
      "athleticIntent",
      "movementIntent",
    ].includes(categoryId)
  ) {
    return categoryId === "stability" ? "stability" : "modifier";
  }

  return "fallback";
};

const isIntegratedSemanticMovement = (
  variation: ReturnType<typeof mapLegacyExerciseToExerciseSystem>["matchedVariation"],
): variation is SemanticIntegratedMovement =>
  Boolean(variation && "patternChain" in variation);

const addMovementChip = (
  chips: MovementArchitectureChip[],
  chip: MovementArchitectureChip,
) => {
  if (!chip.label.trim()) return;
  const normalizedLabel = chip.label.trim().toLowerCase();
  if (chips.some((item) => item.label.trim().toLowerCase() === normalizedLabel)) {
    return;
  }

  chips.push(chip);
};

const getMovementArchitectureChips = (
  exercise: Exercise,
  metadata: NormalizedExerciseCatalogItem | null,
  selectedModifierIds: ExerciseModifierId[] = metadata?.modifierIds || [],
): MovementArchitectureChip[] => {
  if (exercise.custom) {
    return [{ key: "custom-unmapped", label: "Unmapped", tone: "fallback" }];
  }

  const migration = mapLegacyExerciseToExerciseSystem(
    toBuilderCatalogExercise(exercise),
  );
  const variation = migration.matchedVariation;
  const chips: MovementArchitectureChip[] = [];
  const classificationLabels = new Map<string, string>();
  const addClassificationLabel = (label: string) => {
    if (!label.trim()) return;
    classificationLabels.set(label.trim().toLowerCase(), label.trim());
  };

  if (isIntegratedSemanticMovement(variation)) {
    variation.patternChain.forEach((patternRef) => {
      const roleLabel =
        patternRef.role === "primary"
          ? "Primary"
          : patternRef.role === "secondary"
            ? "Secondary"
            : "Tertiary";

      addMovementChip(chips, {
        key: `${variation.id}-${patternRef.role}-${patternRef.patternId}`,
        label: `${roleLabel}: ${getSemanticPatternLabel(patternRef.patternId)}`,
        tone: patternRef.role === "primary" ? "movement" : "secondary",
      });

      if (patternRef.role === "primary") {
        addClassificationLabel(
          getSemanticPatternCategoryLabel(patternRef.patternId),
        );
      }
    });

    addMovementChip(chips, {
      key: `${variation.id}-integrated`,
      label: "Integrated",
      tone: "integrated",
    });
  } else if (variation) {
    addMovementChip(chips, {
      key: `${variation.id}-primary-${variation.primaryPatternId}`,
      label: getSemanticPatternLabel(variation.primaryPatternId),
      tone: "movement",
    });
    addClassificationLabel(
      getSemanticPatternCategoryLabel(variation.primaryPatternId),
    );

    (variation.secondaryPatternIds || []).forEach((patternId) =>
      addMovementChip(chips, {
        key: `${variation.id}-secondary-${patternId}`,
        label: `Secondary: ${getSemanticPatternLabel(patternId)}`,
        tone: "secondary",
      }),
    );

    (variation.tertiaryPatternIds || []).forEach((patternId) =>
      addMovementChip(chips, {
        key: `${variation.id}-tertiary-${patternId}`,
        label: `Tertiary: ${getSemanticPatternLabel(patternId)}`,
        tone: "secondary",
      }),
    );
  } else if (metadata) {
    addMovementChip(chips, {
      key: `${metadata.id}-core-${metadata.coreMovementId}`,
      label: metadata.coreMovementLabel,
      tone: "movement",
    });
    addClassificationLabel(
      getMappedPatternCategoryLabel(metadata.movementPatternId),
    );

    if (
      metadata.movementPatternLabel &&
      metadata.movementPatternLabel !== metadata.coreMovementLabel
    ) {
      addMovementChip(chips, {
        key: `${metadata.id}-pattern-${metadata.movementPatternId}`,
        label: metadata.movementPatternLabel,
        tone: "secondary",
      });
    }
  }

  const semanticModifierIds = migration.inferredModifierIds;
  const semanticEquipmentIds = semanticModifierIds.filter(
    (modifierId) => getSemanticModifier(modifierId)?.categoryId === "equipment",
  );
  const semanticStabilityIds = semanticModifierIds.filter(
    (modifierId) => getSemanticModifier(modifierId)?.categoryId === "stability",
  );
  const semanticVariationIds = semanticModifierIds.filter((modifierId) => {
    const categoryId = getSemanticModifier(modifierId)?.categoryId;
    return categoryId && categoryId !== "equipment" && categoryId !== "stability";
  });

  semanticEquipmentIds.forEach((modifierId) =>
    addMovementChip(chips, {
      key: `semantic-equipment-${modifierId}`,
      label: getSemanticModifierLabel(modifierId),
      tone: getSemanticModifierChipTone(modifierId),
    }),
  );

  semanticStabilityIds.forEach((modifierId) =>
    addMovementChip(chips, {
      key: `semantic-stability-${modifierId}`,
      label: getSemanticModifierLabel(modifierId),
      tone: getSemanticModifierChipTone(modifierId),
    }),
  );

  semanticVariationIds.forEach((modifierId) =>
    addMovementChip(chips, {
      key: `semantic-modifier-${modifierId}`,
      label: getSemanticModifierLabel(modifierId),
      tone: getSemanticModifierChipTone(modifierId),
    }),
  );

  if (metadata) {
    const displayModifierIds = selectedModifierIds.length
      ? selectedModifierIds
      : metadata.modifierIds;
    const mappedEquipment = getModifierLabelsByCategoryFromIds(
      displayModifierIds,
      "apparatus",
    );
    const mappedStability = getModifierLabelsByCategoryFromIds(
      displayModifierIds,
      "stability",
    );
    const mappedVariationModifierIds = displayModifierIds.filter(
      (modifierId) => {
        const categoryId = getModifierCategoryId(modifierId);
        return (
          categoryId &&
          categoryId !== "apparatus" &&
          categoryId !== "stability" &&
          categoryId !== "training-intent"
        );
      },
    );

    displayModifierIds
      .filter((modifierId) => getModifierCategoryId(modifierId) === "apparatus")
      .forEach((modifierId) =>
        addMovementChip(chips, {
          key: `mapped-equipment-${modifierId}`,
          label: getModifierLabel(modifierId),
          tone: getTrainingModifierChipTone(modifierId),
        }),
      );

    mappedEquipment.forEach((label) =>
      addMovementChip(chips, {
        key: `mapped-equipment-fallback-${label}`,
        label,
        tone: "equipment",
      }),
    );

    displayModifierIds
      .filter((modifierId) => getModifierCategoryId(modifierId) === "stability")
      .forEach((modifierId) =>
        addMovementChip(chips, {
          key: `mapped-stability-${modifierId}`,
          label: getModifierLabel(modifierId),
          tone: getTrainingModifierChipTone(modifierId),
        }),
      );

    mappedStability.forEach((label) =>
      addMovementChip(chips, {
        key: `mapped-stability-fallback-${label}`,
        label,
        tone: "stability",
      }),
    );

    mappedVariationModifierIds.forEach((modifierId) =>
      addMovementChip(chips, {
        key: `mapped-modifier-${modifierId}`,
        label: getModifierLabel(modifierId),
        tone: getTrainingModifierChipTone(modifierId),
      }),
    );
  }

  classificationLabels.forEach((label, key) =>
    addMovementChip(chips, {
      key: `classification-${key}`,
      label,
      tone: "classification",
    }),
  );

  if (!chips.length) {
    chips.push({ key: "unmapped", label: "Unmapped", tone: "fallback" });
  }

  return chips;
};

type SemanticVariationOption =
  NormalizedExerciseCatalogItem["semanticVariations"][number];

const uniqueModifierIds = (modifierIds: ExerciseModifierId[]) =>
  Array.from(new Set(modifierIds));

const getApparatusModifierIds = (modifierIds: ExerciseModifierId[]) =>
  modifierIds.filter(
    (modifierId) => getModifierCategoryId(modifierId) === "apparatus",
  );

const getNonApparatusModifierIds = (modifierIds: ExerciseModifierId[]) =>
  modifierIds.filter(
    (modifierId) => getModifierCategoryId(modifierId) !== "apparatus",
  );

const getSemanticVariationAllowedApparatusIds = (
  variation: SemanticVariationOption,
): ExerciseModifierId[] => [...(variation.allowedApparatusIds || [])];

const getSemanticVariationDefaultApparatusId = (
  variation: SemanticVariationOption,
) => variation.defaultApparatusId || getApparatusModifierIds(variation.modifierIds)[0];

const getDefaultSelectedModifierIds = (
  metadata: NormalizedExerciseCatalogItem | null,
) => {
  const firstSemanticVariation = metadata?.semanticVariations.find(
    (variation) => variation.modifierIds.length > 0,
  );

  return firstSemanticVariation
    ? [...firstSemanticVariation.modifierIds]
    : [...(metadata?.modifierIds || [])];
};

const getMatchingSemanticVariation = (
  variations: SemanticVariationOption[],
  selectedModifierIds: ExerciseModifierId[],
) => {
  if (!variations.length || !selectedModifierIds.length) return null;

  const matches = getSemanticVariationMatches(variations, selectedModifierIds);

  return matches[0]?.variation || null;
};

type SemanticVariationMatchDetails = {
  score: number;
  nonEquipmentScore: number;
  equipmentScore: number;
  hasRequiredNonEquipmentMatch: boolean;
  hasEquipmentConflict: boolean;
};

const getSemanticVariationMatches = (
  variations: SemanticVariationOption[],
  selectedModifierIds: ExerciseModifierId[],
) =>
  variations
    .map((variation, index) => {
      const details = getSemanticVariationMatchDetails(
        variation,
        selectedModifierIds,
      );

      return details === null ? null : { variation, details, index };
    })
    .filter(
      (
        match,
      ): match is {
        variation: SemanticVariationOption;
        details: SemanticVariationMatchDetails;
        index: number;
      } => Boolean(match),
    )
    .sort(
      (a, b) =>
        b.details.score - a.details.score ||
        b.details.nonEquipmentScore - a.details.nonEquipmentScore ||
        b.details.equipmentScore - a.details.equipmentScore ||
        a.index - b.index,
    );

const getSemanticVariationMatchDetails = (
  variation: SemanticVariationOption,
  selectedModifierIds: ExerciseModifierId[],
): SemanticVariationMatchDetails | null => {
  if (!selectedModifierIds.length) return null;

  const selectedSet = new Set<string>(selectedModifierIds);
  const selectedApparatusIds = getApparatusModifierIds(selectedModifierIds);
  const definingModifierIds = variation.definingModifierIds?.length
    ? variation.definingModifierIds
    : getNonApparatusModifierIds(variation.modifierIds);
  const matchSets = [
    definingModifierIds,
    ...(variation.matchModifierSets || []).map(getNonApparatusModifierIds),
  ].filter((modifierIds) => modifierIds.length > 0);
  const allowedApparatusIds = getSemanticVariationAllowedApparatusIds(variation);
  const fallbackApparatusIds = getApparatusModifierIds(variation.modifierIds);
  const scoredMatches = matchSets
    .map((modifierIds) => {
      const apparatusModifierIds = allowedApparatusIds.length
        ? allowedApparatusIds
        : fallbackApparatusIds;
      const isEquipmentConstrained =
        allowedApparatusIds.length > 0 || variation.equipmentStrict;
      const nonApparatusMatches = modifierIds.every((modifierId) =>
        selectedSet.has(modifierId),
      );
      const apparatusMatchCount = apparatusModifierIds.filter((modifierId) =>
        selectedSet.has(modifierId),
      ).length;
      const hasEquipmentConflict =
        isEquipmentConstrained &&
        selectedApparatusIds.length > 0 &&
        apparatusMatchCount === 0;

      if (!nonApparatusMatches) return null;
      if (hasEquipmentConflict) return null;

      const nonEquipmentScore = modifierIds.length * 100;
      const equipmentScore = apparatusMatchCount * 10;

      return {
        score: nonEquipmentScore + equipmentScore,
        nonEquipmentScore,
        equipmentScore,
        hasRequiredNonEquipmentMatch: true,
        hasEquipmentConflict: false,
      };
    })
    .filter(
      (details): details is SemanticVariationMatchDetails =>
        details !== null && Number.isFinite(details.score),
    )
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.nonEquipmentScore - a.nonEquipmentScore ||
        b.equipmentScore - a.equipmentScore,
    );

  if (scoredMatches[0]) return scoredMatches[0];

  const apparatusModifierIds = allowedApparatusIds.length
    ? allowedApparatusIds
    : fallbackApparatusIds;
  const apparatusMatchCount = apparatusModifierIds.filter((modifierId) =>
    selectedSet.has(modifierId),
  ).length;

  if (apparatusModifierIds.length > 0 && apparatusMatchCount > 0) {
    const equipmentScore = apparatusMatchCount * 10;

    return {
      score: equipmentScore,
      nonEquipmentScore: 0,
      equipmentScore,
      hasRequiredNonEquipmentMatch: false,
      hasEquipmentConflict: false,
    };
  }

  return null;
};

const getPreferredSemanticVariation = ({
  variations,
  selectedModifierIds,
  currentVariation,
}: {
  variations: SemanticVariationOption[];
  selectedModifierIds: ExerciseModifierId[];
  currentVariation: SemanticVariationOption | null;
}) => {
  const matches = getSemanticVariationMatches(variations, selectedModifierIds);
  const bestMatch = matches[0] || null;

  if (!currentVariation) return bestMatch?.variation || null;

  const currentDetails = getSemanticVariationMatchDetails(
    currentVariation,
    selectedModifierIds,
  );

  if (!currentDetails) return bestMatch?.variation || null;

  const currentCanBePreserved =
    currentDetails.hasRequiredNonEquipmentMatch &&
    !currentDetails.hasEquipmentConflict;

  if (!currentCanBePreserved) return bestMatch?.variation || null;

  if (
    bestMatch &&
    bestMatch.variation.id !== currentVariation.id &&
    bestMatch.details.nonEquipmentScore >=
      currentDetails.nonEquipmentScore + 100
  ) {
    return bestMatch.variation;
  }

  return currentVariation;
};

const applySemanticVariationModifierPreset = (
  currentModifierIds: ExerciseModifierId[],
  variation: SemanticVariationOption,
) => {
  const presetModifierIds = variation.modifierIds;
  const presetApparatusIds = getApparatusModifierIds(presetModifierIds);
  const nonApparatusPresetModifierIds =
    getNonApparatusModifierIds(presetModifierIds);
  const currentApparatusIds = getApparatusModifierIds(currentModifierIds);
  const allowedApparatusIds = getSemanticVariationAllowedApparatusIds(variation);
  const presetCategories = new Set(
    nonApparatusPresetModifierIds.map(getModifierCategoryId).filter(Boolean),
  );
  const nextApparatusIds = ((): ExerciseModifierId[] => {
    if (allowedApparatusIds.length) {
      const allowedCurrentApparatusIds = currentApparatusIds.filter(
        (modifierId) => allowedApparatusIds.includes(modifierId),
      );
      if (allowedCurrentApparatusIds.length) return allowedCurrentApparatusIds;

      const preferredPresetApparatus = presetApparatusIds.find((modifierId) =>
        allowedApparatusIds.includes(modifierId),
      );

      return [
        preferredPresetApparatus ||
          getSemanticVariationDefaultApparatusId(variation) ||
          allowedApparatusIds[0],
      ];
    }

    if (currentApparatusIds.length) return currentApparatusIds;
    return presetApparatusIds.slice(0, 1);
  })();
  const preservedModifierIds = currentModifierIds.filter((modifierId) => {
    const categoryId = getModifierCategoryId(modifierId);
    return (
      categoryId !== "apparatus" &&
      (!categoryId || !presetCategories.has(categoryId))
    );
  });

  return uniqueModifierIds([
    ...preservedModifierIds,
    ...nextApparatusIds,
    ...nonApparatusPresetModifierIds,
  ]);
};

function SemanticVariationSelect({
  options,
  value,
  onChange,
  onOpenChange,
  compact = false,
}: {
  options: SemanticVariationOption[];
  value: string;
  onChange: (variation: SemanticVariationOption) => void;
  onOpenChange?: (open: boolean) => void;
  compact?: boolean;
}) {
  const dropdownId = useId();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const lockedMenuWidthRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);

  const selectedVariation =
    options.find((variation) => variation.id === value) || null;
  const displayValue = selectedVariation?.name || "Select variation";

  const updateMenuPosition = () => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 12;
    const measuredMenuWidth = Math.min(
      Math.max(rect.width, compact ? 220 : 280),
      viewportWidth - margin * 2,
    );
    const menuWidth = lockedMenuWidthRef.current ?? measuredMenuWidth;
    lockedMenuWidthRef.current = menuWidth;
    const left = Math.min(
      Math.max(margin, rect.left),
      Math.max(margin, viewportWidth - menuWidth - margin),
    );
    const maxMenuHeight = Math.min(360, viewportHeight - margin * 2);
    const belowTop = rect.bottom + 8;
    const availableBelow = viewportHeight - belowTop - margin;
    const availableAbove = rect.top - margin - 8;
    const opensAbove = availableBelow < 148 && availableAbove > availableBelow;
    const preferredTop = opensAbove ? rect.top - 8 - maxMenuHeight : belowTop;
    const top = Math.min(
      Math.max(preferredTop, margin),
      Math.max(margin, viewportHeight - maxMenuHeight - margin),
    );
    const maxHeight = Math.max(
      132,
      Math.min(maxMenuHeight, viewportHeight - top - margin),
    );

    setStableFixedDropdownStyle(setMenuStyle, createFixedDropdownStyle({
      top,
      left,
      width: menuWidth,
      maxHeight,
      zIndex: 2147483000,
    }));
  };

  useEffect(() => {
    onOpenChange?.(open);
    if (!open) {
      lockedMenuWidthRef.current = null;
      setMenuStyle(null);
      return;
    }

    updateMenuPosition();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }

      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const handleCloseOtherDropdowns = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string }>).detail;
      if (detail?.id !== dropdownId) setOpen(false);
    };
    let animationFrame: number | null = null;
    const scheduleMenuPositionUpdate = (
      event?: Event,
      unlockWidth = false,
    ) => {
      const target = event?.target;
      if (target instanceof Node && menuRef.current?.contains(target)) {
        return;
      }

      if (unlockWidth) lockedMenuWidthRef.current = null;
      if (animationFrame !== null) return;

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        updateMenuPosition();
      });
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    const handleResize = () => scheduleMenuPositionUpdate(undefined, true);
    const handleScroll = (event: Event) => scheduleMenuPositionUpdate(event);
    window.addEventListener("resize", handleResize);
    document.addEventListener("scroll", handleScroll, true);
    window.addEventListener(
      exerciseLibraryDropdownOpenEvent,
      handleCloseOtherDropdowns,
    );

    return () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener(
        exerciseLibraryDropdownOpenEvent,
        handleCloseOtherDropdowns,
      );
    };
  }, [dropdownId, onOpenChange, open]);

  if (!options.length) return null;

  const selectVariation = (variation: SemanticVariationOption) => {
    onChange(variation);
    setOpen(false);
  };

  return (
    <div className={compact ? "mt-1" : "mt-1.5"}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (!open) {
            announceExerciseLibraryDropdownOpen(dropdownId);
            updateMenuPosition();
          }
          setOpen((current) => !current);
        }}
        className={`group/semantic flex max-w-full items-center gap-1.5 rounded-full border border-yellow-200/20 bg-yellow-300/[0.075] text-left font-black text-yellow-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_22px_rgba(250,204,21,0.08)] outline-none transition hover:border-yellow-200/35 hover:bg-yellow-300/[0.12] ${
          compact
            ? "px-2.5 py-1 text-[10px] leading-4 sm:text-[11px]"
            : "px-3.5 py-1.5 text-[13px] leading-5 sm:text-sm"
        }`}
        title={displayValue}
      >
        <span className="min-w-0 truncate tracking-[0.04em] drop-shadow-[0_0_12px_rgba(250,204,21,0.34)]">
          {displayValue}
        </span>
        <span
          aria-hidden="true"
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-yellow-100/15 bg-yellow-200/10 text-[9px] transition ${
            open ? "rotate-180 border-yellow-100/30" : ""
          }`}
        >
          v
        </span>
      </button>

      {typeof document !== "undefined" && open && menuStyle
        ? createPortal(
            <div
              ref={menuRef}
              style={menuStyle}
              data-exercise-library-floating-menu="true"
              className="fixed overflow-hidden rounded-2xl border border-yellow-100/20 bg-[radial-gradient(circle_at_12%_0%,rgba(250,204,21,0.18),transparent_35%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] p-1.5 shadow-[0_26px_70px_rgba(0,0,0,0.68),0_0_34px_rgba(250,204,21,0.10),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-2xl"
            >
              <div
                role="listbox"
                aria-label="Semantic exercise variations"
                style={{ maxHeight: menuStyle.maxHeight }}
                className="overflow-y-auto pr-1 [scrollbar-color:rgba(250,204,21,0.32)_transparent] [scrollbar-width:thin]"
              >
                {options.map((variation) => {
                  const isSelected = variation.id === value;

                  return (
                    <button
                      key={variation.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => selectVariation(variation)}
                      className={`mb-1 flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm font-black transition ${
                        isSelected
                          ? "border-yellow-200 bg-yellow-300 text-slate-950 shadow-[0_0_24px_rgba(250,204,21,0.22)]"
                          : "border-white/10 bg-white/[0.045] text-yellow-100/85 hover:border-yellow-200/35 hover:bg-yellow-300/12 hover:text-yellow-50"
                      }`}
                    >
                      <span className="min-w-0 whitespace-normal leading-5">
                        {variation.name}
                      </span>
                      {isSelected ? <span>Selected</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function MovementArchitectureChips({
  chips,
  compact = false,
  classificationChipClass,
}: {
  chips: MovementArchitectureChip[];
  compact?: boolean;
  classificationChipClass?: string;
}) {
  const visibleChips = compact ? chips.slice(0, 4) : chips;
  const hiddenCount = chips.length - visibleChips.length;

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 ${
        compact ? "mt-2" : "mt-3"
      }`}
      aria-label="Movement architecture tags"
    >
      {visibleChips.map((chip) => (
        <span
          key={chip.key}
          className={`max-w-full rounded-full border px-2.5 py-1 text-[9px] font-black uppercase leading-4 tracking-[0.08em] ${
            chip.tone === "classification" && classificationChipClass
              ? classificationChipClass
              : movementArchitectureChipClasses[chip.tone]
          }`}
          title={chip.label}
        >
          {chip.label}
        </span>
      ))}

      {hiddenCount > 0 ? (
        <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[9px] font-black uppercase leading-4 tracking-[0.08em] text-slate-400">
          +{hiddenCount}
        </span>
      ) : null}
    </div>
  );
}

type MuscleIntelligence = {
  primary: string[];
  secondary: string[];
  stabilizers: string[];
  source: "movement" | "profile";
};

const muscleLabelOverrides: Record<string, string> = {
  abs: "Abs",
  chest: "Pecs",
  "hip-flexors": "Hip Flexors",
  lats: "Lats",
  "lower-back": "Low Back",
  "rear-delts": "Rear Delts",
  "rotator-cuff": "Rotator Cuff",
  "tibialis-anterior": "Tibialis Anterior",
  "upper-back": "Upper Back",
};

const formatMuscleLabel = (muscle: string) => {
  const normalized = muscle.trim().toLowerCase();
  if (!normalized) return "";
  if (muscleLabelOverrides[normalized]) return muscleLabelOverrides[normalized];

  return normalized
    .split(/[\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const getUniqueMuscleLabels = (muscles: string[]) => {
  const seen = new Set<string>();

  return muscles
    .map(formatMuscleLabel)
    .filter((muscle) => {
      if (!muscle) return false;
      const key = muscle.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const splitMuscleText = (muscles: string) =>
  getUniqueMuscleLabels(
    muscles
      .split(/\s*(?:\/|•|\u2022|,|\+|\band\b)\s*/i)
      .map((muscle) => muscle.trim()),
  );

const getExerciseMuscleIntelligence = (
  exercise: Exercise,
  metadata: NormalizedExerciseCatalogItem | null,
): MuscleIntelligence => {
  if (!exercise.custom) {
    const migration = mapLegacyExerciseToExerciseSystem(
      toBuilderCatalogExercise(exercise),
    );
    const variation = migration.matchedVariation;

    if (variation?.primaryMuscles?.length) {
      return {
        primary: getUniqueMuscleLabels(variation.primaryMuscles),
        secondary: getUniqueMuscleLabels(variation.secondaryMuscles || []),
        stabilizers: [],
        source: "movement",
      };
    }
  }

  const coreMovement = metadata?.coreMovementId
    ? CORE_MOVEMENT_BY_ID[metadata.coreMovementId]
    : null;

  if (coreMovement?.primaryMuscles?.length) {
    return {
      primary: getUniqueMuscleLabels(coreMovement.primaryMuscles),
      secondary: getUniqueMuscleLabels(coreMovement.secondaryMuscles || []),
      stabilizers: [],
      source: "movement",
    };
  }

  const parsedMuscles = splitMuscleText(exercise.muscles || exercise.body);

  return {
    primary: parsedMuscles.slice(0, 1),
    secondary: parsedMuscles.slice(1),
    stabilizers: [],
    source: "profile",
  };
};

function MuscleIntelligenceBlock({
  muscles,
  compact = false,
  showSourceBadge = true,
}: {
  muscles: MuscleIntelligence;
  compact?: boolean;
  showSourceBadge?: boolean;
}) {
  if (
    !muscles.primary.length &&
    !muscles.secondary.length &&
    !muscles.stabilizers.length
  ) {
    return null;
  }

  const muscleRows = [
    {
      label: "Primary",
      value: muscles.primary.join(" • "),
      tone:
        "border-cyan-200/20 bg-cyan-300/10 text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]",
      labelTone: "text-cyan-200/70",
    },
    {
      label: "Secondary",
      value: muscles.secondary.join(" • "),
      tone:
        "border-violet-200/20 bg-violet-300/10 text-violet-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]",
      labelTone: "text-violet-200/70",
    },
    {
      label: "Stabilizers",
      value: muscles.stabilizers.join(" • "),
      tone:
        "border-emerald-200/20 bg-emerald-300/10 text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]",
      labelTone: "text-emerald-200/70",
    },
  ].filter((row) => row.value);

  return (
    <div
      className={`rounded-2xl border border-cyan-100/15 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.12),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.88),rgba(2,6,23,0.74))] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_34px_rgba(0,0,0,0.22)] backdrop-blur-xl ${
        compact ? "mt-1.5 p-2" : "mt-2.5 p-3"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={`font-black uppercase tracking-[0.14em] text-cyan-100/70 ${
            compact ? "text-[8px]" : "text-[10px]"
          }`}
        >
          Muscle Intelligence
        </p>
        {showSourceBadge ? (
          <span
            className={`rounded-full border border-white/10 bg-white/[0.045] font-black uppercase tracking-[0.12em] text-white/40 ${
              compact ? "px-1.5 py-0.5 text-[7px]" : "px-2 py-1 text-[8px]"
            }`}
          >
            {muscles.source === "movement" ? "Mapped" : "Profile"}
          </span>
        ) : null}
      </div>

      <div className={`mt-2 grid ${compact ? "gap-1" : "gap-2"}`}>
        {muscleRows.map((row) => (
          <div
            key={row.label}
            className={`rounded-xl border ${row.tone} ${
              compact ? "px-2 py-1.5" : "px-3 py-2"
            }`}
          >
            <p
              className={`font-black uppercase tracking-[0.12em] ${row.labelTone} ${
                compact ? "text-[7px]" : "text-[8px]"
              }`}
            >
              {row.label}
            </p>
            <p
              className={`mt-0.5 font-black leading-snug ${
                compact ? "text-[10px]" : "text-sm"
              }`}
            >
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

const getStatTime = (stat: LocalExerciseStatEntry) => {
  const time = new Date(stat.date).getTime();
  return Number.isFinite(time) ? time : 0;
};

const parseStatNumber = (value: string | number | undefined) => {
  const parsed = Number.parseFloat(String(value || "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMetric = (value: number) =>
  value > 0 ? value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "--";

const getStatVolume = (stat: LocalExerciseStatEntry) =>
  parseStatNumber(stat.weight) *
  parseStatNumber(stat.reps) *
  parseStatNumber(stat.sets);

const getRecentExerciseStats = (
  stats: LocalExerciseStatEntry[],
  exercise: Exercise,
  variationName: string,
) => {
  const normalizedNames = new Set(
    [exercise.name, variationName]
      .filter(Boolean)
      .map((name) => name.trim().toLowerCase()),
  );

  return stats
    .filter((stat) => {
      const statName = stat.exerciseName?.trim().toLowerCase();
      return (
        stat.exerciseId === exercise.id ||
        (statName ? normalizedNames.has(statName) : false)
      );
    })
    .sort((a, b) => getStatTime(b) - getStatTime(a))
    .slice(0, 3);
};

const getFocusedExerciseCards = (exercises: Exercise[]) => {
  const seenCoreMovements = new Set<string>();
  const hasCorePatternCards = exercises.some(
    (exercise) => getMetadataForExercise(exercise)?.source === "core-pattern",
  );

  return exercises.filter((exercise) => {
    if (exercise.custom) return true;

    const metadata = getMetadataForExercise(exercise);
    if (metadata?.source === "core-pattern") {
      const key = metadata.legacyExerciseId;
      if (seenCoreMovements.has(key)) return false;
      seenCoreMovements.add(key);
      return true;
    }

    if (hasCorePatternCards && metadata) return false;

    const key = metadata?.coreMovementId || exercise.id;

    if (seenCoreMovements.has(key)) return false;
    seenCoreMovements.add(key);
    return true;
  });
};

const getExerciseSortTitle = (exercise: Exercise) => {
  const metadata = getMetadataForExercise(exercise);
  const selectedModifierIds = getDefaultSelectedModifierIds(metadata);
  const semanticVariationOptions = metadata?.semanticVariations || [];
  const matchedSemanticVariation = getMatchingSemanticVariation(
    semanticVariationOptions,
    selectedModifierIds,
  );
  const selectedSemanticVariation = getPreferredSemanticVariation({
    variations: semanticVariationOptions,
    selectedModifierIds,
    currentVariation: matchedSemanticVariation,
  });
  const semanticVariationName =
    selectedSemanticVariation?.name || metadata?.semanticVariationNames?.[0] || "";
  const equipmentLabel = getSelectedEquipmentLabel(
    exercise,
    metadata,
    selectedModifierIds,
  );
  const generatedTitle = getGeneratedCardTitle({
    exercise,
    metadata,
    semanticVariationName,
    equipmentLabel,
  });

  return (
    generatedTitle ||
    semanticVariationName ||
    metadata?.coreMovementLabel ||
    metadata?.movementPatternLabel ||
    exercise.name ||
    ""
  );
};

const getExerciseCategorySectionLabel = (exercise: Exercise) => {
  const metadata = getMetadataForExercise(exercise);

  return getCardClassificationLabel(metadata) || (exercise.custom ? "Custom" : "Other");
};

const getCategorySortRank = (label: string) => {
  const index = movementTypeGroupOrder.indexOf(label as MovementTypeGroup);

  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

const getDifficultySortRank = (level: string) => {
  const index = difficultyOrder.indexOf(level);

  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

const getExerciseStatMatchesForSort = (
  stats: LocalExerciseStatEntry[],
  exercise: Exercise,
) => {
  const metadata = getMetadataForExercise(exercise);
  const normalizedNames = new Set(
    [
      exercise.name,
      metadata?.coreMovementLabel || "",
      metadata?.movementPatternLabel || "",
      ...(metadata?.semanticVariationNames || []),
    ]
      .filter(Boolean)
      .map((name) => name.trim().toLowerCase()),
  );

  return stats.filter((stat) => {
    const statName = stat.exerciseName?.trim().toLowerCase();

    return (
      stat.exerciseId === exercise.id ||
      (statName ? normalizedNames.has(statName) : false)
    );
  });
};

const getExerciseLastUsedTime = (
  stats: LocalExerciseStatEntry[],
  exercise: Exercise,
) =>
  getExerciseStatMatchesForSort(stats, exercise).reduce(
    (latest, stat) => Math.max(latest, getStatTime(stat)),
    0,
  );

const getExerciseLoggedCount = (
  stats: LocalExerciseStatEntry[],
  exercise: Exercise,
) => getExerciseStatMatchesForSort(stats, exercise).length;

const sortExercisesForLibrary = (
  exercises: Exercise[],
  sortMode: ExerciseLibrarySortMode,
  stats: LocalExerciseStatEntry[],
) =>
  [...exercises].sort((left, right) => {
    const titleSort = getExerciseSortTitle(left).localeCompare(
      getExerciseSortTitle(right),
    );

    if (sortMode === "alpha") return titleSort;

    if (sortMode === "difficulty") {
      return (
        getDifficultySortRank(left.level) - getDifficultySortRank(right.level) ||
        titleSort
      );
    }

    if (sortMode === "body") {
      return left.body.localeCompare(right.body) || titleSort;
    }

    if (sortMode === "recent") {
      return (
        getExerciseLastUsedTime(stats, right) -
          getExerciseLastUsedTime(stats, left) ||
        titleSort
      );
    }

    if (sortMode === "logged") {
      return (
        getExerciseLoggedCount(stats, right) -
          getExerciseLoggedCount(stats, left) ||
        titleSort
      );
    }

    return (
      getCategorySortRank(getExerciseCategorySectionLabel(left)) -
        getCategorySortRank(getExerciseCategorySectionLabel(right)) ||
      titleSort
    );
  });

const getExerciseSectionLabel = (
  exercise: Exercise,
  sortMode: ExerciseLibrarySortMode,
) => {
  if (sortMode === "alpha") {
    const firstCharacter = getExerciseSortTitle(exercise)
      .trim()
      .charAt(0)
      .toUpperCase();

    return /^[A-Z]$/.test(firstCharacter) ? firstCharacter : "#";
  }

  if (sortMode === "difficulty") return exercise.level || "Unassigned";
  if (sortMode === "body") return exercise.body || "Other";
  if (sortMode === "recent") return "Recently Used";
  if (sortMode === "logged") return "Most Logged";

  return getExerciseCategorySectionLabel(exercise);
};

const groupExercisesIntoSections = (
  exercises: Exercise[],
  sortMode: ExerciseLibrarySortMode,
) => {
  const sections = new Map<string, { label: string; exercises: Exercise[] }>();

  exercises.forEach((exercise) => {
    const label = getExerciseSectionLabel(exercise, sortMode);
    const key = label.toLowerCase();
    const section = sections.get(key) || { label, exercises: [] };

    section.exercises.push(exercise);
    sections.set(key, section);
  });

  return Array.from(sections.entries()).map(([key, section]) => ({
    key,
    ...section,
  }));
};

const formatCountLabel = (count: number, singular: string, plural?: string) =>
  `${count} ${count === 1 ? singular : plural || `${singular}s`}`;

const createCountedFilterOptions = ({
  allHelper,
  group,
  items,
}: {
  allHelper: string;
  group: string;
  items: Array<{ label: string; count?: number }>;
}): FilterMenuOption[] => [
  {
    value: "All",
    label: "All",
    helper: allHelper,
  },
  ...items.map((option) => ({
    value: option.label,
    label: option.label,
    group,
    helper:
      typeof option.count === "number"
        ? formatCountLabel(option.count, "movement")
        : undefined,
  })),
];

const loadBehaviorFilterOptions = createCountedFilterOptions({
  allHelper: formatCountLabel(
    normalizedCatalog.filterOptions.modifiers.filter((option) =>
      option.id.startsWith("load-behavior:"),
    ).length,
    "behavior",
  ),
  group: "Load Behavior",
  items: normalizedCatalog.filterOptions.modifiers.filter((option) =>
    option.id.startsWith("load-behavior:"),
  ),
});

const levelRank = (level?: string) => {
  const normalized = (level || "").toLowerCase();
  if (normalized.includes("advanced")) return 3;
  if (normalized.includes("intermediate")) return 2;
  if (normalized.includes("beginner")) return 1;
  return 1;
};

type MovementSuggestion = {
  id: string;
  name: string;
  reason: string;
  level: string;
  equipment: string;
};

const dedupeSuggestions = (suggestions: MovementSuggestion[]) => {
  const seen = new Set<string>();

  return suggestions.filter((suggestion) => {
    if (seen.has(suggestion.id)) return false;
    seen.add(suggestion.id);
    return true;
  });
};

const toSuggestion = (
  item: NormalizedExerciseCatalogItem,
  reason: string,
): MovementSuggestion => ({
  id: item.legacyExerciseId,
  name: item.legacyExerciseName,
  reason,
  level: item.legacyExercise.level,
  equipment: item.legacyExercise.equipment,
});

const getMovementSuggestions = (
  exercise: Exercise,
  metadata: NormalizedExerciseCatalogItem | null,
) => {
  const otherItems = normalizedCatalog.items.filter(
    (item) => item.legacyExerciseId !== exercise.id,
  );
  const sameCore = metadata
    ? otherItems.filter(
        (item) => item.coreMovementId === metadata.coreMovementId,
      )
    : [];
  const samePattern = metadata
    ? otherItems.filter(
        (item) => item.movementPatternId === metadata.movementPatternId,
      )
    : otherItems.filter(
        (item) => item.legacyExercise.pattern === exercise.pattern,
      );
  const sameRegionOrEquipment = otherItems.filter(
    (item) =>
      item.legacyExercise.body === exercise.body ||
      item.legacyExercise.equipment === exercise.equipment,
  );
  const substitutions = dedupeSuggestions([
    ...sameCore.map((item) => toSuggestion(item, "Same core movement")),
    ...samePattern.map((item) => toSuggestion(item, "Same movement pattern")),
    ...sameRegionOrEquipment.map((item) =>
      toSuggestion(item, "Same region/equipment"),
    ),
  ]).slice(0, 3);
  const currentRank = levelRank(exercise.level);
  const progressionPool = sameCore.length ? sameCore : samePattern;
  const progressions = progressionPool
    .filter((item) => levelRank(item.legacyExercise.level) > currentRank)
    .map((item) => toSuggestion(item, "Higher skill/load option"))
    .slice(0, 2);
  const regressions = progressionPool
    .filter((item) => levelRank(item.legacyExercise.level) < currentRank)
    .map((item) => toSuggestion(item, "Lower complexity option"))
    .slice(0, 2);

  return { substitutions, progressions, regressions };
};

function ModifierRail({
  label,
  modifiers,
  selectedModifierIds,
  onToggleModifier,
  priority = false,
}: {
  label: string;
  modifiers: ExerciseModifier[];
  selectedModifierIds: ExerciseModifierId[];
  onToggleModifier: (modifier: ExerciseModifier) => void;
  priority?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p
        className={`text-[10px] font-bold uppercase tracking-[0.12em] ${
          priority ? "text-cyan-100/75" : "text-white/40"
        }`}
      >
        {label}
      </p>
      <div className="relative mt-2">
        <div className="flex snap-x gap-1.5 overflow-x-auto overflow-y-hidden pb-1 pr-1 [-webkit-overflow-scrolling:touch] [scrollbar-color:rgba(34,211,238,0.38)_transparent] [scrollbar-width:thin]">
          {modifiers.map((modifier) => {
            const isSelected = selectedModifierIds.includes(modifier.id);

            return (
              <button
                key={modifier.id}
                type="button"
                onClick={() => onToggleModifier(modifier)}
                className={`min-h-[36px] shrink-0 snap-start whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-black transition ${
                  isSelected
                    ? "border-emerald-300 bg-emerald-300 text-slate-950"
                    : "border-white/10 bg-white/[0.045] text-slate-300 hover:border-cyan-300/40 hover:text-white"
                }`}
              >
                {getModifierDisplayLabel(modifier)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LabeledModifierSelect({
  label,
  value,
  options,
  fallback,
  onChange,
  onOpenChange,
  parentDropdownId,
  keepOpenDropdownIds,
  accent,
  size = "detail",
}: {
  label: string;
  value: string;
  options: ExerciseModifier[];
  fallback: string;
  onChange: (modifierId: string) => void;
  onOpenChange?: (open: boolean) => void;
  parentDropdownId?: string;
  keepOpenDropdownIds?: string[];
  accent: "cyan" | "emerald" | "yellow" | "violet";
  size?: "detail" | "grid";
}) {
  if (!options.length) return null;

  const isGrid = size === "grid";
  const labelAccentClasses = {
    cyan: "text-cyan-100/62",
    emerald: "text-emerald-100/62",
    yellow: "text-yellow-100/62",
    violet: "text-violet-100/62",
  };

  return (
    <div className="min-w-0">
      <p
        className={`mb-1 font-black uppercase ${labelAccentClasses[accent]} ${
          isGrid
            ? "text-[7px] tracking-[0.08em] sm:text-[8px]"
            : "text-[9px] tracking-[0.13em]"
        }`}
      >
        {label}
      </p>
      <DetailVariationSelect
        label={label}
        value={value}
        options={options}
        fallback={fallback}
        onChange={onChange}
        onOpenChange={onOpenChange}
        parentDropdownId={parentDropdownId}
        keepOpenDropdownIds={keepOpenDropdownIds}
        accent={accent}
        size={size}
        showInlineLabel={false}
      />
    </div>
  );
}

function GridModifierSelect({
  label,
  value,
  options,
  fallback,
  onChange,
  onOpenChange,
  parentDropdownId,
  keepOpenDropdownIds,
}: {
  label: string;
  value: string;
  options: ExerciseModifier[];
  fallback: string;
  onChange: (modifierId: string) => void;
  onOpenChange?: (open: boolean) => void;
  parentDropdownId?: string;
  keepOpenDropdownIds?: string[];
}) {
  return (
    <LabeledModifierSelect
      label={label}
      value={value}
      options={options}
      fallback={fallback}
      onChange={onChange}
      onOpenChange={onOpenChange}
      parentDropdownId={parentDropdownId}
      keepOpenDropdownIds={keepOpenDropdownIds}
      accent={
        label === "Equipment"
          ? "cyan"
          : label === "Position" ||
              label.includes("Position /") ||
              label === "Stance" ||
              label === "Body Position" ||
              label === "Elevation"
            ? "violet"
            : "emerald"
      }
      size="grid"
    />
  );
}

function DetailVariationSelect({
  label,
  value,
  options,
  fallback,
  onChange,
  accent = "cyan",
  size = "detail",
  className = "",
  onOpenChange,
  parentDropdownId,
  keepOpenDropdownIds,
  showInlineLabel = true,
}: {
  label: string;
  value: string;
  options: ExerciseModifier[];
  fallback: string;
  onChange: (modifierId: string) => void;
  accent?: "cyan" | "emerald" | "yellow" | "violet";
  size?: "detail" | "grid";
  className?: string;
  onOpenChange?: (open: boolean) => void;
  parentDropdownId?: string;
  keepOpenDropdownIds?: string[];
  showInlineLabel?: boolean;
}) {
  const dropdownId = useId();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const dropdownButtonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownMenuRef = useRef<HTMLDivElement | null>(null);
  const lockedDropdownWidthRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [dropdownMenuStyle, setDropdownMenuStyle] =
    useState<CSSProperties | null>(null);
  const isGrid = size === "grid";
  const displayOptions = dedupeModifierOptionsByDisplayLabel(options);
  const selectedOption = displayOptions.find((option) => option.id === value);
  const displayValue = selectedOption
    ? getModifierDisplayLabel(selectedOption)
    : fallback;
  const fallbackOptionLabel =
    fallback.trim().toLowerCase() === "default" || !fallback.trim()
      ? label
      : fallback.trim();
  const getModifierOptionLabel = (modifier: ExerciseModifier) =>
    getModifierDisplayLabel(modifier);
  const normalizeOptionLabel = (optionLabel: string) =>
    optionLabel.trim().toLowerCase();
  const fallbackOptionKey = normalizeOptionLabel(fallbackOptionLabel);
  const fallbackMatchesOption = displayOptions.some(
    (option) => normalizeOptionLabel(getModifierOptionLabel(option)) === fallbackOptionKey,
  );
  const accentClasses = {
    cyan: {
      focus:
        "focus-visible:border-cyan-100/70 focus-visible:ring-2 focus-visible:ring-cyan-200/30",
      trigger:
        "border-cyan-200/30 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.20),transparent_34%),linear-gradient(135deg,rgba(8,47,73,0.62),rgba(15,23,42,0.84))] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_28px_rgba(8,145,178,0.16),0_8px_28px_rgba(0,0,0,0.30)] hover:border-cyan-100/55 hover:bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.28),transparent_34%),linear-gradient(135deg,rgba(8,47,73,0.76),rgba(15,23,42,0.88))] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_24px_rgba(34,211,238,0.16),0_8px_28px_rgba(0,0,0,0.32)]",
      panel:
        "border-cyan-100/20 bg-[radial-gradient(circle_at_15%_0%,rgba(34,211,238,0.20),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] shadow-[0_24px_70px_rgba(0,0,0,0.64),0_0_34px_rgba(34,211,238,0.13),inset_0_1px_0_rgba(255,255,255,0.14)]",
      selected: "border-cyan-200 bg-cyan-300 text-slate-950",
      hover: "hover:border-cyan-200/40 hover:bg-cyan-300/10 hover:text-white",
      glow: "shadow-[0_0_24px_rgba(34,211,238,0.16)]",
      scrollbar: "[scrollbar-color:rgba(34,211,238,0.42)_transparent]",
      label: "text-cyan-100/62",
      value: "text-cyan-50 drop-shadow-[0_0_12px_rgba(34,211,238,0.24)]",
      arrow:
        "border-cyan-200/25 bg-cyan-300/12 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.14)] group-hover/control:border-cyan-100/50 group-hover/control:bg-cyan-300/18",
      arrowOpen: "rotate-180 border-cyan-100/60 bg-cyan-300/24 text-cyan-50",
    },
    emerald: {
      focus:
        "focus-visible:border-emerald-100/70 focus-visible:ring-2 focus-visible:ring-emerald-200/30",
      trigger:
        "border-emerald-200/30 bg-[radial-gradient(circle_at_12%_0%,rgba(16,185,129,0.20),transparent_34%),linear-gradient(135deg,rgba(6,78,59,0.58),rgba(15,23,42,0.84))] text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_28px_rgba(5,150,105,0.16),0_8px_28px_rgba(0,0,0,0.30)] hover:border-emerald-100/55 hover:bg-[radial-gradient(circle_at_12%_0%,rgba(16,185,129,0.28),transparent_34%),linear-gradient(135deg,rgba(6,78,59,0.74),rgba(15,23,42,0.88))] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_24px_rgba(16,185,129,0.16),0_8px_28px_rgba(0,0,0,0.32)]",
      panel:
        "border-emerald-100/20 bg-[radial-gradient(circle_at_15%_0%,rgba(16,185,129,0.20),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] shadow-[0_24px_70px_rgba(0,0,0,0.64),0_0_34px_rgba(16,185,129,0.13),inset_0_1px_0_rgba(255,255,255,0.14)]",
      selected: "border-emerald-200 bg-emerald-300 text-slate-950",
      hover:
        "hover:border-emerald-200/40 hover:bg-emerald-300/10 hover:text-white",
      glow: "shadow-[0_0_24px_rgba(16,185,129,0.16)]",
      scrollbar: "[scrollbar-color:rgba(16,185,129,0.42)_transparent]",
      label: "text-emerald-100/62",
      value:
        "text-emerald-50 drop-shadow-[0_0_12px_rgba(16,185,129,0.24)]",
      arrow:
        "border-emerald-200/25 bg-emerald-300/12 text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.14)] group-hover/control:border-emerald-100/50 group-hover/control:bg-emerald-300/18",
      arrowOpen:
        "rotate-180 border-emerald-100/60 bg-emerald-300/24 text-emerald-50",
    },
    yellow: {
      focus:
        "focus-visible:border-yellow-100/70 focus-visible:ring-2 focus-visible:ring-yellow-200/25",
      trigger:
        "border-yellow-200/30 bg-[radial-gradient(circle_at_12%_0%,rgba(250,204,21,0.16),transparent_34%),linear-gradient(135deg,rgba(113,63,18,0.42),rgba(15,23,42,0.84))] text-yellow-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_28px_rgba(202,138,4,0.12),0_8px_28px_rgba(0,0,0,0.30)] hover:border-yellow-100/55 hover:bg-[radial-gradient(circle_at_12%_0%,rgba(250,204,21,0.24),transparent_34%),linear-gradient(135deg,rgba(113,63,18,0.56),rgba(15,23,42,0.88))] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_24px_rgba(250,204,21,0.12),0_8px_28px_rgba(0,0,0,0.32)]",
      panel:
        "border-yellow-100/20 bg-[radial-gradient(circle_at_15%_0%,rgba(250,204,21,0.16),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] shadow-[0_24px_70px_rgba(0,0,0,0.64),0_0_34px_rgba(250,204,21,0.10),inset_0_1px_0_rgba(255,255,255,0.14)]",
      selected: "border-yellow-200 bg-yellow-300 text-slate-950",
      hover: "hover:border-yellow-200/40 hover:bg-yellow-300/10 hover:text-white",
      glow: "shadow-[0_0_24px_rgba(250,204,21,0.14)]",
      scrollbar: "[scrollbar-color:rgba(250,204,21,0.38)_transparent]",
      label: "text-yellow-100/62",
      value: "text-yellow-50 drop-shadow-[0_0_12px_rgba(250,204,21,0.20)]",
      arrow:
        "border-yellow-200/25 bg-yellow-300/12 text-yellow-100 shadow-[0_0_16px_rgba(250,204,21,0.12)] group-hover/control:border-yellow-100/50 group-hover/control:bg-yellow-300/18",
      arrowOpen:
        "rotate-180 border-yellow-100/60 bg-yellow-300/24 text-yellow-50",
    },
    violet: {
      focus:
        "focus-visible:border-violet-100/70 focus-visible:ring-2 focus-visible:ring-violet-200/30",
      trigger:
        "border-violet-200/30 bg-[radial-gradient(circle_at_12%_0%,rgba(167,139,250,0.20),transparent_34%),linear-gradient(135deg,rgba(76,29,149,0.52),rgba(15,23,42,0.84))] text-violet-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_28px_rgba(124,58,237,0.16),0_8px_28px_rgba(0,0,0,0.30)] hover:border-violet-100/55 hover:bg-[radial-gradient(circle_at_12%_0%,rgba(167,139,250,0.28),transparent_34%),linear-gradient(135deg,rgba(76,29,149,0.68),rgba(15,23,42,0.88))] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_24px_rgba(167,139,250,0.16),0_8px_28px_rgba(0,0,0,0.32)]",
      panel:
        "border-violet-100/20 bg-[radial-gradient(circle_at_15%_0%,rgba(167,139,250,0.20),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] shadow-[0_24px_70px_rgba(0,0,0,0.64),0_0_34px_rgba(167,139,250,0.13),inset_0_1px_0_rgba(255,255,255,0.14)]",
      selected: "border-violet-200 bg-violet-300 text-slate-950",
      hover:
        "hover:border-violet-200/40 hover:bg-violet-300/10 hover:text-white",
      glow: "shadow-[0_0_24px_rgba(167,139,250,0.15)]",
      scrollbar: "[scrollbar-color:rgba(167,139,250,0.42)_transparent]",
      label: "text-violet-100/62",
      value:
        "text-violet-50 drop-shadow-[0_0_12px_rgba(167,139,250,0.24)]",
      arrow:
        "border-violet-200/25 bg-violet-300/12 text-violet-100 shadow-[0_0_16px_rgba(167,139,250,0.14)] group-hover/control:border-violet-100/50 group-hover/control:bg-violet-300/18",
      arrowOpen:
        "rotate-180 border-violet-100/60 bg-violet-300/24 text-violet-50",
    },
  };
  const setDropdownOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
    if (!nextOpen) {
      lockedDropdownWidthRef.current = null;
      setDropdownMenuStyle(null);
    }
  };
  const updateDropdownMenuPosition = () => {
    const trigger = dropdownButtonRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 12;
    const preferredWidth = isGrid ? 224 : 304;
    const measuredWidth = Math.min(
      Math.max(rect.width, preferredWidth),
      viewportWidth - margin * 2,
    );
    const width = lockedDropdownWidthRef.current ?? measuredWidth;
    lockedDropdownWidthRef.current = width;
    const left = Math.min(
      Math.max(rect.left, margin),
      viewportWidth - width - margin,
    );
    const belowTop = rect.bottom + 8;
    const maxMenuHeight = isGrid ? 176 : 224;
    const availableBelow = viewportHeight - belowTop - margin;
    const availableAbove = rect.top - margin - 8;
    const opensAbove = availableBelow < 148 && availableAbove > availableBelow;
    const maxHeight = Math.max(
      132,
      Math.min(
        maxMenuHeight,
        opensAbove ? availableAbove : Math.max(availableBelow, 132),
      ),
    );
    const preferredTop = opensAbove
      ? Math.max(margin, rect.top - 8 - maxHeight)
      : belowTop;
    const top = Math.min(
      Math.max(preferredTop, margin),
      Math.max(margin, viewportHeight - maxHeight - margin),
    );
    const adjustedMaxHeight = Math.max(
      132,
      Math.min(maxHeight, viewportHeight - top - margin),
    );

    setStableFixedDropdownStyle(setDropdownMenuStyle, createFixedDropdownStyle({
      left,
      top,
      width,
      maxHeight: adjustedMaxHeight,
      zIndex: 2147483000,
    }));
  };
  const selectModifier = (modifierId: string) => {
    onChange(modifierId);
    setDropdownOpen(false);
  };

  useEffect(() => {
    if (!open) return;

    const closeWhenAnotherDropdownOpens = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string }>).detail;
      if (detail?.id !== dropdownId) setDropdownOpen(false);
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      const clickedTrigger = dropdownRef.current?.contains(target);
      const clickedMenu = dropdownMenuRef.current?.contains(target);

      if (!clickedTrigger && !clickedMenu) {
        setDropdownOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDropdownOpen(false);
    };
    let animationFrame: number | null = null;
    const scheduleDropdownPositionUpdate = (
      event?: Event,
      unlockWidth = false,
    ) => {
      const target = event?.target;
      if (
        target instanceof Node &&
        dropdownMenuRef.current?.contains(target)
      ) {
        return;
      }

      if (unlockWidth) lockedDropdownWidthRef.current = null;
      if (animationFrame !== null) return;

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        updateDropdownMenuPosition();
      });
    };

    window.addEventListener(
      exerciseLibraryDropdownOpenEvent,
      closeWhenAnotherDropdownOpens,
    );
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    const handleScroll = (event: Event) =>
      scheduleDropdownPositionUpdate(event);
    const handleResize = () => scheduleDropdownPositionUpdate(undefined, true);
    document.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
      window.removeEventListener(
        exerciseLibraryDropdownOpenEvent,
        closeWhenAnotherDropdownOpens,
      );
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [dropdownId, open]);

  if (!displayOptions.length) return null;

  return (
    <div
      ref={dropdownRef}
      onKeyDown={(event) => {
        if (event.key === "Escape") setDropdownOpen(false);
      }}
      className={`relative min-w-0 ${
        open ? "z-[180]" : "z-[1]"
      } ${className}`}
    >
      <button
        ref={dropdownButtonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        title={displayValue || fallbackOptionLabel}
        onClick={() => {
          if (open) {
            setDropdownOpen(false);
            return;
          }

          announceExerciseLibraryDropdownOpen(dropdownId, {
            parentId: parentDropdownId,
            keepOpenIds: keepOpenDropdownIds,
          });
          updateDropdownMenuPosition();
          setDropdownOpen(true);
        }}
        className={`group/control flex w-full min-w-0 items-center justify-between gap-2 border text-left outline-none backdrop-blur-2xl transition ${
          isGrid
            ? "min-h-[34px] rounded-full px-2.5 py-1.5"
            : "min-h-[42px] rounded-full px-3 py-2"
        } ${accentClasses[accent].trigger} ${accentClasses[accent].focus}`}
      >
        <span
          className={`flex min-w-0 flex-1 items-center ${
            showInlineLabel ? "gap-1.5" : "justify-center"
          }`}
        >
          {showInlineLabel ? (
            <span
              className={`shrink-0 font-black uppercase ${accentClasses[accent].label} ${
                isGrid
                  ? "text-[8px] tracking-[0.08em]"
                  : "text-[9px] tracking-[0.12em]"
              }`}
            >
              {label}
            </span>
          ) : null}
          <span
            className={`min-w-0 flex-1 font-black tracking-[0.03em] ${accentClasses[accent].value} [hyphens:none] [overflow-wrap:normal] [word-break:normal] ${
              showInlineLabel
                ? "truncate"
                : "line-clamp-2 whitespace-normal break-normal text-center leading-tight"
            }`}
          >
            {displayValue || fallbackOptionLabel}
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`flex shrink-0 items-center justify-center rounded-full border font-black transition ${accentClasses[accent].arrow} ${
          isGrid
            ? "h-4 w-4 text-[9px]"
            : "h-5 w-5 text-[10px]"
        } ${
          open ? accentClasses[accent].arrowOpen : ""
        }`}
        >
          v
        </span>
      </button>

      {typeof document !== "undefined" && open && dropdownMenuStyle
        ? createPortal(
            <div
              ref={dropdownMenuRef}
              style={dropdownMenuStyle}
              data-exercise-library-floating-menu="true"
              className={`fixed overflow-hidden border ${accentClasses[accent].panel} p-1.5 backdrop-blur-2xl ${
                isGrid ? "rounded-xl" : "rounded-2xl"
              }`}
            >
          <div
            role="listbox"
            aria-label={label}
            style={{ maxHeight: dropdownMenuStyle.maxHeight }}
            className={`overflow-y-auto pr-1 ${accentClasses[accent].scrollbar} [scrollbar-width:thin]`}
          >
            {!value && !fallbackMatchesOption ? (
              <button
                type="button"
                role="option"
                aria-selected={!value}
                onClick={() => selectModifier("")}
                title={fallbackOptionLabel}
                className={`mb-1 flex w-full items-center justify-between gap-3 border text-left font-black transition ${
                  isGrid
                    ? "min-h-[36px] rounded-lg px-2.5 py-1.5 text-xs"
                    : "min-h-[40px] rounded-xl px-3 py-2 text-sm"
                } ${
                  !value
                    ? `${accentClasses[accent].selected} ${accentClasses[accent].glow}`
                    : `border-white/10 bg-white/[0.045] text-slate-300 ${accentClasses[accent].hover}`
                }`}
              >
                <span className="min-w-0 whitespace-normal break-words leading-4">
                  {fallbackOptionLabel}
                </span>
                {!value ? <span>Selected</span> : null}
              </button>
            ) : null}

            {displayOptions.map((modifier) => {
              const modifierLabel = getModifierOptionLabel(modifier);
              const matchesFallback =
                normalizeOptionLabel(modifierLabel) === fallbackOptionKey;
              const isSelected = modifier.id === value || (!value && matchesFallback);

              return (
                <button
                  key={modifier.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => selectModifier(!value && matchesFallback ? "" : modifier.id)}
                  title={modifierLabel}
                  className={`mb-1 flex w-full items-center justify-between gap-3 border text-left font-black transition ${
                    isGrid
                      ? "min-h-[36px] rounded-lg px-2.5 py-1.5 text-xs"
                      : "min-h-[40px] rounded-xl px-3 py-2 text-sm"
                  } ${
                    isSelected
                      ? `${accentClasses[accent].selected} ${accentClasses[accent].glow}`
                      : `border-white/10 bg-white/[0.045] text-slate-300 ${accentClasses[accent].hover}`
                  }`}
                >
                  <span className="min-w-0 whitespace-normal break-words leading-4">
                    {modifierLabel}
                  </span>
                  {isSelected ? <span>Selected</span> : null}
                </button>
              );
            })}
          </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function MovementMetadataPanel({
  metadata,
  selectedModifierIds,
  setSelectedModifierIds,
  movementArchitectureChips,
  classificationChipClass,
}: {
  metadata: NormalizedExerciseCatalogItem | null;
  selectedModifierIds: ExerciseModifierId[];
  setSelectedModifierIds: Dispatch<SetStateAction<ExerciseModifierId[]>>;
  movementArchitectureChips: MovementArchitectureChip[];
  classificationChipClass?: string;
}) {
  const modifierPanelId = useId();
  const modifierTriggerRef = useRef<HTMLButtonElement | null>(null);
  const modifierPopoverRef = useRef<HTMLDivElement | null>(null);
  const lockedModifierPopoverWidthRef = useRef<number | null>(null);
  const [isModifierPanelOpen, setIsModifierPanelOpen] = useState(false);
  const [modifierPopoverStyle, setModifierPopoverStyle] =
    useState<CSSProperties | null>(null);
  const compatibleModifierGroups = getCompatibleModifierGroups(metadata);
  const compatibleModifierCount = compatibleModifierGroups.reduce(
    (count, group) => count + group.modifiers.length,
    0,
  );
  const coverageValue = metadata
    ? compatibleModifierCount > 0
      ? String(compatibleModifierCount)
      : "Core"
    : "--";
  const coverageLabel = metadata
    ? compatibleModifierCount > 0
      ? "compatible options"
      : "mapped movement"
    : "custom movement";
  const coverageNote = metadata
    ? "validated for this movement"
    : "metadata pending";

  const toggleModifier = (modifier: ExerciseModifier) => {
    setSelectedModifierIds((prev) => {
      if (prev.includes(modifier.id)) {
        return prev.filter((modifierId) => modifierId !== modifier.id);
      }

      return [
        ...prev.filter(
          (modifierId) => getModifierCategoryId(modifierId) !== modifier.categoryId,
        ),
        modifier.id,
      ];
    });
  };

  const remainingModifierGroups = compatibleModifierGroups.filter(
    (group) =>
      !["apparatus", "angle-position", "training-intent"].includes(
        group.categoryId,
      ),
  );
  const updateModifierPopoverPosition = () => {
    const trigger = modifierTriggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = viewportWidth < 640 ? 12 : 16;
    const preferredWidth =
      viewportWidth < 640 ? viewportWidth - margin * 2 : 760;
    const measuredWidth = Math.min(preferredWidth, viewportWidth - margin * 2);
    const width = lockedModifierPopoverWidthRef.current ?? measuredWidth;
    lockedModifierPopoverWidthRef.current = width;
    const centeredLeft = rect.left + rect.width / 2 - width / 2;
    const left = Math.min(
      Math.max(centeredLeft, margin),
      viewportWidth - width - margin,
    );
    const rawTop = rect.bottom + 8;
    const viewportSafeHeight = Math.max(220, viewportHeight - margin * 2);
    const availableBelow = Math.max(0, viewportHeight - rawTop - margin);
    const maxMenuHeight = Math.min(520, viewportSafeHeight);
    const minimumUsableHeight = Math.min(260, maxMenuHeight);
    let top = rawTop;
    let maxHeight = Math.min(
      maxMenuHeight,
      Math.max(minimumUsableHeight, availableBelow),
    );

    if (availableBelow < minimumUsableHeight) {
      top = Math.max(
        margin,
        Math.min(rawTop, viewportHeight - maxMenuHeight - margin),
      );
      maxHeight = Math.min(maxMenuHeight, viewportHeight - top - margin);
    }

    setStableFixedDropdownStyle(setModifierPopoverStyle, createFixedDropdownStyle({
      left,
      top,
      width,
      maxHeight,
      zIndex: 2147483647,
    }));
  };
  const toggleModifierPanel = () => {
    if (isModifierPanelOpen) {
      setIsModifierPanelOpen(false);
      lockedModifierPopoverWidthRef.current = null;
      setModifierPopoverStyle(null);
      return;
    }

    announceExerciseLibraryDropdownOpen(modifierPanelId);
    updateModifierPopoverPosition();
    setIsModifierPanelOpen(true);
  };

  useEffect(() => {
    if (!isModifierPanelOpen) {
      lockedModifierPopoverWidthRef.current = null;
      setModifierPopoverStyle(null);
      return;
    }
    const closeModifierPanel = () => {
      setIsModifierPanelOpen(false);
      lockedModifierPopoverWidthRef.current = null;
      setModifierPopoverStyle(null);
    };

    const closeWhenAnotherDropdownOpens = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string }>).detail;
      if (detail?.id !== modifierPanelId) closeModifierPanel();
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      const clickedTrigger = modifierTriggerRef.current?.contains(target);
      const clickedPopover = modifierPopoverRef.current?.contains(target);

      if (!clickedTrigger && !clickedPopover) {
        closeModifierPanel();
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModifierPanel();
    };
    let animationFrame: number | null = null;
    const scheduleModifierPopoverPositionUpdate = (
      event?: Event,
      unlockWidth = false,
    ) => {
      const target = event?.target;
      if (
        target instanceof Node &&
        modifierPopoverRef.current?.contains(target)
      ) {
        return;
      }

      if (unlockWidth) lockedModifierPopoverWidthRef.current = null;
      if (animationFrame !== null) return;

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        updateModifierPopoverPosition();
      });
    };

    window.addEventListener(
      exerciseLibraryDropdownOpenEvent,
      closeWhenAnotherDropdownOpens,
    );
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    const handleScroll = (event: Event) =>
      scheduleModifierPopoverPositionUpdate(event);
    const handleResize = () =>
      scheduleModifierPopoverPositionUpdate(undefined, true);
    document.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
      window.removeEventListener(
        exerciseLibraryDropdownOpenEvent,
        closeWhenAnotherDropdownOpens,
      );
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isModifierPanelOpen, modifierPanelId]);

  return (
    <div className="mt-3 rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.06] p-3 backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
            Movement Intelligence
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
            Compatible variation controls
          </p>
        </div>
      </div>

      {metadata ? (
        <div className="mt-2.5 space-y-2">
          <MovementArchitectureChips
            chips={movementArchitectureChips}
            classificationChipClass={classificationChipClass}
          />

          <div className="rounded-2xl border border-cyan-200/25 bg-[linear-gradient(135deg,rgba(34,211,238,0.22),rgba(16,185,129,0.12))] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_34px_rgba(8,145,178,0.16)]">
            <p className="text-[8px] font-black uppercase leading-3 tracking-[0.16em] text-cyan-100/75">
              Variation Coverage
            </p>

            <div className="mt-1.5 flex flex-wrap items-end gap-x-2 gap-y-1">
              <span className="text-3xl font-black leading-none text-white">
                {coverageValue}
              </span>
              <span className="max-w-[150px] pb-0.5 text-[10px] font-black uppercase leading-3 tracking-[0.08em] text-emerald-100/80">
                {coverageLabel}
              </span>
            </div>

            <p className="mt-1 text-[10px] font-semibold leading-4 text-cyan-50/60">
              {coverageNote}
            </p>
          </div>

          {remainingModifierGroups.length ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/35">
              <button
                ref={modifierTriggerRef}
                type="button"
                aria-controls={modifierPanelId}
                aria-expanded={isModifierPanelOpen}
                onClick={toggleModifierPanel}
                className="flex min-h-[42px] w-full cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-left text-xs font-black uppercase tracking-[0.14em] text-emerald-200"
              >
                <span>Choose Variation Modifiers</span>
                <span
                  aria-hidden="true"
                  className={`text-sm text-emerald-100 ${
                    isModifierPanelOpen ? "rotate-180" : ""
                  }`}
                >
                  v
                </span>
              </button>

              {typeof document !== "undefined" &&
              isModifierPanelOpen &&
              modifierPopoverStyle
                ? createPortal(
                    <div
                      ref={modifierPopoverRef}
                      id={modifierPanelId}
                      style={modifierPopoverStyle}
                      className="fixed max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[26px] border border-cyan-100/15 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(16,185,129,0.13),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.94))] shadow-[0_30px_100px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl sm:max-w-[calc(100vw-2rem)]"
                    >
                      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/45 to-transparent" />
                      <div
                        style={{ maxHeight: modifierPopoverStyle.maxHeight }}
                        className="relative overflow-y-auto overflow-x-hidden overscroll-contain p-4 [scrollbar-gutter:stable] sm:p-5"
                      >
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                                Variation Modifiers
                              </p>
                              <p className="mt-1 text-xs font-semibold text-slate-400">
                                Validated controls for this movement
                              </p>
                            </div>
                            <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200">
                              {remainingModifierGroups.length} groups
                            </span>
                          </div>

                          {remainingModifierGroups.map((group) => (
                            <ModifierRail
                              key={group.categoryId}
                              label={group.label}
                              modifiers={group.modifiers}
                              selectedModifierIds={selectedModifierIds}
                              onToggleModifier={toggleModifier}
                            />
                          ))}
                        </div>
                      </div>
                    </div>,
                    document.body,
                  )
                : null}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-5 text-slate-300">
          Custom exercise. Normalized movement metadata can be added later when
          custom exercise sync expands.
        </p>
      )}
    </div>
  );
}

function RecentStatsStrip({
  stats,
  compact = false,
}: {
  stats: LocalExerciseStatEntry[];
  compact?: boolean;
}) {
  const latest = stats[0];
  const bestReps = stats.reduce(
    (best, stat) => Math.max(best, parseStatNumber(stat.reps)),
    0,
  );
  const recentVolume = stats.reduce(
    (total, stat) => total + getStatVolume(stat),
    0,
  );

  if (!latest) {
    return (
      <div
        className={`rounded-2xl border border-emerald-300/12 bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(34,211,238,0.045))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${
          compact ? "mt-2 px-3 py-2.5" : "mt-2.5 px-3.5 py-3"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
            Recent Stats
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">
            Empty
          </p>
        </div>
        <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-400">
          No recent stats yet. Log this movement to build history.
        </p>
      </div>
    );
  }

  const cells = [
    {
      label: "Last Load",
      value: latest.weight || "--",
      detail: `${latest.reps || "--"} reps x ${latest.sets || "--"} sets`,
    },
    {
      label: "Best Reps",
      value: formatMetric(bestReps),
      detail: "from recent entries",
    },
    {
      label: "Recent Volume",
      value: formatMetric(recentVolume),
      detail: "last 3 entries",
    },
  ];

  if (compact) {
    return (
      <div className="mt-3 rounded-2xl border border-emerald-300/15 bg-[linear-gradient(135deg,rgba(16,185,129,0.13),rgba(34,211,238,0.06))] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
            Recent
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
            {new Date(latest.date).toLocaleDateString()}
          </p>
        </div>
        <p className="mt-1 break-words text-xs font-black leading-5 text-white">
          {latest.weight || "--"} load / {latest.reps || "--"} reps /{" "}
          {latest.sets || "--"} sets
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2.5 rounded-2xl border border-emerald-300/15 bg-[linear-gradient(135deg,rgba(16,185,129,0.13),rgba(34,211,238,0.06))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_10px_30px_rgba(16,185,129,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
          Recent Stats
        </p>
        <p className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
          {new Date(latest.date).toLocaleDateString()}
        </p>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="min-w-0 rounded-xl border border-white/10 bg-slate-950/35 px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          >
            <p className="break-words text-[8px] font-black uppercase leading-[11px] tracking-[0.06em] text-white/35">
              {cell.label}
            </p>
            <p className="mt-1 break-words text-sm font-black leading-4 text-white">
              {cell.value}
            </p>
            <p className="mt-0.5 break-words text-[9px] font-semibold leading-3 text-slate-400">
              {cell.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MovementSuggestionList({
  title,
  suggestions,
  empty,
}: {
  title: string;
  suggestions: MovementSuggestion[];
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
        {title}
      </p>

      {suggestions.length ? (
        <div className="mt-2 space-y-2">
          {suggestions.map((suggestion) => (
            <div
              key={`${title}-${suggestion.id}`}
              className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2"
            >
              <p className="text-xs font-black text-white">
                {suggestion.name}
              </p>
              <p className="mt-1 text-[11px] font-bold text-cyan-100/75">
                {suggestion.reason} - {suggestion.equipment}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs leading-5 text-slate-400">{empty}</p>
      )}
    </div>
  );
}

function MovementSuggestionsPanel({
  suggestions,
}: {
  suggestions: ReturnType<typeof getMovementSuggestions>;
}) {
  return (
    <details className="group mt-3 rounded-2xl border border-white/10 bg-slate-950/45">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <span>
          <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
            Similar / Substitutions
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-400">
            Same core movement first. Open for alternatives.
          </span>
        </span>
        <span
          aria-hidden="true"
          className="text-sm font-black text-cyan-100 transition group-open:rotate-180"
        >
          v
        </span>
      </summary>

      <div className="border-t border-white/10 p-3">
        <MovementSuggestionList
          title="Best Matches"
          suggestions={suggestions.substitutions}
          empty="No close substitutions found yet."
        />
      </div>
    </details>
  );
}

function MovementProgressPanel({
  suggestions,
}: {
  suggestions: ReturnType<typeof getMovementSuggestions>;
}) {
  return (
    <details className="group mt-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.07]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <span>
          <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
            Progress / Regress
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-400">
            Early movement intelligence. Open for simpler or harder options.
          </span>
        </span>
        <span
          aria-hidden="true"
          className="text-sm font-black text-emerald-100 transition group-open:rotate-180"
        >
          v
        </span>
      </summary>

      <div className="grid gap-2 border-t border-white/10 p-3">
        <MovementSuggestionList
          title="Progress"
          suggestions={suggestions.progressions}
          empty="No clear progression mapped yet."
        />
        <MovementSuggestionList
          title="Regress"
          suggestions={suggestions.regressions}
          empty="No simpler regression mapped yet."
        />
      </div>
    </details>
  );
}

function ExerciseLibraryCard({
  exercise,
  metadata,
  suggestions,
  planAddToParam,
  savedExerciseStats,
  viewMode,
  onAddToPlan,
  onDeleteCustom,
  onAddStats,
  isMovementDetailsOpen,
  onToggleMovementDetails,
}: {
  exercise: Exercise;
  metadata: NormalizedExerciseCatalogItem | null;
  suggestions: ReturnType<typeof getMovementSuggestions>;
  planAddToParam: string;
  savedExerciseStats: LocalExerciseStatEntry[];
  viewMode: ExerciseLibraryViewMode;
  onAddToPlan: (exercise: Exercise) => void;
  onDeleteCustom: (id: string) => void;
  onAddStats: (
    exercise: Exercise,
    mode: ExerciseStatsMenuMode,
    anchorElement?: HTMLElement | null,
  ) => void;
  isMovementDetailsOpen: boolean;
  onToggleMovementDetails: (exerciseId: string | null) => void;
}) {
  const [selectedModifierIds, setSelectedModifierIds] = useState<
    ExerciseModifierId[]
  >(() => getDefaultSelectedModifierIds(metadata));
  const [isVariationDropdownOpen, setIsVariationDropdownOpen] =
    useState(false);
  const [isSemanticDropdownOpen, setIsSemanticDropdownOpen] = useState(false);
  const [isGridDetailsOpen, setIsGridDetailsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const gridDetailsDropdownRef = useRef<HTMLDivElement | null>(null);
  const settingsDropdownRef = useRef<HTMLDivElement | null>(null);
  const [explicitSemanticVariationId, setExplicitSemanticVariationId] =
    useState("");
  const semanticVariationOptions = metadata?.semanticVariations || [];
  const matchedSemanticVariation = getMatchingSemanticVariation(
    semanticVariationOptions,
    selectedModifierIds,
  );
  const explicitSemanticVariation =
    semanticVariationOptions.find(
      (variation) => variation.id === explicitSemanticVariationId,
    ) || null;
  const selectedSemanticVariation = getPreferredSemanticVariation({
    variations: semanticVariationOptions,
    selectedModifierIds,
    currentVariation: explicitSemanticVariation || matchedSemanticVariation,
  });
  const variationName = getGeneratedVariationName(
    exercise,
    metadata,
    selectedModifierIds,
  );
  const activeSemanticVariationName = selectedSemanticVariation?.name || "";
  const cardClassificationLabel = getCardClassificationLabel(metadata);
  const categoryTheme = getCategoryTheme(cardClassificationLabel);
  const activeExerciseName = activeSemanticVariationName || variationName;
  const patternLabel = metadata?.movementPatternLabel || exercise.pattern;
  const equipmentLabel = getSelectedEquipmentLabel(
    exercise,
    metadata,
    selectedModifierIds,
  );
  const coreMovementLabel = metadata?.coreMovementLabel || "";
  const cardTitle = getGeneratedCardTitle({
    exercise,
    metadata,
    semanticVariationName: activeSemanticVariationName,
    equipmentLabel,
  });
  const goalLabel = getSelectedGoalLabel(exercise, selectedModifierIds);
  const recentStats = getRecentExerciseStats(
    savedExerciseStats,
    exercise,
    activeExerciseName,
  );
  const movementArchitectureChips = getMovementArchitectureChips(
    exercise,
    metadata,
    selectedModifierIds,
  );
  const muscleIntelligence = getExerciseMuscleIntelligence(exercise, metadata);
  const isGridView = viewMode === "grid";
  const latestGridStat = recentStats[0];
  const compatibleModifierGroups = getCompatibleModifierGroups(metadata);
  const goalModifierGroup = compatibleModifierGroups.find(
    (group) => group.categoryId === "training-intent",
  );
  const selectedGoalModifierId =
    getSelectedModifiersByCategory(selectedModifierIds, "training-intent").find(
      (modifier) =>
        goalModifierGroup?.modifiers.some((option) => option.id === modifier.id),
    )?.id || "";
  const modifierGroupsByCategory = new Map(
    compatibleModifierGroups.map((group) => [group.categoryId, group]),
  );
  const coreMovementId = metadata?.coreMovementId || null;
  const modifierControlDefinitions =
    (coreMovementId && cardModifierControlPresets[coreMovementId]) || [
      defaultEquipmentControl,
      defaultPositionControl,
      getFallbackThirdControl(coreMovementId),
    ];
  const getOptionsForControl = (control: CardModifierControlDefinition) => {
    const categoryOptions = control.categories.flatMap(
      (categoryId) => modifierGroupsByCategory.get(categoryId)?.modifiers || [],
    );
    const availableOptionsById = new Map(
      categoryOptions.map((modifier) => [modifier.id, modifier]),
    );
    const orderedOptions = control.optionIds
      ? control.optionIds
          .map((modifierId) => availableOptionsById.get(modifierId))
          .filter((modifier): modifier is ExerciseModifier => Boolean(modifier))
      : categoryOptions;

    return dedupeModifierOptionsByDisplayLabel(orderedOptions);
  };
  const getSelectedModifierIdForControl = (options: ExerciseModifier[]) =>
    selectedModifierIds.find((modifierId) =>
      options.some((option) => option.id === modifierId),
    ) || "";
  const getFallbackForControl = (
    control: CardModifierControlDefinition,
    options: ExerciseModifier[],
  ) => {
    if (control.categories.includes("apparatus")) return equipmentLabel;

    return patternLabel || control.label;
  };
  const modifierControls = modifierControlDefinitions
    .map((control) => {
      const options = getOptionsForControl(control);

      return {
        ...control,
        options,
        value: getSelectedModifierIdForControl(options),
        fallback: getFallbackForControl(control, options),
      };
    })
    .filter((control) => control.options.length > 0);
  const setModifierForCategories = (
    categoryIds: ExerciseModifierCategoryId[],
    modifierId: string,
  ) => {
    const selectedModifierCategoryId = modifierId
      ? getModifierCategoryId(modifierId as ExerciseModifierId)
      : null;
    const categoriesToClear = selectedModifierCategoryId
      ? [selectedModifierCategoryId]
      : categoryIds;

    setSelectedModifierIds((prev) => [
      ...prev.filter((id) => {
        const categoryId = getModifierCategoryId(id);
        return !categoryId || !categoriesToClear.includes(categoryId);
      }),
      ...(modifierId ? [modifierId as ExerciseModifierId] : []),
    ]);
  };
  const setModifierForCategory = (
    categoryId: ExerciseModifierCategoryId,
    modifierId: string,
  ) => setModifierForCategories([categoryId], modifierId);
  const handleSemanticVariationChange = (
    variation: SemanticVariationOption,
  ) => {
    setExplicitSemanticVariationId(variation.id);
    setSelectedModifierIds((prev) =>
      applySemanticVariationModifierPreset(prev, variation),
    );
  };

  useEffect(() => {
    setSelectedModifierIds(getDefaultSelectedModifierIds(metadata));
    setExplicitSemanticVariationId("");
    setIsGridDetailsOpen(false);
    setIsSettingsOpen(false);
  }, [exercise.id, metadata?.id]);

  const gridDetailsDropdownId = `details-${exercise.id.replace(
    /[^a-zA-Z0-9_-]/g,
    "-",
  )}`;
  const gridDetailsPanelId = `details-panel-${exercise.id.replace(
    /[^a-zA-Z0-9_-]/g,
    "-",
  )}`;
  const settingsDropdownId = `settings-${exercise.id.replace(
    /[^a-zA-Z0-9_-]/g,
    "-",
  )}`;
  const movementDetailsPanelId = `movement-details-${exercise.id.replace(
    /[^a-zA-Z0-9_-]/g,
    "-",
  )}`;
  const dropdownEventKeepsPanelOpen = (
    detail: ExerciseLibraryDropdownOpenDetail | undefined,
    panelId: string,
  ) =>
    detail?.id === panelId ||
    detail?.parentId === panelId ||
    Boolean(detail?.keepOpenIds?.includes(panelId));

  useEffect(() => {
    if (!isSettingsOpen) return;

    const closeWhenAnotherDropdownOpens = (event: Event) => {
      const detail = (event as CustomEvent<ExerciseLibraryDropdownOpenDetail>)
        .detail;
      if (!dropdownEventKeepsPanelOpen(detail, settingsDropdownId)) {
        setIsSettingsOpen(false);
      }
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;

      if (
        target instanceof Node &&
        settingsDropdownRef.current &&
        !settingsDropdownRef.current.contains(target) &&
        !(
          target instanceof Element &&
          target.closest('[data-exercise-library-floating-menu="true"]')
        )
      ) {
        setIsSettingsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSettingsOpen(false);
    };

    window.addEventListener(
      exerciseLibraryDropdownOpenEvent,
      closeWhenAnotherDropdownOpens,
    );
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener(
        exerciseLibraryDropdownOpenEvent,
        closeWhenAnotherDropdownOpens,
      );
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isSettingsOpen, settingsDropdownId]);
  useEffect(() => {
    if (!isGridDetailsOpen) return;

    const closeWhenAnotherDropdownOpens = (event: Event) => {
      const detail = (event as CustomEvent<ExerciseLibraryDropdownOpenDetail>)
        .detail;
      if (
        !dropdownEventKeepsPanelOpen(detail, gridDetailsDropdownId) &&
        !dropdownEventKeepsPanelOpen(detail, settingsDropdownId)
      ) {
        setIsGridDetailsOpen(false);
        setIsSettingsOpen(false);
      }
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;

      if (
        target instanceof Node &&
        gridDetailsDropdownRef.current &&
        !gridDetailsDropdownRef.current.contains(target) &&
        !(
          target instanceof Element &&
          target.closest('[data-exercise-library-floating-menu="true"]')
        )
      ) {
        setIsGridDetailsOpen(false);
        setIsSettingsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsGridDetailsOpen(false);
        setIsSettingsOpen(false);
      }
    };

    window.addEventListener(
      exerciseLibraryDropdownOpenEvent,
      closeWhenAnotherDropdownOpens,
    );
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener(
        exerciseLibraryDropdownOpenEvent,
        closeWhenAnotherDropdownOpens,
      );
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [gridDetailsDropdownId, isGridDetailsOpen, settingsDropdownId]);
  const handleMovementDetailsToggle = () => {
    if (isMovementDetailsOpen) {
      onToggleMovementDetails(null);
      return;
    }

    announceExerciseLibraryDropdownOpen(movementDetailsPanelId);
    onToggleMovementDetails(exercise.id);
  };
  const handleAddStats = (event?: MouseEvent<HTMLButtonElement>) =>
    onAddStats(
      {
        ...exercise,
        name: activeExerciseName,
        pattern: patternLabel,
        equipment: equipmentLabel,
        goal: goalLabel,
      },
      isGridView ? "grid" : "detail",
      event?.currentTarget || null,
    );
  const actionButtons = (
    <div
      className={`grid grid-cols-1 gap-2 ${
        isGridView ? "mt-3" : "mt-4 sm:grid-cols-2"
      }`}
    >
      {planAddToParam ? (
        <button
          type="button"
          onClick={() => onAddToPlan(exercise)}
          className="min-h-[48px] rounded-2xl border border-cyan-300/25 bg-cyan-400/15 px-4 py-3 text-sm font-black text-cyan-200 transition hover:bg-cyan-400 hover:text-slate-950"
        >
          Add to Plan
        </button>
      ) : null}

      {!exercise.custom ? (
        <a
          href={ROUTES.workoutBuilder.exerciseDemo}
          className="flex min-h-[48px] items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-center text-sm font-black text-cyan-300 transition hover:bg-cyan-400 hover:text-slate-950"
        >
          View Demo
        </a>
      ) : null}

      <button
        type="button"
        onClick={handleAddStats}
        className="min-h-[48px] rounded-2xl border border-yellow-300/30 bg-yellow-400/15 px-4 py-3 text-sm font-black text-yellow-300 transition hover:bg-yellow-400 hover:text-slate-950"
      >
        Add Stats
      </button>

      {exercise.custom ? (
        <button
          type="button"
          onClick={() => onDeleteCustom(exercise.id)}
          className="min-h-[48px] rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm font-black text-red-300 transition hover:bg-red-400 hover:text-white"
        >
          Delete Custom
        </button>
      ) : null}
    </div>
  );
  const settingsControls = modifierControls.length ? (
    <div className="grid gap-2 text-xs">
      {modifierControls.map((control) => (
        <LabeledModifierSelect
          key={control.key}
          label={control.label}
          value={control.value}
          options={control.options}
          fallback={control.fallback}
          onOpenChange={setIsVariationDropdownOpen}
          onChange={(modifierId) =>
            setModifierForCategories(control.categories, modifierId)
          }
          parentDropdownId={settingsDropdownId}
          keepOpenDropdownIds={[settingsDropdownId, gridDetailsDropdownId]}
          accent={control.accent}
          size={isGridView ? "grid" : "detail"}
        />
      ))}
    </div>
  ) : null;
  const settingsButtonClass = `flex w-full items-center justify-between border border-cyan-200/20 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.16),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.88),rgba(2,6,23,0.70))] text-left font-black uppercase text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_26px_rgba(0,0,0,0.24)] transition hover:border-cyan-100/45 hover:bg-cyan-300/10 ${
    isGridView
      ? "min-h-[34px] rounded-xl px-2.5 py-1.5 text-[9px] tracking-[0.08em] sm:text-[10px]"
      : "min-h-[42px] rounded-2xl px-3.5 py-2 text-[11px] tracking-[0.12em]"
  }`;
  const renderSettingsChevron = (open: boolean) => (
    <span
      aria-hidden="true"
      className={`flex items-center justify-center rounded-full border border-cyan-200/20 bg-cyan-300/10 text-cyan-100 transition ${
        isGridView ? "h-5 w-5 text-[10px]" : "h-6 w-6 text-xs"
      } ${
        open
          ? "rotate-180 border-cyan-100/50 bg-cyan-300/20"
          : ""
      }`}
    >
      v
    </span>
  );
  const settingsPanelHeader = (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
      <p className="min-w-0 flex-1 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/70">
        Exercise Settings
      </p>
      <span className="shrink-0 whitespace-nowrap rounded-full border border-cyan-200/12 bg-cyan-300/[0.07] px-1.5 py-px text-[7px] font-black uppercase leading-4 tracking-[0.1em] text-cyan-100/50">
        Mapped
      </span>
    </div>
  );
  const renderExerciseSettingsDropdown = ({
    label,
    wrapperClassName,
    panelClassName,
  }: {
    label: string;
    wrapperClassName: string;
    panelClassName: string;
  }) =>
    modifierControls.length ? (
      <div ref={settingsDropdownRef} className={wrapperClassName}>
        <button
          type="button"
          aria-expanded={isSettingsOpen}
          onClick={() => {
            if (!isSettingsOpen) {
              announceExerciseLibraryDropdownOpen(
                settingsDropdownId,
                isGridView
                  ? {
                      parentId: gridDetailsDropdownId,
                      keepOpenIds: [gridDetailsDropdownId],
                    }
                  : undefined,
              );
            }
            setIsSettingsOpen((current) => !current);
          }}
          className={settingsButtonClass}
        >
          <span>{label}</span>
          {renderSettingsChevron(isSettingsOpen)}
        </button>

        {isSettingsOpen ? (
          <div className={panelClassName}>
            {settingsPanelHeader}
            {settingsControls}
          </div>
        ) : null}
      </div>
    ) : null;
  const settingsDropdown = renderExerciseSettingsDropdown({
    label: "Customize Settings",
    wrapperClassName: "relative mt-3",
    panelClassName:
      "relative z-[80] mt-2.5 rounded-2xl border border-cyan-100/30 bg-slate-950/95 p-2.5 shadow-[0_24px_74px_rgba(0,0,0,0.72),0_0_34px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.16)] ring-1 ring-cyan-200/10 backdrop-blur-2xl",
  });
  const gridExerciseSettingsDropdown = renderExerciseSettingsDropdown({
    label: "Exercise Settings",
    wrapperClassName: "relative z-[140]",
    panelClassName:
      "absolute left-0 right-0 top-full z-[940] mt-1.5 max-h-[210px] overflow-y-auto overscroll-contain rounded-2xl border border-cyan-100/35 bg-slate-950/98 p-2.5 shadow-[0_24px_76px_rgba(0,0,0,0.78),0_0_34px_rgba(34,211,238,0.18),inset_0_1px_0_rgba(255,255,255,0.16)] ring-1 ring-cyan-200/14 backdrop-blur-2xl [scrollbar-color:rgba(34,211,238,0.42)_transparent] [scrollbar-width:thin]",
  });
  const gridDetailsDropdown = (
    <div ref={gridDetailsDropdownRef} className="relative mt-1.5 sm:mt-2">
      <button
        type="button"
        aria-controls={gridDetailsPanelId}
        aria-expanded={isGridDetailsOpen}
        onClick={() => {
          if (!isGridDetailsOpen) {
            announceExerciseLibraryDropdownOpen(gridDetailsDropdownId);
            setIsSettingsOpen(false);
          }
          setIsGridDetailsOpen((current) => {
            if (current) setIsSettingsOpen(false);
            return !current;
          });
        }}
        className={settingsButtonClass}
      >
        <span>Details & Settings</span>
        {renderSettingsChevron(isGridDetailsOpen)}
      </button>

      {isGridDetailsOpen ? (
        <div
          id={gridDetailsPanelId}
          className="mt-2 overflow-visible rounded-2xl border border-cyan-100/24 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.94))] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_34px_rgba(0,0,0,0.34)] ring-1 ring-cyan-200/10"
        >
          <div className="p-2.5">
            {gridExerciseSettingsDropdown}

            <MuscleIntelligenceBlock
              muscles={muscleIntelligence}
              compact
              showSourceBadge={false}
            />

            <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.035] p-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100/60">
                  Movement Intelligence
                </p>
                <span className="shrink-0 whitespace-nowrap rounded-full border border-cyan-200/12 bg-cyan-300/[0.07] px-1.5 py-px text-[7px] font-black uppercase leading-4 tracking-[0.1em] text-cyan-100/50">
                  Mapped
                </span>
              </div>
              <MovementArchitectureChips
                chips={movementArchitectureChips}
                compact
                classificationChipClass={categoryTheme.pillClass}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
  const movementDetails = (
    <div className="group mt-2.5 rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_14px_40px_rgba(8,145,178,0.12)] backdrop-blur-2xl">
      <button
        type="button"
        aria-controls={movementDetailsPanelId}
        aria-expanded={isMovementDetailsOpen}
        onClick={handleMovementDetailsToggle}
        className="flex min-h-[48px] w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
            Movement Details
          </span>
          <span className="mt-0.5 block text-xs font-semibold text-slate-400">
            Modifiers, substitutions, progressions, and coaching cue
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-100/15 bg-white/[0.06] text-sm font-black text-cyan-100 transition ${
            isMovementDetailsOpen ? "rotate-180 border-cyan-200/30" : ""
          }`}
        >
          v
        </span>
      </button>

      {isMovementDetailsOpen ? (
        <div
          id={movementDetailsPanelId}
          className="border-t border-white/10 p-3 [&>div:first-child]:mt-0"
        >
          <MovementMetadataPanel
            metadata={metadata}
            selectedModifierIds={selectedModifierIds}
            setSelectedModifierIds={setSelectedModifierIds}
            movementArchitectureChips={movementArchitectureChips}
            classificationChipClass={categoryTheme.pillClass}
          />

          <MovementSuggestionsPanel suggestions={suggestions} />

          <MovementProgressPanel suggestions={suggestions} />

          <div className="mt-3 rounded-2xl border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(16,185,129,0.05))] p-4 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-200/80 drop-shadow-[0_0_8px_rgba(16,185,129,0.35)]">
              Coaching Cue
            </p>

            <p className="mt-2 text-sm leading-5 text-emerald-100/80 drop-shadow-[0_0_10px_rgba(16,185,129,0.25)]">
              {exercise.cue}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );

  if (isGridView) {
    return (
      <article
        className={`group relative self-start overflow-visible rounded-2xl border backdrop-blur-2xl backdrop-saturate-150 transition ${categoryTheme.surfaceClass} ${categoryTheme.cardClass} ${categoryTheme.hoverClass} ${
          isVariationDropdownOpen ||
          isSemanticDropdownOpen ||
          isGridDetailsOpen ||
          isSettingsOpen
            ? "z-[520]"
            : "z-0 hover:z-20"
        }`}
      >
        <div className={`pointer-events-none absolute inset-0 z-0 rounded-2xl ${categoryTheme.overlayClass} opacity-70`} />
        <div className={`pointer-events-none absolute inset-x-0 top-0 z-[12] h-px ${categoryTheme.accentClass}`} />

        <div className="relative z-10 h-16 overflow-hidden rounded-t-2xl bg-slate-950/70 sm:h-24">
          <img
            src={exercise.image || defaultImage}
            alt={cardTitle}
            className="h-full w-full object-cover opacity-78 transition duration-500 group-hover:scale-105 group-hover:opacity-95"
          />
          <div className={`absolute bottom-1 left-1 max-w-[calc(100%-0.5rem)] truncate rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] backdrop-blur-xl sm:bottom-2 sm:left-2 sm:px-2.5 sm:py-1 sm:text-[9px] sm:tracking-[0.12em] ${categoryTheme.pillClass}`}>
            {exercise.body}
          </div>
        </div>

        <div className="relative z-10 p-2 sm:p-3">
          {coreMovementLabel ? (
            <p className="mb-1 text-[8px] font-black uppercase leading-3 tracking-[0.1em] text-cyan-100/70 sm:text-[9px]">
              Core Movement:{" "}
              <span className="text-cyan-50">{coreMovementLabel}</span>
            </p>
          ) : null}

          <h2 className="line-clamp-2 text-sm font-black leading-4 tracking-wide text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.34)] sm:text-base sm:leading-tight">
            {cardTitle}
          </h2>
          <SemanticVariationSelect
            options={semanticVariationOptions}
            value={selectedSemanticVariation?.id || ""}
            onChange={handleSemanticVariationChange}
            onOpenChange={setIsSemanticDropdownOpen}
            compact
          />

          {gridDetailsDropdown}

          <div className="mt-1.5 rounded-lg border border-cyan-100/15 bg-[linear-gradient(135deg,rgba(34,211,238,0.11),rgba(16,185,129,0.075))] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl sm:mt-2 sm:rounded-xl sm:px-2.5 sm:py-2">
            <div className="hidden items-center justify-between gap-2 sm:flex">
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/70 sm:text-[8px]">
                Recent Stats
              </p>
              {latestGridStat ? (
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/35 sm:text-[8px]">
                  {new Date(latestGridStat.date).toLocaleDateString()}
                </p>
              ) : null}
            </div>
            <p className="truncate text-[10px] font-black leading-4 text-slate-100 sm:mt-1 sm:break-words sm:text-[11px]">
              {latestGridStat
                ? `${latestGridStat.weight || "--"} load / ${
                    latestGridStat.reps || "--"
                  } reps / ${latestGridStat.sets || "--"} sets`
                : "No stats yet"}
            </p>
          </div>

          <div className="mt-1.5 grid grid-cols-2 gap-1 sm:mt-2 sm:gap-1.5">
            {!exercise.custom ? (
              <a
                href={ROUTES.workoutBuilder.exerciseDemo}
                className="flex min-h-[40px] items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-1.5 py-2 text-center text-[9px] font-black uppercase tracking-[0.08em] text-cyan-200 transition hover:bg-cyan-400 hover:text-slate-950 sm:min-h-[38px] sm:rounded-xl sm:px-3 sm:text-[10px] sm:tracking-[0.12em]"
              >
                View Demo
              </a>
            ) : (
              <button
                type="button"
                onClick={() => onDeleteCustom(exercise.id)}
                className="min-h-[40px] rounded-lg border border-red-300/20 bg-red-400/10 px-1.5 py-2 text-[9px] font-black uppercase tracking-[0.08em] text-red-200 transition hover:bg-red-400 hover:text-white sm:min-h-[38px] sm:rounded-xl sm:px-3 sm:text-[10px] sm:tracking-[0.12em]"
              >
                Delete
              </button>
            )}

            <button
              type="button"
              onClick={handleAddStats}
              className="min-h-[40px] rounded-lg border border-yellow-300/30 bg-yellow-400/15 px-1.5 py-2 text-[9px] font-black uppercase tracking-[0.08em] text-yellow-300 transition hover:bg-yellow-400 hover:text-slate-950 sm:min-h-[38px] sm:rounded-xl sm:px-3 sm:text-[10px] sm:tracking-[0.12em]"
            >
              Add Stats
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`group relative mb-4 inline-block w-full break-inside-avoid self-start overflow-visible rounded-[30px] border backdrop-blur-2xl backdrop-saturate-150 transition ${categoryTheme.surfaceClass} ${categoryTheme.cardClass} ${categoryTheme.hoverClass} ${
        isVariationDropdownOpen ||
        isSemanticDropdownOpen ||
        isGridDetailsOpen ||
        isSettingsOpen
          ? "z-[520]"
          : isMovementDetailsOpen
            ? "z-[120]"
            : "z-0 hover:z-20"
      }`}
    >
      <div className={`pointer-events-none absolute inset-0 z-0 rounded-[30px] ${categoryTheme.overlayClass} opacity-70`} />
      <div className={`pointer-events-none absolute inset-x-0 top-0 z-[12] h-px ${categoryTheme.accentClass}`} />

      <div
        className={`relative z-10 overflow-hidden rounded-t-[30px] bg-slate-950/60 ${
          isGridView ? "h-32" : "h-44"
        }`}
      >
        <img
          src={exercise.image || defaultImage}
          alt={cardTitle}
          className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
        />
      </div>

      <div className="relative z-10 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${categoryTheme.pillClass}`}>
            {exercise.body}
          </span>

          {cardClassificationLabel ? (
            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${categoryTheme.pillClass}`}>
              {cardClassificationLabel}
            </span>
          ) : null}

          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            {exercise.level}
          </span>
        </div>

        {coreMovementLabel ? (
          <p className="mt-3.5 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/70">
            Core Movement:{" "}
            <span className="text-cyan-50">{coreMovementLabel}</span>
          </p>
        ) : null}

        <h2 className={`${coreMovementLabel ? "mt-1.5" : "mt-3.5"} text-xl font-extrabold leading-7 tracking-wide text-white drop-shadow-[0_0_14px_rgba(255,255,255,0.42)]`}>
          {cardTitle}
        </h2>
        <SemanticVariationSelect
          options={semanticVariationOptions}
          value={selectedSemanticVariation?.id || ""}
          onChange={handleSemanticVariationChange}
          onOpenChange={setIsSemanticDropdownOpen}
        />
        {settingsDropdown}
      </div>

      <div className="relative z-10 px-5 pb-5 pt-3">
        <MuscleIntelligenceBlock muscles={muscleIntelligence} />

        <div className="mt-3 text-xs">
          <DetailVariationSelect
            label="Goal"
            value={selectedGoalModifierId}
            options={goalModifierGroup?.modifiers || []}
            fallback={goalLabel}
            onOpenChange={setIsVariationDropdownOpen}
            onChange={(modifierId) =>
              setModifierForCategory("training-intent", modifierId)
            }
            accent="yellow"
          />
        </div>

        <RecentStatsStrip stats={recentStats} />

        {movementDetails}
        {actionButtons}
      </div>
    </article>
  );
}

export default function ExerciseLibraryPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] =
    useState<ExerciseLibraryViewMode>("detail");
  const [sortMode, setSortMode] =
    useState<ExerciseLibrarySortMode>("category");
  const exercisesPerPage = 12;
  const [bodyFilters, setBodyFilters] = useState<string[]>([]);
  const [goalFilter, setGoalFilter] = useState("All");
  const [levelFilter, setLevelFilter] = useState("All");
  const [movementTypeFilter, setMovementTypeFilter] = useState("All");
  const [apparatusFilter, setApparatusFilter] = useState("All");
  const [loadBehaviorFilter, setLoadBehaviorFilter] = useState("All");
  const [planAddToParam, setPlanAddToParam] = useState("");
  const [openMovementDetailsId, setOpenMovementDetailsId] = useState<
    string | null
  >(null);

  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [statsExercise, setStatsExercise] = useState<Exercise | null>(null);
  const [statsMenuMode, setStatsMenuMode] =
    useState<ExerciseStatsMenuMode>("detail");
  const statsMenuRef = useRef<HTMLDivElement | null>(null);
  const statsMenuAnchorRef = useRef<HTMLElement | null>(null);
  const lockedStatsMenuWidthRef = useRef<number | null>(null);
  const [statsMenuStyle, setStatsMenuStyle] =
    useState<CSSProperties | null>(null);
  const [statWeight, setStatWeight] = useState("");
  const [statReps, setStatReps] = useState("");
  const [statSets, setStatSets] = useState("");
  const [savedExerciseStats, setSavedExerciseStats] = useState<
    LocalExerciseStatEntry[]
  >([]);

  const [newExercise, setNewExercise] = useState({
    name: "",
    body: "",
    muscles: "",
    pattern: "",
    goal: "Stability",
    equipment: "",
    level: "",
    image: "",
    cue: "",
  });

  useEffect(() => {
    setCustomExercises(readCustomExercises<Exercise>());
  }, []);

  useEffect(() => {
    writeCustomExercises(customExercises);
  }, [customExercises]);

  useEffect(() => {
    let isActive = true;

    const syncStats = async () => {
      const result = await loadWorkoutLogEntriesWithFallback();

      if (!isActive) return;

      setSavedExerciseStats(result.data);
    };

    void syncStats();

    const unsubscribe = subscribeToLocalWorkoutData(() => {
      void syncStats();
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPlanAddToParam(params.get("addTo") || "");
  }, []);

  const allExercises: Exercise[] = useMemo(() => {
    return [...normalizedSystemExercises, ...customExercises];
  }, [customExercises]);

  const apparatusOptions = useMemo(() => {
    const equipmentCounts = normalizedCatalog.filterOptions.apparatus.reduce(
      (counts, option) => {
        const label = normalizeEquipmentLabel(option.label);
        counts.set(label, (counts.get(label) || 0) + option.count);
        return counts;
      },
      new Map<string, number>(),
    );
    const equipmentItems = Array.from(equipmentCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => left.label.localeCompare(right.label));

    return createCountedFilterOptions({
      allHelper: formatCountLabel(equipmentItems.length, "equipment option"),
      group: "Equipment",
      items: equipmentItems,
    });
  }, []);

  const bodyOptions = useMemo(
    () => getUniqueOptions(allExercises, "body"),
    [allExercises],
  );

  const goalOptions = useMemo(() => {
    const goalCounts = allExercises.reduce<Map<string, number>>(
      (counts, exercise) => {
        if (!exercise.goal) return counts;

        counts.set(exercise.goal, (counts.get(exercise.goal) || 0) + 1);
        return counts;
      },
      new Map(),
    );
    const goals = Array.from(
      new Set([...baseGoals, ...Array.from(goalCounts.keys())]),
    ).sort();

    return createCountedFilterOptions({
      allHelper: formatCountLabel(goals.length, "goal"),
      group: "Goal",
      items: goals.map((goal) => ({
        label: goal,
        count: goalCounts.get(goal) || 0,
      })),
    });
  }, [allExercises]);

  const searchSuggestions = useMemo<SearchSuggestion[]>(() => {
    const suggestions = new Map<string, SearchSuggestion>();
    const addSuggestion = (suggestion: SearchSuggestion) => {
      const key = `${suggestion.group}:${suggestion.label}`.toLowerCase();
      if (!suggestions.has(key)) suggestions.set(key, suggestion);
    };

    movementTypeOptions.forEach((option) => {
      addSuggestion({
        id: `movement-${option.value}`,
        label: option.label,
        group: "Movement Type",
        helper: option.group,
        query: option.label,
        aliases: [
          option.value,
          ...option.coreMovementIds.map(
            (id) => CORE_MOVEMENT_BY_ID[id]?.label || id,
          ),
          ...option.movementPatternIds.map(
            (id) => MOVEMENT_PATTERN_BY_ID[id]?.label || id,
          ),
        ],
      });
    });

    normalizedCatalog.items.forEach((item) => {
      item.semanticVariations.forEach((variation) => {
        addSuggestion({
          id: `variation-${variation.id}`,
          label: variation.name,
          group: "Exercise Variation",
          helper: item.coreMovementLabel,
          query: variation.name,
          aliases: variation.aliases,
        });
      });
    });

    apparatusOptions
      .filter((option) => option.value !== "All")
      .forEach((option) => {
        addSuggestion({
          id: `equipment-${option.value}`,
          label: option.label,
          group: "Equipment",
          helper: option.helper,
          query: option.label,
          aliases:
            option.label === "TRX"
              ? ["trx", "suspension trainer", "suspension training"]
              : [option.value],
        });
      });

    bodyOptions
      .filter((body) => body !== "All")
      .forEach((body) => {
        addSuggestion({
          id: `body-${body}`,
          label: body,
          group: "Body Region",
          query: body,
        });
      });

    goalOptions
      .filter((option) => option.value !== "All")
      .forEach((option) => {
        addSuggestion({
          id: `goal-${option.value}`,
          label: option.label,
          group: "Goal",
          helper: option.helper,
          query: option.label,
        });
      });

    return Array.from(suggestions.values()).sort(
      (left, right) =>
        left.group.localeCompare(right.group) ||
        left.label.localeCompare(right.label),
    );
  }, [apparatusOptions, bodyOptions, goalOptions]);

  const levelAvailabilityBase = useMemo(() => {
    return allExercises.filter((exercise) => {
      const searchValue = search.toLowerCase();
      const metadata = getMetadataForExercise(exercise);
      const loadBehaviorLabels = getModifierLabelsByCategory(
        metadata,
        "load-behavior",
      );
      const normalizedSearchTokens = metadata
        ? [
            metadata.coreMovementLabel,
            metadata.movementPatternLabel,
            metadata.familyLabel,
            metadata.apparatus || "",
            ...metadata.searchTokens,
            ...metadata.modifierIds.map(getModifierLabel),
          ]
        : [];

      const matchesSearch =
        exercise.name?.toLowerCase().includes(searchValue) ||
        exercise.body?.toLowerCase().includes(searchValue) ||
        exercise.muscles?.toLowerCase().includes(searchValue) ||
        exercise.pattern?.toLowerCase().includes(searchValue) ||
        exercise.goal?.toLowerCase().includes(searchValue) ||
        exercise.equipment?.toLowerCase().includes(searchValue) ||
        exercise.level?.toLowerCase().includes(searchValue) ||
        normalizedSearchTokens.some((token) =>
          token.toLowerCase().includes(searchValue),
        ) ||
        semanticExerciseMatchesQuery(search, {
          id: exercise.id,
          name: exercise.name,
          movementPatterns: metadata
            ? [
                metadata.coreMovementLabel,
                metadata.movementPatternLabel,
                metadata.familyLabel,
              ]
            : [exercise.pattern],
          modifiers: metadata
            ? [
                metadata.apparatus || "",
                ...metadata.modifierIds.map(getModifierLabel),
              ]
            : [exercise.equipment],
          muscleGroups: [exercise.body, exercise.muscles],
          tags: normalizedSearchTokens,
        });

      const matchesBody =
        bodyFilters.length === 0 || bodyFilters.includes(exercise.body);

      const matchesGoal = goalFilter === "All" || exercise.goal === goalFilter;

      const selectedMovementType =
        movementTypeFilter === "All"
          ? null
          : movementTypeOptionByValue.get(movementTypeFilter) || null;
      const matchesMovementType =
        movementTypeFilter === "All" ||
        Boolean(
          metadata &&
            selectedMovementType &&
            movementTypeMatchesItem(selectedMovementType, metadata),
        );
      const matchesApparatus =
        apparatusFilter === "All" ||
        getApparatusFilterLabelsForMetadata(metadata).includes(apparatusFilter);
      const matchesLoadBehavior =
        loadBehaviorFilter === "All" ||
        loadBehaviorLabels.includes(loadBehaviorFilter);

      return (
        matchesSearch &&
        matchesBody &&
        matchesGoal &&
        matchesMovementType &&
        matchesApparatus &&
        matchesLoadBehavior
      );
    });
  }, [
    allExercises,
    search,
    bodyFilters,
    goalFilter,
    movementTypeFilter,
    apparatusFilter,
    loadBehaviorFilter,
  ]);

  const filtered = useMemo(
    () =>
      levelAvailabilityBase.filter(
        (exercise) => levelFilter === "All" || exercise.level === levelFilter,
      ),
    [levelAvailabilityBase, levelFilter],
  );

  const focusedExercises = useMemo(
    () => getFocusedExerciseCards(filtered),
    [filtered],
  );

  const sortOptions = useMemo<FilterMenuOption[]>(() => {
    const hasStats = savedExerciseStats.length > 0;

    return [
      {
        value: "category",
        label: sortModeLabels.category,
        helper: "Architecture group order",
      },
      {
        value: "alpha",
        label: sortModeLabels.alpha,
        helper: "Title order",
      },
      {
        value: "difficulty",
        label: sortModeLabels.difficulty,
        helper: "Beginner to Advanced",
      },
      {
        value: "body",
        label: sortModeLabels.body,
        helper: "Body region groups",
      },
      ...(hasStats
        ? [
            {
              value: "recent",
              label: sortModeLabels.recent,
              helper: "Latest logged first",
            },
            {
              value: "logged",
              label: sortModeLabels.logged,
              helper: "Highest log count first",
            },
          ]
        : []),
    ];
  }, [savedExerciseStats.length]);

  useEffect(() => {
    if (!sortOptions.some((option) => option.value === sortMode)) {
      setSortMode("category");
    }
  }, [sortMode, sortOptions]);

  const sortedFocusedExercises = useMemo(
    () => sortExercisesForLibrary(focusedExercises, sortMode, savedExerciseStats),
    [focusedExercises, sortMode, savedExerciseStats],
  );

  const levelCounts = useMemo(
    () =>
      levelSegments.reduce<Record<string, number>>((counts, segment) => {
        counts[segment.value] = getFocusedExerciseCards(
          levelAvailabilityBase.filter(
            (exercise) => exercise.level === segment.value,
          ),
        ).length;

        return counts;
      }, {}),
    [levelAvailabilityBase],
  );

  const totalPages = Math.ceil(sortedFocusedExercises.length / exercisesPerPage);

  const paginatedExercises = useMemo(() => {
    const startIndex = (currentPage - 1) * exercisesPerPage;
    return sortedFocusedExercises.slice(startIndex, startIndex + exercisesPerPage);
  }, [sortedFocusedExercises, currentPage, exercisesPerPage]);

  const paginatedExerciseSections = useMemo(
    () => groupExercisesIntoSections(paginatedExercises, sortMode),
    [paginatedExercises, sortMode],
  );

  useEffect(() => {
    setCurrentPage(1);
    setOpenMovementDetailsId(null);
  }, [
    search,
    bodyFilters,
    goalFilter,
    levelFilter,
    movementTypeFilter,
    apparatusFilter,
    loadBehaviorFilter,
    sortMode,
  ]);

  useEffect(() => {
    setOpenMovementDetailsId(null);
  }, [currentPage, viewMode]);

  const resetFilters = () => {
    setSearch("");
    setBodyFilters([]);
    setGoalFilter("All");
    setLevelFilter("All");
    setMovementTypeFilter("All");
    setApparatusFilter("All");
    setLoadBehaviorFilter("All");
  };

  const toggleBodyFilter = (body: string) => {
    if (body === "All") {
      setBodyFilters([]);
      return;
    }

    setBodyFilters((currentFilters) =>
      currentFilters.includes(body)
        ? currentFilters.filter((activeBody) => activeBody !== body)
        : [...currentFilters, body],
    );
  };

  const addExercise = () => {
    if (!newExercise.name.trim()) return;

    const exercise: Exercise = {
      id: `custom-${Date.now()}`,
      name: newExercise.name.trim(),
      body: newExercise.body.trim() || "General",
      muscles: newExercise.muscles.trim() || "General",
      pattern: newExercise.pattern.trim() || "General",
      goal: newExercise.goal.trim() || "Stability",
      equipment: newExercise.equipment.trim() || "Bodyweight",
      level: newExercise.level.trim() || "Beginner",
      image: newExercise.image.trim() || defaultImage,
      cue:
        newExercise.cue.trim() ||
        "Move with control, own the position, and make every rep count.",
      custom: true,
    };

    setCustomExercises((prev) => [exercise, ...prev]);

    setNewExercise({
      name: "",
      body: "",
      muscles: "",
      pattern: "",
      goal: "Stability",
      equipment: "",
      level: "",
      image: "",
      cue: "",
    });

    setShowAddForm(false);
  };

  const deleteCustomExercise = (id: string) => {
    setCustomExercises((prev) => prev.filter((exercise) => exercise.id !== id));
  };

  const addExerciseToBuilder = (exercise: Exercise) => {
    const existingExercises = readWorkoutBuilderSelectedExercises();
    const alreadySelected = existingExercises.some(
      (selectedExercise) => selectedExercise.name === exercise.name,
    );

    if (alreadySelected) {
      return false;
    }

    writeWorkoutBuilderSelectedExercises([
      ...existingExercises.map(toBuilderCatalogExercise),
      toBuilderCatalogExercise(exercise),
    ]);
    return true;
  };

  const addExerciseToPlanBuilder = (exercise: Exercise) => {
    addExerciseToBuilder(exercise);

    if (!planAddToParam) return;

    router.push(
      `${ROUTES.workoutBuilder.home}?addTo=${encodeURIComponent(
        planAddToParam,
      )}`,
    );
  };

  const updateStatsMenuPosition = (mode: ExerciseStatsMenuMode = statsMenuMode) => {
    const anchor = statsMenuAnchorRef.current;
    if (!anchor || !anchor.isConnected) {
      setStatsMenuStyle(null);
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 12;
    const gap = 12;
    const isDetailMode = mode === "detail";
    const maxHeight = isDetailMode
      ? Math.min(Math.round(viewportHeight * 0.86), viewportHeight - margin * 2)
      : Math.min(430, viewportHeight - margin * 2);
    const measuredHeight = Math.min(
      statsMenuRef.current?.offsetHeight || (isDetailMode ? 640 : 360),
      maxHeight,
    );
    const measuredWidth = Math.min(
      viewportWidth < 640
        ? viewportWidth - margin * 2
        : isDetailMode
          ? 760
          : 380,
      viewportWidth - margin * 2,
    );
    const width = lockedStatsMenuWidthRef.current ?? measuredWidth;
    lockedStatsMenuWidthRef.current = width;
    const centeredLeft = rect.left + rect.width / 2 - width / 2;
    const centeredTop = rect.top + rect.height / 2 - measuredHeight / 2;
    const canOpenRight = rect.right + gap + width <= viewportWidth - margin;
    const canOpenLeft = rect.left - gap - width >= margin;
    const canOpenBelow =
      rect.bottom + gap + measuredHeight <= viewportHeight - margin;
    const canOpenAbove = rect.top - gap - measuredHeight >= margin;
    let left = centeredLeft;
    let top = centeredTop;

    if (viewportWidth >= 640 && canOpenRight) {
      left = rect.right + gap;
      top = centeredTop;
    } else if (viewportWidth >= 640 && canOpenLeft) {
      left = rect.left - gap - width;
      top = centeredTop;
    } else if (canOpenBelow) {
      left = centeredLeft;
      top = rect.bottom + gap;
    } else if (canOpenAbove) {
      left = centeredLeft;
      top = rect.top - gap - measuredHeight;
    }

    left = Math.min(
      Math.max(left, margin),
      Math.max(margin, viewportWidth - width - margin),
    );
    top = Math.min(
      Math.max(top, margin),
      Math.max(margin, viewportHeight - measuredHeight - margin),
    );

    setStableFixedDropdownStyle(
      setStatsMenuStyle,
      createFixedDropdownStyle({
        left,
        top,
        width,
        maxHeight,
        zIndex: 2147483647,
      }),
    );
  };

  const resetStatsMenuAnchor = () => {
    statsMenuAnchorRef.current = null;
    lockedStatsMenuWidthRef.current = null;
    setStatsMenuStyle(null);
  };

  const openStatsMenu = (
    exercise: Exercise,
    mode: ExerciseStatsMenuMode,
    anchorElement?: HTMLElement | null,
  ) => {
    setStatsMenuMode(mode);
    if (anchorElement) {
      statsMenuAnchorRef.current = anchorElement;
      lockedStatsMenuWidthRef.current = null;
      updateStatsMenuPosition(mode);
    } else {
      resetStatsMenuAnchor();
    }
    setStatsExercise(exercise);
  };

  const closeStatsMenu = () => {
    setStatsExercise(null);
    resetStatsMenuAnchor();
  };

  const saveStatsEntry = () => {
    if (
      !statsExercise ||
      !statWeight.trim() ||
      !statReps.trim() ||
      !statSets.trim()
    ) {
      return;
    }

    const newStat: LocalExerciseStatEntry = {
      exerciseId: statsExercise.id,
      exerciseName: statsExercise.name,
      body: statsExercise.body,
      pattern: statsExercise.pattern,
      equipment: statsExercise.equipment,
      weight: statWeight.trim(),
      reps: statReps.trim(),
      sets: statSets.trim(),
      date: new Date().toISOString(),
      source: "exercise-library",
    };

    prependExerciseStats(newStat);

    setSavedExerciseStats((prev) => [newStat, ...prev]);
    setStatWeight("");
    setStatReps("");
    setStatSets("");
    if (statsMenuMode === "grid") {
      closeStatsMenu();
    }
  };

  useEffect(() => {
    if (!statsExercise) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;

      if (
        target instanceof Node &&
        statsMenuRef.current &&
        !statsMenuRef.current.contains(target)
      ) {
        closeStatsMenu();
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeStatsMenu();
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [statsExercise]);

  useEffect(() => {
    if (!statsExercise) return;

    updateStatsMenuPosition(statsMenuMode);

    let animationFrame: number | null = null;
    const schedulePositionUpdate = (event?: Event, unlockWidth = false) => {
      const target = event?.target;
      if (target instanceof Node && statsMenuRef.current?.contains(target)) {
        return;
      }

      if (unlockWidth) lockedStatsMenuWidthRef.current = null;
      if (animationFrame !== null) return;

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        updateStatsMenuPosition(statsMenuMode);
      });
    };
    const handleScroll = (event: Event) => schedulePositionUpdate(event);
    const handleResize = () => schedulePositionUpdate(undefined, true);

    document.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [statsExercise, statsMenuMode]);

  const FilterMenu = ({
    label,
    value,
    options,
    onChange,
    accent = "cyan",
    widePanel = false,
    searchable = false,
    groupOrder = [],
    panelWidth = 560,
    preserveOrder = false,
  }: {
    label: string;
    value: string;
    options: Array<string | FilterMenuOption>;
    onChange: (value: string) => void;
    accent?: "cyan" | "emerald" | "blue" | "violet";
    widePanel?: boolean;
    searchable?: boolean;
    groupOrder?: string[];
    panelWidth?: number;
    preserveOrder?: boolean;
  }) => {
    const dropdownId = useId();
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const lockedPanelWidthRef = useRef<number | null>(null);
    const [open, setOpen] = useState(false);
    const [panelQuery, setPanelQuery] = useState("");
    const [panelStyle, setPanelStyle] = useState<CSSProperties | null>(null);
    const normalizedOptions: FilterMenuOption[] = options.map((option) =>
      typeof option === "string"
        ? { value: option, label: option }
        : option,
    );
    const allOption = normalizedOptions.find((option) => option.value === "All");
    const nonAllOptions = normalizedOptions.filter(
      (option) => option.value !== "All",
    );
    const sortedOptions = [
      ...(allOption ? [allOption] : []),
      ...(preserveOrder
        ? nonAllOptions
        : nonAllOptions.sort((left, right) => {
            const leftGroupIndex = groupOrder.indexOf(left.group || "");
            const rightGroupIndex = groupOrder.indexOf(right.group || "");
            const leftGroupSort =
              leftGroupIndex === -1 ? Number.MAX_SAFE_INTEGER : leftGroupIndex;
            const rightGroupSort =
              rightGroupIndex === -1 ? Number.MAX_SAFE_INTEGER : rightGroupIndex;

            return (
              leftGroupSort - rightGroupSort ||
              (left.group || "").localeCompare(right.group || "") ||
              left.label.localeCompare(right.label)
            );
          })),
    ];
    const filteredOptions = panelQuery.trim()
      ? sortedOptions.filter((option) =>
          [option.label, option.group || "", option.helper || ""]
            .join(" ")
            .toLowerCase()
            .includes(panelQuery.trim().toLowerCase()),
        )
      : sortedOptions;
    const selectedOption =
      normalizedOptions.find((option) => option.value === value) ||
      normalizedOptions[0];

    const accentClasses = {
      cyan: {
        trigger: "border-cyan-300/30 bg-cyan-400/10 text-cyan-200",
        panel:
          "border-cyan-100/20 bg-[radial-gradient(circle_at_15%_0%,rgba(34,211,238,0.18),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] shadow-[0_24px_80px_rgba(0,0,0,0.72),0_0_34px_rgba(34,211,238,0.12)]",
        selected: "bg-cyan-300 text-slate-950",
        hover: "text-slate-300 hover:bg-cyan-300/10 hover:text-white",
        scrollbar: "[scrollbar-color:rgba(34,211,238,0.38)_transparent]",
        arrow:
          "border-cyan-200/25 bg-cyan-300/10 after:text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.12)]",
        arrowOpen: "rotate-180 border-cyan-200/50 bg-cyan-300/20",
      },
      emerald: {
        trigger: "border-emerald-300/30 bg-emerald-400/10 text-emerald-200",
        panel:
          "border-emerald-100/20 bg-[radial-gradient(circle_at_15%_0%,rgba(16,185,129,0.18),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] shadow-[0_24px_80px_rgba(0,0,0,0.72),0_0_34px_rgba(16,185,129,0.12)]",
        selected: "bg-emerald-300 text-slate-950",
        hover: "text-slate-300 hover:bg-emerald-300/10 hover:text-white",
        scrollbar: "[scrollbar-color:rgba(16,185,129,0.38)_transparent]",
        arrow:
          "border-emerald-200/25 bg-emerald-300/10 after:text-emerald-100 shadow-[0_0_14px_rgba(16,185,129,0.12)]",
        arrowOpen: "rotate-180 border-emerald-200/50 bg-emerald-300/20",
      },
      blue: {
        trigger: "border-blue-300/30 bg-blue-400/10 text-blue-200",
        panel:
          "border-sky-100/20 bg-[radial-gradient(circle_at_15%_0%,rgba(56,189,248,0.18),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] shadow-[0_24px_80px_rgba(0,0,0,0.72),0_0_34px_rgba(56,189,248,0.12)]",
        selected: "bg-sky-300 text-slate-950",
        hover: "text-slate-300 hover:bg-sky-300/10 hover:text-white",
        scrollbar: "[scrollbar-color:rgba(56,189,248,0.38)_transparent]",
        arrow:
          "border-sky-200/25 bg-sky-300/10 after:text-sky-100 shadow-[0_0_14px_rgba(56,189,248,0.12)]",
        arrowOpen: "rotate-180 border-sky-200/50 bg-sky-300/20",
      },
      violet: {
        trigger: "border-violet-300/30 bg-violet-400/10 text-violet-200",
        panel:
          "border-violet-100/20 bg-[radial-gradient(circle_at_15%_0%,rgba(167,139,250,0.18),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] shadow-[0_24px_80px_rgba(0,0,0,0.72),0_0_34px_rgba(167,139,250,0.12)]",
        selected: "bg-violet-300 text-slate-950",
        hover: "text-slate-300 hover:bg-violet-300/10 hover:text-white",
        scrollbar: "[scrollbar-color:rgba(167,139,250,0.38)_transparent]",
        arrow:
          "border-violet-200/25 bg-violet-300/10 after:text-violet-100 shadow-[0_0_14px_rgba(167,139,250,0.12)]",
        arrowOpen: "rotate-180 border-violet-200/50 bg-violet-300/20",
      },
    };

    const updatePanelPosition = () => {
      const button = buttonRef.current;
      if (!button || !widePanel) return;

      const rect = button.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const margin = 12;
      const safeTop = getTopNavigationSafeArea();
      const measuredWidth = Math.min(
        Math.max(rect.width, panelWidth),
        viewportWidth - margin * 2,
      );
      const width = lockedPanelWidthRef.current ?? measuredWidth;
      lockedPanelWidthRef.current = width;
      const usableHeight = Math.max(160, viewportHeight - safeTop - margin);
      const minPanelHeight = Math.min(240, usableHeight);
      const panelMaxHeight = Math.min(520, usableHeight);
      const preferredTop = Math.max(rect.bottom + 8, safeTop);
      const top = Math.min(
        preferredTop,
        Math.max(safeTop, viewportHeight - minPanelHeight - margin),
      );
      const left = Math.min(
        Math.max(rect.left, margin),
        Math.max(margin, viewportWidth - width - margin),
      );
      const maxHeight = Math.max(
        minPanelHeight,
        Math.min(panelMaxHeight, viewportHeight - top - margin),
      );

      setStableFixedDropdownStyle(
        setPanelStyle,
        createFixedDropdownStyle({
          left,
          top,
          width,
          maxHeight,
          zIndex: topFilterDropdownZIndex,
        }),
      );
    };

    useEffect(() => {
      const closeWhenAnotherDropdownOpens = (event: Event) => {
        const detail = (event as CustomEvent<{ id: string }>).detail;
        if (detail?.id !== dropdownId) setOpen(false);
      };
      const closeOnOutsidePointer = (event: PointerEvent) => {
        const target = event.target;
        if (
          target instanceof Node &&
          dropdownRef.current &&
          !dropdownRef.current.contains(target) &&
          !panelRef.current?.contains(target)
        ) {
          setOpen(false);
        }
      };
      const closeOnEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") setOpen(false);
      };

      window.addEventListener(
        exerciseLibraryDropdownOpenEvent,
        closeWhenAnotherDropdownOpens,
      );
      document.addEventListener("pointerdown", closeOnOutsidePointer);
      document.addEventListener("keydown", closeOnEscape);

      return () => {
        window.removeEventListener(
          exerciseLibraryDropdownOpenEvent,
          closeWhenAnotherDropdownOpens,
        );
        document.removeEventListener("pointerdown", closeOnOutsidePointer);
        document.removeEventListener("keydown", closeOnEscape);
      };
    }, [dropdownId]);

    useEffect(() => {
      if (!open) {
        lockedPanelWidthRef.current = null;
        setPanelStyle(null);
        setPanelQuery("");
        return;
      }

      if (!widePanel) return;

      updatePanelPosition();

      let animationFrame: number | null = null;
      const schedulePositionUpdate = (unlockWidth = false) => {
        if (unlockWidth) lockedPanelWidthRef.current = null;
        if (animationFrame !== null) return;

        animationFrame = window.requestAnimationFrame(() => {
          animationFrame = null;
          updatePanelPosition();
        });
      };
      const handleResize = () => schedulePositionUpdate(true);
      const handleScroll = () => schedulePositionUpdate();

      document.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);

      return () => {
        if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
        document.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleResize);
      };
    }, [open, widePanel, panelWidth]);

    const optionList = (
      <div className={`${widePanel ? "max-h-[inherit]" : "max-h-72"} overflow-y-auto pr-1 ${accentClasses[accent].scrollbar} [scrollbar-width:thin]`}>
        {searchable ? (
          <input
            value={panelQuery}
            onChange={(event) => setPanelQuery(event.target.value)}
            placeholder={`Search ${label.toLowerCase()}...`}
            className="mb-2 min-h-[40px] w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-white/25"
          />
        ) : null}

        {filteredOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              onChange(option.value);
              setOpen(false);
            }}
            className={`mb-1 flex min-h-[40px] w-full items-center justify-between rounded-2xl px-4 py-2.5 text-left text-sm font-bold transition ${
              value === option.value
                ? accentClasses[accent].selected
                : accentClasses[accent].hover
            }`}
          >
            <span className="min-w-0">
              <span className="block">{option.label}</span>
              {(option.group || option.helper) && (
                <span
                  className={`mt-0.5 block text-[10px] font-black uppercase tracking-[0.12em] ${
                    value === option.value
                      ? "text-slate-900/65"
                      : "text-white/35"
                  }`}
                >
                  {[option.group, option.helper]
                    .filter(Boolean)
                    .join(" / ")}
                </span>
              )}
            </span>
            {value === option.value && <span>✓</span>}
          </button>
        ))}

        {filteredOptions.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-bold text-slate-400">
            No options found
          </div>
        ) : null}
      </div>
    );

    return (
      <div ref={dropdownRef} className="relative">
        <button
          ref={buttonRef}
          type="button"
          aria-label={label}
          aria-expanded={open}
          onClick={() => {
            if (!open) announceExerciseLibraryDropdownOpen(dropdownId);
            setOpen((prev) => !prev);
          }}
          className={`flex min-h-[46px] w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left shadow-xl transition hover:scale-[1.01] md:min-h-[42px] md:px-2.5 md:py-2 min-[1100px]:min-h-[46px] min-[1100px]:px-3 min-[1100px]:py-2.5 ${accentClasses[accent].trigger}`}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
              {label}
            </p>
            <p className="mt-0.5 text-sm font-black text-white">
              {selectedOption?.label || value}
            </p>
            {(selectedOption?.group || selectedOption?.helper) ? (
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
                {[selectedOption.group, selectedOption.helper]
                  .filter(Boolean)
                  .join(" / ")}
              </p>
            ) : null}
          </div>

          <span
            aria-hidden="true"
            className={`relative ml-3 flex h-7 w-7 items-center justify-center rounded-full border text-sm font-black text-transparent transition after:absolute after:content-['v'] ${accentClasses[accent].arrow} ${
              open ? accentClasses[accent].arrowOpen : ""
            }`}
          >
            ↓
          </span>
        </button>

        {open && widePanel && panelStyle
          ? createPortal(
              <div
                ref={panelRef}
                style={panelStyle}
                className={`fixed overflow-hidden rounded-[26px] border p-2 backdrop-blur-xl ${accentClasses[accent].panel}`}
              >
                {optionList}
              </div>,
              document.body,
            )
          : null}

        {open && !widePanel && (
          <div className={`absolute left-0 right-0 z-[9999] mt-2 overflow-hidden rounded-[24px] border p-2 backdrop-blur-xl ${accentClasses[accent].panel}`}>
            <div className={`max-h-72 overflow-y-auto pr-1 ${accentClasses[accent].scrollbar} [scrollbar-width:thin]`}>
              {normalizedOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`mb-1 flex min-h-[40px] w-full items-center justify-between rounded-2xl px-4 py-2.5 text-left text-sm font-bold transition ${
                    value === option.value
                      ? accentClasses[accent].selected
                      : accentClasses[accent].hover
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block">{option.label}</span>
                    {(option.group || option.helper) && (
                      <span
                        className={`mt-0.5 block text-[10px] font-black uppercase tracking-[0.12em] ${
                          value === option.value
                            ? "text-slate-900/65"
                            : "text-white/35"
                        }`}
                      >
                        {[option.group, option.helper]
                          .filter(Boolean)
                          .join(" / ")}
                      </span>
                    )}
                  </span>
                  {value === option.value && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const LevelSegmentedControl = ({
    value,
    onChange,
    counts,
  }: {
    value: string;
    onChange: (value: string) => void;
    counts: Record<string, number>;
  }) => (
    <div
      aria-label="Level"
      className="grid min-h-[46px] grid-cols-3 overflow-hidden rounded-2xl shadow-[0_12px_34px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl"
    >
        {levelSegments.map((segment, index) => {
          const isActive = value === segment.value;
          const count = counts[segment.value] || 0;
          const radiusClass =
            index === 0
              ? "rounded-l-2xl rounded-r-none"
              : index === levelSegments.length - 1
                ? "rounded-r-2xl rounded-l-none"
                : "rounded-none";

          return (
            <button
              key={segment.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(isActive ? "All" : segment.value)}
              title={
                isActive
                  ? `Clear level filter (${count} available)`
                  : `Filter ${segment.label} (${count} available)`
              }
              className={`min-w-0 border-y border-l px-1 py-1.5 text-[9px] font-black uppercase leading-3 tracking-[0.04em] transition focus:relative focus:z-10 focus:outline-none focus:ring-2 focus:ring-violet-200/45 sm:px-1.5 sm:text-[10px] ${
                isActive ? segment.active : segment.tone
              } ${radiusClass} ${
                index === levelSegments.length - 1 ? "border-r" : ""
              }`}
            >
              <span className="block truncate">{segment.label}</span>
              <span className="mt-0.5 block truncate text-[8px] font-black leading-3 opacity-70 sm:text-[9px]">
                {count} available
              </span>
            </button>
          );
        })}
    </div>
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <section className="mx-auto w-full max-w-[1240px] space-y-6 px-3 py-6 sm:px-4 sm:py-8">
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_18%_8%,rgba(34,211,238,0.2),transparent_32%),radial-gradient(circle_at_90%_20%,rgba(16,185,129,0.14),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-4 shadow-2xl sm:rounded-[42px] sm:p-6 lg:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-300">
            Exercise Library
          </p>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
              <div>
                <h1 className="max-w-3xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                  Choose the movement first.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                  Start from the core movement pattern, then use compatible
                  modifiers to shape the variation you want to train.
                </p>
              </div>

            <div className="rounded-[28px] border border-cyan-300/20 bg-cyan-400/10 p-5 flex flex-col justify-between">
              <div>
                <p className="text-sm text-slate-300">Library Count</p>
                <p className="mt-2 text-3xl font-black text-white sm:text-4xl">
                  {allExercises.length}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {customExercises.length} custom exercises
                </p>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-cyan-200/80">
                  {normalizedCatalog.report.validItems} validated movement
                  mappings
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  (window.location.href = ROUTES.workoutBuilder.home)
                }
                className="mt-4 min-h-[48px] rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-black text-slate-300 transition hover:border-cyan-300/40 hover:text-white"
              >
                ← Back to Workout Builder
              </button>
            </div>
          </div>
        </section>

        <section className="relative z-30 overflow-visible rounded-[30px] border border-white/15 bg-white/[0.055] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl backdrop-saturate-150 md:p-3 min-[1100px]:p-4">
          <div className="grid gap-2.5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end min-[1100px]:grid-cols-[1fr_auto_auto] min-[1100px]:items-start">
            <div className="md:col-span-2 min-[1100px]:col-span-1">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">
                Movement Filters
              </p>

              <SearchInputWithSuggestions
                value={search}
                onChange={setSearch}
                suggestions={searchSuggestions}
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-2.5 md:min-w-[9rem] md:justify-self-start md:px-3 md:py-2 min-[1100px]:px-4 min-[1100px]:py-2.5">
              <p className="text-xs text-slate-400">Showing</p>
              <p className="mt-1 text-2xl font-black text-cyan-300 md:text-xl min-[1100px]:text-2xl">
                {focusedExercises.length}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Core cards
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="min-h-[44px] rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-5 py-3 text-sm font-black text-emerald-300 transition hover:bg-emerald-400 hover:text-slate-950 md:min-h-[42px] md:justify-self-end md:px-4 md:py-2.5 min-[1100px]:min-h-[44px] min-[1100px]:px-5 min-[1100px]:py-3"
            >
              {showAddForm ? "Close Form" : "+ Add Exercise"}
            </button>
          </div>

          {showAddForm && (
            <div className="mt-6 rounded-[28px] border border-emerald-300/20 bg-slate-950/50 p-5">
              <p className="text-lg font-black text-white">
                Add Private Exercise
              </p>
              <p className="mt-1 text-sm text-slate-400">
                This saves to your browser only, so it is only visible to you on
                this device.
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {[
                  ["name", "Exercise Name"],
                  ["body", "Body Part"],
                  ["muscles", "Smaller Muscles, use • between each"],
                  ["pattern", "Pattern"],
                  ["goal", "Goal"],
                  ["equipment", "Equipment"],
                  ["level", "Level"],
                  ["image", "Image URL"],
                  ["cue", "Coaching Cue"],
                ].map(([key, label]) => (
                  <input
                    key={key}
                    placeholder={label}
                    value={newExercise[key as keyof typeof newExercise]}
                    onChange={(e) =>
                      setNewExercise((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    className="min-h-[48px] rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300"
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={addExercise}
                className="mt-5 min-h-[48px] rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300"
              >
                Save Exercise
              </button>
            </div>
          )}

          {planAddToParam ? (
            <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-xs font-black text-emerald-200">
              Plan assignment mode
            </div>
          ) : null}

          <div className="mt-2.5 grid gap-2.5 md:grid-cols-2 md:gap-2 min-[1100px]:grid-cols-4 min-[1100px]:gap-2.5">
              <FilterMenu
                label="Movement Type"
                value={movementTypeFilter}
                options={movementTypeFilterOptions}
                onChange={setMovementTypeFilter}
                accent="emerald"
                widePanel
                searchable
                groupOrder={[...movementTypeGroupOrder]}
                panelWidth={680}
              />

              <FilterMenu
                label="Equipment"
                value={apparatusFilter}
                options={apparatusOptions}
                onChange={setApparatusFilter}
                accent="blue"
                widePanel
                panelWidth={540}
              />

              <FilterMenu
                label="Goal"
                value={goalFilter}
                options={goalOptions}
                onChange={setGoalFilter}
                accent="emerald"
              />

              <LevelSegmentedControl
                value={levelFilter}
                onChange={setLevelFilter}
                counts={levelCounts}
              />

          </div>

          <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-2.5 sm:flex-row sm:items-center md:flex-nowrap">
            <div className="rounded-2xl border border-cyan-300/15 bg-slate-950/55 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="grid grid-cols-2 gap-1">
                {(["detail", "grid"] as ExerciseLibraryViewMode[]).map(
                  (mode) => (
                    <button
                      key={mode}
                      type="button"
                      aria-label={viewModeLabels[mode]}
                      title={viewModeLabels[mode]}
                      onClick={() => setViewMode(mode)}
                      className={`flex min-h-[40px] min-w-[42px] items-center justify-center rounded-xl px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                        viewMode === mode
                          ? "bg-cyan-300 text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.22)]"
                          : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <ViewModeIcon mode={mode} />
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="w-full sm:max-w-[15rem]">
              <FilterMenu
                label="Sort"
                value={sortMode}
                options={sortOptions}
                onChange={(value) => setSortMode(value as ExerciseLibrarySortMode)}
                accent="cyan"
                preserveOrder
              />
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="min-h-[42px] rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-slate-300 transition hover:border-cyan-300/40 hover:text-white sm:min-w-[116px]"
            >
              Clear
            </button>
          </div>

          <div className="-mx-4 -mb-4 mt-3 box-border overflow-hidden rounded-b-[30px] border-t border-white/10 bg-white/10 md:-mx-3 md:-mb-3 min-[1100px]:-mx-4 min-[1100px]:-mb-4">
            <div className="box-border flex w-full flex-wrap gap-px">
              {bodyOptions.map((body) => {
                const isActive =
                  body === "All"
                    ? bodyFilters.length === 0
                    : bodyFilters.includes(body);
                const bodyTheme = getBodyRegionTheme(body);

                return (
                  <button
                    key={body}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => toggleBodyFilter(body)}
                    className={`flex min-h-[48px] min-w-0 flex-[1_1_7.25rem] items-center justify-center px-2.5 py-2.5 text-center text-[10px] font-black uppercase leading-[1.12] tracking-[0.07em] transition focus:relative focus:z-10 focus:outline-none focus:ring-2 focus:ring-white/30 sm:min-h-[52px] sm:px-3 sm:text-[11px] ${
                      isActive
                        ? bodyTheme.tabClass
                        : `bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.76))] text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${bodyTheme.tabHoverClass}`
                    }`}
                  >
                    <span className="block max-w-full whitespace-normal break-normal [hyphens:none] [overflow-wrap:normal] [text-wrap:balance]">
                      {body}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="relative z-0 space-y-7 overflow-visible">
          {paginatedExerciseSections.map((section) => (
            (() => {
              const sectionTheme =
                sortMode === "body"
                  ? getBodyRegionTheme(section.label)
                  : getCategoryTheme(section.label);

              return (
                <div key={section.key} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                    <div>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${sectionTheme.pillClass}`}>
                        {section.label}
                      </span>
                      <div className={`mt-1.5 h-px w-16 ${sectionTheme.accentClass}`} />
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${sectionTheme.pillClass}`}>
                      {section.exercises.length}
                    </span>
                  </div>

                  <div
                    className={`relative z-0 overflow-visible ${
                      viewMode === "grid"
                        ? "grid grid-cols-2 items-start gap-2 max-[360px]:grid-cols-1 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4"
                        : "grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    }`}
                  >
                    {section.exercises.map((exercise) => {
                      const metadata = getMetadataForExercise(exercise);
                      const suggestions = getMovementSuggestions(exercise, metadata);

                      return (
                        <ExerciseLibraryCard
                          key={exercise.id}
                          exercise={exercise}
                          metadata={metadata}
                          suggestions={suggestions}
                          planAddToParam={planAddToParam}
                          savedExerciseStats={savedExerciseStats}
                          viewMode={viewMode}
                          onAddToPlan={addExerciseToPlanBuilder}
                          onDeleteCustom={deleteCustomExercise}
                          onAddStats={openStatsMenu}
                          isMovementDetailsOpen={openMovementDetailsId === exercise.id}
                          onToggleMovementDetails={setOpenMovementDetailsId}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })()
          ))}
        </section>

        {focusedExercises.length > exercisesPerPage && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="min-h-[44px] rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:text-white disabled:opacity-40"
            >
              ←
            </button>

            {Array.from({ length: totalPages }).map((_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`h-11 w-11 rounded-xl text-sm font-bold ${
                    currentPage === page
                      ? "bg-cyan-400 text-black"
                      : "bg-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="min-h-[44px] rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:text-white disabled:opacity-40"
            >
              →
            </button>
          </div>
        )}

        {focusedExercises.length === 0 && (
          <section className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 text-center shadow-2xl sm:rounded-[34px] sm:p-10">
            <p className="text-lg font-black text-white">No exercises found.</p>
            <p className="mt-2 text-sm text-slate-400">
              Try clearing filters or adding a new movement.
            </p>
          </section>
        )}
      </section>

      {statsExercise && statsMenuMode === "grid" && (
        <div
          style={statsMenuStyle || undefined}
          className={
            statsMenuStyle
              ? "fixed max-w-[calc(100vw-1.5rem)]"
              : "fixed inset-x-3 bottom-3 z-[9999] mx-auto w-auto max-w-[430px] sm:bottom-6 sm:right-6 sm:left-auto sm:w-[min(92vw,430px)]"
          }
        >
          <div
            ref={statsMenuRef}
            className="max-h-[inherit] overflow-y-auto overflow-x-hidden rounded-[28px] border border-white/20 bg-[radial-gradient(circle_at_12%_0%,rgba(250,204,21,0.18),transparent_34%),radial-gradient(circle_at_90%_12%,rgba(34,211,238,0.14),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(2,6,23,0.90))] p-4 shadow-[0_30px_120px_rgba(0,0,0,0.82),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl backdrop-saturate-150"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-300">
                  Quick Stats
                </p>
                <h3 className="mt-1 line-clamp-2 text-lg font-black leading-6 text-white">
                  {statsExercise.name}
                </h3>
                <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                  {statsExercise.equipment || statsExercise.pattern}
                </p>
              </div>

              <button
                type="button"
                onClick={closeStatsMenu}
                className="min-h-[40px] shrink-0 rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2 text-xs font-black text-white/70 transition hover:bg-white/[0.18] hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-4 rounded-[24px] border border-yellow-200/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.105),rgba(255,255,255,0.045))] p-3 shadow-[0_14px_38px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
                Weight × Reps × Sets
              </p>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <input
                  value={statWeight}
                  onChange={(e) => setStatWeight(e.target.value)}
                  placeholder="Weight"
                  className="min-h-[46px] min-w-0 rounded-2xl border border-white/12 bg-slate-950/45 px-3 py-2 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] outline-none transition placeholder:text-white/35 focus:border-yellow-200/45 focus:bg-white/[0.10]"
                />

                <input
                  value={statReps}
                  onChange={(e) => setStatReps(e.target.value)}
                  placeholder="Reps"
                  className="min-h-[46px] min-w-0 rounded-2xl border border-white/12 bg-slate-950/45 px-3 py-2 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] outline-none transition placeholder:text-white/35 focus:border-yellow-200/45 focus:bg-white/[0.10]"
                />

                <input
                  value={statSets}
                  onChange={(e) => setStatSets(e.target.value)}
                  placeholder="Sets"
                  className="min-h-[46px] min-w-0 rounded-2xl border border-white/12 bg-slate-950/45 px-3 py-2 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] outline-none transition placeholder:text-white/35 focus:border-yellow-200/45 focus:bg-white/[0.10]"
                />
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={saveStatsEntry}
                className="min-h-[46px] rounded-2xl bg-gradient-to-r from-yellow-300 to-yellow-500 px-4 py-3 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(250,204,21,0.22)] transition hover:scale-[1.01]"
              >
                Save Stats
              </button>

              <a
                href={ROUTES.dashboard.stats}
                className="flex min-h-[46px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-black text-slate-300 transition hover:border-yellow-300/40 hover:text-white"
              >
                View Stats Page
              </a>
            </div>
          </div>
        </div>
      )}

      {statsExercise && statsMenuMode === "detail" && (
        <div
          style={statsMenuStyle || undefined}
          className={
            statsMenuStyle
              ? "fixed max-w-[calc(100vw-1.5rem)]"
              : "fixed inset-x-2 bottom-3 top-3 z-[9999] mx-auto w-auto max-w-[760px] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:w-[min(94vw,760px)]"
          }
        >
          <div
            ref={statsMenuRef}
            className="max-h-[inherit] max-w-full overflow-hidden rounded-[28px] border border-white/20 bg-white/[0.075] shadow-[0_30px_120px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl backdrop-saturate-150 sm:rounded-[34px]"
          >
            <div className="max-h-[inherit] overflow-y-auto overflow-x-hidden overscroll-contain px-1">
              <div className="grid lg:grid-cols-[1.05fr_310px] h-full">
                <div className="min-h-0 overflow-y-auto">
                  <div className="relative h-52 overflow-hidden border-b border-white/10 bg-slate-950 sm:h-[310px]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.22),transparent_42%),linear-gradient(135deg,rgba(8,13,30,0.95),rgba(2,6,23,0.98))]" />

                    <div className="absolute inset-0 flex items-center justify-center">
                      <button
                        type="button"
                        className="flex h-20 w-20 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-300/10 text-3xl text-cyan-200 shadow-[0_0_40px_rgba(34,211,238,0.25)] transition hover:scale-105 hover:bg-cyan-300/20"
                      >
                        ▶
                      </button>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">
                        Add Stats
                      </p>
                      <h3 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                        {statsExercise.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-300">
                        {statsExercise.body} • {statsExercise.pattern} •{" "}
                        {statsExercise.equipment}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-cyan-200/15 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(14,165,233,0.12),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.74),rgba(2,6,23,0.64))] p-5 shadow-[0_18px_56px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.16),inset_0_0_40px_rgba(34,211,238,0.06)] backdrop-blur-2xl backdrop-saturate-150">
                    <p className="mt-2 rounded-2xl border border-cyan-100/20 bg-white/[0.075] p-4 text-sm font-black uppercase tracking-[0.16em] text-cyan-100 shadow-[0_12px_34px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.18),inset_0_0_26px_rgba(34,211,238,0.055)] backdrop-blur-2xl">
                      Coaching Cue
                    </p>
                    <p className="mt-2 rounded-2xl border border-white/12 bg-white/[0.055] p-4 text-sm leading-6 text-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl">
                      {statsExercise.cue ||
                        "Move with control, own the position, and make every rep count."}
                    </p>
                  </div>
                </div>

                <div className="border-t border-white/10 bg-white/[0.055] p-4 shadow-[inset_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-xl lg:border-l lg:border-t-0">
                  <div className="mb-4 rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-3">
                    <p className="text-xs font-black uppercase text-emerald-300">
                      Recent Stats
                    </p>

                    <div className="mt-2 space-y-2">
                      {savedExerciseStats
                        .filter((stat) => stat.exerciseId === statsExercise.id)
                        .slice(0, 3).length > 0 ? (
                        savedExerciseStats
                          .filter(
                            (stat) => stat.exerciseId === statsExercise.id,
                          )
                          .slice(0, 3)
                          .map((stat, index) => (
                            <div
                              key={`${stat.date}-${index}`}
                              className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]"
                            >
                              <p className="text-base font-extrabold tracking-wide text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]">
                                <span className="text-white">
                                  {stat.weight}
                                </span>
                                <span className="mx-2 text-white/30">×</span>
                                <span className="text-white">{stat.reps}</span>
                                <span className="mx-2 text-white/30">×</span>
                                <span className="text-white">{stat.sets}</span>
                              </p>

                              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                                {new Date(stat.date).toLocaleDateString()}
                              </p>
                            </div>
                          ))
                      ) : (
                        <p className="text-sm text-slate-300">
                          No recent stats saved yet.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 rounded-[28px] border border-yellow-200/15 bg-[radial-gradient(circle_at_12%_0%,rgba(250,204,21,0.16),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.82))] p-4 shadow-[0_18px_52px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.16),inset_0_0_32px_rgba(250,204,21,0.055)] backdrop-blur-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/80 drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]">
                          Weight × Reps × Sets
                        </p>
                        <p className="mt-1 text-xs text-white/40">
                          Quick set tracking
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={closeStatsMenu}
                        className="min-h-[44px] rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-2 text-xs font-black text-white/70 transition hover:bg-white/[0.18] hover:text-white"
                      >
                        Close
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      <input
                        value={statWeight}
                        onChange={(e) => setStatWeight(e.target.value)}
                        placeholder="Weight"
                        className="min-h-[50px] rounded-2xl border border-white/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.055))] px-3.5 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl outline-none transition placeholder:text-white/35 hover:border-yellow-200/25 hover:bg-white/[0.12] focus:border-yellow-200/45 focus:bg-white/[0.14] focus:shadow-[0_14px_34px_rgba(0,0,0,0.28),0_0_0_3px_rgba(250,204,21,0.08),inset_0_1px_0_rgba(255,255,255,0.18)]"
                      />

                      <input
                        value={statReps}
                        onChange={(e) => setStatReps(e.target.value)}
                        placeholder="Reps"
                        className="min-h-[50px] rounded-2xl border border-white/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.055))] px-3.5 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl outline-none transition placeholder:text-white/35 hover:border-yellow-200/25 hover:bg-white/[0.12] focus:border-yellow-200/45 focus:bg-white/[0.14] focus:shadow-[0_14px_34px_rgba(0,0,0,0.28),0_0_0_3px_rgba(250,204,21,0.08),inset_0_1px_0_rgba(255,255,255,0.18)]"
                      />

                      <input
                        value={statSets}
                        onChange={(e) => setStatSets(e.target.value)}
                        placeholder="Sets"
                        className="min-h-[50px] rounded-2xl border border-white/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.055))] px-3.5 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl outline-none transition placeholder:text-white/35 hover:border-yellow-200/25 hover:bg-white/[0.12] focus:border-yellow-200/45 focus:bg-white/[0.14] focus:shadow-[0_14px_34px_rgba(0,0,0,0.28),0_0_0_3px_rgba(250,204,21,0.08),inset_0_1px_0_rgba(255,255,255,0.18)]"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={saveStatsEntry}
                    className="mt-3 min-h-[48px] w-full rounded-2xl bg-gradient-to-r from-yellow-300 to-yellow-500 px-4 py-3 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(250,204,21,0.22)] transition hover:scale-[1.01]"
                  >
                    Save Stats
                  </button>

                  <div className="mt-3 grid gap-2">
                    <a
                      href={ROUTES.dashboard.stats}
                      className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-black text-slate-300 transition hover:border-yellow-300/40 hover:text-white"
                    >
                      View Stats Page →
                    </a>

                    <a
                      href={ROUTES.workoutBuilder.exerciseDemo}
                      className="min-h-[48px] rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-center text-sm font-black text-cyan-300 transition hover:bg-cyan-400 hover:text-slate-950"
                    >
                      View Full Demo Page →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
