"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import Body, {
  type ExtendedBodyPart,
  type Slug,
} from "react-muscle-highlighter";
import { useRouter } from "next/navigation";
import { loadWorkoutLogEntriesWithFallback } from "@/lib/data/workoutPersistence";
import { supabase } from "@/lib/supabaseClient";
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
  STANDARD_RANGE_OF_MOTION_MODIFIER_IDS,
} from "@/lib/training/movementTaxonomy";
import { createExerciseVariation } from "@/lib/training/movementGeneration";
import { ROUTES } from "@/lib/routes";
import type { MuscleSlug } from "@/components/anatomy/exerciseMuscleMap";
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
  customExerciseId?: string;
  name: string;
  exerciseName?: string;
  body: string;
  muscles: string;
  pattern: string;
  goal: string;
  equipment: string;
  level: string;
  image?: string;
  cue?: string;
  custom?: boolean;
  coreMovementPattern?: CoreMovementId | string;
  semanticVariationId?: string;
  semanticVariationName?: string;
  semanticVariation?: string;
  generatedTitle?: string;
  selectedModifierIds?: ExerciseModifierId[];
  settings?: Record<string, string>;
  variationModifiers?: string[];
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  coachingCue?: string;
  imageUrl?: string;
};

type PrivateExerciseDraft = {
  name: string;
  coreMovementPattern: CoreMovementId | "";
  semanticVariationId: string;
  modifierIds: ExerciseModifierId[];
  goal: string;
  difficulty: string;
  primaryMuscles: string;
  secondaryMuscles: string;
  cue: string;
  image: string;
};

type ExerciseLibraryProfileSummary = {
  avatarUrl: string | null;
  bio: string;
  currentFocus: string;
  displayName: string;
  email: string;
  preferredTrainingStyle: string;
  primaryGoal: string;
  secondaryGoal: string;
  trainingLevel: string;
};

const defaultExerciseLibraryProfileSummary: ExerciseLibraryProfileSummary = {
  avatarUrl: null,
  bio: "Add profile details",
  currentFocus: "Add profile details",
  displayName: "Athlete",
  email: "",
  preferredTrainingStyle: "Add profile details",
  primaryGoal: "No goal set",
  secondaryGoal: "Add profile details",
  trainingLevel: "",
};

type ExerciseLibraryViewMode = "detail" | "grid";
type ExerciseStatsMenuMode = "detail" | "grid";
type WeightUnit = "lbs" | "kg";
type ExerciseLibraryUiThemeId =
  | "space-glass"
  | "ocean-water"
  | "neon-gym"
  | "minimal-dark"
  | "emerald-performance";
type ExerciseLibrarySortMode =
  | "category"
  | "alpha"
  | "difficulty"
  | "body"
  | "favorites"
  | "recent"
  | "logged";

type MovementDetailsSubPanel = "similar" | "progress";

const defaultExerciseLibrarySortMode: ExerciseLibrarySortMode = "category";

const viewModeLabels: Record<ExerciseLibraryViewMode, string> = {
  detail: "Detail View",
  grid: "Grid View",
};

const sortModeLabels: Record<ExerciseLibrarySortMode, string> = {
  category: "Category Order",
  alpha: "A-Z",
  difficulty: "Difficulty",
  body: "Body Region",
  favorites: "Favorites",
  recent: "Recently Used",
  logged: "Most Logged",
};

const exerciseLibraryFavoritesStorageKey =
  "sound-fitness:exercise-library:favorites";

const readExerciseLibraryFavoriteIds = () => {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(exerciseLibraryFavoritesStorageKey) || "[]",
    );

    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
};

const writeExerciseLibraryFavoriteIds = (favoriteIds: Set<string>) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      exerciseLibraryFavoritesStorageKey,
      JSON.stringify(Array.from(favoriteIds).sort()),
    );
  } catch {
    // Local persistence can fail in restricted browser modes; UI state still toggles.
  }
};

const difficultyOrder = ["Beginner", "Intermediate", "Advanced"];

type DifficultyTheme = {
  tone: string;
  active: string;
  pill: string;
  focusRing: string;
};

const difficultyThemeFallback: DifficultyTheme = {
  tone:
    "border-slate-200/20 bg-slate-300/[0.08] text-slate-200 hover:border-slate-200/35 hover:bg-slate-300/[0.14]",
  active:
    "border-slate-100 bg-slate-200 text-slate-950 shadow-[0_0_24px_rgba(148,163,184,0.22)]",
  pill:
    "border-slate-200/18 bg-slate-300/8 text-slate-300 shadow-[0_0_16px_rgba(148,163,184,0.08)]",
  focusRing: "focus:ring-slate-200/35",
};

const difficultyThemes: Record<string, DifficultyTheme> = {
  beginner: {
    tone:
      "border-emerald-200/25 bg-emerald-300/10 text-emerald-100 hover:border-emerald-200/45 hover:bg-emerald-300/18",
    active:
      "border-emerald-200 bg-emerald-300 text-slate-950 shadow-[0_0_28px_rgba(16,185,129,0.28)]",
    pill:
      "border-emerald-200/25 bg-emerald-300/12 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.10)]",
    focusRing: "focus:ring-emerald-200/40",
  },
  intermediate: {
    tone:
      "border-cyan-200/25 bg-cyan-300/10 text-cyan-100 hover:border-cyan-200/45 hover:bg-cyan-300/18",
    active:
      "border-cyan-200 bg-cyan-300 text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.28)]",
    pill:
      "border-cyan-200/25 bg-cyan-300/12 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.10)]",
    focusRing: "focus:ring-cyan-200/40",
  },
  advanced: {
    tone:
      "border-amber-200/25 bg-amber-300/10 text-amber-100 hover:border-amber-200/45 hover:bg-amber-300/18",
    active:
      "border-amber-200 bg-amber-300 text-slate-950 shadow-[0_0_30px_rgba(251,191,36,0.28)]",
    pill:
      "border-amber-200/26 bg-amber-300/12 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.10)]",
    focusRing: "focus:ring-amber-200/40",
  },
  elite: {
    tone:
      "border-fuchsia-200/25 bg-fuchsia-300/10 text-fuchsia-100 hover:border-fuchsia-200/45 hover:bg-fuchsia-300/18",
    active:
      "border-fuchsia-200 bg-fuchsia-300 text-slate-950 shadow-[0_0_30px_rgba(217,70,239,0.28)]",
    pill:
      "border-fuchsia-200/26 bg-fuchsia-300/12 text-fuchsia-100 shadow-[0_0_18px_rgba(217,70,239,0.10)]",
    focusRing: "focus:ring-fuchsia-200/40",
  },
};

const getDifficultyTheme = (difficulty?: string | null): DifficultyTheme =>
  difficulty
    ? difficultyThemes[difficulty.trim().toLowerCase()] || difficultyThemeFallback
    : difficultyThemeFallback;

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

function FavoriteStarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 2 3.09 6.26 6.91 1-5 4.87 1.18 6.87L12 17.77 5.82 21 7 14.13l-5-4.87 6.91-1L12 2Z" />
    </svg>
  );
}

function FavoriteButton({
  isFavorite,
  onToggle,
  compact = false,
}: {
  isFavorite: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={isFavorite}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      title={isFavorite ? "Remove from favorites" : "Add to favorites"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
      className={`absolute right-2 top-2 z-[35] flex items-center justify-center rounded-full border backdrop-blur-xl transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-200/40 ${
        compact ? "h-8 w-8" : "h-10 w-10"
      } ${
        isFavorite
          ? "border-yellow-200/70 bg-yellow-300/22 text-yellow-200 shadow-[0_0_28px_rgba(250,204,21,0.30),inset_0_1px_0_rgba(255,255,255,0.20)]"
          : "border-white/15 bg-slate-950/58 text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:border-yellow-200/45 hover:bg-yellow-300/12 hover:text-yellow-100"
      }`}
    >
      <FavoriteStarIcon filled={isFavorite} />
    </button>
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
    ...getDifficultyTheme("Beginner"),
  },
  {
    value: "Intermediate",
    label: "Intermediate",
    ...getDifficultyTheme("Intermediate"),
  },
  {
    value: "Advanced",
    label: "Advanced",
    ...getDifficultyTheme("Advanced"),
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
    <div className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 z-10 mt-1 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-200/18 bg-cyan-300/10 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.14)] min-[1100px]:mt-1.5 min-[1100px]:h-8 min-[1100px]:w-8"
      >
        <svg
          className="h-3.5 w-3.5 min-[1100px]:h-4 min-[1100px]:w-4"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </div>
      <input
        ref={inputRef}
        placeholder="Search core movement, muscle, pattern, goal, equipment, or level..."
        value={value}
        onFocus={openPanel}
        onChange={(event) => {
          onChange(event.target.value);
          if (!open) openPanel();
        }}
        className="mt-2 min-h-[44px] w-full rounded-2xl border border-cyan-100/18 bg-[radial-gradient(circle_at_8%_0%,rgba(34,211,238,0.18),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(2,6,23,0.82))] px-3 py-2 pl-12 text-sm font-semibold text-white shadow-[0_16px_42px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.12)] outline-none ring-1 ring-white/[0.035] backdrop-blur-2xl placeholder:text-slate-500 transition focus:border-cyan-200/60 focus:bg-slate-950/90 focus:shadow-[0_20px_58px_rgba(0,0,0,0.38),0_0_36px_rgba(34,211,238,0.18),inset_0_1px_0_rgba(255,255,255,0.16)] focus:ring-2 focus:ring-cyan-200/18 md:min-h-[42px] md:px-3 md:py-2 md:pl-12 min-[1100px]:mt-3 min-[1100px]:min-h-[48px] min-[1100px]:rounded-[22px] min-[1100px]:px-4 min-[1100px]:py-3 min-[1100px]:pl-14 min-[1100px]:text-base"
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

const normalizedMetadataByExerciseId = new Map(
  normalizedCatalog.items.map((item) => [item.legacyExerciseId, item]),
);

// Internal migration marker: system exercises now come from the normalized
// catalog service, converted back to the current Exercise shape for this page.
// Drop unmapped legacy fallbacks so placeholder cards do not leak into results.
const normalizedSystemExercises = (
  getExerciseCatalogWithLegacyFallback() as Exercise[]
).filter((exercise) => normalizedMetadataByExerciseId.has(exercise.id));

const defaultImage =
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=900";

const myExercisesSectionLabel = "My Exercises";
const myExercisesSectionKey = myExercisesSectionLabel.toLowerCase();

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
  "Fat Loss",
  "Stability",
  "Mobility",
  "Athletic Performance",
  "Conditioning",
  "Rehab / Return to Training",
  "Recovery",
  "Power",
  "General Fitness",
  "Endurance",
  "Skill / Technique",
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

const reorderBodyRegionOptions = (options: string[]) => {
  const reorderedOptions = [...options];
  const fullBodyIndex = reorderedOptions.indexOf("Full Body");
  const upperBackShouldersIndex = reorderedOptions.indexOf(
    "Upper Back / Shoulders",
  );

  if (fullBodyIndex !== -1 && upperBackShouldersIndex !== -1) {
    [reorderedOptions[fullBodyIndex], reorderedOptions[upperBackShouldersIndex]] =
      [reorderedOptions[upperBackShouldersIndex], reorderedOptions[fullBodyIndex]];
  }

  return reorderedOptions;
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

const executionStyleModifierIds = (ids: string[]) =>
  ids as ExerciseModifierId[];

const limitedExecutionStyleOptionIds = executionStyleModifierIds([
  "execution-style:unilateral",
  "execution-style:alternating",
]);

const getVariableExecutionStyleOptionIds = (
  coreMovementId?: CoreMovementId | null,
) => {
  if (!coreMovementId) return [];

  if (
    ["shoulder-press", "curl", "biceps-curl", "lunge", "step-up"].includes(
      coreMovementId,
    )
  ) {
    return limitedExecutionStyleOptionIds;
  }

  return [];
};

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

  const executionStyleOptions = getVariableExecutionStyleOptionIds(
    metadata.coreMovementId,
  )
    .map((modifierId) => EXERCISE_MODIFIER_BY_ID[modifierId])
    .filter((modifier): modifier is ExerciseModifier => Boolean(modifier));

  if (executionStyleOptions.length) {
    const category = EXERCISE_MODIFIER_CATEGORY_BY_ID["execution-style"];
    if (!groups["execution-style"]) {
      groups["execution-style"] = {
        categoryId: "execution-style",
        label: getModifierCategoryLabel("execution-style"),
        displayOrder: category?.displayOrder || 999,
        modifiers: [],
      };
    }

    const group = groups["execution-style"];
    executionStyleOptions.forEach((modifier) => {
      if (
        group &&
        !group.modifiers.some((existing) => existing.id === modifier.id)
      ) {
        group.modifiers.push(modifier);
      }
    });
  }

  return Object.values(groups)
    .filter(Boolean)
    .map((group) => ({
      ...group,
      modifiers:
        group.categoryId === "range-of-motion"
          ? getStandardRangeOfMotionOptions()
          : group.modifiers.sort(
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
  dumbbells: "Dumbbell",
  kb: "Kettlebell",
  kettlebell: "Kettlebell",
  "kettle bell": "Kettlebell",
  "kettle bell ": "Kettlebell",
  "kettle-ball": "Kettlebell",
  "ez bar": "EZ Bar",
  "ez-bar": "EZ Bar",
  "ez curl bar": "EZ Bar",
  "curl bar": "EZ Bar",
  "medicine ball": "Medicine Ball",
  "med ball": "Medicine Ball",
  "slam ball": "Slam Ball",
  "dead ball": "Slam Ball",
  plate: "Weight Plate",
  "weight plate": "Weight Plate",
  "olympic plate": "Weight Plate",
  "iron plate": "Weight Plate",
  "bumper plate": "Weight Plate",
  sandbag: "Sandbag",
  "sand bag": "Sandbag",
  bodyweight: "Bodyweight",
  "body weight": "Bodyweight",
  "no equipment": "Bodyweight",
  bb: "Barbell",
  barbell: "Barbell",
  smith: "Smith Machine",
  "smith machine": "Smith Machine",
  machine: "Machine",
  cable: "Cable",
  band: "Band",
  "safety bar": "Safety Bar",
  "safety squat bar": "Safety Bar",
  ssb: "Safety Bar",
  "trap bar": "Trap Bar",
  trx: "TRX",
  landmine: "Landmine",
  box: "Box",
  sled: "Sled",
  "stability ball": "Stability Ball",
  suspension: "TRX",
  "suspension trainer": "TRX",
  "suspension training": "TRX",
  slider: "Sliders",
  sliders: "Sliders",
  glider: "Sliders",
  gliders: "Sliders",
  "furniture slider": "Sliders",
  "furniture sliders": "Sliders",
};

const normalizeEquipmentLabel = (label: string) => {
  const normalizedKey = label.trim().toLowerCase().replace(/\s+/g, " ");
  return equipmentLabelReplacements[normalizedKey] || label.trim();
};

const normalizeEquipmentSearchTerm = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[-_/]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const equipmentSearchAliasLabels: Record<string, string[]> = {
  barbell: ["bb"],
  "smith machine": ["smith"],
  dumbbell: ["db", "dumbbells", "dumbell"],
  kettlebell: ["kb", "kettle bell", "kettle-ball"],
  "ez bar": ["ez-bar", "ez curl bar", "curl bar"],
  bodyweight: ["body weight", "no equipment"],
  "medicine ball": ["med ball"],
  "slam ball": ["dead ball"],
  "weight plate": ["plate", "olympic plate", "iron plate", "bumper plate"],
  sandbag: ["sand bag"],
  "safety bar": ["safety squat bar", "ssb"],
  trx: ["suspension", "suspension trainer", "suspension training"],
  sliders: ["slider", "glider", "gliders", "furniture slider", "furniture sliders"],
};

const getEquipmentSearchAliasesForLabel = (label: string) => {
  const canonicalLabel = normalizeEquipmentLabel(label);
  const normalizedCanonical = normalizeEquipmentSearchTerm(canonicalLabel);

  return Array.from(
    new Set([
      canonicalLabel,
      label,
      normalizedCanonical,
      ...(equipmentSearchAliasLabels[normalizedCanonical] || []),
    ]),
  ).filter(Boolean);
};

const equipmentSearchModifierAliases: Array<{
  modifierId: ExerciseModifierId;
  terms: string[];
}> = [
  { modifierId: "apparatus:barbell", terms: ["barbell", "bb"] },
  { modifierId: "apparatus:smith-machine", terms: ["smith machine", "smith"] },
  {
    modifierId: "apparatus:ez-bar",
    terms: ["ez bar", "ez-bar", "ez curl bar", "curl bar"],
  },
  {
    modifierId: "apparatus:dumbbell",
    terms: ["dumbbell", "dumbbells", "dumbell", "db"],
  },
  {
    modifierId: "apparatus:kettlebell",
    terms: ["kettlebell", "kettle bell", "kettle-ball", "kb"],
  },
  {
    modifierId: "apparatus:bodyweight",
    terms: ["bodyweight", "body weight", "no equipment"],
  },
  { modifierId: "apparatus:machine", terms: ["machine"] },
  { modifierId: "apparatus:cable", terms: ["cable"] },
  { modifierId: "apparatus:band", terms: ["band"] },
  {
    modifierId: "apparatus:medicine-ball",
    terms: ["medicine ball", "med ball"],
  },
  {
    modifierId: "apparatus:slam-ball",
    terms: ["slam ball", "dead ball"],
  },
  {
    modifierId: "apparatus:weight-plate",
    terms: ["weight plate", "plate", "olympic plate", "iron plate", "bumper plate"],
  },
  {
    modifierId: "apparatus:sandbag",
    terms: ["sandbag", "sand bag"],
  },
  {
    modifierId: "apparatus:safety-bar",
    terms: ["safety bar", "safety squat bar", "ssb"],
  },
  { modifierId: "apparatus:landmine", terms: ["landmine"] },
  { modifierId: "apparatus:trap-bar", terms: ["trap bar"] },
  {
    modifierId: "apparatus:trx",
    terms: ["trx", "suspension trainer", "suspension training"],
  },
  {
    modifierId: "apparatus:sliders",
    terms: ["sliders", "slider", "glider", "gliders", "furniture slider", "furniture sliders"],
  },
  { modifierId: "apparatus:box", terms: ["box"] },
  { modifierId: "apparatus:sled", terms: ["sled"] },
];

const getSearchedEquipmentModifierId = (
  query: string,
): ExerciseModifierId | null => {
  const normalizedQuery = normalizeEquipmentSearchTerm(query);
  if (!normalizedQuery) return null;

  const paddedQuery = ` ${normalizedQuery} `;
  const match = equipmentSearchModifierAliases
    .flatMap((entry) =>
      entry.terms.map((term) => ({
        modifierId: entry.modifierId,
        term: normalizeEquipmentSearchTerm(term),
      })),
    )
    .sort((left, right) => right.term.length - left.term.length)
    .find(
      ({ term }) =>
        normalizedQuery === term || paddedQuery.includes(` ${term} `),
    );

  return match?.modifierId || null;
};

const getModifierDisplayLabel = (modifier: ExerciseModifier) =>
  modifier.categoryId === "apparatus"
    ? normalizeEquipmentLabel(modifier.label)
    : modifier.label;

const getControlModifierDisplayLabel = (
  label: string,
  modifier: ExerciseModifier,
) =>
  isFeetWidthControlLabel(label)
    ? feetWidthDisplayLabels[modifier.id] || getModifierDisplayLabel(modifier)
    : getModifierDisplayLabel(modifier);

const getSearchedModifierIds = (query: string): ExerciseModifierId[] => {
  const normalizedQuery = normalizeEquipmentSearchTerm(query);
  if (!normalizedQuery) return [];

  const paddedQuery = ` ${normalizedQuery} `;

  return Object.values(EXERCISE_MODIFIER_BY_ID)
    .filter((modifier) => modifier.categoryId !== "apparatus")
    .filter((modifier) => {
      const terms = [
        modifier.label,
        modifier.slug,
        ...(modifier.aliases || []),
      ].map(normalizeEquipmentSearchTerm);

      return terms.some(
        (term) =>
          term && (normalizedQuery === term || paddedQuery.includes(` ${term} `)),
      );
    })
    .map((modifier) => modifier.id);
};

const resistanceProfileSuggestionModifierIds = [
  "assistance-resistance:chaotic",
  "assistance-resistance:chains",
  "range-of-motion:shortened-partial",
  "range-of-motion:lengthened-partial",
  "range-of-motion:rom-limiter",
  "load-behavior:variable-resistance",
] as ExerciseModifierId[];

const getStandardRangeOfMotionOptions = () =>
  STANDARD_RANGE_OF_MOTION_MODIFIER_IDS
    .map((modifierId) => EXERCISE_MODIFIER_BY_ID[modifierId])
    .filter((modifier): modifier is ExerciseModifier => Boolean(modifier));

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

const modifierDedupLabelReplacements: Record<string, string> = {
  db: "dumbbell",
  dumbell: "dumbbell",
  dumbbell: "dumbbell",
  kb: "kettlebell",
  kettlebell: "kettlebell",
  "kettle bell": "kettlebell",
  "ez bar": "ez bar",
  "ez-bar": "ez bar",
  "ez curl bar": "ez bar",
  "curl bar": "ez bar",
  "body weight": "bodyweight",
  bodyweight: "bodyweight",
  "safety bar": "safety bar",
  "safety squat bar": "safety bar",
  ssb: "safety bar",
  "slam ball": "slam ball",
  "dead ball": "slam ball",
  "sand bag": "sandbag",
  sandbag: "sandbag",
  standard: "standard stance",
  "standard stance": "standard stance",
  narrow: "narrow stance",
  "narrow stance": "narrow stance",
  conventional: "conventional stance",
  "conventional stance": "conventional stance",
  sumo: "wide stance",
  "sumo stance": "wide stance",
  "sumo position": "wide stance",
  "goblet load": "goblet",
  "goblet load position": "goblet",
  goblet: "goblet",
  deadstop: "dead stop",
  "dead stop": "dead stop",
  "floor position": "floor",
  floor: "floor",
  chaos: "chaotic",
  "chaotic load": "chaotic",
  "oscillating load": "chaotic",
  "hanging plates": "chaotic",
  "band suspended weight": "chaotic",
  "band-suspended weight": "chaotic",
  "hanging kettlebells": "chaotic",
  "earthquake bar": "chaotic",
  chain: "chains",
  chains: "chains",
  "chain loaded": "chains",
  "chain resistance": "chains",
  "top half": "shortened partial",
  "top-half": "shortened partial",
  "lockout partial": "shortened partial",
  "partial near lockout": "shortened partial",
  "shortened bias": "shortened partial",
  "bottom half": "lengthened partial",
  "bottom-half": "lengthened partial",
  "stretch partial": "lengthened partial",
  "stretched partial": "lengthened partial",
  "partial near stretch": "lengthened partial",
  "lengthened bias": "lengthened partial",
  "box rom": "rom limiter",
  "box rom modifier": "rom limiter",
  "limited rom": "rom limiter",
  "limited range": "rom limiter",
  "range limiter": "rom limiter",
  pins: "rom limiter",
  "pin press": "rom limiter",
  blocks: "rom limiter",
  "block pull": "rom limiter",
  boards: "rom limiter",
  "board press": "rom limiter",
  "rack pull": "rom limiter",
  "safety bars": "rom limiter",
};

const normalizeModifierDedupLabel = (label: string) => {
  const normalizedEquipmentLabel = normalizeEquipmentLabel(label);
  const normalizedKey = normalizedEquipmentLabel
    .trim()
    .toLowerCase()
    .replace(/[â€™']/g, "")
    .replace(/[-_/]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return modifierDedupLabelReplacements[normalizedKey] || normalizedKey;
};

const getModifierDedupKeysForLabel = (label: string) => {
  const normalized = normalizeModifierDedupLabel(label);
  return normalized ? [normalized] : [];
};

const getModifierDedupKeysForModifier = (modifier: ExerciseModifier) =>
  Array.from(
    new Set(
      [
        getModifierDisplayLabel(modifier),
        modifier.label,
        ...(modifier.aliases || []),
        modifier.id.split(":").pop() || modifier.id,
      ].flatMap(getModifierDedupKeysForLabel),
    ),
  );

const getModifierDedupKeysForModifierId = (modifierId: ExerciseModifierId) => {
  const modifier = EXERCISE_MODIFIER_BY_ID[modifierId];

  return modifier
    ? getModifierDedupKeysForModifier(modifier)
    : getModifierDedupKeysForLabel(modifierId.split(":").pop() || modifierId);
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
  "limb-usage:narrow-stance",
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

const commonLoadEquipmentOptionIds = modifierIds([
  "apparatus:bodyweight",
  "apparatus:dumbbell",
  "apparatus:kettlebell",
  "apparatus:barbell",
  "apparatus:ez-bar",
  "apparatus:cable",
  "apparatus:band",
  "apparatus:machine",
  "apparatus:smith-machine",
  "apparatus:landmine",
  "apparatus:weight-plate",
  "apparatus:trx",
  "apparatus:sandbag",
  "apparatus:safety-bar",
]);

const squatEquipmentOptionIds = modifierIds([
  ...commonLoadEquipmentOptionIds,
  "apparatus:trap-bar",
  "apparatus:box",
]);

const hingeEquipmentOptionIds = modifierIds([
  ...commonLoadEquipmentOptionIds,
  "apparatus:trap-bar",
]);

const lungeEquipmentOptionIds = modifierIds([
  ...commonLoadEquipmentOptionIds,
  "apparatus:sliders",
]);

const stepUpEquipmentOptionIds = modifierIds([
  ...commonLoadEquipmentOptionIds,
  "apparatus:box",
]);

const hipThrustBridgeEquipmentOptionIds = modifierIds([
  ...commonLoadEquipmentOptionIds,
  "apparatus:box",
]);

const feetWidthOptionIds = modifierIds([
  "limb-usage:narrow-stance",
  "limb-usage:standard-stance",
  "limb-usage:conventional-stance",
  "limb-usage:wide-stance",
  "angle-position:split-stance",
]);

const lungeFeetWidthOptionIds = modifierIds([
  "limb-usage:narrow-stance",
  "limb-usage:standard-stance",
]);

const hipThrustBridgeFeetWidthOptionIds = modifierIds([
  "limb-usage:narrow-stance",
  "limb-usage:standard-stance",
  "limb-usage:wide-stance",
  "angle-position:split-stance",
]);

const hingeFeetWidthOptionIds = modifierIds([
  "limb-usage:conventional-stance",
  "limb-usage:wide-stance",
  "limb-usage:narrow-stance",
  "limb-usage:staggered",
  "limb-usage:kickstand",
  "limb-usage:single-leg",
]);

const hingePositionOptionIds = modifierIds([
  "angle-position:standing",
  "angle-position:seated",
  "angle-position:roman-chair",
]);

const stepUpDirectionOptionIds = modifierIds([
  "direction:forward",
  "direction:lateral",
  "direction:crossover",
]);

const stepUpExecutionStyleOptionIds = modifierIds([
  "execution-style:unilateral",
  "execution-style:alternating",
]);

const feetWidthDisplayLabels: Partial<Record<ExerciseModifierId, string>> = {
  "limb-usage:narrow-stance": "Narrow",
  "limb-usage:standard-stance": "Standard",
  "limb-usage:conventional-stance": "Conventional",
  "limb-usage:wide-stance": "Wide",
  "limb-usage:sumo-stance": "Wide",
  "limb-usage:staggered": "Staggered",
  "limb-usage:kickstand": "Kickstand",
  "limb-usage:single-leg": "Single Leg",
  "angle-position:split-stance": "Split",
};

const isFeetWidthControlLabel = (label: string) =>
  label.trim().toLowerCase() === "feet width";

const getFeetWidthControl = (
  key: string,
  optionIds: ExerciseModifierId[] = feetWidthOptionIds,
): CardModifierControlDefinition => ({
  key,
  label: "Feet Width",
  categories: ["limb-usage", "angle-position"],
  optionIds,
  accent: "violet",
});

const lowerBodyFeetWidthFallbackCoreIds = new Set<CoreMovementId>([
  "step-up",
  "step-down",
]);

const hipThrustBridgeCoreMovementIds = new Set<CoreMovementId>([
  "hip-thrust-bridge",
  "hip-thrust-glute-bridge",
]);

const hipThrustBridgeModifierControls: CardModifierControlDefinition[] = [
  {
    key: "hip-thrust-equipment",
    label: "Equipment",
    categories: ["apparatus"],
    optionIds: hipThrustBridgeEquipmentOptionIds,
    accent: "cyan",
  },
  {
    key: "hip-thrust-position",
    label: "Position",
    categories: ["angle-position"],
    optionIds: modifierIds([
      "angle-position:floor",
      "angle-position:feet-elevated",
      "angle-position:frog-stance",
      "angle-position:bench-supported",
      "angle-position:seated",
      "angle-position:kneeling",
      "angle-position:half-kneeling",
      "angle-position:standing",
    ]),
    accent: "violet",
  },
  getFeetWidthControl(
    "hip-thrust-feet-width",
    hipThrustBridgeFeetWidthOptionIds,
  ),
];

const cardModifierControlPresets: Partial<
  Record<CoreMovementId, CardModifierControlDefinition[]>
> = {
  squat: [
    {
      key: "squat-equipment",
      label: "Equipment",
      categories: ["apparatus"],
      optionIds: squatEquipmentOptionIds,
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
    getFeetWidthControl("squat-feet-width"),
  ],
  "chest-press": [
    {
      key: "chest-press-equipment",
      label: "Equipment",
      categories: ["apparatus"],
      optionIds: commonLoadEquipmentOptionIds,
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
      optionIds: commonLoadEquipmentOptionIds,
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
        "range-of-motion:shortened-partial",
        "range-of-motion:lengthened-partial",
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
      optionIds: commonLoadEquipmentOptionIds,
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
        "range-of-motion:shortened-partial",
        "range-of-motion:lengthened-partial",
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
      optionIds: commonLoadEquipmentOptionIds,
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
        "range-of-motion:shortened-partial",
        "range-of-motion:lengthened-partial",
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
      optionIds: commonLoadEquipmentOptionIds,
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
        "stability:bosu",
        "assistance-resistance:chaotic",
        "assistance-resistance:chains",
      ]),
      accent: "emerald",
    },
  ],
  hinge: [
    {
      key: "hinge-equipment",
      label: "Equipment",
      categories: ["apparatus"],
      optionIds: hingeEquipmentOptionIds,
      accent: "cyan",
    },
    getFeetWidthControl("hinge-feet-width", hingeFeetWidthOptionIds),
    {
      key: "hinge-position",
      label: "Position",
      categories: ["angle-position"],
      optionIds: hingePositionOptionIds,
      accent: "violet",
    },
    {
      key: "hinge-rom",
      label: "ROM",
      categories: ["range-of-motion"],
      optionIds: modifierIds([
        "range-of-motion:full-rom",
        "range-of-motion:shortened-partial",
        "range-of-motion:lengthened-partial",
        "range-of-motion:deficit",
        "range-of-motion:rom-limiter",
      ]),
      accent: "emerald",
    },
  ],
  lunge: [
    {
      key: "lunge-equipment",
      label: "Equipment",
      categories: ["apparatus"],
      optionIds: lungeEquipmentOptionIds,
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
    getFeetWidthControl("lunge-feet-width", lungeFeetWidthOptionIds),
    {
      key: "lunge-position-elevation",
      label: "Position / Elevation",
      categories: ["angle-position", "range-of-motion"],
      optionIds: modifierIds([
        "angle-position:rear-foot-elevated",
        "range-of-motion:deficit",
        "range-of-motion:rom-limiter",
      ]),
      accent: "violet",
    },
  ],
  "hip-thrust-bridge": hipThrustBridgeModifierControls,
  "hip-thrust-glute-bridge": hipThrustBridgeModifierControls,
  "step-up": [
    {
      key: "step-up-equipment",
      label: "Equipment",
      categories: ["apparatus"],
      optionIds: stepUpEquipmentOptionIds,
      accent: "cyan",
    },
    {
      key: "step-up-direction",
      label: "Direction",
      categories: ["direction"],
      optionIds: stepUpDirectionOptionIds,
      accent: "emerald",
    },
    {
      key: "step-up-execution-style",
      label: "Execution Style",
      categories: ["execution-style"],
      optionIds: stepUpExecutionStyleOptionIds,
      accent: "emerald",
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
    "angle-position:90-90",
    "angle-position:hanging",
    "angle-position:kneeling",
    "angle-position:split-stance",
    "angle-position:rear-foot-elevated",
    "angle-position:half-kneeling",
    "limb-usage:standard-stance",
    "limb-usage:conventional-stance",
    "limb-usage:wide-stance",
  ]),
  accent: "violet",
};

const nonApplicableModifierControlLabel = "N/A";
const defaultRangeOfMotionModifierId =
  STANDARD_RANGE_OF_MOTION_MODIFIER_IDS[0];

const isLoadPositionControl = (control: CardModifierControlDefinition) =>
  control.label.trim().toLowerCase() === "load position" ||
  control.key.toLowerCase().includes("load-position");

const hasRangeOfMotionControlCategory = (
  control: CardModifierControlDefinition,
) => control.categories.includes("range-of-motion");

const isRangeOfMotionControl = (control: CardModifierControlDefinition) =>
  control.categories.length === 1 &&
  control.categories[0] === "range-of-motion";

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
      label: "Direction",
      categories: ["direction"],
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
      key: "fallback-rom",
      label: "ROM",
      categories: ["range-of-motion"],
      accent: "emerald",
    };
  }

  if (
    coreMovementId &&
    lowerBodyFeetWidthFallbackCoreIds.has(coreMovementId)
  ) {
    return getFeetWidthControl("fallback-feet-width");
  }

  return {
    key: "fallback-modifier",
    label: "Modifier",
    categories: ["direction", "limb-usage", "range-of-motion"],
    accent: "emerald",
  };
};

type PrivateExerciseModifierControl = CardModifierControlDefinition & {
  options: ExerciseModifier[];
};

const emptyPrivateExerciseDraft = (): PrivateExerciseDraft => ({
  name: "",
  coreMovementPattern: "",
  semanticVariationId: "",
  modifierIds: [],
  goal: "Hypertrophy",
  difficulty: "Beginner",
  primaryMuscles: "",
  secondaryMuscles: "",
  cue: "",
  image: "",
});

const titleCase = (value: string) =>
  value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getPrivateExerciseMetadataForCoreMovement = (
  coreMovementId?: CoreMovementId | "",
) =>
  coreMovementId
    ? normalizedCatalog.items.find((item) => item.coreMovementId === coreMovementId) ||
      null
    : null;

const getPrivateExerciseControlOptionSource = (
  metadata: NormalizedExerciseCatalogItem | null,
) => {
  const compatibleOptions = new Map(
    getCompatibleModifierGroups(metadata)
      .flatMap((group) => group.modifiers)
      .map((modifier) => [modifier.id, modifier]),
  );
  const allOptions = new Map(
    Object.values(EXERCISE_MODIFIER_BY_ID).map((modifier) => [
      modifier.id,
      modifier,
    ]),
  );

  return { allOptions, compatibleOptions };
};

const getPrivateExerciseOptionsForControl = (
  control: CardModifierControlDefinition,
  metadata: NormalizedExerciseCatalogItem | null,
) => {
  const { allOptions, compatibleOptions } =
    getPrivateExerciseControlOptionSource(metadata);

  if (isRangeOfMotionControl(control)) return getStandardRangeOfMotionOptions();

  const categoryOptions = control.categories.flatMap((categoryId) =>
    Array.from(allOptions.values()).filter(
      (modifier) => modifier.categoryId === categoryId,
    ),
  );
  const sourceById = control.optionIds ? allOptions : compatibleOptions;
  const orderedOptions = control.optionIds
    ? control.optionIds
        .map((modifierId) => sourceById.get(modifierId))
        .filter((modifier): modifier is ExerciseModifier => Boolean(modifier))
    : categoryOptions;
  const normalizedOptions = hasRangeOfMotionControlCategory(control)
    ? [
        ...orderedOptions.filter(
          (modifier) => modifier.categoryId !== "range-of-motion",
        ),
        ...getStandardRangeOfMotionOptions(),
      ]
    : orderedOptions;

  return dedupeModifierOptionsByDisplayLabel(normalizedOptions);
};

const getPrivateExerciseModifierControls = (
  coreMovementId: CoreMovementId | "",
  metadata: NormalizedExerciseCatalogItem | null,
): PrivateExerciseModifierControl[] => {
  if (!coreMovementId) return [];

  const controlDefinitions =
    cardModifierControlPresets[coreMovementId] || [
      defaultEquipmentControl,
      defaultPositionControl,
      getFallbackThirdControl(coreMovementId),
    ];

  return controlDefinitions
    .filter((control) => !control.categories.includes("execution-style"))
    .map((control) => ({
      ...control,
      options: getPrivateExerciseOptionsForControl(control, metadata),
    }))
    .filter((control) => control.options.length > 0);
};

const getPrivateExerciseDefaultModifierIds = (
  coreMovementId: CoreMovementId,
  controls: PrivateExerciseModifierControl[],
) => {
  const coreMovement = CORE_MOVEMENT_BY_ID[coreMovementId];
  const defaultIds = new Set<ExerciseModifierId>(
    coreMovement?.defaultModifierIds || [],
  );

  controls.forEach((control) => {
    if (
      control.categories.includes("apparatus") &&
      !Array.from(defaultIds).some(
        (modifierId) => getModifierCategoryId(modifierId) === "apparatus",
      )
    ) {
      const bodyweightOption =
        control.options.find((option) => option.id === "apparatus:bodyweight") ||
        control.options[0];
      if (bodyweightOption) defaultIds.add(bodyweightOption.id);
    }

    if (
      isRangeOfMotionControl(control) &&
      control.options.some((option) => option.id === defaultRangeOfMotionModifierId)
    ) {
      defaultIds.add(defaultRangeOfMotionModifierId);
    }
  });

  return normalizeModifierIdsForCoreMovement(coreMovementId, Array.from(defaultIds));
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
    .map((part) =>
      normalizeGeneratedTitlePart(part) === "sliders" ? "Slider" : part,
    )
    .find((part) => part && part.toLowerCase() !== "all") || "";

const semanticNameIncludesEquipment = (
  semanticVariationName: string,
  equipmentLabel: string,
) => {
  const semanticName = normalizeGeneratedTitlePart(semanticVariationName);
  const equipmentName = normalizeGeneratedTitlePart(equipmentLabel);
  if (!semanticName || !equipmentName) return false;

  const equipmentAliases: Record<string, string[]> = {
    "ez bar": ["ez bar", "ez curl bar", "curl bar"],
    "medicine ball": ["medicine ball", "med ball"],
    "slam ball": ["slam ball", "dead ball"],
    "weight plate": ["weight plate", "plate", "olympic plate", "iron plate", "bumper plate"],
    plate: ["plate", "weight plate", "olympic plate", "iron plate", "bumper plate"],
    sandbag: ["sandbag", "sand bag"],
    "safety bar": ["safety bar", "safety squat bar", "ssb"],
    "stability ball": ["stability ball", "swiss ball"],
    sliders: ["slider", "sliders", "glider", "gliders", "furniture slider", "furniture sliders"],
    slider: ["slider", "sliders", "glider", "gliders", "furniture slider", "furniture sliders"],
    trx: ["trx", "suspension", "suspension trainer", "suspension training"],
    suspension: ["suspension", "trx", "suspension trainer", "suspension training"],
  };
  const aliases = equipmentAliases[equipmentName] || [equipmentName];

  return aliases.some((alias) => {
    const normalizedAlias = normalizeGeneratedTitlePart(alias);
    return (
      semanticName === normalizedAlias ||
      semanticName.startsWith(`${normalizedAlias} `) ||
      semanticName.includes(` ${normalizedAlias} `) ||
      semanticName.endsWith(` ${normalizedAlias}`)
    );
  });
};

const semanticNameImpliesBodyweight = (semanticVariationName: string) => {
  const semanticName = normalizeGeneratedTitlePart(semanticVariationName);

  return [
  "air squat",
  "sumo squat",
  "narrow squat",
  "narrow stance squat",
  "pistol squat",
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

const fallbackTitleStanceModifierIds = new Set<ExerciseModifierId>(
  modifierIds([
    "limb-usage:standard-stance",
    "limb-usage:narrow-stance",
    "limb-usage:conventional-stance",
    "limb-usage:wide-stance",
    "limb-usage:staggered",
    "limb-usage:kickstand",
    "execution-style:unilateral",
    "execution-style:alternating",
    "limb-usage:single-leg",
  ]),
);

const fallbackTitleLoadPositionModifierIds = new Set<ExerciseModifierId>(
  modifierIds([
    "angle-position:goblet",
    "angle-position:front-loaded",
    "angle-position:back-loaded",
    "angle-position:overhead",
  ]),
);

const fallbackTitleModifierCategoryPriority: ExerciseModifierCategoryId[] = [
  "direction",
  "range-of-motion",
  "tempo",
  "load-behavior",
  "execution-style",
  "limb-usage",
  "stability",
  "assistance-resistance",
];

const getFallbackTitleModifierLabel = (
  modifier: ExerciseModifier,
  metadata: NormalizedExerciseCatalogItem | null,
) => {
  if (modifier.includeInDisplayName === false) return "";

  if (
    metadata?.coreMovementId === "squat" &&
    (modifier.id === "limb-usage:wide-stance" ||
      modifier.id === "limb-usage:sumo-stance")
  ) {
    return "Sumo";
  }

  return (modifier.displayPrefix || modifier.label)
    .replace(/\s+Stance$/i, "")
    .replace(/\s+Position$/i, "")
    .trim();
};

const getSelectedFallbackTitleModifier = (
  selectedModifierIds: ExerciseModifierId[],
  predicate: (modifier: ExerciseModifier) => boolean,
) =>
  selectedModifierIds
    .map((modifierId) => EXERCISE_MODIFIER_BY_ID[modifierId])
    .filter(
      (modifier): modifier is ExerciseModifier =>
        Boolean(modifier) && predicate(modifier),
    )
    .sort((a, b) => a.displayOrder - b.displayOrder)[0] || null;

const getStepUpFallbackTitleDescriptor = (
  metadata: NormalizedExerciseCatalogItem | null,
  selectedModifierIds: ExerciseModifierId[],
) => {
  if (metadata?.coreMovementId !== "step-up") return "";

  const executionModifier = getSelectedFallbackTitleModifier(
    selectedModifierIds,
    (modifier) => stepUpExecutionStyleOptionIds.includes(modifier.id),
  );
  const directionModifier = getSelectedFallbackTitleModifier(
    selectedModifierIds,
    (modifier) => stepUpDirectionOptionIds.includes(modifier.id),
  );
  const seen = new Set<string>();

  return [executionModifier, directionModifier]
    .map((modifier) =>
      modifier ? getFallbackTitleModifierLabel(modifier, metadata) : "",
    )
    .filter(Boolean)
    .filter((label) => {
      const key = normalizeGeneratedTitlePart(label);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(" ");
};

const getFallbackTitleDescriptor = (
  metadata: NormalizedExerciseCatalogItem | null,
  selectedModifierIds: ExerciseModifierId[],
) => {
  const stepUpDescriptor = getStepUpFallbackTitleDescriptor(
    metadata,
    selectedModifierIds,
  );
  if (stepUpDescriptor) return stepUpDescriptor;

  const stanceModifier = getSelectedFallbackTitleModifier(
    selectedModifierIds,
    (modifier) => fallbackTitleStanceModifierIds.has(modifier.id),
  );
  const positionModifier = getSelectedFallbackTitleModifier(
    selectedModifierIds,
    (modifier) =>
      modifier.categoryId === "angle-position" &&
      !fallbackTitleLoadPositionModifierIds.has(modifier.id),
  );
  const loadPositionModifier = getSelectedFallbackTitleModifier(
    selectedModifierIds,
    (modifier) => fallbackTitleLoadPositionModifierIds.has(modifier.id),
  );
  const usefulModifier = fallbackTitleModifierCategoryPriority
    .map((categoryId) =>
      getSelectedFallbackTitleModifier(
        selectedModifierIds,
        (modifier) =>
          modifier.categoryId === categoryId &&
          !fallbackTitleStanceModifierIds.has(modifier.id),
      ),
    )
    .find(Boolean);

  return [
    stanceModifier,
    positionModifier,
    loadPositionModifier,
    usefulModifier,
  ]
    .map((modifier) =>
      modifier ? getFallbackTitleModifierLabel(modifier, metadata) : "",
    )
    .find(Boolean) || "";
};

const gluteBridgeTitleModifierLabels: Partial<Record<ExerciseModifierId, string>> = {
  "limb-usage:single-leg": "Single Leg",
  "angle-position:frog-stance": "Frog Stance",
  "angle-position:feet-elevated": "Feet Elevated",
  "limb-usage:wide-stance": "Wide Stance",
  "limb-usage:narrow-stance": "Narrow Stance",
  "angle-position:split-stance": "Split Stance",
  "stability:bosu": "BOSU",
};

const gluteBridgeTitleModifierPriority = modifierIds([
  "limb-usage:single-leg",
  "angle-position:frog-stance",
  "angle-position:feet-elevated",
  "stability:bosu",
  "limb-usage:wide-stance",
  "limb-usage:narrow-stance",
  "angle-position:split-stance",
]);

const getSemanticVariationTitleDescriptor = (
  metadata: NormalizedExerciseCatalogItem | null,
  semanticVariationName: string,
  selectedModifierIds: ExerciseModifierId[],
) => {
  if (!metadata) return "";

  const normalizedSemanticName = normalizeGeneratedTitlePart(semanticVariationName);
  const selectedModifierIdSet = new Set(selectedModifierIds);
  const semanticVariation = metadata.semanticVariations.find(
    (variation) =>
      normalizeGeneratedTitlePart(variation.name) === normalizedSemanticName,
  );
  const semanticDefaultModifierIds = new Set([
    ...(semanticVariation?.modifierIds || []),
    ...(semanticVariation?.definingModifierIds || []),
  ]);
  const semanticTitlePrefixModifierIds = new Set<ExerciseModifierId>([
    "assistance-resistance:contralateral",
    "assistance-resistance:ipsilateral",
  ]);
  const titlePrefixModifier = selectedModifierIds
    .map((modifierId) => EXERCISE_MODIFIER_BY_ID[modifierId])
    .filter(
      (modifier): modifier is ExerciseModifier =>
        Boolean(modifier) &&
        (modifier.categoryId === "execution-style" ||
          semanticTitlePrefixModifierIds.has(modifier.id)) &&
        modifier.includeInDisplayName !== false &&
        !semanticDefaultModifierIds.has(modifier.id) &&
        !normalizeGeneratedTitlePart(semanticVariationName).includes(
          normalizeGeneratedTitlePart(modifier.label),
        ),
    )
    .sort((a, b) => a.displayOrder - b.displayOrder)[0];

  if (titlePrefixModifier) {
    return getFallbackTitleModifierLabel(titlePrefixModifier, metadata);
  }

  if (
    !hipThrustBridgeCoreMovementIds.has(metadata.coreMovementId) ||
    !["glute bridge", "hip thrust"].includes(normalizedSemanticName)
  ) {
    return "";
  }

  const modifierId = gluteBridgeTitleModifierPriority.find((id) =>
    selectedModifierIdSet.has(id),
  );

  return modifierId ? gluteBridgeTitleModifierLabels[modifierId] || "" : "";
};

const compactGeneratedTitleParts = (parts: string[]) => {
  const seen = new Set<string>();

  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const key = normalizeGeneratedTitlePart(part);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const getFallbackGeneratedCardTitle = ({
  exercise,
  metadata,
  equipmentLabel,
  selectedModifierIds,
}: {
  exercise: Exercise;
  metadata: NormalizedExerciseCatalogItem | null;
  equipmentLabel: string;
  selectedModifierIds: ExerciseModifierId[];
}) => {
  const equipmentPrefix = getPrimaryEquipmentPrefix(equipmentLabel);
  const descriptor = getFallbackTitleDescriptor(metadata, selectedModifierIds);
  const coreMovementName = metadata?.coreMovementLabel || exercise.name;

  return (
    compactGeneratedTitleParts([
      equipmentPrefix,
      descriptor,
      coreMovementName,
    ]).join(" ") || coreMovementName
  );
};

const normalizeModifierIdsForCoreMovement = (
  coreMovementId: CoreMovementId | null | undefined,
  modifierIds: ExerciseModifierId[],
) =>
  uniqueModifierIds(
    modifierIds.flatMap((modifierId) => {
      if (
        coreMovementId &&
        hipThrustBridgeCoreMovementIds.has(coreMovementId) &&
        modifierId === "angle-position:supine"
      ) {
        return "angle-position:floor";
      }

      if (
        modifierId === "apparatus:suspension" ||
        modifierId === ("apparatus:suspension-trainer" as ExerciseModifierId) ||
        modifierId === ("apparatus:suspension-training" as ExerciseModifierId)
      ) {
        return "apparatus:trx";
      }

      if (
        modifierId !== "stability:bosu" &&
        getModifierCategoryId(modifierId) === "stability"
      ) {
        return [];
      }

      if (
        modifierId === ("apparatus:ez-curl-bar" as ExerciseModifierId) ||
        modifierId === ("apparatus:curl-bar" as ExerciseModifierId)
      ) {
        return "apparatus:ez-bar";
      }

      if (
        modifierId === ("apparatus:safety-squat-bar" as ExerciseModifierId) ||
        modifierId === ("apparatus:ssb" as ExerciseModifierId)
      ) {
        return "apparatus:safety-bar";
      }

      if (modifierId === ("apparatus:dead-ball" as ExerciseModifierId)) {
        return "apparatus:slam-ball";
      }

      if (modifierId === ("apparatus:sand-bag" as ExerciseModifierId)) {
        return "apparatus:sandbag";
      }

      if (
        modifierId === ("apparatus:slider" as ExerciseModifierId) ||
        modifierId === ("apparatus:glider" as ExerciseModifierId) ||
        modifierId === ("apparatus:gliders" as ExerciseModifierId) ||
        modifierId === ("apparatus:furniture-slider" as ExerciseModifierId) ||
        modifierId === ("apparatus:furniture-sliders" as ExerciseModifierId)
      ) {
        return "apparatus:sliders";
      }

      if (
        modifierId === ("apparatus:plate" as ExerciseModifierId) ||
        modifierId === ("apparatus:olympic-plate" as ExerciseModifierId) ||
        modifierId === ("apparatus:iron-plate" as ExerciseModifierId) ||
        modifierId === ("apparatus:bumper-plate" as ExerciseModifierId)
      ) {
        return "apparatus:weight-plate";
      }

      if (modifierId === ("execution-style:contralateral" as ExerciseModifierId)) {
        return "assistance-resistance:contralateral";
      }
      if (modifierId === ("execution-style:ipsilateral" as ExerciseModifierId)) {
        return "assistance-resistance:ipsilateral";
      }
      if (
        modifierId === ("execution-style:bilateral" as ExerciseModifierId) ||
        modifierId === ("execution-style:single-arm" as ExerciseModifierId) ||
        modifierId === ("execution-style:offset" as ExerciseModifierId)
      ) {
        return [];
      }
      if (modifierId === ("execution-style:single-leg" as ExerciseModifierId)) {
        return "limb-usage:single-leg";
      }

      if (modifierId === ("assistance-resistance:band-assisted" as ExerciseModifierId)) {
        return "assistance-resistance:assisted";
      }
      if (
        modifierId ===
        ("assistance-resistance:accommodating-resistance" as ExerciseModifierId)
      ) {
        return "assistance-resistance:variable-resistance";
      }
      if (
        modifierId === ("assistance-resistance:weighted" as ExerciseModifierId) ||
        modifierId === ("assistance-resistance:deloaded" as ExerciseModifierId) ||
        modifierId === ("assistance-resistance:partner-assisted" as ExerciseModifierId)
      ) {
        return [];
      }

      if (
        coreMovementId === "lunge" &&
        (modifierId === "limb-usage:wide-stance" ||
          modifierId === "limb-usage:sumo-stance" ||
          modifierId === "limb-usage:staggered")
      ) {
        return "limb-usage:standard-stance";
      }

      if (
        coreMovementId === "squat" &&
        modifierId === "limb-usage:unilateral"
      ) {
        return "limb-usage:single-leg";
      }

      if (modifierId === "limb-usage:bilateral") {
        return [];
      }
      if (modifierId === "limb-usage:unilateral") {
        return coreMovementId &&
          ["shoulder-press", "curl", "biceps-curl", "lunge", "step-up"].includes(
            coreMovementId,
          )
          ? "execution-style:unilateral"
          : [];
      }
      if (modifierId === "limb-usage:alternating") {
        return coreMovementId &&
          ["shoulder-press", "curl", "biceps-curl", "lunge", "step-up"].includes(
            coreMovementId,
          )
          ? "execution-style:alternating"
          : [];
      }
      if (modifierId === "limb-usage:single-arm") {
        return coreMovementId &&
          ["shoulder-press", "curl", "biceps-curl", "lunge", "step-up"].includes(
            coreMovementId,
          )
          ? "execution-style:unilateral"
          : [];
      }
      if (modifierId === "limb-usage:single-leg") {
        return "limb-usage:single-leg";
      }
      if (modifierId === "limb-usage:offset") {
        return [];
      }

      if (modifierId === "limb-usage:sumo-stance") {
        return "limb-usage:wide-stance";
      }

      return modifierId;
    }),
  );

const getGeneratedCardTitle = ({
  exercise,
  metadata,
  semanticVariationName,
  equipmentLabel,
  selectedModifierIds,
}: {
  exercise: Exercise;
  metadata: NormalizedExerciseCatalogItem | null;
  semanticVariationName: string;
  equipmentLabel: string;
  selectedModifierIds: ExerciseModifierId[];
}) => {
  const semanticName = semanticVariationName.trim();

  if (!semanticName) {
    return getFallbackGeneratedCardTitle({
      exercise,
      metadata,
      equipmentLabel,
      selectedModifierIds,
    });
  }

  const equipmentPrefix = getPrimaryEquipmentPrefix(equipmentLabel);
  const semanticDescriptor = getSemanticVariationTitleDescriptor(
    metadata,
    semanticName,
    selectedModifierIds,
  );
  const omitBodyweightPrefix =
    Boolean(semanticDescriptor) &&
    normalizeGeneratedTitlePart(equipmentPrefix) === "bodyweight";
  if (
    !equipmentPrefix ||
    omitBodyweightPrefix ||
    semanticNameIncludesEquipment(semanticName, equipmentPrefix) ||
    (normalizeGeneratedTitlePart(equipmentPrefix) === "bodyweight" &&
      semanticNameImpliesBodyweight(semanticName))
  ) {
    return (
      compactGeneratedTitleParts([semanticDescriptor, semanticName]).join(" ") ||
      semanticName
    );
  }

  return compactGeneratedTitleParts([
    equipmentPrefix,
    semanticDescriptor,
    semanticName,
  ]).join(" ");
};

const getGoalTrainingTips = (goalLabel: string) => {
  const normalizedGoal = normalizeGeneratedTitlePart(goalLabel);
  const goalTipMap: Record<string, string[]> = {
    strength: [
      "3-6 reps",
      "longer rest",
      "controlled eccentric",
      "high force output",
    ],
    hypertrophy: [
      "6-15 reps",
      "moderate rest",
      "controlled tempo",
      "full ROM emphasis",
    ],
    mobility: [
      "slow tempo",
      "controlled breathing",
      "end-range control",
      "longer holds",
    ],
    "athletic performance": [
      "explosive intent",
      "reactive movement",
      "lower fatigue",
      "high movement quality",
    ],
    power: [
      "explosive intent",
      "reactive movement",
      "lower fatigue",
      "high movement quality",
    ],
    rehab: [
      "low pain",
      "controlled tempo",
      "stability first",
      "reduced load",
    ],
    recovery: [
      "low pain",
      "controlled tempo",
      "stability first",
      "reduced load",
    ],
    conditioning: [
      "shorter rest",
      "cyclical effort",
      "density focus",
    ],
    endurance: [
      "shorter rest",
      "cyclical effort",
      "density focus",
    ],
    stability: [
      "slower tempo",
      "balance challenge",
      "controlled positioning",
    ],
  };

  return goalTipMap[normalizedGoal] || [];
};

function GoalTrainingTips({
  goalLabel,
  compact = false,
}: {
  goalLabel: string;
  compact?: boolean;
}) {
  const tips = getGoalTrainingTips(goalLabel);
  if (!tips.length) return null;

  return (
    <div
      className={`border border-yellow-200/14 bg-[linear-gradient(135deg,rgba(250,204,21,0.10),rgba(15,23,42,0.72))] shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] ${
        compact
          ? "mt-1.5 rounded-xl px-2 py-1.5"
          : "mt-2 rounded-2xl px-3 py-2"
      }`}
    >
      <p className={`${compact ? "text-[7px]" : "text-[8px]"} font-black uppercase tracking-[0.16em] text-yellow-100/62`}>
        Training Focus
      </p>
      <div className={`${compact ? "mt-1 gap-1" : "mt-1.5 gap-1.5"} flex flex-wrap`}>
        {tips.map((tip) => (
          <span
            key={tip}
            className={`rounded-full border border-yellow-200/16 bg-yellow-300/8 font-bold text-yellow-50/82 ${
              compact
                ? "px-1.5 py-0.5 text-[8px] leading-3"
                : "px-2 py-1 text-[10px] leading-3"
            }`}
          >
            {tip}
          </span>
        ))}
      </div>
    </div>
  );
}

const getSelectedGoalLabel = (
  exercise: Exercise,
  selectedModifierIds: ExerciseModifierId[],
  metadata: NormalizedExerciseCatalogItem | null,
) => {
  const selectedIntent = getSelectedModifiersByCategory(
    selectedModifierIds,
    "training-intent",
  ).filter(
    (modifier) =>
      !(
        metadata?.coreMovementId &&
        hipThrustBridgeCoreMovementIds.has(metadata.coreMovementId) &&
        modifier.id === "training-intent:stability"
      ),
  );

  if (
    metadata?.coreMovementId &&
    hipThrustBridgeCoreMovementIds.has(metadata.coreMovementId) &&
    normalizeGeneratedTitlePart(exercise.goal) === "stability"
  ) {
    return selectedIntent.map((modifier) => modifier.label).join(", ") || "Hypertrophy";
  }

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
  favorites: {
    surfaceClass:
      "bg-[linear-gradient(135deg,rgba(113,63,18,0.36),rgba(15,23,42,0.76),rgba(2,6,23,0.92))]",
    cardClass:
      "border-yellow-200/28 shadow-[0_18px_58px_rgba(0,0,0,0.40),0_0_34px_rgba(250,204,21,0.14),inset_0_1px_0_rgba(255,255,255,0.18)]",
    overlayClass:
      "bg-[radial-gradient(circle_at_18%_0%,rgba(250,204,21,0.20),transparent_34%),linear-gradient(120deg,rgba(250,204,21,0.11)_0%,rgba(255,255,255,0.04)_42%,transparent_74%)]",
    accentClass:
      "bg-gradient-to-r from-transparent via-yellow-200/75 to-transparent",
    pillClass:
      "border-yellow-200/34 bg-yellow-300/16 text-yellow-100 shadow-[0_0_22px_rgba(250,204,21,0.16)]",
    hoverClass:
      "hover:border-yellow-100/44 hover:shadow-[0_26px_86px_rgba(0,0,0,0.52),0_0_42px_rgba(250,204,21,0.18),inset_0_1px_0_rgba(255,255,255,0.22)]",
    tabClass:
      "bg-[linear-gradient(135deg,rgba(250,204,21,0.98),rgba(245,158,11,0.78))] text-slate-950 shadow-[0_0_30px_rgba(250,204,21,0.28),inset_0_1px_0_rgba(255,255,255,0.40)] ring-1 ring-yellow-100/70",
    tabHoverClass:
      "hover:bg-[linear-gradient(135deg,rgba(250,204,21,0.18),rgba(15,23,42,0.88))] hover:text-yellow-50 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:ring-yellow-200/35",
  },
  [myExercisesSectionKey]: {
    surfaceClass:
      "bg-[linear-gradient(135deg,rgba(8,47,73,0.36),rgba(15,23,42,0.78),rgba(2,6,23,0.92))]",
    cardClass:
      "border-cyan-200/24 shadow-[0_18px_58px_rgba(0,0,0,0.40),0_0_34px_rgba(34,211,238,0.12),inset_0_1px_0_rgba(255,255,255,0.18)]",
    overlayClass:
      "bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(250,204,21,0.12),transparent_30%),linear-gradient(120deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0.035)_42%,transparent_74%)]",
    accentClass:
      "bg-gradient-to-r from-cyan-300/15 via-cyan-200/75 to-yellow-200/45",
    pillClass:
      "border-cyan-200/34 bg-cyan-300/15 text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.16)]",
    hoverClass:
      "hover:border-cyan-100/42 hover:shadow-[0_26px_86px_rgba(0,0,0,0.52),0_0_42px_rgba(34,211,238,0.18),inset_0_1px_0_rgba(255,255,255,0.22)]",
    tabClass:
      "bg-[linear-gradient(135deg,rgba(34,211,238,0.96),rgba(250,204,21,0.72))] text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.26),inset_0_1px_0_rgba(255,255,255,0.40)] ring-1 ring-cyan-100/65",
    tabHoverClass:
      "hover:bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(15,23,42,0.88))] hover:text-cyan-50 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:ring-cyan-200/35",
  },
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

type ExerciseLibraryThemeCssVariables = CSSProperties & Record<string, string>;

const categoryThemeCssPresets = {
  slate: {
    accent: "rgba(148, 163, 184, 0.78)",
    accentStrong: "rgba(226, 232, 240, 0.92)",
    accentSoft: "rgba(148, 163, 184, 0.12)",
    border: "rgba(203, 213, 225, 0.22)",
    glow: "rgba(148, 163, 184, 0.16)",
    panel: "rgba(15, 23, 42, 0.94)",
    panelSoft: "rgba(148, 163, 184, 0.075)",
    text: "rgb(226, 232, 240)",
    track: "rgba(15, 23, 42, 0.74)",
  },
  emerald: {
    accent: "rgba(52, 211, 153, 0.82)",
    accentStrong: "rgba(110, 231, 183, 0.96)",
    accentSoft: "rgba(16, 185, 129, 0.14)",
    border: "rgba(110, 231, 183, 0.34)",
    glow: "rgba(16, 185, 129, 0.24)",
    panel: "rgba(6, 78, 59, 0.34)",
    panelSoft: "rgba(16, 185, 129, 0.075)",
    text: "rgb(209, 250, 229)",
    track: "rgba(6, 78, 59, 0.38)",
  },
  lime: {
    accent: "rgba(190, 242, 100, 0.82)",
    accentStrong: "rgba(217, 249, 157, 0.96)",
    accentSoft: "rgba(132, 204, 22, 0.14)",
    border: "rgba(217, 249, 157, 0.34)",
    glow: "rgba(190, 242, 100, 0.22)",
    panel: "rgba(63, 98, 18, 0.34)",
    panelSoft: "rgba(132, 204, 22, 0.075)",
    text: "rgb(236, 252, 203)",
    track: "rgba(63, 98, 18, 0.38)",
  },
  cyan: {
    accent: "rgba(34, 211, 238, 0.82)",
    accentStrong: "rgba(103, 232, 249, 0.96)",
    accentSoft: "rgba(34, 211, 238, 0.14)",
    border: "rgba(103, 232, 249, 0.34)",
    glow: "rgba(34, 211, 238, 0.24)",
    panel: "rgba(8, 47, 73, 0.34)",
    panelSoft: "rgba(34, 211, 238, 0.075)",
    text: "rgb(207, 250, 254)",
    track: "rgba(8, 47, 73, 0.42)",
  },
  violet: {
    accent: "rgba(167, 139, 250, 0.82)",
    accentStrong: "rgba(196, 181, 253, 0.96)",
    accentSoft: "rgba(139, 92, 246, 0.14)",
    border: "rgba(196, 181, 253, 0.34)",
    glow: "rgba(167, 139, 250, 0.24)",
    panel: "rgba(76, 29, 149, 0.34)",
    panelSoft: "rgba(139, 92, 246, 0.075)",
    text: "rgb(237, 233, 254)",
    track: "rgba(76, 29, 149, 0.40)",
  },
  amber: {
    accent: "rgba(251, 191, 36, 0.82)",
    accentStrong: "rgba(253, 224, 71, 0.96)",
    accentSoft: "rgba(245, 158, 11, 0.14)",
    border: "rgba(253, 224, 71, 0.34)",
    glow: "rgba(251, 191, 36, 0.24)",
    panel: "rgba(113, 63, 18, 0.34)",
    panelSoft: "rgba(245, 158, 11, 0.075)",
    text: "rgb(254, 243, 199)",
    track: "rgba(113, 63, 18, 0.40)",
  },
  rose: {
    accent: "rgba(251, 113, 133, 0.82)",
    accentStrong: "rgba(253, 164, 175, 0.96)",
    accentSoft: "rgba(244, 63, 94, 0.14)",
    border: "rgba(253, 164, 175, 0.34)",
    glow: "rgba(251, 113, 133, 0.24)",
    panel: "rgba(159, 18, 57, 0.30)",
    panelSoft: "rgba(244, 63, 94, 0.075)",
    text: "rgb(255, 228, 230)",
    track: "rgba(159, 18, 57, 0.38)",
  },
  orange: {
    accent: "rgba(251, 146, 60, 0.82)",
    accentStrong: "rgba(253, 186, 116, 0.96)",
    accentSoft: "rgba(249, 115, 22, 0.14)",
    border: "rgba(253, 186, 116, 0.36)",
    glow: "rgba(251, 146, 60, 0.24)",
    panel: "rgba(154, 52, 18, 0.34)",
    panelSoft: "rgba(249, 115, 22, 0.075)",
    text: "rgb(255, 237, 213)",
    track: "rgba(154, 52, 18, 0.40)",
  },
  teal: {
    accent: "rgba(45, 212, 191, 0.82)",
    accentStrong: "rgba(94, 234, 212, 0.96)",
    accentSoft: "rgba(20, 184, 166, 0.14)",
    border: "rgba(94, 234, 212, 0.34)",
    glow: "rgba(45, 212, 191, 0.24)",
    panel: "rgba(15, 118, 110, 0.32)",
    panelSoft: "rgba(20, 184, 166, 0.075)",
    text: "rgb(204, 251, 241)",
    track: "rgba(15, 118, 110, 0.38)",
  },
  sky: {
    accent: "rgba(125, 211, 252, 0.82)",
    accentStrong: "rgba(186, 230, 253, 0.96)",
    accentSoft: "rgba(14, 165, 233, 0.12)",
    border: "rgba(186, 230, 253, 0.30)",
    glow: "rgba(125, 211, 252, 0.20)",
    panel: "rgba(14, 116, 144, 0.24)",
    panelSoft: "rgba(14, 165, 233, 0.065)",
    text: "rgb(224, 242, 254)",
    track: "rgba(14, 116, 144, 0.34)",
  },
  integrated: {
    accent: "rgba(250, 204, 21, 0.80)",
    accentStrong: "rgba(196, 181, 253, 0.96)",
    accentSoft: "rgba(250, 204, 21, 0.12)",
    border: "rgba(253, 224, 71, 0.34)",
    glow: "rgba(250, 204, 21, 0.24)",
    panel: "rgba(76, 29, 149, 0.26)",
    panelSoft: "rgba(167, 139, 250, 0.075)",
    text: "rgb(254, 249, 195)",
    track: "rgba(76, 29, 149, 0.34)",
  },
};

const getCategoryThemeCssVariables = (
  theme: CategoryTheme,
): ExerciseLibraryThemeCssVariables => {
  const signature = `${theme.surfaceClass} ${theme.cardClass} ${theme.pillClass} ${theme.tabClass}`.toLowerCase();
  const preset =
    signature.includes("yellow") && signature.includes("violet")
      ? categoryThemeCssPresets.integrated
      : signature.includes("cyan") && signature.includes("yellow")
        ? categoryThemeCssPresets.cyan
      : signature.includes("lime")
        ? categoryThemeCssPresets.lime
        : signature.includes("emerald")
          ? categoryThemeCssPresets.emerald
          : signature.includes("violet")
            ? categoryThemeCssPresets.violet
            : signature.includes("amber") || signature.includes("yellow")
              ? categoryThemeCssPresets.amber
              : signature.includes("rose")
                ? categoryThemeCssPresets.rose
                : signature.includes("orange")
                  ? categoryThemeCssPresets.orange
                  : signature.includes("teal")
                    ? categoryThemeCssPresets.teal
                    : signature.includes("sky")
                      ? categoryThemeCssPresets.sky
                      : signature.includes("cyan")
                        ? categoryThemeCssPresets.cyan
                        : categoryThemeCssPresets.slate;

  return {
    "--exercise-theme-accent": preset.accent,
    "--exercise-theme-accent-strong": preset.accentStrong,
    "--exercise-theme-accent-soft": preset.accentSoft,
    "--exercise-theme-border": preset.border,
    "--exercise-theme-glow": preset.glow,
    "--exercise-theme-panel": preset.panel,
    "--exercise-theme-panel-soft": preset.panelSoft,
    "--exercise-theme-text": preset.text,
    "--exercise-theme-scrollbar-track": preset.track,
    "--exercise-theme-scrollbar-thumb": preset.accent,
    "--exercise-theme-scrollbar-thumb-hover": preset.accentStrong,
  } as ExerciseLibraryThemeCssVariables;
};

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

type BodyRegionLayer = "Upper" | "Lower" | "Core";

const bodyRegionLayerConfigs: Array<{
  id: BodyRegionLayer;
  title: string;
  helper: string;
  pattern: RegExp;
  theme: CategoryTheme;
}> = [
  {
    id: "Upper",
    title: "Upper",
    helper: "Chest, back, shoulders, arms",
    pattern:
      /(upper|chest|pec|shoulder|delt|back|lat|trap|rhomboid|arm|bicep|tricep|wrist|forearm|rotator|cuff|neck|cervical)/i,
    theme: getCategoryTheme("Upper Push"),
  },
  {
    id: "Lower",
    title: "Lower",
    helper: "Quads, glutes, hips, calves",
    pattern:
      /(lower|leg|quad|hamstring|glute|hip|adductor|abductor|calf|tibialis|knee|ankle|posterior chain)/i,
    theme: getCategoryTheme("Lower Body Compound"),
  },
  {
    id: "Core",
    title: "Core",
    helper: "Abs, obliques, anti-movement",
    pattern:
      /(core|abs|oblique|anti|rotation|extension|lateral flexion|trunk|mobility|bracing)/i,
    theme: getCategoryTheme("Core"),
  },
];

const getBodyRegionLayerForLabel = (label: string): BodyRegionLayer | null => {
  const normalizedLabel = label.trim();
  if (!normalizedLabel || normalizedLabel.toLowerCase() === "all") return null;

  return (
    bodyRegionLayerConfigs.find((config) =>
      config.pattern.test(normalizedLabel),
    )?.id || null
  );
};

type ExerciseBodyFigureGender = "male" | "female";

const exerciseAnatomyColors = [
  "#34d399",
  "#67e8f9",
  "#a78bfa",
  "#fb7185",
  "#facc15",
];

const exerciseAnatomyBodySlugs: MuscleSlug[] = [
  "chest",
  "deltoids",
  "biceps",
  "triceps",
  "forearm",
  "abs",
  "obliques",
  "quadriceps",
  "hamstring",
  "gluteal",
  "calves",
  "trapezius",
  "upper-back",
  "lower-back",
  "adductors",
  "hip-flexors",
  "tibialis",
];

const exerciseAnatomySlugLayer: Record<MuscleSlug, BodyRegionLayer> = {
  chest: "Upper",
  deltoids: "Upper",
  biceps: "Upper",
  triceps: "Upper",
  forearm: "Upper",
  abs: "Core",
  obliques: "Core",
  quadriceps: "Lower",
  hamstring: "Lower",
  gluteal: "Lower",
  calves: "Lower",
  trapezius: "Upper",
  "upper-back": "Upper",
  "lower-back": "Core",
  adductors: "Lower",
  "hip-flexors": "Lower",
  tibialis: "Lower",
};

const exerciseAnatomySlugBodyCandidates: Record<MuscleSlug, string[]> = {
  chest: ["Chest"],
  deltoids: [
    "Shoulders",
    "Lateral Delts",
    "Middle Deltoids",
    "Delts",
    "Upper Back / Shoulders",
  ],
  biceps: ["Arms"],
  triceps: ["Arms"],
  forearm: ["Forearms", "Arms"],
  abs: ["Core", "Abs"],
  obliques: ["Core", "Obliques"],
  quadriceps: ["Legs", "Quads", "Quadriceps"],
  hamstring: ["Hamstrings", "Posterior Chain"],
  gluteal: [
    "Glutes",
    "Glute Bridge",
    "Hip Thrust / Bridge",
    "Hips / Glutes",
    "Posterior Chain",
  ],
  calves: ["Calves", "Lower Legs"],
  trapezius: ["Back", "Upper Back / Shoulders"],
  "upper-back": ["Back", "Upper Back / Shoulders"],
  "lower-back": ["Core", "Posterior Chain", "Back"],
  adductors: ["Hips / Adductors", "Hips"],
  "hip-flexors": ["Hips", "Core"],
  tibialis: ["Lower Legs"],
};

const exerciseAnatomySlugThemeCategory: Record<MuscleSlug, string> = {
  chest: "Upper Push",
  deltoids: "Upper Push",
  biceps: "Arm Isolation",
  triceps: "Arm Isolation",
  forearm: "Arm Isolation",
  abs: "Core",
  obliques: "Core",
  quadriceps: "Lower Body Isolation",
  hamstring: "Lower Body Compound",
  gluteal: "Lower Body Compound",
  calves: "Lower Body Isolation",
  trapezius: "Upper Pull",
  "upper-back": "Upper Pull",
  "lower-back": "Core",
  adductors: "Lower Body Isolation",
  "hip-flexors": "Lower Body Isolation",
  tibialis: "Lower Body Isolation",
};

const exerciseAnatomyRegionVisuals: Record<
  string,
  {
    baseFill: string;
    contextFill: string;
    selectedFill: string;
    stroke: string;
    glow: string;
  }
> = {
  "Lower Body Compound": {
    baseFill: "rgba(6, 78, 59, 0.36)",
    contextFill: "rgba(16, 185, 129, 0.42)",
    selectedFill: "rgba(52, 211, 153, 0.88)",
    stroke: "rgba(110, 231, 183, 0.72)",
    glow: "rgba(16, 185, 129, 0.28)",
  },
  "Lower Body Isolation": {
    baseFill: "rgba(63, 98, 18, 0.36)",
    contextFill: "rgba(132, 204, 22, 0.40)",
    selectedFill: "rgba(190, 242, 100, 0.86)",
    stroke: "rgba(217, 249, 157, 0.72)",
    glow: "rgba(190, 242, 100, 0.24)",
  },
  "Upper Push": {
    baseFill: "rgba(8, 47, 73, 0.38)",
    contextFill: "rgba(34, 211, 238, 0.40)",
    selectedFill: "rgba(103, 232, 249, 0.88)",
    stroke: "rgba(165, 243, 252, 0.72)",
    glow: "rgba(34, 211, 238, 0.28)",
  },
  "Upper Pull": {
    baseFill: "rgba(76, 29, 149, 0.36)",
    contextFill: "rgba(139, 92, 246, 0.40)",
    selectedFill: "rgba(196, 181, 253, 0.88)",
    stroke: "rgba(221, 214, 254, 0.72)",
    glow: "rgba(167, 139, 250, 0.28)",
  },
  "Arm Isolation": {
    baseFill: "rgba(113, 63, 18, 0.34)",
    contextFill: "rgba(245, 158, 11, 0.40)",
    selectedFill: "rgba(251, 191, 36, 0.88)",
    stroke: "rgba(253, 224, 71, 0.70)",
    glow: "rgba(251, 191, 36, 0.26)",
  },
  Core: {
    baseFill: "rgba(159, 18, 57, 0.32)",
    contextFill: "rgba(244, 63, 94, 0.40)",
    selectedFill: "rgba(251, 113, 133, 0.88)",
    stroke: "rgba(253, 164, 175, 0.72)",
    glow: "rgba(251, 113, 133, 0.28)",
  },
};

const exerciseAnatomyFallbackVisual = {
  baseFill: "rgba(30, 41, 59, 0.72)",
  contextFill: "rgba(148, 163, 184, 0.28)",
  selectedFill: "rgba(226, 232, 240, 0.82)",
  stroke: "rgba(226, 232, 240, 0.56)",
  glow: "rgba(148, 163, 184, 0.20)",
};

const getExerciseAnatomySlugVisual = (slug: MuscleSlug) =>
  exerciseAnatomyRegionVisuals[exerciseAnatomySlugThemeCategory[slug]] ||
  exerciseAnatomyFallbackVisual;

const normalizeBodySelectorValue = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");

const resolveAnatomySlugBodyOption = (
  slug: MuscleSlug,
  bodyOptions: string[],
) => {
  const candidates = exerciseAnatomySlugBodyCandidates[slug] || [];
  const normalizedCandidates = candidates.map(normalizeBodySelectorValue);
  const usableOptions = bodyOptions.filter((option) => option !== "All");

  return (
    usableOptions.find((option) =>
      normalizedCandidates.includes(normalizeBodySelectorValue(option)),
    ) ||
    usableOptions.find((option) => {
      const normalizedOption = normalizeBodySelectorValue(option);
      return normalizedCandidates.some(
        (candidate) =>
          normalizedOption.includes(candidate) ||
          candidate.includes(normalizedOption),
      );
    }) ||
    null
  );
};

const exerciseAnatomyIndicatorPositions: Record<
  MuscleSlug,
  { back: CSSProperties; front: CSSProperties }
> = {
  chest: { front: { left: "50%", top: "31%" }, back: { left: "50%", top: "33%" } },
  deltoids: { front: { left: "34%", top: "29%" }, back: { left: "66%", top: "30%" } },
  biceps: { front: { left: "27%", top: "39%" }, back: { left: "73%", top: "39%" } },
  triceps: { front: { left: "72%", top: "40%" }, back: { left: "28%", top: "40%" } },
  forearm: { front: { left: "25%", top: "51%" }, back: { left: "75%", top: "51%" } },
  abs: { front: { left: "50%", top: "45%" }, back: { left: "50%", top: "46%" } },
  obliques: { front: { left: "38%", top: "47%" }, back: { left: "62%", top: "47%" } },
  quadriceps: { front: { left: "45%", top: "67%" }, back: { left: "55%", top: "67%" } },
  hamstring: { front: { left: "55%", top: "70%" }, back: { left: "45%", top: "70%" } },
  gluteal: { front: { left: "50%", top: "59%" }, back: { left: "50%", top: "56%" } },
  calves: { front: { left: "43%", top: "84%" }, back: { left: "57%", top: "82%" } },
  trapezius: { front: { left: "50%", top: "24%" }, back: { left: "50%", top: "25%" } },
  "upper-back": { front: { left: "60%", top: "34%" }, back: { left: "50%", top: "36%" } },
  "lower-back": { front: { left: "50%", top: "51%" }, back: { left: "50%", top: "49%" } },
  adductors: { front: { left: "54%", top: "68%" }, back: { left: "46%", top: "68%" } },
  "hip-flexors": { front: { left: "42%", top: "57%" }, back: { left: "58%", top: "58%" } },
  tibialis: { front: { left: "56%", top: "81%" }, back: { left: "44%", top: "84%" } },
};

const getAnatomyRegionDescription = (label: string, slug?: MuscleSlug) => {
  const normalizedLabel = normalizeBodySelectorValue(label);
  const normalizedSlug = slug ? normalizeBodySelectorValue(slug) : "";

  if (/(glute|hip thrust|bridge)/.test(normalizedLabel + " " + normalizedSlug)) {
    return "Primary hip extension and pelvic stability muscles.";
  }
  if (/(delt|shoulder)/.test(normalizedLabel + " " + normalizedSlug)) {
    return "Shoulder abduction, pressing, and arm positioning.";
  }
  if (/(chest|pec)/.test(normalizedLabel)) {
    return "Horizontal pressing, fly patterns, and upper-body force transfer.";
  }
  if (/(lat|back|trap|rhomboid)/.test(normalizedLabel + " " + normalizedSlug)) {
    return "Pulling strength, scapular control, and posture support.";
  }
  if (/(quad|knee)/.test(normalizedLabel)) {
    return "Knee extension strength for squats, lunges, and step patterns.";
  }
  if (/(hamstring|posterior chain)/.test(normalizedLabel)) {
    return "Hip hinge support, knee flexion, and posterior-chain control.";
  }
  if (/(core|abs|oblique|trunk)/.test(normalizedLabel)) {
    return "Trunk stiffness, bracing, rotation control, and transfer strength.";
  }
  if (/(arm|bicep|tricep|forearm|wrist)/.test(normalizedLabel)) {
    return "Arm strength, elbow control, grip support, and accessory volume.";
  }
  if (/(calf|tibialis|ankle|lower leg)/.test(normalizedLabel)) {
    return "Lower-leg strength for gait, jumping, bracing, and ankle control.";
  }
  if (/(adductor|abductor|hip)/.test(normalizedLabel)) {
    return "Hip positioning, pelvic control, and lower-body stability.";
  }

  return "A movement-relevant training region used for filtering and volume tracking.";
};

const getPopularExercisesForBodyRegion = (
  label: string,
  exercises: Exercise[],
) => {
  const normalizedLabel = normalizeBodySelectorValue(label);
  if (!normalizedLabel) return [];

  const scoredExercises = exercises
    .map((exercise) => {
      const metadata = getMetadataForExercise(exercise);
      const bodyLabels = getExerciseVolumeBodyLabels(exercise, metadata);
      const normalizedBodyLabels = bodyLabels.map(normalizeBodySelectorValue);
      const title = getExerciseSortTitle(exercise);
      const searchText = normalizeBodySelectorValue(
        [
          title,
          exercise.name,
          exercise.body,
          exercise.muscles,
          metadata?.coreMovementLabel || "",
          metadata?.movementPatternLabel || "",
        ].join(" "),
      );
      let score = 0;

      if (normalizedBodyLabels.includes(normalizedLabel)) score += 40;
      if (
        normalizedBodyLabels.some(
          (bodyLabel) =>
            bodyLabel.includes(normalizedLabel) ||
            normalizedLabel.includes(bodyLabel),
        )
      ) {
        score += 18;
      }
      if (searchText.includes(normalizedLabel)) score += 8;
      if (
        /glute/.test(normalizedLabel) &&
        /\b(hip thrust|glute bridge|bridge|pull through|lunge)\b/.test(searchText)
      ) {
        score += 18;
      }
      if (
        /(delt|shoulder)/.test(normalizedLabel) &&
        /\b(lateral raise|shoulder press|reverse fly|upright row)\b/.test(
          searchText,
        )
      ) {
        score += 18;
      }
      if (
        /(chest|pec)/.test(normalizedLabel) &&
        /\b(chest press|chest fly|push up|push-up)\b/.test(searchText)
      ) {
        score += 18;
      }
      if (
        /(back|lat)/.test(normalizedLabel) &&
        /\b(row|vertical pull|pullover|pulldown)\b/.test(searchText)
      ) {
        score += 18;
      }

      return { exercise, score, title };
    })
    .filter((entry) => entry.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.title.localeCompare(right.title),
    );

  return Array.from(
    new Map(
      scoredExercises.map((entry) => [
        entry.exercise.id,
        { exercise: entry.exercise, title: entry.title },
      ]),
    ).values(),
  ).slice(0, 4);
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

const exerciseMatchesBodyRegionLayer = (
  exercise: Exercise,
  metadata: NormalizedExerciseCatalogItem | null,
  layer: BodyRegionLayer | null,
) => {
  if (!layer) return true;

  const layerConfig = bodyRegionLayerConfigs.find(
    (config) => config.id === layer,
  );
  if (!layerConfig) return true;

  const coreMovement =
    metadata?.coreMovementId && CORE_MOVEMENT_BY_ID[metadata.coreMovementId]
      ? CORE_MOVEMENT_BY_ID[metadata.coreMovementId]
      : null;
  const movementCategory = metadata
    ? getMappedPatternCategoryLabel(metadata.movementPatternId)
    : "";
  const valuesToMatch = [
    exercise.body,
    exercise.muscles,
    exercise.pattern,
    exercise.goal,
    ...getExerciseVolumeBodyLabels(exercise, metadata),
    metadata?.coreMovementLabel || "",
    metadata?.movementPatternLabel || "",
    metadata?.familyLabel || "",
    metadata?.apparatus || "",
    movementCategory,
    coreMovement?.bodyRegion || "",
    ...(coreMovement?.primaryMuscles || []),
    ...(coreMovement?.secondaryMuscles || []),
  ];

  return valuesToMatch.some((value) => layerConfig.pattern.test(value));
};

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
  "frog-stance",
  "seated",
  "standing",
  "kneeling",
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
  "roman-chair",
  "plank",
  "rear-foot-elevated",
  "front-foot-elevated",
  "preacher",
  "side-support",
  "quadruped",
  "90-90",
  "hanging",
]);

const modifierAnglePositionSlugs = new Set([
  "goblet",
  "front-loaded",
  "back-loaded",
  "overhead",
]);

const positionLimbUsageSlugs = new Set([
  "standard-stance",
  "narrow-stance",
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
  if (modifier.categoryId === "execution-style") return "modifier";
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
      "executionStyle",
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

const legacyChaoticStabilityModifierId =
  "stability:chaotic" as ExerciseModifierId;

const getDerivedResistanceProfileChips = (
  metadata: NormalizedExerciseCatalogItem | null,
  modifierIds: ExerciseModifierId[],
): MovementArchitectureChip[] => {
  const modifierIdSet = new Set(modifierIds);
  const chips: MovementArchitectureChip[] = [];

  if (modifierIdSet.has("assistance-resistance:chains")) {
    chips.push({
      key: "derived-resistance-chains-variable",
      label: "Variable Resistance",
      tone: "modifier",
    });
  }

  if (modifierIdSet.has("apparatus:band")) {
    chips.push({
      key: "derived-resistance-variable",
      label: "Variable Resistance",
      tone: "modifier",
    });
  }

  if (
    modifierIdSet.has("assistance-resistance:chaotic") ||
    modifierIdSet.has(legacyChaoticStabilityModifierId)
  ) {
    chips.push({
      key: "derived-resistance-chaotic",
      label: "Chaotic Resistance",
      tone: "modifier",
    });
  }

  if (modifierIdSet.has("range-of-motion:shortened-partial")) {
    chips.push({
      key: "derived-resistance-shortened-bias",
      label: "Shortened Bias",
      tone: "modifier",
    });
  } else if (
    modifierIdSet.has("range-of-motion:lengthened-partial") ||
    metadata?.coreMovementId === "chest-fly" ||
    metadata?.coreMovementId === "reverse-fly"
  ) {
    chips.push({
      key: "derived-resistance-lengthened-bias",
      label: "Lengthened Bias",
      tone: "modifier",
    });
  }

  return chips;
};

const shouldSuppressDirectResistanceProfileChip = (
  modifierId: ExerciseModifierId,
) =>
  modifierId === "assistance-resistance:chaotic" ||
  modifierId === legacyChaoticStabilityModifierId;

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
          categoryId !== "training-intent" &&
          !shouldSuppressDirectResistanceProfileChip(modifierId)
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

    getDerivedResistanceProfileChips(metadata, displayModifierIds).forEach(
      (chip) => addMovementChip(chips, chip),
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
type SpotlightShift = "center" | "left" | "right";

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
    if (presetApparatusIds.length > 1) {
      return presetApparatusIds.filter((modifierId) =>
        allowedApparatusIds.length ? allowedApparatusIds.includes(modifierId) : true,
      );
    }

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

type SemanticVariationStatsSummary = {
  hasStats: boolean;
  lastLoggedLabel: string;
  lifetimeSets: number;
  lifetimeSetsLabel: string;
};

const emptySemanticVariationStatsSummary: SemanticVariationStatsSummary = {
  hasStats: false,
  lastLoggedLabel: "No recent logs",
  lifetimeSets: 0,
  lifetimeSetsLabel: "0 sets",
};

const semanticVariationMenuGroupOrder = [
  "Common",
  "Strength",
  "Machine",
  "Cable / Band",
  "Bodyweight",
  "Athletic",
  "Mobility / Rehab",
  "All Variations",
] as const;

const getSemanticVariationModifierLabels = (
  variation: SemanticVariationOption,
) =>
  uniqueModifierIds([
    ...(variation.modifierIds || []),
    ...(variation.definingModifierIds || []),
  ])
    .map((modifierId) => EXERCISE_MODIFIER_BY_ID[modifierId]?.label || "")
    .filter(Boolean);

const getSemanticVariationEquipmentSummary = (
  variation: SemanticVariationOption,
) => {
  const equipmentLabels = uniqueModifierIds([
    ...(variation.modifierIds || []),
    ...(variation.definingModifierIds || []),
  ])
    .filter((modifierId) => getModifierCategoryId(modifierId) === "apparatus")
    .map((modifierId) => EXERCISE_MODIFIER_BY_ID[modifierId]?.label || "")
    .filter(Boolean);

  return equipmentLabels.slice(0, 2).join(" / ") || "Flexible setup";
};

const getSemanticVariationMenuGroup = (
  variation: SemanticVariationOption,
  index: number,
) => {
  const tokenText = [
    variation.name,
    ...(variation.aliases || []),
    ...getSemanticVariationModifierLabels(variation),
  ]
    .join(" ")
    .toLowerCase();

  if (index < 4) return "Common";
  if (/\b(machine|smith|pec deck|leg press|hack squat)\b/.test(tokenText)) {
    return "Machine";
  }
  if (/\b(cable|band|resistance band)\b/.test(tokenText)) {
    return "Cable / Band";
  }
  if (/\b(bodyweight|air squat|push-up|pull-up|plank)\b/.test(tokenText)) {
    return "Bodyweight";
  }
  if (/\b(jump|plyometric|sprint|throw|slam|swing|athletic)\b/.test(tokenText)) {
    return "Athletic";
  }
  if (/\b(mobility|rehab|stretch|pancake|jefferson|controlled)\b/.test(tokenText)) {
    return "Mobility / Rehab";
  }
  if (/\b(barbell|dumbbell|kettlebell|trap bar|landmine|weight plate|ez bar)\b/.test(tokenText)) {
    return "Strength";
  }

  return "All Variations";
};

const getSemanticVariationSearchText = (variation: SemanticVariationOption) =>
  [
    variation.name,
    ...(variation.aliases || []),
    ...getSemanticVariationModifierLabels(variation),
  ]
    .join(" ")
    .toLowerCase();

function SemanticVariationSelect({
  options,
  value,
  onChange,
  onOpenChange,
  onAddNewVariation,
  coreMovementLabel,
  statsByVariationId = {},
  themeStyle,
  compact = false,
}: {
  options: SemanticVariationOption[];
  value: string;
  onChange: (variation: SemanticVariationOption) => void;
  onOpenChange?: (open: boolean) => void;
  onAddNewVariation?: () => void;
  coreMovementLabel?: string;
  statsByVariationId?: Record<string, SemanticVariationStatsSummary>;
  themeStyle?: ExerciseLibraryThemeCssVariables;
  compact?: boolean;
}) {
  const dropdownId = useId();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const lockedMenuWidthRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedVariation =
    options.find((variation) => variation.id === value) || null;
  const displayValue = selectedVariation?.name || "Select variation";
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const groupedOptions = useMemo(() => {
    const groups = new Map<string, SemanticVariationOption[]>();

    options
      .filter((variation) =>
        normalizedSearchQuery
          ? getSemanticVariationSearchText(variation).includes(
              normalizedSearchQuery,
            )
          : true,
      )
      .forEach((variation) => {
        const originalIndex = options.findIndex(
          (option) => option.id === variation.id,
        );
        const groupLabel = getSemanticVariationMenuGroup(
          variation,
          originalIndex >= 0 ? originalIndex : 999,
        );

        groups.set(groupLabel, [...(groups.get(groupLabel) || []), variation]);
      });

    return Array.from(groups.entries()).sort(
      ([leftLabel], [rightLabel]) =>
        semanticVariationMenuGroupOrder.indexOf(
          leftLabel as (typeof semanticVariationMenuGroupOrder)[number],
        ) -
          semanticVariationMenuGroupOrder.indexOf(
            rightLabel as (typeof semanticVariationMenuGroupOrder)[number],
          ) || leftLabel.localeCompare(rightLabel),
    );
  }, [normalizedSearchQuery, options]);

  const updateMenuPosition = () => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 12;
    const preferredMinWidth = compact ? 360 : 440;
    const preferredMaxWidth = compact ? 460 : 520;
    const measuredMenuWidth = Math.min(
      Math.max(rect.width, preferredMinWidth),
      preferredMaxWidth,
      viewportWidth - margin * 2,
    );
    const menuWidth = lockedMenuWidthRef.current ?? measuredMenuWidth;
    lockedMenuWidthRef.current = menuWidth;
    const left = Math.min(
      Math.max(margin, rect.left),
      Math.max(margin, viewportWidth - menuWidth - margin),
    );
    const maxMenuHeight = Math.min(520, viewportHeight - margin * 2);
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
      setSearchQuery("");
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
    setSearchQuery("");
    setOpen(false);
  };
  const menuMaxHeight =
    typeof menuStyle?.maxHeight === "number" ? menuStyle.maxHeight : 420;
  const optionListMaxHeight = Math.max(172, menuMaxHeight - 188);

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
        className={`exercise-library-themed-semantic-trigger group/semantic flex max-w-full items-center gap-1.5 rounded-full border border-yellow-200/20 bg-yellow-300/[0.075] text-left font-black text-yellow-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_22px_rgba(250,204,21,0.08)] outline-none transition hover:border-yellow-200/35 hover:bg-yellow-300/[0.12] ${
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
              style={{ ...menuStyle, ...themeStyle }}
              data-exercise-library-floating-menu="true"
              className="exercise-library-themed-floating-panel fixed overflow-hidden rounded-2xl border border-yellow-100/20 bg-[radial-gradient(circle_at_12%_0%,rgba(250,204,21,0.18),transparent_35%),radial-gradient(circle_at_88%_6%,rgba(34,211,238,0.12),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.985),rgba(2,6,23,0.965))] p-2 shadow-[0_30px_92px_rgba(0,0,0,0.78),0_0_42px_rgba(250,204,21,0.13),inset_0_1px_0_rgba(255,255,255,0.15)] ring-1 ring-yellow-100/10 backdrop-blur-2xl"
            >
              <div className="border-b border-yellow-100/12 px-2 pb-2.5 pt-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-100/58">
                      Semantic Variations
                    </p>
                    <p className="mt-1 truncate text-sm font-black text-white">
                      {coreMovementLabel || "Exercise Type"}
                    </p>
                  </div>
                  {selectedVariation ? (
                    <span className="shrink-0 rounded-xl border border-yellow-100/18 bg-yellow-300/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-yellow-100/70">
                      Selected
                    </span>
                  ) : null}
                </div>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  data-no-drag-scroll="true"
                  placeholder="Search variations"
                  className="mt-2.5 min-h-10 w-full rounded-xl border border-white/10 bg-slate-950/72 px-3 py-2 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-yellow-200/45 focus:bg-slate-950/90"
                />
              </div>

              <div
                role="listbox"
                aria-label="Semantic exercise variations"
                style={{ maxHeight: optionListMaxHeight }}
                  className="exercise-library-themed-scrollbar mt-2 overflow-y-auto pr-1 [scrollbar-color:rgba(250,204,21,0.32)_transparent] [scrollbar-width:thin]"
              >
                {groupedOptions.length ? (
                  groupedOptions.map(([groupLabel, groupOptions]) => (
                    <div key={groupLabel} className="mb-2 last:mb-0">
                      <p className="mb-1.5 px-2 text-[8px] font-black uppercase tracking-[0.18em] text-yellow-100/42">
                        {groupLabel}
                      </p>
                      <div className="space-y-1.5">
                        {groupOptions.map((variation) => {
                          const isSelected = variation.id === value;
                          const optionStats =
                            statsByVariationId[variation.id] ||
                            emptySemanticVariationStatsSummary;
                          const setupLabel =
                            getSemanticVariationEquipmentSummary(variation);

                          return (
                            <button
                              key={variation.id}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => selectVariation(variation)}
                              className={`flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                                isSelected
                                  ? "exercise-library-themed-option-selected border-yellow-200 bg-yellow-300 text-slate-950 shadow-[0_0_28px_rgba(250,204,21,0.26)]"
                                  : "border-white/10 bg-white/[0.045] text-yellow-100/88 hover:border-yellow-200/35 hover:bg-yellow-300/12 hover:text-yellow-50"
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block text-sm font-black leading-5">
                                  {variation.name}
                                </span>
                                <span
                                  className={`mt-1 block text-[10px] font-bold leading-4 ${
                                    isSelected
                                      ? "text-slate-700"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {setupLabel}
                                </span>
                              </span>
                              <span className="shrink-0 text-right">
                                <span
                                  className={`block whitespace-nowrap text-[10px] font-black uppercase tracking-[0.08em] ${
                                    isSelected
                                      ? "text-slate-900"
                                      : optionStats.hasStats
                                        ? "text-emerald-200"
                                        : "text-white/42"
                                  }`}
                                >
                                  {optionStats.lifetimeSetsLabel}
                                </span>
                                <span
                                  className={`mt-1 block whitespace-nowrap text-[9px] font-bold ${
                                    isSelected
                                      ? "text-slate-700"
                                      : "text-white/36"
                                  }`}
                                >
                                  Last: {optionStats.lastLoggedLabel}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3 text-sm font-bold text-slate-400">
                    No matching variations.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpen(false);
                  setSearchQuery("");
                  onAddNewVariation?.();
                }}
                className="mt-2 flex min-h-11 w-full items-center justify-center rounded-xl border border-emerald-200/22 bg-emerald-300/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-100 transition hover:border-emerald-100/48 hover:bg-emerald-300 hover:text-slate-950"
              >
                + Add New Variation
              </button>
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
  onChipSelect,
}: {
  chips: MovementArchitectureChip[];
  compact?: boolean;
  classificationChipClass?: string;
  onChipSelect?: (chip: MovementArchitectureChip) => void;
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
      {visibleChips.map((chip) => {
        const chipClassName = `exercise-library-themed-chip max-w-full rounded-full border px-2.5 py-1 text-[9px] font-black uppercase leading-4 tracking-[0.08em] transition ${
            chip.tone === "classification" && classificationChipClass
              ? classificationChipClass
              : movementArchitectureChipClasses[chip.tone]
          }`;

        return onChipSelect && chip.tone !== "fallback" ? (
          <button
            key={chip.key}
            type="button"
            aria-label={`Filter by ${chip.label}`}
            onClick={() => onChipSelect(chip)}
            className={`${chipClassName} cursor-pointer hover:-translate-y-0.5 hover:border-white/35 focus:outline-none focus:ring-2 focus:ring-cyan-100/30`}
            title={`Filter by ${chip.label}`}
          >
            {chip.label}
          </button>
        ) : (
          <span key={chip.key} className={chipClassName} title={chip.label}>
            {chip.label}
          </span>
        );
      })}

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

const getExerciseMappingSearchText = (
  exercise: Exercise,
  metadata: NormalizedExerciseCatalogItem | null,
) =>
  [
    exercise.id,
    exercise.name,
    exercise.exerciseName,
    exercise.generatedTitle,
    exercise.semanticVariationName,
    exercise.semanticVariation,
    exercise.body,
    exercise.muscles,
    exercise.pattern,
    exercise.coreMovementPattern,
    metadata?.coreMovementId,
    metadata?.coreMovementLabel,
    metadata?.movementPatternLabel,
    metadata?.familyLabel,
    ...(metadata?.semanticVariationNames || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const getExerciseMuscleMappingOverride = (
  exercise: Exercise,
  metadata: NormalizedExerciseCatalogItem | null,
): Omit<MuscleIntelligence, "source"> | null => {
  const mappingText = getExerciseMappingSearchText(exercise, metadata);
  const coreMovementId = metadata?.coreMovementId || exercise.coreMovementPattern;
  const isHipThrustBridge =
    coreMovementId === "hip-thrust-bridge" ||
    /\b(hip thrust|glute bridge|glute drive|glute extension|pull through|pull-through)\b/.test(
      mappingText,
    );

  if (isHipThrustBridge) {
    return {
      primary: ["Glutes"],
      secondary: ["Hamstrings", "Core", "Adductors"],
      stabilizers: [],
    };
  }

  const isLateralRaise =
    /\b(lateral raise|side raise|lateral delt|middle delt|middle deltoid)\b/.test(
      mappingText,
    );

  if (isLateralRaise) {
    return {
      primary: ["Lateral Delts", "Middle Deltoids"],
      secondary: ["Front Delts", "Upper Traps", "Rotator Cuff"],
      stabilizers: ["Shoulder Stabilizers"],
    };
  }

  return null;
};

const getExerciseVolumeBodyLabels = (
  exercise: Exercise,
  metadata: NormalizedExerciseCatalogItem | null = getMetadataForExercise(exercise),
) => {
  const override = getExerciseMuscleMappingOverride(exercise, metadata);
  const labels = [
    exercise.body,
    ...(override?.primary || []),
    ...(override?.secondary || []),
    ...(override?.stabilizers || []),
    ...splitMuscleText(exercise.muscles || "").slice(0, 6),
  ];
  const mappingText = getExerciseMappingSearchText(exercise, metadata);

  if (override?.primary.some((muscle) => /delt|deltoid/i.test(muscle))) {
    labels.push("Shoulders");
  }
  if (/\bglute|hip thrust|bridge|pull through|pull-through\b/.test(mappingText)) {
    labels.push("Glutes");
  }

  return getUniqueMuscleLabels(labels).filter(Boolean);
};

const getExerciseMuscleIntelligence = (
  exercise: Exercise,
  metadata: NormalizedExerciseCatalogItem | null,
): MuscleIntelligence => {
  const override = getExerciseMuscleMappingOverride(exercise, metadata);

  if (override) {
    return {
      primary: getUniqueMuscleLabels(override.primary),
      secondary: getUniqueMuscleLabels(override.secondary),
      stabilizers: getUniqueMuscleLabels(override.stabilizers),
      source: "movement",
    };
  }

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
  latestSetInsight,
  onMuscleSelect,
  showSourceBadge = true,
  weeklySetsByMuscleLabel,
}: {
  muscles: MuscleIntelligence;
  compact?: boolean;
  latestSetInsight?: LatestSetInsight | null;
  onMuscleSelect?: (muscle: string) => void;
  showSourceBadge?: boolean;
  weeklySetsByMuscleLabel?: Map<string, number>;
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
      items: muscles.primary,
      value: muscles.primary.join(" • "),
      tone:
        "border-cyan-200/20 bg-cyan-300/10 text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]",
      labelTone: "text-cyan-200/70",
    },
    {
      label: "Secondary",
      items: muscles.secondary,
      value: muscles.secondary.join(" • "),
      tone:
        "border-violet-200/20 bg-violet-300/10 text-violet-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]",
      labelTone: "text-violet-200/70",
    },
    {
      label: "Stabilizers",
      items: muscles.stabilizers,
      value: muscles.stabilizers.join(" • "),
      tone:
        "border-emerald-200/20 bg-emerald-300/10 text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]",
      labelTone: "text-emerald-200/70",
    },
  ].filter((row) => row.value);

  return (
    <div
      className={`exercise-library-themed-intelligence rounded-2xl border border-cyan-100/15 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.12),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.88),rgba(2,6,23,0.74))] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_34px_rgba(0,0,0,0.22)] backdrop-blur-xl ${
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
            className={`exercise-library-themed-intelligence-tile rounded-xl border ${row.tone} ${
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
            {onMuscleSelect ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {row.items.map((muscle) => {
                  const muscleWeeklySets = weeklySetsByMuscleLabel
                    ? getWeeklySetsForVolumeLabel(weeklySetsByMuscleLabel, muscle)
                    : 0;
                  const isLatestMusclePulse = Boolean(
                    latestSetInsight?.bodyLabels.some(
                      (label) =>
                        normalizeBodySelectorValue(label) ===
                        normalizeBodySelectorValue(muscle),
                    ),
                  );
                  const muscleWeeklyGoal = getWeeklySetGoalForMuscle();
                  const muscleStatusId = getWeeklySetGoalStatusId(
                    muscleWeeklySets,
                    muscleWeeklyGoal,
                  );
                  const muscleTheme = getBodyRegionTheme(muscle);
                  const muscleStyle = {
                    ...getCategoryThemeCssVariables(muscleTheme),
                    "--exercise-chip-volume-progress": `${getWeeklySetGoalFillPercent(
                      muscleWeeklySets,
                      muscleWeeklyGoal,
                    )}%`,
                  } as ExerciseLibraryThemeCssVariables;

                  return (
                    <button
                      key={`${row.label}-${muscle}`}
                      type="button"
                      aria-label={`Filter by ${muscle}, ${Math.max(
                        0,
                        Math.round(muscleWeeklySets),
                      )} of ${muscleWeeklyGoal} weekly sets`}
                      onClick={() => onMuscleSelect(muscle)}
                      style={muscleStyle}
                      className={`exercise-library-themed-chip exercise-library-volume-chip rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 font-black leading-snug text-white transition hover:-translate-y-0.5 hover:border-cyan-100/30 hover:bg-cyan-300/12 focus:outline-none focus:ring-2 focus:ring-cyan-100/30 ${
                        isLatestMusclePulse ? "exercise-library-volume-pulse" : ""
                      } ${
                        compact ? "text-[9px]" : "text-xs"
                      }`}
                      title={`${muscle}: ${Math.max(
                        0,
                        Math.round(muscleWeeklySets),
                      )} of ${muscleWeeklyGoal} weekly sets, ${weeklyVolumeStatusConfig[muscleStatusId].label}`}
                    >
                      <span
                        aria-hidden="true"
                        className="exercise-library-volume-chip__fill"
                      />
                      <span className="exercise-library-volume-chip__content">
                        <span>{muscle}</span>
                        {isLatestMusclePulse ? (
                          <span className="exercise-library-volume-added-chip">
                            {latestSetInsight?.pulseLabel}
                          </span>
                        ) : null}
                        <span className="exercise-library-volume-chip__stat">
                          <WeeklySetGoalBadge
                            completedSets={muscleWeeklySets}
                            goalSets={muscleWeeklyGoal}
                          />
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p
                className={`mt-0.5 font-black leading-snug ${
                  compact ? "text-[10px]" : "text-sm"
                }`}
              >
                {row.value}
              </p>
            )}
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

const exerciseLibraryPreferredWeightUnitStorageKey =
  "soundFitness.exerciseLibrary.preferredWeightUnit";
const exerciseLibraryUiThemeStorageKey =
  "soundFitness.exerciseLibrary.uiTheme";
const kilogramsPerPound = 0.45359237;

const exerciseLibraryUiThemeConfigs: Record<
  ExerciseLibraryUiThemeId,
  { helper: string; label: string; mood: string }
> = {
  "space-glass": {
    helper: "Cosmic glass, star glow, category neon",
    label: "Space Glass",
    mood: "Cosmic",
  },
  "ocean-water": {
    helper: "Blue water light with liquid volume fills",
    label: "Ocean / Water",
    mood: "Fluid",
  },
  "neon-gym": {
    helper: "Higher contrast glow for a night-gym console",
    label: "Neon Gym",
    mood: "Electric",
  },
  "minimal-dark": {
    helper: "Quieter dark panels with restrained shimmer",
    label: "Minimal Dark",
    mood: "Focused",
  },
  "emerald-performance": {
    helper: "Emerald training lab with performance accents",
    label: "Emerald Performance",
    mood: "Performance",
  },
};

const exerciseLibraryUiThemeOptions = Object.entries(
  exerciseLibraryUiThemeConfigs,
).map(([id, config]) => ({
  id: id as ExerciseLibraryUiThemeId,
  ...config,
}));

const normalizeWeightUnit = (value?: string | null): WeightUnit =>
  value === "kg" ? "kg" : "lbs";

const normalizeExerciseLibraryUiTheme = (
  value?: string | null,
): ExerciseLibraryUiThemeId =>
  value && value in exerciseLibraryUiThemeConfigs
    ? (value as ExerciseLibraryUiThemeId)
    : "space-glass";

const readExerciseLibraryPreferredWeightUnit = (): WeightUnit => {
  if (typeof window === "undefined") return "lbs";
  return normalizeWeightUnit(
    window.localStorage.getItem(exerciseLibraryPreferredWeightUnitStorageKey),
  );
};

const writeExerciseLibraryPreferredWeightUnit = (unit: WeightUnit) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    exerciseLibraryPreferredWeightUnitStorageKey,
    unit,
  );
};

const readExerciseLibraryUiTheme = (): ExerciseLibraryUiThemeId => {
  if (typeof window === "undefined") return "space-glass";
  return normalizeExerciseLibraryUiTheme(
    window.localStorage.getItem(exerciseLibraryUiThemeStorageKey),
  );
};

const writeExerciseLibraryUiTheme = (themeId: ExerciseLibraryUiThemeId) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(exerciseLibraryUiThemeStorageKey, themeId);
};

const convertPoundsToPreferredUnit = (valueInPounds: number, unit: WeightUnit) =>
  unit === "kg" ? valueInPounds * kilogramsPerPound : valueInPounds;

const formatWeightMetric = (
  valueInPounds: number,
  unit: WeightUnit,
  options: { compact?: boolean; volume?: boolean } = {},
) => {
  if (valueInPounds <= 0) return "";

  const convertedValue = convertPoundsToPreferredUnit(valueInPounds, unit);
  const formatted = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: unit === "kg" && !options.volume ? 1 : 0,
    notation: options.compact ? "compact" : "standard",
  }).format(convertedValue);
  const displayUnit = unit === "lbs" ? "lb" : "kg";

  return `${formatted} ${displayUnit}`;
};

const formatWeeklyVolumeRangeLabel = (date = new Date()) => {
  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - 6);

  const sameMonth = startDate.getMonth() === date.getMonth();
  const startLabel = startDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const endLabel = date.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : "short",
    day: "numeric",
  });

  return `Trailing 7 days: ${startLabel}-${endLabel}`;
};

const getStatCompletedReps = (stat: LocalExerciseStatEntry) =>
  parseStatNumber(stat.reps) * parseStatNumber(stat.sets);

const isStatWithinTrailingSevenDays = (stat: LocalExerciseStatEntry) => {
  const statTime = getStatTime(stat);
  if (!statTime) return false;

  return statTime >= Date.now() - 7 * 24 * 60 * 60 * 1000;
};

const getWeeklyVolumeForStats = (stats: LocalExerciseStatEntry[]) =>
  stats.reduce(
    (summary, stat) => {
      if (!isStatWithinTrailingSevenDays(stat)) return summary;

      return {
        reps: summary.reps + getStatCompletedReps(stat),
        sets: summary.sets + parseStatNumber(stat.sets),
        weightVolume: summary.weightVolume + getStatVolume(stat),
      };
    },
    { reps: 0, sets: 0, weightVolume: 0 },
  );

const formatMetric = (value: number) =>
  value > 0 ? value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "--";

const getStatVolume = (stat: LocalExerciseStatEntry) =>
  parseStatNumber(stat.weight) *
  parseStatNumber(stat.reps) *
  parseStatNumber(stat.sets);

const getEstimatedOneRepMax = (stat: LocalExerciseStatEntry) => {
  const weight = parseStatNumber(stat.weight);
  const reps = parseStatNumber(stat.reps);

  if (weight <= 0 || reps <= 0) return 0;
  return weight * (1 + reps / 30);
};

type GoalLogicSummary = {
  emphasisLabel: string;
  forecastLabel: string;
  futureLoadCapacityLabel: string;
  goalCue: string;
  primaryGoalLabel: string;
  recoveryRiskLabel: string;
  stimulusLabel: string;
};

const normalizeGoalLogicKey = (goal?: string | null) =>
  normalizeFilterCompareValue(goal || "General Fitness");

const goalLogicCopy: Record<
  string,
  { emphasisLabel: string; goalCue: string }
> = {
  strength: {
    emphasisLabel: "Load progression",
    goalCue:
      "Prioritizes heavier quality sets, best-load trends, and longer-rest readiness.",
  },
  hypertrophy: {
    emphasisLabel: "Muscle volume",
    goalCue:
      "Prioritizes weekly set volume, muscle coverage, and repeatable growth stimulus.",
  },
  "fat loss": {
    emphasisLabel: "Consistency density",
    goalCue:
      "Prioritizes training consistency, total reps, and conditioning-friendly density.",
  },
  mobility: {
    emphasisLabel: "ROM frequency",
    goalCue:
      "Prioritizes repeat exposure, controlled range, and low-friction consistency.",
  },
  "athletic performance": {
    emphasisLabel: "Quality power",
    goalCue:
      "Prioritizes explosive intent, clean reps, and balanced athletic categories.",
  },
  conditioning: {
    emphasisLabel: "Work capacity",
    goalCue:
      "Prioritizes repeatable output, density, and total weekly movement volume.",
  },
  "rehab return to training": {
    emphasisLabel: "Controlled progression",
    goalCue:
      "Prioritizes gradual loading, controlled volume, and consistent exposure.",
  },
  stability: {
    emphasisLabel: "Control under load",
    goalCue:
      "Prioritizes bracing, positional control, and stable repeatable patterns.",
  },
  power: {
    emphasisLabel: "Explosive quality",
    goalCue:
      "Prioritizes quality reps, load intent, and crisp low-fatigue power practice.",
  },
  "general fitness": {
    emphasisLabel: "Balanced training",
    goalCue:
      "Prioritizes broad weekly coverage, consistency, and sustainable progression.",
  },
  endurance: {
    emphasisLabel: "Repeatable reps",
    goalCue:
      "Prioritizes total reps, frequency, and durable work capacity.",
  },
  "skill technique": {
    emphasisLabel: "Movement quality",
    goalCue:
      "Prioritizes clean reps, practice frequency, and technique consistency.",
  },
  recovery: {
    emphasisLabel: "Low fatigue consistency",
    goalCue:
      "Prioritizes fresh areas, controlled volume, and lower-fatigue movement choices.",
  },
};

const getGoalLogicCopy = (goal?: string | null) =>
  goalLogicCopy[normalizeGoalLogicKey(goal)] ||
  goalLogicCopy["general fitness"];

const isStatWithinPreviousTrailingSevenDays = (
  stat: LocalExerciseStatEntry,
) => {
  const statTime = getStatTime(stat);
  if (!statTime) return false;

  const trailingSevenStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const previousSevenStart = Date.now() - 14 * 24 * 60 * 60 * 1000;

  return statTime >= previousSevenStart && statTime < trailingSevenStart;
};

const getPreviousTrailingSevenDayWeightVolumeForStats = (
  stats: LocalExerciseStatEntry[],
) =>
  stats
    .filter(isStatWithinPreviousTrailingSevenDays)
    .reduce((total, stat) => total + getStatVolume(stat), 0);

const formatWeightVolumeComparison = (
  currentVolume: number,
  previousVolume: number,
) => {
  if (currentVolume <= 0) return "No load volume yet";
  if (previousVolume <= 0) return "No prior loaded range";

  const percentChange = ((currentVolume - previousVolume) / previousVolume) * 100;
  const roundedChange = Math.round(percentChange);
  const prefix = roundedChange > 0 ? "+" : "";

  return `${prefix}${roundedChange}% vs prior 7 days`;
};

const getFutureLoadCapacityLabel = (
  stats: LocalExerciseStatEntry[],
  unit: WeightUnit,
) => {
  const loadedStats = stats
    .filter((stat) => parseStatNumber(stat.weight) > 0)
    .sort((left, right) => getStatTime(right) - getStatTime(left));

  if (loadedStats.length < 2) return "Future load: needs more data";

  const recentLoadedStats = loadedStats.slice(0, 5);
  const latestWeight = parseStatNumber(recentLoadedStats[0].weight);
  const bestEstimatedLoad = Math.max(
    ...recentLoadedStats.map(getEstimatedOneRepMax),
  );
  const estimate = Math.max(latestWeight, bestEstimatedLoad * 0.82);
  const displayEstimate = formatWeightMetric(estimate, unit);

  return displayEstimate
    ? `Estimated next working load: ${displayEstimate}`
    : "Future load: needs more data";
};

const getVolumeForecastLabel = (
  stats: LocalExerciseStatEntry[],
  weeklySets: number,
  weeklyGoalSets: number,
) => {
  const weeklyStats = stats.filter(isStatWithinTrailingSevenDays);
  if (!weeklyStats.length) return "Forecast: log sets to project the week";

  const oldestTime = Math.min(...weeklyStats.map(getStatTime).filter(Boolean));
  const daysSpanned = Math.min(
    7,
    Math.max(1, Math.ceil((Date.now() - oldestTime) / (24 * 60 * 60 * 1000)) + 1),
  );
  const projectedSets = (Math.max(0, weeklySets) / daysSpanned) * 7;
  const projectedPercent = Math.round(
    getWeeklySetGoalProgressPercent(projectedSets, weeklyGoalSets),
  );

  return `At this pace: estimated ${projectedPercent}% of weekly volume`;
};

const getGoalStimulusLabel = (
  goal: string,
  weeklySets: number,
  weeklyGoalSets: number,
) => {
  const progress = getWeeklySetGoalProgressPercent(weeklySets, weeklyGoalSets);
  const normalizedGoal = normalizeGoalLogicKey(goal);

  if (progress >= 111) return "Training stimulus: high, watch overreach";
  if (progress >= 75) {
    return normalizedGoal.includes("hypertrophy")
      ? "Muscle-growth stimulus: high this range"
      : "Training stimulus: on target";
  }
  if (progress >= 41) return "Training stimulus: building";
  return "Training stimulus: under target";
};

const getRecoveryRiskLabel = (weeklySets: number, weeklyGoalSets: number) => {
  const progress = getWeeklySetGoalProgressPercent(weeklySets, weeklyGoalSets);

  if (progress > 110) return "Recovery signal: above target";
  if (progress >= 75) return "Recovery signal: balanced";
  return "Recovery signal: room to build";
};

const getExerciseStatHistory = (
  stats: LocalExerciseStatEntry[],
  exercise: Exercise,
  variationName: string,
  metadata?: NormalizedExerciseCatalogItem | null,
  semanticVariationId?: string,
) => {
  const normalizedNames = new Set(
    [
      exercise.name,
      exercise.semanticVariationName,
      exercise.generatedTitle,
      variationName,
      ...(metadata?.semanticVariationNames || []),
    ]
      .filter(Boolean)
      .map((name) => normalizeStatMatchValue(name)),
  );

  return stats
    .filter((stat) => {
      const statName = normalizeStatMatchValue(stat.exerciseName);
      const statSemanticVariationId =
        typeof stat.semanticVariationId === "string"
          ? stat.semanticVariationId
          : "";
      const statSemanticName = normalizeStatMatchValue(stat.semanticVariationName);
      const statGeneratedTitle = normalizeStatMatchValue(stat.generatedTitle);

      return (
        stat.exerciseId === exercise.id ||
        (semanticVariationId &&
          statSemanticVariationId === semanticVariationId) ||
        (statSemanticName ? normalizedNames.has(statSemanticName) : false) ||
        (statGeneratedTitle ? normalizedNames.has(statGeneratedTitle) : false) ||
        (statName ? normalizedNames.has(statName) : false)
      );
    })
    .sort((a, b) => getStatTime(b) - getStatTime(a));
};

const getRecentExerciseStats = (
  stats: LocalExerciseStatEntry[],
  exercise: Exercise,
  variationName: string,
  metadata?: NormalizedExerciseCatalogItem | null,
  semanticVariationId?: string,
) =>
  getExerciseStatHistory(
    stats,
    exercise,
    variationName,
    metadata,
    semanticVariationId,
  ).slice(0, 3);

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
    selectedModifierIds,
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

const getExerciseCoreMovementSortTitle = (exercise: Exercise) => {
  const metadata = getMetadataForExercise(exercise);

  return (
    metadata?.coreMovementLabel ||
    metadata?.movementPatternLabel ||
    exercise.coreMovementPattern ||
    exercise.pattern ||
    exercise.name ||
    ""
  );
};

const getExerciseCategorySectionLabel = (exercise: Exercise) => {
  const metadata = getMetadataForExercise(exercise);

  return (
    getCardClassificationLabel(metadata) ||
    (exercise.custom ? myExercisesSectionLabel : "")
  );
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

const sumLoggedSets = (stats: LocalExerciseStatEntry[]) =>
  stats.reduce((total, stat) => total + parseStatNumber(stat.sets), 0);

const normalizeStatMatchValue = (value?: string | null) =>
  value?.trim().toLowerCase() || "";
const normalizeFilterCompareValue = (value?: string | null) =>
  value?.trim().toLowerCase().replace(/\s+/g, " ") || "";

const getLifetimeSetsComplete = (
  stats: LocalExerciseStatEntry[],
  exercise: Exercise,
  metadata: NormalizedExerciseCatalogItem | null,
  semanticVariationName: string,
  semanticVariationId?: string,
) => {
  const exactExerciseStats = stats.filter(
    (stat) => stat.exerciseId === exercise.id,
  );

  if (exactExerciseStats.length > 0) return sumLoggedSets(exactExerciseStats);

  const semanticNames = new Set(
    [
      semanticVariationName,
      exercise.semanticVariationName,
      exercise.generatedTitle,
      exercise.name,
      ...(metadata?.semanticVariationNames || []),
    ]
      .map(normalizeStatMatchValue)
      .filter(Boolean),
  );
  const coreMovementIds = new Set(
    [metadata?.coreMovementId, exercise.coreMovementPattern]
      .map((value) => (typeof value === "string" ? value : ""))
      .filter(Boolean),
  );
  const coreMovementNames = new Set(
    [
      metadata?.coreMovementLabel,
      metadata?.movementPatternLabel,
      exercise.pattern,
    ]
      .map(normalizeStatMatchValue)
      .filter(Boolean),
  );
  const fallbackStats = stats.filter((stat) => {
    const statSemanticVariationId =
      typeof stat.semanticVariationId === "string"
        ? stat.semanticVariationId
        : "";
    const statCoreMovementPattern =
      typeof stat.coreMovementPattern === "string"
        ? stat.coreMovementPattern
        : "";
    const statExerciseName = normalizeStatMatchValue(stat.exerciseName);
    const statSemanticName = normalizeStatMatchValue(stat.semanticVariationName);
    const statGeneratedTitle = normalizeStatMatchValue(stat.generatedTitle);
    const statPattern = normalizeStatMatchValue(stat.pattern);

    return (
      (semanticVariationId &&
        statSemanticVariationId === semanticVariationId) ||
      (statSemanticName && semanticNames.has(statSemanticName)) ||
      (statGeneratedTitle && semanticNames.has(statGeneratedTitle)) ||
      (statExerciseName && semanticNames.has(statExerciseName)) ||
      (statCoreMovementPattern &&
        coreMovementIds.has(statCoreMovementPattern)) ||
      (statPattern && coreMovementNames.has(statPattern))
    );
  });

  return sumLoggedSets(fallbackStats);
};

const formatLifetimeSetsComplete = (sets: number) => {
  const roundedSets = Math.max(0, Math.round(sets));
  const formatted =
    roundedSets >= 1000
      ? new Intl.NumberFormat(undefined, {
          maximumFractionDigits: 1,
          notation: "compact",
        })
          .format(roundedSets)
          .replace("K", "k")
      : roundedSets.toLocaleString();

  return `${formatted} ${roundedSets === 1 ? "Set" : "Sets"}`;
};

const formatSemanticVariationLastLoggedLabel = (
  stats: LocalExerciseStatEntry[],
) => {
  const latestTime = stats.reduce(
    (latest, stat) => Math.max(latest, getStatTime(stat)),
    0,
  );

  if (!latestTime) return "No recent logs";

  return new Date(latestTime).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
};

const getSemanticVariationStatsSummary = (
  stats: LocalExerciseStatEntry[],
  exercise: Exercise,
  variation: SemanticVariationOption,
) => {
  const variationName = normalizeStatMatchValue(variation.name);
  const variationAliases = new Set(
    [variation.name, ...(variation.aliases || [])]
      .map(normalizeStatMatchValue)
      .filter(Boolean),
  );
  const exerciseImpliesVariation = [
    exercise.semanticVariationName,
    exercise.semanticVariation,
    exercise.generatedTitle,
    exercise.name,
  ]
    .map(normalizeStatMatchValue)
    .some((name) => Boolean(name) && name === variationName);
  const idMatches = stats.filter(
    (stat) => stat.semanticVariationId === variation.id,
  );
  const nameMatches = idMatches.length
    ? idMatches
    : stats.filter((stat) => {
        const statExerciseName = normalizeStatMatchValue(stat.exerciseName);
        const statSemanticName = normalizeStatMatchValue(
          stat.semanticVariationName,
        );
        const statGeneratedTitle = normalizeStatMatchValue(stat.generatedTitle);
        const exactExerciseMatch =
          exerciseImpliesVariation && stat.exerciseId === exercise.id;

        return (
          exactExerciseMatch ||
          (statSemanticName && variationAliases.has(statSemanticName)) ||
          (statGeneratedTitle && variationAliases.has(statGeneratedTitle)) ||
          (statExerciseName && variationAliases.has(statExerciseName))
        );
      });
  const lifetimeSets = sumLoggedSets(nameMatches);

  if (!nameMatches.length) return emptySemanticVariationStatsSummary;

  return {
    hasStats: true,
    lastLoggedLabel: formatSemanticVariationLastLoggedLabel(nameMatches),
    lifetimeSets,
    lifetimeSetsLabel: formatLifetimeSetsComplete(lifetimeSets),
  };
};

const sortExercisesForLibrary = (
  exercises: Exercise[],
  sortMode: ExerciseLibrarySortMode,
  stats: LocalExerciseStatEntry[],
  favoriteExerciseIds: Set<string>,
) =>
  [...exercises].sort((left, right) => {
    const titleSort = getExerciseSortTitle(left).localeCompare(
      getExerciseSortTitle(right),
    );
    const coreMovementTitleSort = getExerciseCoreMovementSortTitle(
      left,
    ).localeCompare(getExerciseCoreMovementSortTitle(right));

    if (sortMode === "favorites") {
      return (
        Number(favoriteExerciseIds.has(right.id)) -
          Number(favoriteExerciseIds.has(left.id)) ||
        titleSort
      );
    }

    if (sortMode === "alpha") return coreMovementTitleSort || titleSort;

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
  favoriteExerciseIds: Set<string>,
) => {
  if (sortMode === "alpha") {
    const firstCharacter = getExerciseCoreMovementSortTitle(exercise)
      .trim()
      .charAt(0)
      .toUpperCase();

    return /^[A-Z]$/.test(firstCharacter) ? firstCharacter : "#";
  }

  if (sortMode === "difficulty") return exercise.level || "Unassigned";
  if (sortMode === "body") return exercise.body || "Other";
  if (sortMode === "favorites") {
    return favoriteExerciseIds.has(exercise.id) ? "Favorites" : "Other Exercises";
  }
  if (sortMode === "recent") return "Recently Used";
  if (sortMode === "logged") return "Most Logged";

  return getExerciseCategorySectionLabel(exercise);
};

const groupExercisesIntoSections = (
  exercises: Exercise[],
  sortMode: ExerciseLibrarySortMode,
  favoriteExerciseIds: Set<string>,
) => {
  const sections = new Map<string, { label: string; exercises: Exercise[] }>();

  if (sortMode === "category" && favoriteExerciseIds.size > 0) {
    const favoriteExercises = exercises.filter((exercise) =>
      favoriteExerciseIds.has(exercise.id),
    );

    if (favoriteExercises.length > 0) {
      sections.set("favorites", {
        label: "Favorites",
        exercises: favoriteExercises,
      });
    }
  }

  exercises.forEach((exercise) => {
    const label = getExerciseSectionLabel(
      exercise,
      sortMode,
      favoriteExerciseIds,
    );
    if (!label.trim()) return;

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

type ExerciseLibrarySection = ReturnType<typeof groupExercisesIntoSections>[number];

const defaultOpenExerciseSectionKey = "lower body compound";

const getDefaultActiveExerciseSectionKey = (
  sections: ExerciseLibrarySection[],
) => {
  const favoriteSection = sections.find((section) => section.key === "favorites");
  const lowerBodyCompoundSection = sections.find(
    (section) => section.key === defaultOpenExerciseSectionKey,
  );
  const firstContentSection =
    sections.find((section) => section.key !== "favorites") || favoriteSection;

  return (
    lowerBodyCompoundSection?.key ||
    firstContentSection?.key ||
    favoriteSection?.key ||
    null
  );
};

const getFirstVisibleExerciseSectionKey = (
  sections: ExerciseLibrarySection[],
) => sections[0]?.key || null;

const getExerciseCoreMovementDisplayName = (exercise: Exercise) => {
  const metadata = getMetadataForExercise(exercise);
  const coreMovementPattern =
    typeof exercise.coreMovementPattern === "string" ? exercise.coreMovementPattern : "";

  return (
    metadata?.coreMovementLabel ||
    metadata?.movementPatternLabel ||
    (coreMovementPattern
      ? CORE_MOVEMENT_BY_ID[coreMovementPattern as CoreMovementId]?.label ||
        labelize(coreMovementPattern)
      : "") ||
    exercise.pattern ||
    exercise.name
  );
};

const normalizeExerciseCoreMovementTabKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "movement";

const getExerciseCoreMovementTabKey = (exercise: Exercise) => {
  const metadata = getMetadataForExercise(exercise);
  const coreMovementPattern =
    metadata?.coreMovementId ||
    (typeof exercise.coreMovementPattern === "string"
      ? exercise.coreMovementPattern
      : "");

  return normalizeExerciseCoreMovementTabKey(
    coreMovementPattern || getExerciseCoreMovementDisplayName(exercise),
  );
};

const getExerciseSectionCoreMovementTabs = (
  section: ExerciseLibrarySection,
) => {
  const coreMovementTabs: Array<{ key: string; label: string }> = [];
  const seenCoreMovements = new Set<string>();

  section.exercises.forEach((exercise) => {
    const coreMovementName = getExerciseCoreMovementDisplayName(exercise).trim();
    const coreMovementKey = getExerciseCoreMovementTabKey(exercise);

    if (!coreMovementName || seenCoreMovements.has(coreMovementKey)) return;

    seenCoreMovements.add(coreMovementKey);
    coreMovementTabs.push({
      key: coreMovementKey,
      label: coreMovementName,
    });
  });

  return coreMovementTabs;
};

type WeeklySetsSummary = {
  bodyRepsByLabel: Map<string, number>;
  bodySetsByLabel: Map<string, number>;
  bodyWeightVolumeByLabel: Map<string, number>;
  coreMovementSetsByKey: Map<string, number>;
  coreMovementWeightVolumeByKey: Map<string, number>;
  exerciseRepsById: Map<string, number>;
  exerciseSetsById: Map<string, number>;
  exerciseWeightVolumeById: Map<string, number>;
  latestSessionSetsByLabel: Map<string, number>;
  latestSessionSetsByLayer: Map<BodyRegionLayer, number>;
  latestSessionSetsBySectionKey: Map<string, number>;
  lastTrainedByLabel: Map<string, number>;
  lastTrainedByLayer: Map<BodyRegionLayer, number>;
  layerSetsById: Map<BodyRegionLayer, number>;
  layerWeightVolumeById: Map<BodyRegionLayer, number>;
  sectionSetsByKey: Map<string, number>;
  sectionWeightVolumeByKey: Map<string, number>;
};

const createExerciseStatLookup = (exercises: Exercise[]) => {
  const byId = new Map<string, Exercise>();
  const byName = new Map<string, Exercise>();

  exercises.forEach((exercise) => {
    byId.set(exercise.id, exercise);
    [
      exercise.name,
      exercise.exerciseName,
      exercise.generatedTitle,
      exercise.semanticVariationName,
      exercise.semanticVariation,
    ]
      .map(normalizeStatMatchValue)
      .filter(Boolean)
      .forEach((name) => {
        if (!byName.has(name)) byName.set(name, exercise);
      });
  });

  return { byId, byName };
};

const resolveStatExercise = (
  stat: LocalExerciseStatEntry,
  lookup: ReturnType<typeof createExerciseStatLookup>,
) => {
  const byIdMatch = lookup.byId.get(stat.exerciseId);
  if (byIdMatch) return byIdMatch;

  return (
    lookup.byName.get(normalizeStatMatchValue(stat.exerciseName)) ||
    lookup.byName.get(normalizeStatMatchValue(stat.generatedTitle)) ||
    lookup.byName.get(normalizeStatMatchValue(stat.semanticVariationName)) ||
    null
  );
};

const defaultWeeklySetGoalsBySectionLabel: Record<string, number> = {
  "arm isolation": 20,
  athletic: 16,
  "cervical isolation": 8,
  core: 24,
  favorites: 24,
  integrated: 16,
  "lower body compound": 40,
  "lower body isolation": 24,
  mobility: 14,
  "my exercises": 20,
  "upper pull": 32,
  "upper push": 32,
};

const defaultWeeklySetGoalsByRegionLayer: Record<BodyRegionLayer, number> = {
  Core: 24,
  Lower: 64,
  Upper: 64,
};

const defaultBodyPartWeeklySetGoal = 12;
const defaultCoreMovementWeeklySetGoal = 12;
const defaultExerciseWeeklySetGoal = 12;
const defaultMuscleWeeklySetGoal = 12;
const allBodyRegionWeeklySetGoal = Object.values(
  defaultWeeklySetGoalsByRegionLayer,
).reduce((total, goal) => total + goal, 0);

const normalizeWeeklySetGoalLabel = (label: string) =>
  label.trim().toLowerCase() === "integrated movement"
    ? "integrated"
    : label.trim().toLowerCase();

const getWeeklySetGoalForSection = (label: string) =>
  defaultWeeklySetGoalsBySectionLabel[normalizeWeeklySetGoalLabel(label)] || 20;

const getWeeklySetGoalForRegionLayer = (layer: BodyRegionLayer | null) =>
  layer ? defaultWeeklySetGoalsByRegionLayer[layer] : allBodyRegionWeeklySetGoal;

const getWeeklySetGoalForBodyPart = (body: string) =>
  normalizeBodySelectorValue(body) === "all"
    ? allBodyRegionWeeklySetGoal
    : defaultBodyPartWeeklySetGoal;

const getWeeklySetGoalForCoreMovement = () => defaultCoreMovementWeeklySetGoal;

const getWeeklySetGoalForExercise = () => defaultExerciseWeeklySetGoal;

const getWeeklySetGoalForMuscle = () => defaultMuscleWeeklySetGoal;

type WeeklyVolumeStatusId =
  | "undertrained"
  | "almost-there"
  | "trained"
  | "risk";

const weeklyVolumeStatusConfig: Record<
  WeeklyVolumeStatusId,
  { dotClass: string; label: string; ringClass: string }
> = {
  undertrained: {
    dotClass: "bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.55)]",
    label: "Undertrained",
    ringClass: "ring-rose-300/35",
  },
  "almost-there": {
    dotClass: "bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.55)]",
    label: "Almost there",
    ringClass: "ring-amber-200/35",
  },
  trained: {
    dotClass: "bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.55)]",
    label: "Trained",
    ringClass: "ring-emerald-200/35",
  },
  risk: {
    dotClass: "bg-fuchsia-300 shadow-[0_0_12px_rgba(240,171,252,0.58)]",
    label: "Risk of overtraining",
    ringClass: "ring-fuchsia-200/35",
  },
};

const getWeeklyVolumeStatusId = (sets: number): WeeklyVolumeStatusId => {
  const roundedSets = Math.max(0, Math.round(sets));
  if (roundedSets <= 3) return "undertrained";
  if (roundedSets <= 7) return "almost-there";
  if (roundedSets <= 18) return "trained";
  return "risk";
};

const getWeeklyVolumeStatus = (sets: number) =>
  weeklyVolumeStatusConfig[getWeeklyVolumeStatusId(sets)];

const getWeeklyVolumeProgressPercent = (sets: number) =>
  Math.min(100, Math.max(0, (Math.max(0, sets) / 18) * 100));

const getWeeklySetGoalProgressPercent = (sets: number, goal: number) => {
  const safeGoal = Math.max(1, goal);
  return Math.max(0, (Math.max(0, sets) / safeGoal) * 100);
};

const getWeeklySetGoalFillPercent = (sets: number, goal: number) =>
  Math.min(100, getWeeklySetGoalProgressPercent(sets, goal));

const getWeeklySetGoalStatusId = (
  sets: number,
  goal: number,
): WeeklyVolumeStatusId => {
  const progressPercent = getWeeklySetGoalProgressPercent(sets, goal);
  if (progressPercent <= 40) return "undertrained";
  if (progressPercent <= 74) return "almost-there";
  if (progressPercent <= 110) return "trained";
  return "risk";
};

function VolumeStatusIndicator({
  className = "",
  sets,
  statusId,
}: {
  className?: string;
  sets: number;
  statusId?: WeeklyVolumeStatusId;
}) {
  const resolvedStatusId = statusId || getWeeklyVolumeStatusId(sets);
  const status = weeklyVolumeStatusConfig[resolvedStatusId];

  return (
    <span
      aria-label={status.label}
      data-volume-status={resolvedStatusId}
      className={`exercise-library-volume-status-indicator inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-black/25 ring-1 ${status.ringClass} ${className}`}
      title={status.label}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`} />
    </span>
  );
}

function WeightVolumeStat({
  className = "",
  comparisonLabel = "",
  targetVolume = 0,
  volume,
  weightUnit,
}: {
  className?: string;
  comparisonLabel?: string;
  targetVolume?: number;
  volume: number;
  weightUnit: WeightUnit;
}) {
  const safeVolume = Math.max(0, volume);
  const hasTarget = targetVolume > 0;
  const volumeLabel = formatWeightMetric(safeVolume, weightUnit, {
    compact: true,
    volume: true,
  });
  const targetLabel =
    hasTarget &&
    formatWeightMetric(targetVolume, weightUnit, {
      compact: true,
      volume: true,
    });
  const displayLabel = safeVolume > 0
    ? targetLabel
      ? `${volumeLabel} / ${targetLabel} volume`
      : `${volumeLabel} volume`
    : "No loaded range yet";

  return (
    <span
      className={`exercise-library-weight-volume-stat ${className}`}
      title={
        comparisonLabel
          ? `Weight volume: ${displayLabel}. ${comparisonLabel}`
          : `Weight volume: ${displayLabel}`
      }
    >
      <span className="text-[var(--exercise-theme-text)]">Weight Volume</span>
      <span>{displayLabel}</span>
      {comparisonLabel && safeVolume > 0 ? <span>{comparisonLabel}</span> : null}
    </span>
  );
}

type CooldownCounterSummary = {
  detail: string;
  fillPercent: number;
  label: string;
  remainingMs: number;
  sessionSets: number;
  totalHours: number;
};

const getCooldownHoursFromSessionDose = (
  sessionSetsCompleted: number,
  weeklySetGoal: number,
) => {
  const safeGoal = Math.max(1, weeklySetGoal);
  const sessionVolumeRatio = Math.max(0, sessionSetsCompleted) / safeGoal;
  return Math.min(48, Math.max(0, (sessionVolumeRatio / 0.5) * 48));
};

const formatCooldownRemainingLabel = (remainingMs: number) => {
  if (remainingMs <= 0) return "Ready";

  const remainingHours = Math.max(1, Math.ceil(remainingMs / (60 * 60 * 1000)));
  const days = Math.floor(remainingHours / 24);
  const hours = remainingHours % 24;

  if (days > 0 && hours > 0) return `Cooldown: ${days}d ${hours}h left`;
  if (days > 0) return `Cooldown: ${days}d left`;
  return `Cooldown: ${remainingHours}h left`;
};

const getCooldownCounterSummary = ({
  lastTrainedTime,
  sessionSetsCompleted,
  weeklySetGoal,
}: {
  lastTrainedTime: number;
  sessionSetsCompleted: number;
  weeklySetGoal: number;
}): CooldownCounterSummary => {
  const safeSessionSets = Math.max(0, sessionSetsCompleted);
  const cooldownHours = getCooldownHoursFromSessionDose(
    safeSessionSets,
    weeklySetGoal,
  );

  if (!lastTrainedTime || safeSessionSets <= 0 || cooldownHours <= 0) {
    return {
      detail: "No recent sets",
      fillPercent: 0,
      label: "Ready",
      remainingMs: 0,
      sessionSets: safeSessionSets,
      totalHours: 0,
    };
  }

  const cooldownMs = cooldownHours * 60 * 60 * 1000;
  const elapsedMs = Math.max(0, Date.now() - lastTrainedTime);
  const remainingMs = Math.max(0, cooldownMs - elapsedMs);
  const fillPercent =
    cooldownMs > 0 ? Math.min(100, (remainingMs / cooldownMs) * 100) : 0;
  const label =
    remainingMs <= 0
      ? "Ready"
      : elapsedMs < 12 * 60 * 60 * 1000
        ? "Trained today"
        : formatCooldownRemainingLabel(remainingMs);

  return {
    detail:
      remainingMs <= 0
        ? "Cooldown complete"
        : formatCooldownRemainingLabel(remainingMs),
    fillPercent,
    label,
    remainingMs,
    sessionSets: safeSessionSets,
    totalHours: cooldownHours,
  };
};

function CooldownCounterBar({
  className = "",
  summary,
}: {
  className?: string;
  summary: CooldownCounterSummary;
}) {
  const cooldownStyle = {
    "--exercise-cooldown-progress": `${summary.fillPercent}%`,
  } as ExerciseLibraryThemeCssVariables;

  return (
    <span
      className={`exercise-library-cooldown-counter ${className}`}
      data-ready={summary.remainingMs <= 0 ? "true" : "false"}
      style={cooldownStyle}
      title={`2-Day Cooldown Counter. Latest session dose: ${Math.max(
        0,
        Math.round(summary.sessionSets),
      )} sets. ${summary.detail}`}
    >
      <span aria-hidden="true" className="exercise-library-cooldown-counter__track">
        <span className="exercise-library-cooldown-counter__fill" />
      </span>
      <span className="exercise-library-cooldown-counter__text">
        {summary.label}
      </span>
    </span>
  );
}

function WeeklySetGoalBadge({
  className = "",
  completedSets,
  completedReps = 0,
  completedWeightVolume = 0,
  goalSets,
  rangeLabel = formatWeeklyVolumeRangeLabel(),
  showReps = false,
  showWeightVolume = false,
  weightUnit = "lbs",
}: {
  className?: string;
  completedSets: number;
  completedReps?: number;
  completedWeightVolume?: number;
  goalSets: number;
  rangeLabel?: string;
  showReps?: boolean;
  showWeightVolume?: boolean;
  weightUnit?: WeightUnit;
}) {
  const roundedCompletedSets = Math.max(0, Math.round(completedSets));
  const roundedCompletedReps = Math.max(0, Math.round(completedReps));
  const roundedGoalSets = Math.max(1, Math.round(goalSets));
  const statusId = getWeeklySetGoalStatusId(roundedCompletedSets, roundedGoalSets);
  const status = weeklyVolumeStatusConfig[statusId];
  const weightVolumeLabel = formatWeightMetric(
    completedWeightVolume,
    weightUnit,
    { compact: true, volume: true },
  );
  const repsLabel =
    showReps && roundedCompletedReps > 0
      ? ` - ${roundedCompletedReps.toLocaleString()} reps`
      : "";
  const shouldShowWeightVolume = showWeightVolume && Boolean(weightVolumeLabel);

  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      title={`${status.label}. Set volume, ${rangeLabel}: ${roundedCompletedSets} of ${roundedGoalSets} sets${repsLabel}${
        weightVolumeLabel ? ` - Weight volume: ${weightVolumeLabel}` : ""
      }`}
    >
      <VolumeStatusIndicator
        sets={roundedCompletedSets}
        statusId={statusId}
      />
      <span>
        {roundedCompletedSets} / {roundedGoalSets} sets
        {repsLabel}
      </span>
      {shouldShowWeightVolume ? (
        <span className="text-[0.92em] opacity-80">
          {weightVolumeLabel} volume
        </span>
      ) : null}
    </span>
  );
}

const formatLastTrainedBadge = (time: number) => {
  if (!time) return "fresh";

  const elapsedDays = Math.floor((Date.now() - time) / (24 * 60 * 60 * 1000));

  if (elapsedDays <= 0) return "today";
  if (elapsedDays === 1) return "1d ago";
  return `${elapsedDays}d ago`;
};

const getBodyTrainingSignal = (
  weeklySets: number,
  lastTrainedTime: number,
  weeklyGoal = defaultBodyPartWeeklySetGoal,
) => {
  const progressPercent = getWeeklySetGoalProgressPercent(weeklySets, weeklyGoal);
  if (progressPercent >= 75 && progressPercent <= 110) {
    return "Balanced this week";
  }
  if (progressPercent > 110) return "Above weekly target";
  if (weeklySets > 0) {
    return `${Math.max(0, Math.round(weeklySets))} / ${weeklyGoal} sets logged`;
  }
  if (lastTrainedTime) return "Needs attention";
  return "Fresh area";
};

const getLastTrainedForVolumeLabel = (
  lastTrainedMap: Map<string, number>,
  label: string,
) => {
  const directValue = lastTrainedMap.get(label);
  if (typeof directValue === "number") return directValue;

  const normalizedLabel = normalizeBodySelectorValue(label);
  for (const [mapLabel, value] of lastTrainedMap.entries()) {
    if (normalizeBodySelectorValue(mapLabel) === normalizedLabel) return value;
  }

  return 0;
};

const formatTrainingRecencyLabel = (time: number) => {
  if (!time) return "No recent training logged";

  const elapsedDays = Math.floor((Date.now() - time) / (24 * 60 * 60 * 1000));
  if (elapsedDays <= 0) return "Last trained today";
  if (elapsedDays === 1) return "Last trained yesterday";
  return `Last trained ${elapsedDays}d ago`;
};

const getTrainingDayKey = (time: number) => {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const getTrainingStreakLabel = (stats: LocalExerciseStatEntry[]) => {
  const trainedDays = new Set(
    stats
      .map(getStatTime)
      .filter(Boolean)
      .map(getTrainingDayKey),
  );

  if (!trainedDays.size) return "No recent training logged";

  const latestTrainingDay = Math.max(...Array.from(trainedDays));
  const oneDay = 24 * 60 * 60 * 1000;
  let streakDays = 0;
  let cursor = latestTrainingDay;

  while (trainedDays.has(cursor)) {
    streakDays += 1;
    cursor -= oneDay;
  }

  return `${streakDays} ${streakDays === 1 ? "day" : "days"} streak`;
};

const getBodyPartButtonSizeClass = (body: string) => {
  const normalizedBody = normalizeBodySelectorValue(body);
  if (
    /\b(full body|legs?|glutes?|hips glutes|back|upper back|chest|shoulders?|posterior chain)\b/.test(
      normalizedBody,
    )
  ) {
    return "exercise-library-body-volume-button--large";
  }

  if (/\b(forearms?|calves?|neck|cervical|wrists?|tibialis|mobility)\b/.test(normalizedBody)) {
    return "exercise-library-body-volume-button--small";
  }

  return "exercise-library-body-volume-button--medium";
};

const buildWeeklySetsSummary = (
  stats: LocalExerciseStatEntry[],
  exercises: Exercise[],
): WeeklySetsSummary => {
  const lookup = createExerciseStatLookup(exercises);
  const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
  type LatestSessionDose = { latestTime: number; sessionKey: number; sets: number };
  const summary: WeeklySetsSummary = {
    bodyRepsByLabel: new Map(),
    bodySetsByLabel: new Map(),
    bodyWeightVolumeByLabel: new Map(),
    coreMovementSetsByKey: new Map(),
    coreMovementWeightVolumeByKey: new Map(),
    exerciseRepsById: new Map(),
    exerciseSetsById: new Map(),
    exerciseWeightVolumeById: new Map(),
    latestSessionSetsByLabel: new Map(),
    latestSessionSetsByLayer: new Map(),
    latestSessionSetsBySectionKey: new Map(),
    lastTrainedByLabel: new Map(),
    lastTrainedByLayer: new Map(),
    layerSetsById: new Map(),
    layerWeightVolumeById: new Map(),
    sectionSetsByKey: new Map(),
    sectionWeightVolumeByKey: new Map(),
  };
  const latestSessionDoseByLabel = new Map<string, LatestSessionDose>();
  const latestSessionDoseByLayer = new Map<BodyRegionLayer, LatestSessionDose>();
  const latestSessionDoseBySectionKey = new Map<string, LatestSessionDose>();
  const addToMap = (map: Map<string, number>, key: string, sets: number) => {
    if (!key || sets <= 0) return;
    map.set(key, (map.get(key) || 0) + sets);
  };
  const addLatestSessionDose = <T extends string>(
    map: Map<T, LatestSessionDose>,
    key: T,
    time: number,
    sets: number,
  ) => {
    if (!key || !time || sets <= 0) return;

    const sessionKey = getTrainingDayKey(time);
    const current = map.get(key);

    if (!current || sessionKey > current.sessionKey) {
      map.set(key, { latestTime: time, sessionKey, sets });
      return;
    }

    if (sessionKey === current.sessionKey) {
      current.sets += sets;
      current.latestTime = Math.max(current.latestTime, time);
    }
  };
  const addLatestToMap = <T extends string>(
    map: Map<T, number>,
    key: T,
    time: number,
  ) => {
    if (!key || !time) return;
    map.set(key, Math.max(map.get(key) || 0, time));
  };

  stats.forEach((stat) => {
    const statTime = getStatTime(stat);
    if (!statTime) return;

    const sets = parseStatNumber(stat.sets);
    if (sets <= 0) return;
    const completedReps = getStatCompletedReps(stat);
    const completedWeightVolume = getStatVolume(stat);

    const exercise = resolveStatExercise(stat, lookup);
    if (!exercise) return;

    const metadata = getMetadataForExercise(exercise);
    const bodyLabels = getExerciseVolumeBodyLabels(exercise, metadata);
    const sectionKey = getExerciseCategorySectionLabel(exercise).toLowerCase();

    bodyLabels.forEach((label) => {
      addLatestToMap(summary.lastTrainedByLabel, label, statTime);
      addLatestSessionDose(latestSessionDoseByLabel, label, statTime, sets);
    });
    bodyRegionLayerConfigs.forEach((layerConfig) => {
      if (!exerciseMatchesBodyRegionLayer(exercise, metadata, layerConfig.id)) {
        return;
      }

      addLatestToMap(summary.lastTrainedByLayer, layerConfig.id, statTime);
      addLatestSessionDose(
        latestSessionDoseByLayer,
        layerConfig.id,
        statTime,
        sets,
      );
      if (statTime >= cutoffTime) {
        const currentLayerSets = summary.layerSetsById.get(layerConfig.id) || 0;
        summary.layerSetsById.set(layerConfig.id, currentLayerSets + sets);
        const currentLayerWeightVolume =
          summary.layerWeightVolumeById.get(layerConfig.id) || 0;
        summary.layerWeightVolumeById.set(
          layerConfig.id,
          currentLayerWeightVolume + completedWeightVolume,
        );
      }
    });
    addLatestSessionDose(latestSessionDoseBySectionKey, sectionKey, statTime, sets);

    if (statTime < cutoffTime) return;

    addToMap(summary.exerciseSetsById, exercise.id, sets);
    addToMap(summary.exerciseRepsById, exercise.id, completedReps);
    addToMap(
      summary.exerciseWeightVolumeById,
      exercise.id,
      completedWeightVolume,
    );
    bodyLabels.forEach((label) =>
      addToMap(summary.bodySetsByLabel, label, sets),
    );
    bodyLabels.forEach((label) =>
      addToMap(summary.bodyRepsByLabel, label, completedReps),
    );
    bodyLabels.forEach((label) =>
      addToMap(summary.bodyWeightVolumeByLabel, label, completedWeightVolume),
    );
    addToMap(
      summary.sectionSetsByKey,
      sectionKey,
      sets,
    );
    addToMap(
      summary.sectionWeightVolumeByKey,
      sectionKey,
      completedWeightVolume,
    );
    addToMap(
      summary.coreMovementSetsByKey,
      getExerciseCoreMovementTabKey(exercise),
      sets,
    );
    addToMap(
      summary.coreMovementWeightVolumeByKey,
      getExerciseCoreMovementTabKey(exercise),
      completedWeightVolume,
    );
  });

  latestSessionDoseByLabel.forEach((dose, key) => {
    summary.latestSessionSetsByLabel.set(key, dose.sets);
  });
  latestSessionDoseByLayer.forEach((dose, key) => {
    summary.latestSessionSetsByLayer.set(key, dose.sets);
  });
  latestSessionDoseBySectionKey.forEach((dose, key) => {
    summary.latestSessionSetsBySectionKey.set(key, dose.sets);
  });

  return summary;
};

const getWeeklySetsForExercises = (
  exercises: Exercise[],
  exerciseSetsById: Map<string, number>,
) =>
  exercises.reduce(
    (total, exercise) => total + (exerciseSetsById.get(exercise.id) || 0),
    0,
  );

const getWeeklyWeightVolumeForExercises = (
  exercises: Exercise[],
  exerciseWeightVolumeById: Map<string, number>,
) =>
  exercises.reduce(
    (total, exercise) =>
      total + (exerciseWeightVolumeById.get(exercise.id) || 0),
    0,
  );

const getWeeklySetsForVolumeLabel = (
  volumeMap: Map<string, number>,
  label: string,
) => {
  const directValue = volumeMap.get(label);
  if (typeof directValue === "number") return directValue;

  const normalizedLabel = normalizeBodySelectorValue(label);
  const matchedEntry = Array.from(volumeMap.entries()).find(
    ([key]) => normalizeBodySelectorValue(key) === normalizedLabel,
  );

  return matchedEntry?.[1] || 0;
};

type LatestSetInsight = {
  addedReps: number;
  addedSets: number;
  achievementLine: string;
  bodyLabels: string[];
  coreMovementKey: string;
  exerciseId: string;
  exerciseName: string;
  goalLine: string;
  id: string;
  lastTrainedLine: string;
  latestLine: string;
  latestWeightPounds: number;
  latestWeightVolumePounds: number;
  layerIds: BodyRegionLayer[];
  primaryBodyLabel: string;
  pulseLabel: string;
  remainingLine: string;
  sectionKey: string;
  sectionLabel: string;
  summaryLine: string;
  timestamp: number;
};

const chooseLatestSetInsightBodyLabel = (labels: string[], fallback: string) => {
  const preferredPatterns = [
    /\bglutes?\b/i,
    /\blateral delts?\b/i,
    /\bmiddle deltoids?\b/i,
    /\bshoulders?\b/i,
  ];

  return (
    preferredPatterns
      .map((pattern) => labels.find((label) => pattern.test(label)))
      .find(Boolean) ||
    labels[0] ||
    fallback
  );
};

const buildLatestSetInsight = ({
  exercise,
  previousStats,
  previousWeeklySetsSummary,
  stat,
}: {
  exercise: Exercise;
  previousStats: LocalExerciseStatEntry[];
  previousWeeklySetsSummary: WeeklySetsSummary;
  stat: LocalExerciseStatEntry;
}): LatestSetInsight => {
  const metadata = getMetadataForExercise(exercise);
  const addedSets = parseStatNumber(stat.sets);
  const repsPerSet = parseStatNumber(stat.reps);
  const addedReps = getStatCompletedReps(stat);
  const weight = parseStatNumber(stat.weight);
  const bodyLabels = getExerciseVolumeBodyLabels(exercise, metadata);
  const primaryBodyLabel = chooseLatestSetInsightBodyLabel(
    bodyLabels,
    exercise.body,
  );
  const previousPrimaryBodySets = getWeeklySetsForVolumeLabel(
    previousWeeklySetsSummary.bodySetsByLabel,
    primaryBodyLabel,
  );
  const nextPrimaryBodySets = previousPrimaryBodySets + addedSets;
  const bodyWeeklyGoal = getWeeklySetGoalForBodyPart(primaryBodyLabel);
  const remainingSets = Math.max(
    0,
    Math.ceil(bodyWeeklyGoal - nextPrimaryBodySets),
  );
  const sectionLabel = getExerciseCategorySectionLabel(exercise) || "Exercise";
  const sectionKey = sectionLabel.toLowerCase();
  const previousExerciseStats = getExerciseStatHistory(
    previousStats,
    exercise,
    stat.generatedTitle ||
      stat.semanticVariationName ||
      exercise.generatedTitle ||
      exercise.name,
    metadata,
    stat.semanticVariationId || exercise.semanticVariationId,
  ).filter(isStatWithinTrailingSevenDays);
  const previousBestVolume = previousExerciseStats.reduce(
    (bestVolume, previousStat) =>
      Math.max(bestVolume, getStatVolume(previousStat)),
    0,
  );
  const newStatVolume = getStatVolume(stat);
  const isNewBestVolumeThisWeek =
    newStatVolume > 0 && newStatVolume > previousBestVolume;
  const layerIds = Array.from(
    new Set(
      bodyLabels
        .map((label) => getBodyRegionLayerForLabel(label))
        .filter((layer): layer is BodyRegionLayer => Boolean(layer)),
    ),
  );

  return {
    addedReps,
    addedSets,
    achievementLine: isNewBestVolumeThisWeek ? "New best volume this week" : "",
    bodyLabels,
    coreMovementKey: getExerciseCoreMovementTabKey(exercise),
    exerciseId: exercise.id,
    exerciseName: stat.generatedTitle || exercise.generatedTitle || exercise.name,
    goalLine: `Trailing 7 days - ${primaryBodyLabel}: ${Math.max(
      0,
      Math.round(nextPrimaryBodySets),
    )} / ${bodyWeeklyGoal} weekly sets`,
    id: `${exercise.id}-${stat.date}-${addedSets}-${addedReps}`,
    lastTrainedLine: "Last trained today",
    latestLine: `Latest: ${Math.max(0, Math.round(addedSets))} ${
      Math.round(addedSets) === 1 ? "set" : "sets"
    } - ${Math.max(0, Math.round(repsPerSet)) || "--"} reps`,
    latestWeightPounds: weight,
    latestWeightVolumePounds: newStatVolume,
    layerIds,
    primaryBodyLabel,
    pulseLabel: `+${Math.max(0, Math.round(addedSets))} ${
      Math.round(addedSets) === 1 ? "set" : "sets"
    }${addedReps > 0 ? ` / +${Math.round(addedReps)} reps` : ""}`,
    remainingLine:
      remainingSets > 0
        ? `${remainingSets} ${remainingSets === 1 ? "set" : "sets"} away from weekly goal`
        : "Weekly goal reached",
    sectionKey,
    sectionLabel,
    summaryLine: `+${Math.max(0, Math.round(addedSets))} ${
      Math.round(addedSets) === 1 ? "set" : "sets"
    } added to ${primaryBodyLabel} in trailing 7 days`,
    timestamp: Date.now(),
  };
};

const formatLatestSetInsightDisplayLine = (
  insight: LatestSetInsight,
  preferredWeightUnit: WeightUnit,
) => {
  const loadLabel = formatWeightMetric(
    insight.latestWeightPounds,
    preferredWeightUnit,
  );
  const volumeLabel = formatWeightMetric(
    insight.latestWeightVolumePounds,
    preferredWeightUnit,
    { compact: true, volume: true },
  );

  return [
    insight.latestLine,
    loadLabel ? `Load: ${loadLabel}` : "",
    volumeLabel ? `Weight volume: ${volumeLabel}` : "",
  ]
    .filter(Boolean)
    .join(" - ");
};

function ExerciseBodyAnatomySelector({
  activeLayer,
  bodyOptions,
  exercises,
  latestSetInsight,
  onBodySelect,
  onLayerSelect,
  onPopularExerciseSelect,
  preferredWeightUnit,
  selectedBodies,
  weeklyVolumeRangeLabel,
  weeklySetsSummary,
}: {
  activeLayer: BodyRegionLayer | null;
  bodyOptions: string[];
  exercises: Exercise[];
  latestSetInsight?: LatestSetInsight | null;
  onBodySelect: (body: string, layer: BodyRegionLayer) => void;
  onLayerSelect: (layer: BodyRegionLayer) => void;
  onPopularExerciseSelect: (exercise: Exercise) => void;
  preferredWeightUnit: WeightUnit;
  selectedBodies: string[];
  weeklyVolumeRangeLabel: string;
  weeklySetsSummary: WeeklySetsSummary;
}) {
  const [gender, setGender] = useState<ExerciseBodyFigureGender>("male");
  const anatomySelectorRef = useRef<HTMLDivElement | null>(null);
  const [activeAnatomyPopup, setActiveAnatomyPopup] = useState<{
    bodyOption: string;
    layer: BodyRegionLayer;
    pinned: boolean;
    slug: MuscleSlug;
  } | null>(null);
  const selectedBodySet = useMemo(
    () => new Set(selectedBodies.map(normalizeBodySelectorValue)),
    [selectedBodies],
  );
  const hasSelectedBodies = selectedBodySet.size > 0;
  const latestBodySet = useMemo(
    () =>
      new Set(
        (latestSetInsight?.bodyLabels || []).map(normalizeBodySelectorValue),
      ),
    [latestSetInsight],
  );
  const selectedBodyLabels = selectedBodies.length
    ? selectedBodies.join(" / ")
    : activeLayer || "All regions";
  const activeLayerWeeklySets = activeLayer
    ? weeklySetsSummary.layerSetsById.get(activeLayer) || 0
    : Array.from(weeklySetsSummary.exerciseSetsById.values()).reduce(
        (total, sets) => total + sets,
        0,
      );
  const activeLayerWeightVolume = activeLayer
    ? weeklySetsSummary.layerWeightVolumeById.get(activeLayer) || 0
    : Array.from(weeklySetsSummary.exerciseWeightVolumeById.values()).reduce(
        (total, volume) => total + volume,
        0,
      );
  const activeLayerWeightVolumeLabel = formatWeightMetric(
    activeLayerWeightVolume,
    preferredWeightUnit,
    { compact: true, volume: true },
  );
  const activeLayerWeeklyGoal = getWeeklySetGoalForRegionLayer(activeLayer);
  const activeLayerTheme =
    bodyRegionLayerConfigs.find((config) => config.id === activeLayer)?.theme ||
    getCategoryTheme("Integrated");
  const activeLayerVolumeStyle = {
    ...getCategoryThemeCssVariables(activeLayerTheme),
    "--exercise-layer-volume-progress": `${getWeeklySetGoalFillPercent(
      activeLayerWeeklySets,
      activeLayerWeeklyGoal,
    )}%`,
  } as ExerciseLibraryThemeCssVariables;
  const activeLayerLastTrained = activeLayer
    ? weeklySetsSummary.lastTrainedByLayer.get(activeLayer) || 0
    : Math.max(0, ...Array.from(weeklySetsSummary.lastTrainedByLayer.values()));
  const activeLayerLatestSessionSets = activeLayer
    ? weeklySetsSummary.latestSessionSetsByLayer.get(activeLayer) || 0
    : Math.max(
        0,
        ...Array.from(weeklySetsSummary.latestSessionSetsByLayer.values()),
      );
  const activeLayerCooldownSummary = getCooldownCounterSummary({
    lastTrainedTime: activeLayerLastTrained,
    sessionSetsCompleted: activeLayerLatestSessionSets,
    weeklySetGoal: activeLayerWeeklyGoal,
  });

  useEffect(() => {
    if (!activeAnatomyPopup) return;

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        anatomySelectorRef.current?.contains(target)
      ) {
        return;
      }

      setActiveAnatomyPopup(null);
    };
    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveAnatomyPopup(null);
      }
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [activeAnatomyPopup]);

  const showAnatomyPopup = (slug: MuscleSlug, pinned = false) => {
    const layer = exerciseAnatomySlugLayer[slug];
    const bodyOption =
      resolveAnatomySlugBodyOption(slug, bodyOptions) || labelize(slug);

    setActiveAnatomyPopup({
      bodyOption,
      layer,
      pinned,
      slug,
    });
  };

  const closeUnpinnedAnatomyPopup = () => {
    setActiveAnatomyPopup((current) =>
      current && !current.pinned ? null : current,
    );
  };

  const selectAnatomySlug = (slug: MuscleSlug) => {
    const layer = exerciseAnatomySlugLayer[slug];
    const bodyOption = resolveAnatomySlugBodyOption(slug, bodyOptions);

    showAnatomyPopup(slug, true);

    if (bodyOption) {
      onBodySelect(bodyOption, layer);
      return;
    }

    onLayerSelect(layer);
  };

  const anatomyPopupTheme =
    activeAnatomyPopup &&
    getBodyRegionTheme(activeAnatomyPopup.bodyOption || activeAnatomyPopup.layer);
  const anatomyPopupWeeklySets = activeAnatomyPopup
    ? getWeeklySetsForVolumeLabel(
        weeklySetsSummary.bodySetsByLabel,
        activeAnatomyPopup.bodyOption,
      ) ||
      weeklySetsSummary.layerSetsById.get(activeAnatomyPopup.layer) ||
      0
    : 0;
  const anatomyPopupWeeklyGoal = activeAnatomyPopup
    ? getWeeklySetGoalForBodyPart(activeAnatomyPopup.bodyOption) ||
      getWeeklySetGoalForRegionLayer(activeAnatomyPopup.layer)
    : defaultBodyPartWeeklySetGoal;
  const anatomyPopupLastTrained = activeAnatomyPopup
    ? getLastTrainedForVolumeLabel(
        weeklySetsSummary.lastTrainedByLabel,
        activeAnatomyPopup.bodyOption,
      ) ||
      weeklySetsSummary.lastTrainedByLayer.get(activeAnatomyPopup.layer) ||
      0
    : 0;
  const anatomyPopupLatestSessionSets = activeAnatomyPopup
    ? getWeeklySetsForVolumeLabel(
        weeklySetsSummary.latestSessionSetsByLabel,
        activeAnatomyPopup.bodyOption,
      ) ||
      weeklySetsSummary.latestSessionSetsByLayer.get(activeAnatomyPopup.layer) ||
      0
    : 0;
  const anatomyPopupCooldownSummary = getCooldownCounterSummary({
    lastTrainedTime: anatomyPopupLastTrained,
    sessionSetsCompleted: anatomyPopupLatestSessionSets,
    weeklySetGoal: anatomyPopupWeeklyGoal,
  });
  const anatomyPopupPopularExercises = activeAnatomyPopup
    ? getPopularExercisesForBodyRegion(activeAnatomyPopup.bodyOption, exercises)
    : [];
  const anatomyPopupStyle =
    anatomyPopupTheme &&
    ({
      ...getCategoryThemeCssVariables(anatomyPopupTheme),
      "--exercise-layer-volume-progress": `${getWeeklySetGoalFillPercent(
        anatomyPopupWeeklySets,
        anatomyPopupWeeklyGoal,
      )}%`,
    } as ExerciseLibraryThemeCssVariables);

  const bodyData = useMemo<readonly ExtendedBodyPart[]>(() => {
    return exerciseAnatomyBodySlugs.map((slug) => {
      const layer = exerciseAnatomySlugLayer[slug];
      const bodyOption = resolveAnatomySlugBodyOption(slug, bodyOptions);
      const visual = getExerciseAnatomySlugVisual(slug);
      const isSelected = Boolean(
        bodyOption &&
          selectedBodySet.has(normalizeBodySelectorValue(bodyOption)),
      );
      const isLatestPulse = Boolean(
        bodyOption && latestBodySet.has(normalizeBodySelectorValue(bodyOption)),
      );
      const isInActiveLayer = !activeLayer || layer === activeLayer;
      const isLayerContext = Boolean(activeLayer && layer === activeLayer);
      const shouldLiftLayer = isLayerContext && !hasSelectedBodies;
      const fill = isSelected
        ? visual.selectedFill
        : isLatestPulse
          ? visual.contextFill
        : shouldLiftLayer
          ? visual.contextFill
          : isInActiveLayer
            ? visual.baseFill
            : "rgba(15, 23, 42, 0.58)";

      return {
        slug: slug as Slug,
        color: fill,
        styles: {
          fill,
          opacity: isSelected || isLatestPulse ? 1 : isInActiveLayer ? (hasSelectedBodies ? 0.58 : 0.92) : 0.24,
          stroke: isSelected
            ? "#ffffff"
            : isLatestPulse
              ? visual.stroke
            : shouldLiftLayer
              ? visual.stroke
              : isInActiveLayer
                ? "rgba(226,232,240,0.34)"
              : "rgba(255,255,255,0.16)",
          strokeWidth: isSelected ? 2.15 : isLatestPulse ? 1.8 : shouldLiftLayer ? 1.45 : 0.72,
          filter: isLatestPulse
            ? `drop-shadow(0 0 12px ${visual.glow})`
            : undefined,
        },
      };
    });
  }, [activeLayer, bodyOptions, hasSelectedBodies, latestBodySet, selectedBodySet]);

  const handleBodyPartPress = (part: ExtendedBodyPart) => {
    if (!part.slug) return;

    const slug = part.slug as MuscleSlug;
    if (!exerciseAnatomyBodySlugs.includes(slug)) return;

    selectAnatomySlug(slug);
  };

  return (
    <div
      ref={anatomySelectorRef}
      className="relative grid gap-3 overflow-visible border-b border-cyan-100/10 p-2.5 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]"
    >
      <div className="relative overflow-hidden rounded-[24px] border border-cyan-100/14 bg-[radial-gradient(circle_at_50%_12%,rgba(34,211,238,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.86),rgba(2,6,23,0.76))] p-3 shadow-[0_18px_44px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.10)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(16,185,129,0.12),transparent_50%)]" />
        <div className="relative z-10 flex items-center justify-between gap-2">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200/80">
              Anatomy Select
            </p>
            <p className="mt-1 text-xs font-black text-white">
              {selectedBodyLabels}
            </p>
          </div>
          <div className="flex rounded-xl border border-white/10 bg-slate-950/42 p-0.5">
            {(["male", "female"] as ExerciseBodyFigureGender[]).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={gender === item}
                onClick={() => setGender(item)}
                className={`rounded-lg px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] transition ${
                  gender === item
                    ? "bg-emerald-300 text-slate-950"
                    : "text-slate-400 hover:bg-emerald-300/10 hover:text-emerald-100"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-10 mt-3 grid min-h-[248px] gap-2 rounded-[22px] border border-white/10 bg-slate-950/42 p-2 min-[520px]:grid-cols-2">
          {(["front", "back"] as const).map((figureSide) => (
            <div
              key={figureSide}
              className="exercise-library-anatomy-figure relative flex min-h-[232px] items-center justify-center overflow-hidden rounded-[18px] border border-white/10 bg-[radial-gradient(circle_at_50%_24%,rgba(255,255,255,0.08),transparent_34%),rgba(2,6,23,0.36)]"
              onClick={(event) => event.stopPropagation()}
            >
              <span className="pointer-events-none absolute left-2 top-2 rounded-lg border border-white/10 bg-slate-950/54 px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-slate-300">
                {figureSide}
              </span>
              <Body
                data={bodyData}
                side={figureSide}
                gender={gender}
                scale={0.72}
                colors={exerciseAnatomyColors}
                defaultFill="#1e293b"
                defaultStroke="rgba(255,255,255,0.18)"
                defaultStrokeWidth={0.6}
                border="rgba(255,255,255,0.24)"
                hiddenParts={["hair"]}
                onBodyPartPress={handleBodyPartPress}
              />
              {exerciseAnatomyBodySlugs.map((slug) => {
                const layer = exerciseAnatomySlugLayer[slug];
                const bodyOption =
                  resolveAnatomySlugBodyOption(slug, bodyOptions) ||
                  labelize(slug);
                const isLayerVisible = !activeLayer || activeLayer === layer;
                const weeklySets =
                  getWeeklySetsForVolumeLabel(
                    weeklySetsSummary.bodySetsByLabel,
                    bodyOption,
                  ) ||
                  weeklySetsSummary.layerSetsById.get(layer) ||
                  0;
                const weeklyGoal = getWeeklySetGoalForBodyPart(bodyOption);
                const statusId = getWeeklySetGoalStatusId(
                  weeklySets,
                  weeklyGoal,
                );
                const indicatorTheme = getBodyRegionTheme(bodyOption);
                const indicatorStyle = {
                  ...exerciseAnatomyIndicatorPositions[slug][figureSide],
                  ...getCategoryThemeCssVariables(indicatorTheme),
                } as CSSProperties;
                const isSelected =
                  selectedBodySet.has(normalizeBodySelectorValue(bodyOption)) ||
                  activeAnatomyPopup?.slug === slug;

                return (
                  <button
                    key={`${figureSide}-${slug}`}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`${bodyOption} anatomy region, ${Math.max(
                      0,
                      Math.round(weeklySets),
                    )} of ${weeklyGoal} sets`}
                    data-volume-status={statusId}
                    onClick={(event) => {
                      event.stopPropagation();
                      selectAnatomySlug(slug);
                    }}
                    onFocus={() => showAnatomyPopup(slug)}
                    onMouseEnter={() => showAnatomyPopup(slug)}
                    onMouseLeave={closeUnpinnedAnatomyPopup}
                    style={indicatorStyle}
                    title={`${bodyOption}: ${Math.max(
                      0,
                      Math.round(weeklySets),
                    )} / ${weeklyGoal} sets`}
                    className={`exercise-library-anatomy-indicator ${
                      isSelected ? "exercise-library-anatomy-indicator--active" : ""
                    } ${isLayerVisible ? "" : "opacity-35"}`}
                  >
                    <span className="sr-only">{bodyOption}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="grid content-start gap-2 rounded-[24px] border border-white/10 bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-200/75">
              Primary body layer
            </p>
            <p className="mt-1 text-xs font-bold text-slate-400">
              Tap the figure or choose a training layer.
            </p>
          </div>
          <div
            style={activeLayerVolumeStyle}
            className="exercise-library-layer-volume-card relative overflow-hidden rounded-xl border border-cyan-100/14 bg-cyan-300/10 px-2.5 py-1.5 text-right"
          >
            <span
              aria-hidden="true"
              className="exercise-library-layer-volume-card__fill"
            />
            <p className="relative z-10 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
              <WeeklySetGoalBadge
                completedSets={activeLayerWeeklySets}
                completedWeightVolume={activeLayerWeightVolume}
                goalSets={activeLayerWeeklyGoal}
                rangeLabel={weeklyVolumeRangeLabel}
                showWeightVolume={Boolean(activeLayerWeightVolumeLabel)}
                weightUnit={preferredWeightUnit}
              />
            </p>
            <p className="relative z-10 mt-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-slate-400">
              {formatLastTrainedBadge(activeLayerLastTrained)}
            </p>
            <CooldownCounterBar
              className="relative z-10 mt-1 justify-end"
              summary={activeLayerCooldownSummary}
            />
          </div>
        </div>

        <div className="rounded-[18px] border border-white/10 bg-slate-950/38 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/75">
            Training signal
          </p>
          <p className="mt-1 text-sm font-black text-white">
            {getBodyTrainingSignal(
              activeLayerWeeklySets,
              activeLayerLastTrained,
              activeLayerWeeklyGoal,
            )}
          </p>
          <p className="mt-1 text-[10px] font-bold text-slate-400">
            Uses logged set volume and weight volume from {weeklyVolumeRangeLabel}.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {bodyRegionLayerConfigs.map((layerConfig) => {
            const isActiveLayer = activeLayer === layerConfig.id;
            const isLatestLayerPulse = Boolean(
              latestSetInsight?.layerIds.includes(layerConfig.id),
            );
            const layerWeeklySets =
              weeklySetsSummary.layerSetsById.get(layerConfig.id) || 0;
            const layerWeightVolume =
              weeklySetsSummary.layerWeightVolumeById.get(layerConfig.id) || 0;
            const layerWeightVolumeLabel = formatWeightMetric(
              layerWeightVolume,
              preferredWeightUnit,
              { compact: true, volume: true },
            );
            const layerWeeklyGoal = getWeeklySetGoalForRegionLayer(
              layerConfig.id,
            );
            const layerLastTrained =
              weeklySetsSummary.lastTrainedByLayer.get(layerConfig.id) || 0;
            const layerLatestSessionSets =
              weeklySetsSummary.latestSessionSetsByLayer.get(layerConfig.id) || 0;
            const layerCooldownSummary = getCooldownCounterSummary({
              lastTrainedTime: layerLastTrained,
              sessionSetsCompleted: layerLatestSessionSets,
              weeklySetGoal: layerWeeklyGoal,
            });
            const layerStatusId = getWeeklySetGoalStatusId(
              layerWeeklySets,
              layerWeeklyGoal,
            );
            const layerVolumeStyle = {
              ...getCategoryThemeCssVariables(layerConfig.theme),
              "--exercise-layer-volume-progress": `${getWeeklySetGoalFillPercent(
                layerWeeklySets,
                layerWeeklyGoal,
              )}%`,
            } as ExerciseLibraryThemeCssVariables;
            return (
              <button
                key={layerConfig.id}
                type="button"
                aria-pressed={isActiveLayer}
                onClick={() => onLayerSelect(layerConfig.id)}
                style={layerVolumeStyle}
                title={`${layerConfig.title}. Set volume, ${weeklyVolumeRangeLabel}: ${Math.max(
                  0,
                  Math.round(layerWeeklySets),
                )} of ${layerWeeklyGoal} sets${
                  layerWeightVolumeLabel
                    ? ` - Weight volume: ${layerWeightVolumeLabel}`
                    : ""
                }, ${weeklyVolumeStatusConfig[layerStatusId].label}`}
                className={`exercise-library-layer-volume-card relative min-h-[78px] overflow-hidden rounded-[18px] border px-3 py-2 text-left transition duration-200 focus:outline-none focus:ring-2 focus:ring-white/25 ${
                  isLatestLayerPulse ? "exercise-library-volume-pulse" : ""
                } ${
                  isActiveLayer
                    ? `${layerConfig.theme.tabClass} scale-[1.01]`
                    : `${layerConfig.theme.pillClass} opacity-[0.78] hover:-translate-y-0.5 hover:opacity-100`
                }`}
              >
                <span
                  aria-hidden="true"
                  className="exercise-library-layer-volume-card__fill"
                />
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 ${layerConfig.theme.overlayClass} ${
                    isActiveLayer ? "opacity-55" : "opacity-25"
                  }`}
                />
                <span className="relative z-10 block">
                  <span className="block text-sm font-black uppercase tracking-[0.16em]">
                    {layerConfig.title}
                  </span>
                  <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.08em] opacity-72">
                    {layerConfig.helper}
                  </span>
                  <span className="mt-2 inline-flex rounded-lg border border-current/20 bg-black/15 px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em]">
                    <WeeklySetGoalBadge
                      completedSets={layerWeeklySets}
                      completedWeightVolume={layerWeightVolume}
                      goalSets={layerWeeklyGoal}
                      rangeLabel={weeklyVolumeRangeLabel}
                      showWeightVolume={Boolean(layerWeightVolumeLabel)}
                      weightUnit={preferredWeightUnit}
                    />
                  </span>
                  <span className="ml-1 mt-2 inline-flex rounded-lg border border-current/20 bg-black/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em]">
                    {formatLastTrainedBadge(layerLastTrained)}
                  </span>
                  <CooldownCounterBar
                    className="mt-2"
                    summary={layerCooldownSummary}
                  />
                  {isLatestLayerPulse ? (
                    <span className="ml-1 mt-2 inline-flex rounded-lg border border-white/20 bg-white/15 px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em]">
                      {latestSetInsight?.pulseLabel}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

      </div>
      {activeAnatomyPopup && anatomyPopupTheme && anatomyPopupStyle ? (
        <div
          style={anatomyPopupStyle}
          className="exercise-library-anatomy-popup absolute left-3 right-3 top-3 z-[120] max-h-[min(28rem,calc(100vh-2rem))] overflow-y-auto rounded-[24px] border border-white/14 bg-[radial-gradient(circle_at_12%_0%,var(--exercise-theme-accent-soft),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] p-3 shadow-[0_28px_88px_rgba(0,0,0,0.72),0_0_38px_var(--exercise-theme-glow),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl sm:left-auto sm:w-[22rem]"
          role="dialog"
          aria-label={`${activeAnatomyPopup.bodyOption} anatomy insight`}
        >
          <div className={`pointer-events-none absolute inset-x-4 top-0 h-px ${anatomyPopupTheme.accentClass}`} />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[var(--exercise-theme-text)]">
                Muscle insight
              </p>
              <h3 className="mt-1 text-lg font-black leading-6 text-white">
                {activeAnatomyPopup.bodyOption}
              </h3>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
                {activeAnatomyPopup.layer} body layer
              </p>
            </div>
            <button
              type="button"
              aria-label="Close muscle insight"
              onClick={() => setActiveAnatomyPopup(null)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-xs font-black text-slate-300 transition hover:border-white/24 hover:bg-white/[0.12] hover:text-white"
            >
              X
            </button>
          </div>

          <p className="mt-3 text-xs font-semibold leading-5 text-slate-300">
            {getAnatomyRegionDescription(
              activeAnatomyPopup.bodyOption,
              activeAnatomyPopup.slug,
            )}
          </p>

          <div className="exercise-library-layer-volume-card relative mt-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] p-3">
            <span
              aria-hidden="true"
              className="exercise-library-layer-volume-card__fill"
            />
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white">
                <WeeklySetGoalBadge
                  completedSets={anatomyPopupWeeklySets}
                  goalSets={anatomyPopupWeeklyGoal}
                  rangeLabel={weeklyVolumeRangeLabel}
                />
              </span>
              <span className="rounded-xl border border-white/10 bg-black/18 px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-slate-300">
                {formatTrainingRecencyLabel(anatomyPopupLastTrained)}
              </span>
              <CooldownCounterBar
                className="basis-full"
                summary={anatomyPopupCooldownSummary}
              />
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
              Popular
            </p>
            {anatomyPopupPopularExercises.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {anatomyPopupPopularExercises.map(({ exercise, title }) => (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => {
                      setActiveAnatomyPopup(null);
                      onPopularExerciseSelect(exercise);
                    }}
                    className={`exercise-library-logic-pill rounded-xl border px-2 py-1 text-left text-[9px] font-black uppercase tracking-[0.08em] transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/25 ${anatomyPopupTheme.pillClass}`}
                    title={`Open ${title}`}
                  >
                    {title}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs font-semibold text-slate-400">
                No mapped popular exercises yet.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const getExerciseSectionTheme = (
  section: ExerciseLibrarySection | undefined,
  sortMode: ExerciseLibrarySortMode,
) => {
  if (!section) return categoryThemeFallback;
  return sortMode === "body"
    ? getBodyRegionTheme(section.label)
    : getCategoryTheme(section.label);
};

const exerciseLibraryPageSelectorFallbackTheme: CategoryTheme = {
  surfaceClass:
    "bg-[linear-gradient(135deg,rgba(8,47,73,0.42),rgba(15,23,42,0.78),rgba(2,6,23,0.92))]",
  cardClass:
    "border-cyan-200/22 shadow-[0_18px_58px_rgba(0,0,0,0.38),0_0_30px_rgba(34,211,238,0.12),inset_0_1px_0_rgba(255,255,255,0.16)]",
  overlayClass:
    "bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_88%_16%,rgba(250,204,21,0.12),transparent_30%),linear-gradient(120deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0.035)_42%,transparent_74%)]",
  accentClass:
    "bg-gradient-to-r from-cyan-300/20 via-cyan-200/80 to-yellow-200/45",
  pillClass:
    "border-cyan-200/32 bg-cyan-300/14 text-cyan-50 shadow-[0_0_20px_rgba(34,211,238,0.15)]",
  hoverClass:
    "hover:border-cyan-100/34 hover:shadow-[0_26px_86px_rgba(0,0,0,0.50),0_0_36px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.20)]",
  tabClass:
    "bg-[linear-gradient(135deg,rgba(34,211,238,0.94),rgba(250,204,21,0.72))] text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.22),inset_0_1px_0_rgba(255,255,255,0.36)] ring-1 ring-cyan-100/55",
  tabHoverClass:
    "hover:bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(15,23,42,0.88))] hover:text-cyan-50 focus:ring-cyan-200/35",
};

const getExercisePageSelectorTheme = (sectionTheme: CategoryTheme) =>
  sectionTheme === categoryThemeFallback
    ? exerciseLibraryPageSelectorFallbackTheme
    : sectionTheme;

type TrainingIntelligenceStatCard = {
  detail?: string;
  weightVolume?: number;
  weightVolumeComparisonLabel?: string;
  weightVolumeTarget?: number;
  helper: string;
  id: string;
  onClick?: () => void;
  progressPercent?: number;
  pulse?: boolean;
  statusId?: WeeklyVolumeStatusId;
  theme: CategoryTheme;
  title?: string;
  value: string;
  label: string;
};

type TrainingIntelligenceShortcut = {
  active?: boolean;
  disabled?: boolean;
  helper?: string;
  id: string;
  label: string;
  onClick: () => void;
  theme: CategoryTheme;
  title?: string;
};

type TrainingLogicInsight = {
  detail: string;
  eyebrow: string;
  id: string;
  onClick?: () => void;
  statusId?: WeeklyVolumeStatusId;
  theme: CategoryTheme;
  title: string;
};

type TrainingLogicPanelId = "goal" | "stats" | "insights";

function TrainingLogicDropdownSection({
  accent,
  children,
  helper,
  id,
  isOpen,
  onOpen,
  status,
  title,
}: {
  accent: string;
  children: ReactNode;
  helper: string;
  id: TrainingLogicPanelId;
  isOpen: boolean;
  onOpen: (id: TrainingLogicPanelId) => void;
  status: string;
  title: string;
}) {
  return (
    <article
      className="exercise-library-training-dropdown rounded-[24px] border border-white/10 bg-slate-950/34 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]"
      data-open={isOpen ? "true" : "false"}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => {
          if (!isOpen) onOpen(id);
        }}
        className="exercise-library-training-dropdown__trigger flex w-full items-center justify-between gap-3 rounded-[24px] px-3 py-3 text-left transition hover:border-[var(--exercise-theme-border)] focus:outline-none focus:ring-2 focus:ring-white/18 sm:px-4"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--exercise-theme-text)]">
              {title}
            </span>
            <span className="rounded-xl border border-white/10 bg-white/[0.055] px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-slate-300">
              {status}
            </span>
          </span>
          <span className="mt-1 block text-xs font-semibold leading-5 text-slate-400">
            {helper}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="exercise-library-training-dropdown__chevron flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-sm font-black text-[var(--exercise-theme-text)]"
        >
          v
        </span>
      </button>
      <div className="exercise-library-training-dropdown__content">
        <div className="px-3 pb-3 sm:px-4 sm:pb-4">{children}</div>
      </div>
      <div
        aria-hidden="true"
        className={`exercise-library-training-dropdown__accent ${accent}`}
      />
    </article>
  );
}

function TrainingIntelligenceHeader({
  currentFocusLabel,
  goalLogic,
  insights,
  lastTrainedLabel,
  latestSetInsight,
  onPreferredWeightUnitChange,
  preferredWeightUnit,
  profileSummary,
  sectionTheme,
  shortcuts,
  statCards,
  trainingStreakLabel,
  weeklyGoalSets,
  weeklyWeightVolumeComparisonLabel,
  weeklyVolumeRangeLabel,
  weeklyWeightVolume,
  weeklyReps,
  weeklySets,
}: {
  currentFocusLabel: string;
  goalLogic: GoalLogicSummary;
  insights: TrainingLogicInsight[];
  lastTrainedLabel: string;
  latestSetInsight?: LatestSetInsight | null;
  onPreferredWeightUnitChange: (unit: WeightUnit) => void;
  preferredWeightUnit: WeightUnit;
  profileSummary: ExerciseLibraryProfileSummary;
  sectionTheme: CategoryTheme;
  shortcuts: TrainingIntelligenceShortcut[];
  statCards: TrainingIntelligenceStatCard[];
  trainingStreakLabel: string;
  weeklyGoalSets: number;
  weeklyWeightVolumeComparisonLabel: string;
  weeklyVolumeRangeLabel: string;
  weeklyWeightVolume: number;
  weeklyReps: number;
  weeklySets: number;
}) {
  const headerThemeStyle = {
    ...getCategoryThemeCssVariables(sectionTheme),
    "--training-intelligence-progress": `${getWeeklySetGoalFillPercent(
      weeklySets,
      weeklyGoalSets,
    )}%`,
  } as ExerciseLibraryThemeCssVariables;
  const weeklyStatusId = getWeeklySetGoalStatusId(weeklySets, weeklyGoalSets);
  const weeklyStatus = weeklyVolumeStatusConfig[weeklyStatusId];
  const roundedWeeklySets = Math.max(0, Math.round(weeklySets));
  const roundedWeeklyReps = Math.max(0, Math.round(weeklyReps));
  const [activeTrainingPanel, setActiveTrainingPanel] =
    useState<TrainingLogicPanelId>("goal");
  const openTrainingPanel = (panelId: TrainingLogicPanelId) => {
    setActiveTrainingPanel((current) =>
      current === panelId ? current : panelId,
    );
  };
  const weeklyGoalProgressPercent = Math.round(
    getWeeklySetGoalFillPercent(weeklySets, weeklyGoalSets),
  );
  const secondaryGoalLabel =
    profileSummary.secondaryGoal &&
    !/add profile details|no goal set/i.test(profileSummary.secondaryGoal)
      ? profileSummary.secondaryGoal
      : "";
  const bestPerformanceCard =
    statCards.find((card) =>
      /best|performance|load/i.test(
        `${card.id} ${card.label} ${card.helper} ${card.value}`,
      ),
    ) || null;
  const bodyVolumeCards = statCards.filter((card) =>
    /body|volume|muscle|category|undertrained|highest/i.test(
      `${card.id} ${card.label}`,
    ),
  );
  const renderTrainingStatCard = (card: TrainingIntelligenceStatCard) => {
    const cardStyle = {
      ...getCategoryThemeCssVariables(card.theme),
      "--training-stat-progress": `${
        typeof card.progressPercent === "number"
          ? Math.min(100, Math.max(0, card.progressPercent))
          : 0
      }%`,
    } as ExerciseLibraryThemeCssVariables;
    const content = (
      <>
        {typeof card.progressPercent === "number" ? (
          <span
            aria-hidden="true"
            className="exercise-library-training-stat-card__fill"
          />
        ) : null}
        <span className="relative z-10 flex items-start justify-between gap-2">
          <span className="min-w-0">
            <span className="block text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
              {card.label}
            </span>
            <span className="mt-1 block truncate text-sm font-black text-white">
              {card.value}
            </span>
            {typeof card.weightVolume === "number" ? (
              <WeightVolumeStat
                className="mt-2"
                comparisonLabel={card.weightVolumeComparisonLabel}
                targetVolume={card.weightVolumeTarget}
                volume={card.weightVolume}
                weightUnit={preferredWeightUnit}
              />
            ) : null}
            <span className="mt-1 block line-clamp-2 text-[10px] font-semibold leading-4 text-slate-400">
              {card.helper}
            </span>
          </span>
          {card.statusId ? (
            <VolumeStatusIndicator sets={0} statusId={card.statusId} />
          ) : null}
        </span>
        {card.detail ? (
          <span className="relative z-10 mt-2 block truncate text-[9px] font-black uppercase tracking-[0.1em] text-[var(--exercise-theme-text)]">
            {card.detail}
          </span>
        ) : null}
        {card.pulse ? (
          <span className="exercise-library-volume-added-chip relative z-10 mt-2 inline-flex">
            Updated
          </span>
        ) : null}
      </>
    );
    const className = `exercise-library-training-stat-card relative min-h-[116px] overflow-hidden rounded-[20px] border border-white/10 bg-slate-950/42 p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] transition hover:-translate-y-0.5 hover:border-white/22 hover:bg-white/[0.07] ${card.pulse ? "exercise-library-volume-pulse" : ""}`;

    return card.onClick ? (
      <button
        key={card.id}
        type="button"
        onClick={card.onClick}
        style={cardStyle}
        title={card.title || card.label}
        className={`${className} cursor-pointer`}
      >
        {content}
      </button>
    ) : (
      <div
        key={card.id}
        style={cardStyle}
        title={card.title || card.label}
        className={className}
      >
        {content}
      </div>
    );
  };
  return (
    <section
      style={headerThemeStyle}
      className={`exercise-library-training-intelligence relative overflow-hidden rounded-[30px] border p-3 shadow-[0_28px_90px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl backdrop-saturate-150 sm:p-4 lg:p-5 ${sectionTheme.surfaceClass} ${sectionTheme.cardClass}`}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 ${sectionTheme.overlayClass} opacity-70`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 h-px ${sectionTheme.accentClass}`}
      />

      <div className="relative z-10 grid gap-3">
        <TrainingLogicDropdownSection
          accent={sectionTheme.accentClass}
          helper="Primary training target, weekly progress, and goal-specific direction."
          id="goal"
          isOpen={activeTrainingPanel === "goal"}
          onOpen={openTrainingPanel}
          status={`${weeklyGoalProgressPercent}%`}
          title="Goal"
        >
          <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="exercise-library-goal-engine rounded-[22px] border border-white/10 bg-white/[0.045] p-3">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[var(--exercise-theme-text)]">
                Primary Goal
              </p>
              <h2 className="mt-1 text-2xl font-black leading-7 text-white">
                {goalLogic.primaryGoalLabel}
              </h2>
              {secondaryGoalLabel ? (
                <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-slate-300">
                  Secondary: {secondaryGoalLabel}
                </p>
              ) : null}
              <p className="mt-3 text-xs font-semibold leading-5 text-slate-300">
                {goalLogic.goalCue}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="exercise-library-logic-chip rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2">
                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Suggested Focus
                  </p>
                  <p className="mt-0.5 text-[11px] font-black leading-4 text-white">
                    {currentFocusLabel}
                  </p>
                </div>
                <div className="exercise-library-logic-chip rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2">
                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Guidance
                  </p>
                  <p className="mt-0.5 text-[11px] font-black leading-4 text-white">
                    {goalLogic.emphasisLabel}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={ROUTES.dashboard.profile}
                  className="exercise-library-logic-pill rounded-2xl border border-cyan-100/22 bg-cyan-300/12 px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-100/50 hover:bg-cyan-300 hover:text-slate-950"
                >
                  Edit Preferences
                </a>
                <a
                  href={ROUTES.dashboard.progressGoals}
                  className="exercise-library-logic-pill rounded-2xl border border-emerald-100/20 bg-emerald-300/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-100 transition hover:-translate-y-0.5 hover:border-emerald-100/45 hover:bg-emerald-300 hover:text-slate-950"
                >
                  Edit Goals
                </a>
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Weekly Goal Progress
                  </p>
                  <p className="mt-1 text-lg font-black text-white">
                    {roundedWeeklySets} / {weeklyGoalSets} sets
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-100 ring-1 ${weeklyStatus.ringClass}`}
                  title={weeklyStatus.label}
                >
                  <VolumeStatusIndicator
                    sets={roundedWeeklySets}
                    statusId={weeklyStatusId}
                  />
                  {weeklyStatus.label}
                </span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/24">
                <div className="exercise-library-training-intelligence__weekly-fill h-full rounded-full transition-all duration-500 ease-out" />
              </div>
              <div className="mt-3 grid gap-2">
                {[
                  ["Stimulus", goalLogic.stimulusLabel],
                  ["Forecast", goalLogic.forecastLabel],
                  ["Recovery", goalLogic.recoveryRiskLabel],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="exercise-library-logic-chip rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2"
                  >
                    <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">
                      {label}
                    </p>
                    <p className="mt-0.5 text-[11px] font-black leading-4 text-white">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TrainingLogicDropdownSection>

        <TrainingLogicDropdownSection
          accent={sectionTheme.accentClass}
          helper="Weekly volume, recent logs, best performance, and body/category summaries."
          id="stats"
          isOpen={activeTrainingPanel === "stats"}
          onOpen={openTrainingPanel}
          status={`${roundedWeeklySets}/${weeklyGoalSets}`}
          title="Stats"
        >
          <div className="grid gap-3 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                Weekly Summary
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="exercise-library-logic-chip rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2">
                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Sets
                  </p>
                  <p className="mt-0.5 text-sm font-black text-white">
                    {roundedWeeklySets} / {weeklyGoalSets}
                  </p>
                </div>
                <div className="exercise-library-logic-chip rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2">
                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Reps
                  </p>
                  <p className="mt-0.5 text-sm font-black text-white">
                    {roundedWeeklyReps.toLocaleString()}
                  </p>
                </div>
              </div>
              <WeightVolumeStat
                className="mt-3"
                comparisonLabel={weeklyWeightVolumeComparisonLabel}
                volume={weeklyWeightVolume}
                weightUnit={preferredWeightUnit}
              />
              <p className="mt-2 text-xs font-semibold text-slate-400">
                {weeklyVolumeRangeLabel} · {lastTrainedLabel}
              </p>
              {latestSetInsight ? (
                <div className="mt-3 rounded-2xl border border-emerald-200/18 bg-emerald-300/10 px-3 py-2 text-xs font-bold text-emerald-50">
                  <p className="font-black uppercase tracking-[0.12em]">
                    Most Recent Set
                  </p>
                  <p className="mt-1 line-clamp-2">
                    {latestSetInsight.exerciseName} -{" "}
                    {formatLatestSetInsightDisplayLine(
                      latestSetInsight,
                      preferredWeightUnit,
                    )}
                  </p>
                </div>
              ) : (
                <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-semibold text-slate-400">
                  No recent workout logged yet.
                </p>
              )}
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.045] p-1">
                <p className="px-2 pb-1 pt-1 text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">
                  Preferred Weight Unit
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {(["lbs", "kg"] as WeightUnit[]).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      aria-pressed={preferredWeightUnit === unit}
                      onClick={() => onPreferredWeightUnitChange(unit)}
                      className={`rounded-xl px-2 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] transition ${
                        preferredWeightUnit === unit
                          ? "bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.24)]"
                          : "text-slate-400 hover:bg-white/[0.07] hover:text-white"
                      }`}
                    >
                      {unit === "lbs" ? "Pounds / lbs" : "Kilograms / kg"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {statCards.map(renderTrainingStatCard)}
            </div>
          </div>
          {bestPerformanceCard ? (
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Best recent performance: {bestPerformanceCard.value} ·{" "}
              {bestPerformanceCard.helper}
            </p>
          ) : null}
          {bodyVolumeCards.length ? (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Body/category volume summaries are represented in the stat tiles
              above.
            </p>
          ) : null}
        </TrainingLogicDropdownSection>

        <TrainingLogicDropdownSection
          accent={sectionTheme.accentClass}
          helper="Forecasts, recovery signals, undertrained areas, and next useful moves."
          id="insights"
          isOpen={activeTrainingPanel === "insights"}
          onOpen={openTrainingPanel}
          status={currentFocusLabel}
          title="Insights"
        >
          <div className="grid gap-3 xl:grid-cols-[1fr_1fr]">
            <div className="grid gap-2">
              {[
                ["Future Load Capacity", goalLogic.futureLoadCapacityLabel],
                ["Training Stimulus", goalLogic.stimulusLabel],
                ["Recovery / Cooldown", goalLogic.recoveryRiskLabel],
                ["Suggested Next Focus", currentFocusLabel],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="exercise-library-logic-chip rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2"
                >
                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">
                    {label}
                  </p>
                  <p className="mt-0.5 text-[11px] font-black leading-4 text-white">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-2">
              {insights.map((insight) => {
                const insightStyle = getCategoryThemeCssVariables(insight.theme);
                const content = (
                  <>
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-2 left-0 w-1 rounded-full bg-[var(--exercise-theme-accent)] shadow-[0_0_18px_var(--exercise-theme-glow)]"
                    />
                    <span className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.14em] text-[var(--exercise-theme-text)]">
                      {insight.statusId ? (
                        <VolumeStatusIndicator
                          sets={0}
                          statusId={insight.statusId}
                        />
                      ) : null}
                      {insight.eyebrow}
                    </span>
                    <span className="mt-1 block text-sm font-black text-white">
                      {insight.title}
                    </span>
                    <span className="mt-1 block text-[11px] font-semibold leading-4 text-slate-400">
                      {insight.detail}
                    </span>
                  </>
                );
                const className =
                  "relative rounded-2xl border border-white/10 bg-white/[0.045] py-2.5 pl-3.5 pr-3 text-left transition hover:-translate-y-0.5 hover:border-[var(--exercise-theme-border)] hover:bg-[var(--exercise-theme-accent-soft)]";

                return insight.onClick ? (
                  <button
                    key={insight.id}
                    type="button"
                    onClick={insight.onClick}
                    style={insightStyle}
                    className={`${className} cursor-pointer`}
                  >
                    {content}
                  </button>
                ) : (
                  <div
                    key={insight.id}
                    style={insightStyle}
                    className={className}
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {shortcuts.map((shortcut) => {
              const shortcutStyle = getCategoryThemeCssVariables(shortcut.theme);

              return (
                <button
                  key={shortcut.id}
                  type="button"
                  disabled={shortcut.disabled}
                  onClick={shortcut.onClick}
                  style={shortcutStyle}
                  title={shortcut.title || shortcut.helper || shortcut.label}
                  className={`exercise-library-training-shortcut relative min-h-[34px] overflow-hidden rounded-xl border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] transition ${
                    shortcut.active
                      ? "border-[var(--exercise-theme-border)] bg-[var(--exercise-theme-accent-soft)] text-[var(--exercise-theme-text)] shadow-[0_0_22px_var(--exercise-theme-glow)]"
                      : "border-white/10 bg-white/[0.045] text-slate-300 hover:-translate-y-0.5 hover:border-[var(--exercise-theme-border)] hover:text-white"
                  } disabled:cursor-not-allowed disabled:opacity-35`}
                >
                  <span
                    aria-hidden="true"
                    className="exercise-library-training-shortcut__fill"
                  />
                  <span className="relative z-10">{shortcut.label}</span>
                </button>
              );
            })}
            <a
              href={ROUTES.dashboard.stats}
              className="exercise-library-logic-pill rounded-xl border border-cyan-100/18 bg-cyan-300/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100 transition hover:-translate-y-0.5 hover:bg-cyan-300 hover:text-slate-950"
            >
              Open Stats Dashboard
            </a>
          </div>
        </TrainingLogicDropdownSection>
      </div>

      <div className="hidden">
        <div className="exercise-library-goal-engine rounded-[24px] border border-white/10 bg-slate-950/38 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.11)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[var(--exercise-theme-text)]">
                Goal Logic Engine
              </p>
              <h2 className="mt-1 text-2xl font-black leading-7 text-white">
                {goalLogic.primaryGoalLabel}
              </h2>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-300">
                {goalLogic.goalCue}
              </p>
            </div>
            <a
              href={ROUTES.dashboard.stats}
              className="exercise-library-logic-pill rounded-2xl border border-cyan-100/22 bg-cyan-300/12 px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-100/50 hover:bg-cyan-300 hover:text-slate-950"
            >
              View Stats
            </a>
          </div>

          <div className="mt-3 grid gap-2">
            {[
              ["Emphasis", goalLogic.emphasisLabel],
              ["Status", trainingStreakLabel],
              ["Next focus", currentFocusLabel],
              ["Load capacity", goalLogic.futureLoadCapacityLabel],
              ["Stimulus", goalLogic.stimulusLabel],
              ["Forecast", goalLogic.forecastLabel],
              ["Recovery", goalLogic.recoveryRiskLabel],
            ].map(([label, value]) => (
              <div
                key={label}
                className="exercise-library-logic-chip rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2"
              >
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">
                  {label}
                </p>
                <p className="mt-0.5 text-[11px] font-black leading-4 text-white">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.045] p-1">
            <p className="px-2 pb-1 pt-1 text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">
              Preferred Weight Unit
            </p>
            <div className="grid grid-cols-2 gap-1">
              {(["lbs", "kg"] as WeightUnit[]).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  aria-pressed={preferredWeightUnit === unit}
                  onClick={() => onPreferredWeightUnitChange(unit)}
                  className={`rounded-xl px-2 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] transition ${
                    preferredWeightUnit === unit
                      ? "bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.24)]"
                      : "text-slate-400 hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  {unit === "lbs" ? "Pounds / lbs" : "Kilograms / kg"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-[24px] border border-white/10 bg-slate-950/36 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.11)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Weekly Volume Command
                </p>
                <h3 className="mt-1 text-lg font-black text-white">
                  {roundedWeeklySets} / {weeklyGoalSets} sets
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  {weeklyVolumeRangeLabel} - {roundedWeeklyReps.toLocaleString()} reps
                  logged - {lastTrainedLabel}
                </p>
                <WeightVolumeStat
                  className="mt-2"
                  comparisonLabel={weeklyWeightVolumeComparisonLabel}
                  volume={weeklyWeightVolume}
                  weightUnit={preferredWeightUnit}
                />
              </div>
              <span
                className={`inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-100 ring-1 ${weeklyStatus.ringClass}`}
                title={weeklyStatus.label}
              >
                <VolumeStatusIndicator
                  sets={roundedWeeklySets}
                  statusId={weeklyStatusId}
                />
                {weeklyStatus.label}
              </span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/24">
              <div className="exercise-library-training-intelligence__weekly-fill h-full rounded-full transition-all duration-500 ease-out" />
            </div>
            {latestSetInsight ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200/18 bg-emerald-300/10 px-3 py-2 text-xs font-bold text-emerald-50">
                <span className="font-black uppercase tracking-[0.12em]">
                  Latest:
                </span>
                <span className="min-w-0 truncate">
                  {latestSetInsight.exerciseName} -{" "}
                  {formatLatestSetInsightDisplayLine(
                    latestSetInsight,
                    preferredWeightUnit,
                  )}
                </span>
                <span className="exercise-library-volume-added-chip">
                  {latestSetInsight.pulseLabel}
                </span>
              </div>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => {
              const cardStyle = {
                ...getCategoryThemeCssVariables(card.theme),
                "--training-stat-progress": `${
                  typeof card.progressPercent === "number"
                    ? Math.min(100, Math.max(0, card.progressPercent))
                    : 0
                }%`,
              } as ExerciseLibraryThemeCssVariables;
              const content = (
                <>
                  {typeof card.progressPercent === "number" ? (
                    <span
                      aria-hidden="true"
                      className="exercise-library-training-stat-card__fill"
                    />
                  ) : null}
                  <span className="relative z-10 flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                        {card.label}
                      </span>
                      <span className="mt-1 block truncate text-sm font-black text-white">
                        {card.value}
                      </span>
                      {typeof card.weightVolume === "number" ? (
                        <WeightVolumeStat
                          className="mt-2"
                          comparisonLabel={card.weightVolumeComparisonLabel}
                          targetVolume={card.weightVolumeTarget}
                          volume={card.weightVolume}
                          weightUnit={preferredWeightUnit}
                        />
                      ) : null}
                      <span className="mt-1 block line-clamp-2 text-[10px] font-semibold leading-4 text-slate-400">
                        {card.helper}
                      </span>
                    </span>
                    {card.statusId ? (
                      <VolumeStatusIndicator sets={0} statusId={card.statusId} />
                    ) : null}
                  </span>
                  {card.detail ? (
                    <span className="relative z-10 mt-2 block truncate text-[9px] font-black uppercase tracking-[0.1em] text-[var(--exercise-theme-text)]">
                      {card.detail}
                    </span>
                  ) : null}
                  {card.pulse ? (
                    <span className="exercise-library-volume-added-chip relative z-10 mt-2 inline-flex">
                      Updated
                    </span>
                  ) : null}
                </>
              );
              const className = `exercise-library-training-stat-card relative min-h-[116px] overflow-hidden rounded-[20px] border border-white/10 bg-slate-950/42 p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] transition hover:-translate-y-0.5 hover:border-white/22 hover:bg-white/[0.07] ${card.pulse ? "exercise-library-volume-pulse" : ""}`;

              return card.onClick ? (
                <button
                  key={card.id}
                  type="button"
                  onClick={card.onClick}
                  style={cardStyle}
                  title={card.title || card.label}
                  className={`${className} cursor-pointer`}
                >
                  {content}
                </button>
              ) : (
                <div
                  key={card.id}
                  style={cardStyle}
                  title={card.title || card.label}
                  className={className}
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-[24px] border border-white/10 bg-slate-950/38 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.11)]">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Quick Navigation
                </p>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  Jump to the next useful shelf.
                </p>
              </div>
              <span className={`rounded-xl border px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${sectionTheme.pillClass}`}>
                {currentFocusLabel}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {shortcuts.map((shortcut) => {
                const shortcutStyle = getCategoryThemeCssVariables(
                  shortcut.theme,
                );

                return (
                  <button
                    key={shortcut.id}
                    type="button"
                    disabled={shortcut.disabled}
                    onClick={shortcut.onClick}
                    style={shortcutStyle}
                    title={shortcut.title || shortcut.helper || shortcut.label}
                    className={`exercise-library-training-shortcut relative min-h-[34px] overflow-hidden rounded-xl border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] transition ${
                      shortcut.active
                        ? "border-[var(--exercise-theme-border)] bg-[var(--exercise-theme-accent-soft)] text-[var(--exercise-theme-text)] shadow-[0_0_22px_var(--exercise-theme-glow)]"
                        : "border-white/10 bg-white/[0.045] text-slate-300 hover:-translate-y-0.5 hover:border-[var(--exercise-theme-border)] hover:text-white"
                    } disabled:cursor-not-allowed disabled:opacity-35`}
                  >
                    <span
                      aria-hidden="true"
                      className="exercise-library-training-shortcut__fill"
                    />
                    <span className="relative z-10">{shortcut.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-slate-950/38 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.11)]">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Coach Insight
                </p>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  Based on logged weekly volume.
                </p>
              </div>
              <span className="rounded-xl border border-white/10 bg-white/[0.055] px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-slate-300">
                Live logic
              </span>
            </div>

            <div className="mt-3 grid gap-2">
              {insights.map((insight) => {
                const insightStyle = getCategoryThemeCssVariables(insight.theme);
                const content = (
                  <>
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-2 left-0 w-1 rounded-full bg-[var(--exercise-theme-accent)] shadow-[0_0_18px_var(--exercise-theme-glow)]"
                    />
                    <span className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.14em] text-[var(--exercise-theme-text)]">
                      {insight.statusId ? (
                        <VolumeStatusIndicator
                          sets={0}
                          statusId={insight.statusId}
                        />
                      ) : null}
                      {insight.eyebrow}
                    </span>
                    <span className="mt-1 block text-sm font-black text-white">
                      {insight.title}
                    </span>
                    <span className="mt-1 block text-[11px] font-semibold leading-4 text-slate-400">
                      {insight.detail}
                    </span>
                  </>
                );
                const className =
                  "relative rounded-2xl border border-white/10 bg-white/[0.045] py-2.5 pl-3.5 pr-3 text-left transition hover:-translate-y-0.5 hover:border-[var(--exercise-theme-border)] hover:bg-[var(--exercise-theme-accent-soft)]";

                return insight.onClick ? (
                  <button
                    key={insight.id}
                    type="button"
                    onClick={insight.onClick}
                    style={insightStyle}
                    className={`${className} cursor-pointer`}
                  >
                    {content}
                  </button>
                ) : (
                  <div
                    key={insight.id}
                    style={insightStyle}
                    className={className}
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          </div>

          <a
            href={ROUTES.dashboard.stats}
            className="exercise-library-logic-chip rounded-[24px] border border-white/10 bg-slate-950/34 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] transition hover:-translate-y-0.5 hover:border-cyan-100/30 hover:bg-cyan-300/10"
          >
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
              Training Analytics
            </p>
            <p className="mt-1 text-sm font-black text-white">
              Open Stats Dashboard
            </p>
            <p className="mt-1 text-[10px] font-semibold text-slate-400">
              Review logs, history, and progress trends.
            </p>
          </a>
        </div>
      </div>
    </section>
  );
}

function ExerciseLibraryWidgetDock({
  bodyBalanceLabel,
  currentFocusLabel,
  latestTrainingExerciseName,
  latestTrainingLine,
  onCreateExercise,
  onThemeChange,
  sectionTheme,
  shortcuts,
  themeId,
  preferredWeightUnit,
  weeklyGoalSets,
  weeklyMuscleGroupsHit,
  weeklyWeightVolume,
  weeklyWeightVolumeComparisonLabel,
  weeklyVolumeRangeLabel,
  weeklySets,
}: {
  bodyBalanceLabel: string;
  currentFocusLabel: string;
  latestTrainingExerciseName: string;
  latestTrainingLine: string;
  onCreateExercise: () => void;
  onThemeChange: (themeId: ExerciseLibraryUiThemeId) => void;
  sectionTheme: CategoryTheme;
  shortcuts: TrainingIntelligenceShortcut[];
  themeId: ExerciseLibraryUiThemeId;
  preferredWeightUnit: WeightUnit;
  weeklyGoalSets: number;
  weeklyMuscleGroupsHit: number;
  weeklyWeightVolume: number;
  weeklyWeightVolumeComparisonLabel: string;
  weeklyVolumeRangeLabel: string;
  weeklySets: number;
}) {
  const widgetStyle = {
    ...getCategoryThemeCssVariables(sectionTheme),
    "--training-stat-progress": `${getWeeklySetGoalFillPercent(
      weeklySets,
      weeklyGoalSets,
    )}%`,
  } as ExerciseLibraryThemeCssVariables;
  const weeklyStatusId = getWeeklySetGoalStatusId(weeklySets, weeklyGoalSets);
  const primaryQuickActions: TrainingIntelligenceShortcut[] = [
    ...shortcuts.filter((shortcut) =>
      ["favorites", "recent", "undertrained", "my-exercises"].includes(
        shortcut.id,
      ),
    ),
    {
      disabled: false,
      helper: "Start a private movement",
      id: "widget-create-exercise",
      label: "Create Exercise",
      onClick: onCreateExercise,
      theme: getCategoryTheme("Integrated"),
    },
  ].slice(0, 5);

  return (
    <section
      style={widgetStyle}
      className="exercise-library-widget-dock relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/42 p-2.5 shadow-[0_24px_80px_rgba(0,0,0,0.38),0_0_34px_var(--exercise-theme-glow),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-2xl backdrop-saturate-150 sm:p-3"
    >
      <div className={`pointer-events-none absolute inset-0 ${sectionTheme.overlayClass} opacity-45`} />
      <div className={`pointer-events-none absolute inset-x-4 top-0 h-px ${sectionTheme.accentClass}`} />

      <div className="relative z-10 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-[1.08fr_0.95fr_0.95fr_0.95fr_1.35fr_1.1fr] lg:overflow-visible lg:pb-0">
        <div className="exercise-library-widget-card min-w-[14rem] overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.045] p-3 lg:min-w-0">
          <span
            aria-hidden="true"
            className="exercise-library-widget-card__fill"
          />
          <div className="relative z-10">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
              Weekly Volume Summary
            </p>
            <p className="mt-1 text-xl font-black text-white">
              {Math.max(0, Math.round(weeklySets))} / {weeklyGoalSets} sets
            </p>
            <WeightVolumeStat
              className="mt-2"
              comparisonLabel={weeklyWeightVolumeComparisonLabel}
              volume={weeklyWeightVolume}
              weightUnit={preferredWeightUnit}
            />
            <p className="mt-1 text-[10px] font-semibold text-slate-400">
              {weeklyVolumeRangeLabel}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            primaryQuickActions.find((action) => action.id === "undertrained")
              ?.onClick()
          }
          className="exercise-library-widget-card min-w-[12rem] rounded-[22px] border border-white/10 bg-white/[0.04] p-3 text-left transition hover:-translate-y-0.5 hover:border-[var(--exercise-theme-border)] hover:bg-white/[0.07] lg:min-w-0"
        >
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
            Suggested Focus
          </p>
          <p className="mt-1 line-clamp-2 text-base font-black text-white">
            {currentFocusLabel}
          </p>
          <p className="mt-1 text-[10px] font-semibold leading-4 text-slate-400">
            Best next area from live weekly volume.
          </p>
        </button>

        <div className="exercise-library-widget-card min-w-[12rem] rounded-[22px] border border-white/10 bg-white/[0.04] p-3 lg:min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
            Recent Training
          </p>
          <p className="mt-1 line-clamp-2 text-base font-black text-white">
            {latestTrainingExerciseName || "No recent workout"}
          </p>
          <p className="mt-1 text-[10px] font-semibold leading-4 text-slate-400">
            {latestTrainingLine}
          </p>
        </div>

        <div className="exercise-library-widget-card min-w-[12rem] rounded-[22px] border border-white/10 bg-white/[0.04] p-3 lg:min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
            Body Balance
          </p>
          <p className="mt-1 text-base font-black text-white">
            {weeklyMuscleGroupsHit} groups hit
          </p>
          <p className="mt-1 flex items-center gap-2 text-[10px] font-semibold leading-4 text-slate-400">
            <VolumeStatusIndicator sets={weeklySets} statusId={weeklyStatusId} />
            {bodyBalanceLabel}
          </p>
        </div>

        <div className="exercise-library-widget-card min-w-[18rem] rounded-[22px] border border-white/10 bg-white/[0.04] p-3 lg:min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                Theme Selector
              </p>
              <p className="mt-1 text-xs font-bold text-slate-400">
                {exerciseLibraryUiThemeConfigs[themeId].helper}
              </p>
            </div>
            <span className="rounded-xl border border-white/10 bg-white/[0.06] px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-[var(--exercise-theme-text)]">
              {exerciseLibraryUiThemeConfigs[themeId].mood}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {exerciseLibraryUiThemeOptions.map((theme) => (
              <button
                key={theme.id}
                type="button"
                aria-pressed={themeId === theme.id}
                onClick={() => onThemeChange(theme.id)}
                className={`rounded-xl border px-2 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] transition ${
                  themeId === theme.id
                    ? "border-cyan-100/40 bg-cyan-300 text-slate-950 shadow-[0_0_22px_rgba(34,211,238,0.24)]"
                    : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/22 hover:bg-white/[0.08] hover:text-white"
                }`}
                title={theme.helper}
              >
                {theme.label}
              </button>
            ))}
          </div>
        </div>

        <div className="exercise-library-widget-card min-w-[12rem] rounded-[22px] border border-white/10 bg-white/[0.04] p-3 lg:min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
            Quick Actions
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {primaryQuickActions.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={action.disabled}
                onClick={action.onClick}
                className={`rounded-xl border px-2 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] transition disabled:cursor-not-allowed disabled:opacity-35 ${action.theme.pillClass}`}
                title={action.helper || action.label}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ActiveFilterStatusPanel({
  activeFilterChips,
  bodyRegionLayer,
  matchingCount,
  onClear,
  sectionTheme,
}: {
  activeFilterChips: string[];
  bodyRegionLayer: BodyRegionLayer | null;
  matchingCount: number;
  onClear: () => void;
  sectionTheme: CategoryTheme;
}) {
  const hasActiveFilters = activeFilterChips.length > 0;
  const layerLabel = bodyRegionLayer || "All regions";
  const statusStyle = getCategoryThemeCssVariables(sectionTheme);

  return (
    <div
      style={statusStyle}
      className="exercise-library-active-filter-status relative overflow-hidden border-y border-cyan-100/12 bg-slate-950/42 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:px-4"
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 ${sectionTheme.overlayClass} opacity-35`}
      />
      <div className="relative z-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[var(--exercise-theme-text)]">
            Active Filter Status
          </p>
          <p className="mt-1 text-sm font-black text-white">
            {matchingCount.toLocaleString()} matching cards
            <span className="text-slate-500"> · </span>
            {layerLabel}
          </p>
          <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-400">
            Body selector filters first, then movement, equipment, goal,
            difficulty, search, and sort refine the visible shelves.
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 lg:justify-end">
          {hasActiveFilters ? (
            activeFilterChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={onClear}
                title={`Clear filters including ${chip}`}
                className="exercise-library-logic-pill rounded-xl border border-white/10 bg-white/[0.055] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] text-slate-200 transition hover:-translate-y-0.5 hover:border-[var(--exercise-theme-border)] hover:bg-[var(--exercise-theme-accent-soft)] hover:text-white"
              >
                {chip}
                <span className="ml-1 text-[var(--exercise-theme-text)]">x</span>
              </button>
            ))
          ) : (
            <span className="exercise-library-logic-chip rounded-xl border border-white/10 bg-white/[0.045] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">
              No active filters
            </span>
          )}

          <button
            type="button"
            onClick={onClear}
            className="rounded-xl border border-cyan-100/18 bg-cyan-300/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-100/45 hover:bg-cyan-300 hover:text-slate-950"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
}

function ExerciseLibraryResultsPageSelector({
  activeSectionKey,
  activeSectionLabel,
  currentPage,
  latestSetInsight,
  onPageChange,
  onSectionSelect,
  placement,
  preferredWeightUnit,
  sections,
  sectionTheme,
  weeklySetsBySectionKey,
  weeklyVolumeRangeLabel,
  weeklyWeightVolumeBySectionKey,
  sortMode,
  totalPages,
}: {
  activeSectionKey: string | null;
  activeSectionLabel: string;
  currentPage: number;
  latestSetInsight?: LatestSetInsight | null;
  onPageChange: (page: number) => void;
  onSectionSelect: (sectionKey: string) => void;
  placement: "top" | "bottom";
  preferredWeightUnit: WeightUnit;
  sections: ExerciseLibrarySection[];
  sectionTheme: CategoryTheme;
  weeklySetsBySectionKey: Map<string, number>;
  weeklyVolumeRangeLabel: string;
  weeklyWeightVolumeBySectionKey: Map<string, number>;
  sortMode: ExerciseLibrarySortMode;
  totalPages: number;
}) {
  if (totalPages <= 1 && sections.length <= 1) return null;

  const progressPercent = Math.min(
    100,
    Math.max(0, (currentPage / Math.max(totalPages, 1)) * 100),
  );
  const showPageControls = totalPages > 1;
  const activeSectionWeeklySets = activeSectionKey
    ? weeklySetsBySectionKey.get(activeSectionKey) || 0
    : 0;
  const activeSectionWeightVolume = activeSectionKey
    ? weeklyWeightVolumeBySectionKey.get(activeSectionKey) || 0
    : 0;
  const activeSectionWeightVolumeLabel = formatWeightMetric(
    activeSectionWeightVolume,
    preferredWeightUnit,
    { compact: true, volume: true },
  );
  const activeSectionWeeklyGoal =
    getWeeklySetGoalForSection(activeSectionLabel);
  const activeSectionGoalStyle = {
    ...getCategoryThemeCssVariables(sectionTheme),
    "--exercise-category-goal-progress": `${getWeeklySetGoalFillPercent(
      activeSectionWeeklySets,
      activeSectionWeeklyGoal,
    )}%`,
  } as ExerciseLibraryThemeCssVariables;
  const showSectionRail = placement === "top" && sections.length > 0;
  const goToPage = (page: number) => {
    onPageChange(Math.min(Math.max(page, 1), totalPages));
  };

  return (
    <nav
      aria-label={`${placement === "top" ? "Top" : "Bottom"} Exercise Library page navigation`}
      className={`relative overflow-hidden rounded-[26px] border p-2.5 backdrop-blur-2xl backdrop-saturate-150 sm:p-3 ${sectionTheme.surfaceClass} ${sectionTheme.cardClass}`}
    >
      <div className={`pointer-events-none absolute inset-0 ${sectionTheme.overlayClass} opacity-60`} />
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${sectionTheme.accentClass}`} />

      <div className="relative z-10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
            {placement === "top" ? "Browsing pages" : "More pages"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-xl border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${sectionTheme.pillClass}`}>
              {activeSectionLabel}
            </span>
            <span
              style={activeSectionGoalStyle}
              className="relative inline-flex overflow-hidden rounded-xl border border-cyan-200/18 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100"
            >
              <span
                aria-hidden="true"
                className="exercise-library-page-section-tab__goal-fill"
              />
              <WeeklySetGoalBadge
                className="relative z-10"
                completedSets={activeSectionWeeklySets}
                completedWeightVolume={activeSectionWeightVolume}
                goalSets={activeSectionWeeklyGoal}
                rangeLabel={weeklyVolumeRangeLabel}
                showWeightVolume={Boolean(activeSectionWeightVolumeLabel)}
                weightUnit={preferredWeightUnit}
              />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
              {weeklyVolumeRangeLabel}
            </span>
            <span className="text-xs font-black text-white">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        </div>

        {showPageControls ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <button
              type="button"
              aria-label="Previous Exercise Library page"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-slate-950/48 text-sm font-black text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] transition hover:-translate-y-0.5 hover:border-white/28 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-35"
            >
              <span aria-hidden="true">{"<"}</span>
            </button>

            <div className="flex min-w-0 max-w-full gap-1 overflow-x-auto rounded-full border border-white/10 bg-slate-950/45 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {Array.from({ length: totalPages }, (_, pageIndex) => {
                const page = pageIndex + 1;
                const isCurrentPage = page === currentPage;

                return (
                  <button
                    key={page}
                    type="button"
                    aria-current={isCurrentPage ? "page" : undefined}
                    aria-label={`Go to Exercise Library page ${page}`}
                    onClick={() => goToPage(page)}
                    className={`flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-[10px] font-black uppercase tracking-[0.08em] transition duration-200 ${
                      isCurrentPage
                        ? `${sectionTheme.pillClass} scale-105 text-white`
                        : "border-white/8 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:bg-white/[0.075] hover:text-white"
                    }`}
                  >
                    <span className="hidden md:inline">Page&nbsp;</span>
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              aria-label="Next Exercise Library page"
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-slate-950/48 text-sm font-black text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] transition hover:-translate-y-0.5 hover:border-white/28 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-35"
            >
              <span aria-hidden="true">{">"}</span>
            </button>
          </div>
        ) : null}
      </div>

      {showSectionRail ? (
        <div className="exercise-library-page-section-tab-rail relative z-10 mt-2 flex gap-1.5 overflow-x-auto rounded-[18px] border border-white/10 bg-slate-950/38 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sections.map((section) => {
            const pillTheme = getExerciseSectionTheme(section, sortMode);
            const isActive = section.key === activeSectionKey;
            const isLatestSectionPulse =
              latestSetInsight?.sectionKey === section.key;
            const weeklySets = weeklySetsBySectionKey.get(section.key) || 0;
            const weightVolume =
              weeklyWeightVolumeBySectionKey.get(section.key) || 0;
            const weightVolumeLabel = formatWeightMetric(
              weightVolume,
              preferredWeightUnit,
              { compact: true, volume: true },
            );
            const weeklyGoal = getWeeklySetGoalForSection(section.label);
            const goalFillPercent = getWeeklySetGoalFillPercent(
              weeklySets,
              weeklyGoal,
            );
            const goalStatusId = getWeeklySetGoalStatusId(
              weeklySets,
              weeklyGoal,
            );
            const sectionTabStyle = {
              ...getCategoryThemeCssVariables(pillTheme),
              "--exercise-category-goal-progress": `${goalFillPercent}%`,
            } as ExerciseLibraryThemeCssVariables;

            return (
              <button
                key={section.key}
                type="button"
                aria-pressed={isActive}
                onClick={() => onSectionSelect(section.key)}
                style={sectionTabStyle}
                title={`${section.label}. Set volume, ${weeklyVolumeRangeLabel}: ${Math.max(0, Math.round(weeklySets))} of ${weeklyGoal} sets${
                  weightVolumeLabel ? ` - Weight volume: ${weightVolumeLabel}` : ""
                }, ${weeklyVolumeStatusConfig[goalStatusId].label}`}
                className={`exercise-library-page-section-tab ${
                  isActive ? "exercise-library-page-section-tab--active" : ""
                } ${
                  isLatestSectionPulse ? "exercise-library-volume-pulse" : ""
                } group/tile flex min-h-[44px] shrink-0 items-center justify-between gap-2 border px-2.5 py-1.5 text-left transition duration-200 ${
                  isActive
                    ? `${pillTheme.tabClass} w-[14.5rem] scale-[1.015]`
                    : `${pillTheme.pillClass} w-[12rem] opacity-[0.82] hover:-translate-y-0.5 hover:opacity-100 sm:w-[12.75rem]`
                }`}
              >
                <span
                  aria-hidden="true"
                  className="exercise-library-page-section-tab__goal-fill"
                />
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 ${pillTheme.overlayClass} ${
                    isActive ? "opacity-70" : "opacity-30"
                  }`}
                />
                <span className="relative z-10 min-w-0">
                  <span className="block truncate text-[9px] font-black uppercase leading-3 tracking-[0.14em] sm:text-[10px]">
                    {section.label}
                  </span>
                  <span className="mt-1 block truncate text-[8px] font-black uppercase tracking-[0.08em] opacity-72">
                    {section.exercises.length} cards
                    <span className="opacity-50"> - </span>
                    <WeeklySetGoalBadge
                      completedSets={weeklySets}
                      completedWeightVolume={weightVolume}
                      goalSets={weeklyGoal}
                      rangeLabel={weeklyVolumeRangeLabel}
                      showWeightVolume={Boolean(weightVolumeLabel)}
                      weightUnit={preferredWeightUnit}
                    />
                    {isLatestSectionPulse ? (
                      <>
                        <span className="opacity-50"> - </span>
                        <span className="exercise-library-volume-added-chip">
                          {latestSetInsight?.pulseLabel}
                        </span>
                      </>
                    ) : null}
                  </span>
                </span>
                <span className="relative z-10 flex w-12 shrink-0 flex-col items-end gap-1">
                  <span className="h-1 w-full overflow-hidden rounded-full border border-current/15 bg-black/20">
                    <span
                      className="exercise-library-page-section-tab__mini-fill block h-full rounded-full opacity-80 transition-all duration-300"
                      style={{ width: `${goalFillPercent}%` }}
                    />
                  </span>
                  <span className="text-[7px] font-black uppercase tracking-[0.08em] opacity-70">
                    {isActive ? "Open" : "Tap"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="relative z-10 mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full ${sectionTheme.accentClass} transition-all duration-300 ease-out`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </nav>
  );
}

function ExerciseCategoryShelf({
  children,
  coreMovementWeeklySetsByKey,
  coreMovementWeeklyWeightVolumeByKey,
  isOpen,
  latestSetInsight,
  onToggle,
  preferredWeightUnit,
  section,
  sectionTheme,
  weeklySets,
  weeklyVolumeRangeLabel,
  weeklyWeightVolume,
}: {
  children: ReactNode;
  coreMovementWeeklySetsByKey: Map<string, number>;
  coreMovementWeeklyWeightVolumeByKey: Map<string, number>;
  isOpen: boolean;
  latestSetInsight?: LatestSetInsight | null;
  onToggle: () => void;
  preferredWeightUnit: WeightUnit;
  section: ExerciseLibrarySection;
  sectionTheme: CategoryTheme;
  weeklySets: number;
  weeklyVolumeRangeLabel: string;
  weeklyWeightVolume: number;
}) {
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const pendingCoreMovementTabKeyRef = useRef<string | null>(null);
  const shelfDragStateRef = useRef({
    hasDragged: false,
    isDragging: false,
    isPointerDown: false,
    scrollLeft: 0,
    startX: 0,
    startY: 0,
  });
  const shouldPreventShelfClickRef = useRef(false);
  const centeredCardKeyRef = useRef<string | null>(null);
  const centerScrollTimerRef = useRef<number | null>(null);
  const coreMovementTabs = getExerciseSectionCoreMovementTabs(section);
  const coreMovementTabSignature = coreMovementTabs
    .map((tab) => tab.key)
    .join("|");
  const [activeCoreMovementTabKey, setActiveCoreMovementTabKey] = useState<
    string | null
  >(coreMovementTabs[0]?.key ?? null);
  const [scrollState, setScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
    clientWidth: 0,
    currentPage: 1,
    isOverflowing: false,
    maxScrollLeft: 0,
    progressPercent: 100,
    scrollLeft: 0,
    scrollWidth: 0,
    totalPages: 1,
  });
  const [spotlightCardKey, setSpotlightCardKey] = useState<string | null>(null);
  const [spotlightShift, setSpotlightShift] =
    useState<SpotlightShift>("center");

  const updateScrollState = () => {
    const slider = sliderRef.current;
    if (!slider) return;

    const scrollLeft = Math.round(slider.scrollLeft);
    const scrollWidth = Math.round(slider.scrollWidth);
    const clientWidth = Math.round(slider.clientWidth);
    const maxScrollLeft = Math.max(0, scrollWidth - clientWidth);
    const snapPositions = getShelfSnapPositions();
    const cardsPerPage = getShelfCardsPerPage();
    const nearestSnapIndex = getNearestShelfSnapIndex(scrollLeft);
    const totalPages = snapPositions.length
      ? Math.max(1, Math.ceil(snapPositions.length / cardsPerPage))
      : maxScrollLeft > 4
        ? Math.max(1, Math.ceil(scrollWidth / Math.max(clientWidth, 1)))
        : 1;
    const currentPage = snapPositions.length
      ? Math.min(totalPages, Math.floor(nearestSnapIndex / cardsPerPage) + 1)
      : totalPages > 1 && maxScrollLeft > 0
        ? Math.min(
            totalPages,
            Math.max(
              1,
              Math.round((scrollLeft / maxScrollLeft) * (totalPages - 1)) + 1,
            ),
          )
        : 1;
    const progressPercent =
      totalPages > 1
        ? ((currentPage - 1) / Math.max(totalPages - 1, 1)) * 100
        : 100;
    const nextState = {
      canScrollLeft: scrollLeft > 4,
      canScrollRight: scrollLeft < maxScrollLeft - 4,
      clientWidth,
      currentPage,
      isOverflowing: maxScrollLeft > 4,
      maxScrollLeft,
      progressPercent,
      scrollLeft,
      scrollWidth,
      totalPages,
    };

    setScrollState((currentState) =>
      currentState.canScrollLeft === nextState.canScrollLeft &&
      currentState.canScrollRight === nextState.canScrollRight &&
      currentState.clientWidth === nextState.clientWidth &&
      currentState.currentPage === nextState.currentPage &&
      currentState.isOverflowing === nextState.isOverflowing &&
      currentState.maxScrollLeft === nextState.maxScrollLeft &&
      currentState.progressPercent === nextState.progressPercent &&
      currentState.scrollLeft === nextState.scrollLeft &&
      currentState.scrollWidth === nextState.scrollWidth &&
      currentState.totalPages === nextState.totalPages
        ? currentState
        : nextState,
    );
  };

  const getShelfCards = () => {
    const slider = sliderRef.current;
    if (!slider) return [];

    return Array.from(
      slider.querySelectorAll<HTMLElement>(".exercise-library-card-slide"),
    );
  };

  const getShelfSnapPositions = () => {
    const slider = sliderRef.current;
    if (!slider) return [];

    const maxScrollLeft = Math.max(0, slider.scrollWidth - slider.clientWidth);
    const positions = getShelfCards().map((card) => {
      const desiredLeft =
        card.offsetLeft + card.offsetWidth / 2 - slider.clientWidth / 2;
      return Math.min(Math.max(desiredLeft, 0), maxScrollLeft);
    });

    return positions.filter(
      (position, index) =>
        index === 0 || Math.abs(position - positions[index - 1]) > 2,
    );
  };

  const getNearestShelfSnapIndex = (scrollLeft: number) => {
    const positions = getShelfSnapPositions();
    if (!positions.length) return 0;

    return positions.reduce((nearestIndex, position, index) => {
      const nearestDistance = Math.abs(positions[nearestIndex] - scrollLeft);
      const distance = Math.abs(position - scrollLeft);
      return distance < nearestDistance ? index : nearestIndex;
    }, 0);
  };

  const getShelfCardsPerPage = () => {
    const slider = sliderRef.current;
    const positions = getShelfSnapPositions();
    if (!slider || positions.length <= 1) return 1;

    const cardStep = Math.max(1, positions[1] - positions[0]);
    return Math.max(1, Math.floor(slider.clientWidth / cardStep));
  };

  const scrollShelfToSnapIndex = (
    snapIndex: number,
    behavior: ScrollBehavior = "smooth",
  ) => {
    const slider = sliderRef.current;
    const positions = getShelfSnapPositions();
    if (!slider || !positions.length) return;

    const clampedIndex = Math.min(
      Math.max(snapIndex, 0),
      positions.length - 1,
    );
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    slider.scrollTo({
      behavior: prefersReducedMotion ? "auto" : behavior,
      left: positions[clampedIndex],
    });
    window.setTimeout(
      () => {
        updateScrollState();
        updateActiveCoreMovementTabFromScroll();
      },
      prefersReducedMotion || behavior === "auto" ? 0 : 260,
    );
  };

  const settleShelfToNearestSnap = () => {
    const slider = sliderRef.current;
    if (!slider) return;

    scrollShelfToSnapIndex(getNearestShelfSnapIndex(slider.scrollLeft));
  };

  const updateActiveCoreMovementTabFromScroll = () => {
    const slider = sliderRef.current;
    if (!slider) return;

    const cards = getShelfCards();
    if (!cards.length) {
      setActiveCoreMovementTabKey(null);
      return;
    }

    const sliderRect = slider.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(slider);
    const paddingLeft = Number.parseFloat(computedStyle.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(computedStyle.paddingRight) || 0;
    const visibleLeft = sliderRect.left + paddingLeft;
    const visibleRight = sliderRect.right - paddingRight;
    const firstVisibleCard =
      cards.find((card) => {
        const cardRect = card.getBoundingClientRect();
        return cardRect.right > visibleLeft && cardRect.left < visibleRight;
      }) || cards[0];
    const nextCoreMovementTabKey =
      firstVisibleCard.dataset.coreMovementTab || coreMovementTabs[0]?.key || null;

    setActiveCoreMovementTabKey((currentTabKey) =>
      currentTabKey === nextCoreMovementTabKey
        ? currentTabKey
        : nextCoreMovementTabKey,
    );
  };

  const scrollShelfCardIntoView = (
    card: HTMLElement,
    behavior: ScrollBehavior = "smooth",
    options: { cardKey?: string; force?: boolean } = {},
  ) => {
    const slider = sliderRef.current;
    if (!slider) return;

    const dragState = shelfDragStateRef.current;
    if (dragState.isPointerDown || dragState.isDragging) return;

    const maxScrollLeft = Math.max(0, slider.scrollWidth - slider.clientWidth);
    const targetLeft = Math.min(
      Math.max(
        card.offsetLeft + card.offsetWidth / 2 - slider.clientWidth / 2,
        0,
      ),
      maxScrollLeft,
    );
    const distance = Math.abs(slider.scrollLeft - targetLeft);
    const cardKey = options.cardKey || card.dataset.cardKey || "";

    if (distance < 4) {
      updateScrollState();
      updateActiveCoreMovementTabFromScroll();
      return;
    }

    if (
      cardKey &&
      !options.force &&
      centeredCardKeyRef.current === cardKey &&
      centerScrollTimerRef.current !== null
    ) {
      return;
    }

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (cardKey) centeredCardKeyRef.current = cardKey;
    if (centerScrollTimerRef.current !== null) {
      window.clearTimeout(centerScrollTimerRef.current);
      centerScrollTimerRef.current = null;
    }

    slider.scrollTo({
      behavior: prefersReducedMotion ? "auto" : behavior,
      left: targetLeft,
    });
    centerScrollTimerRef.current = window.setTimeout(
      () => {
        centerScrollTimerRef.current = null;
        updateScrollState();
        updateActiveCoreMovementTabFromScroll();
      },
      prefersReducedMotion || behavior === "auto" ? 0 : 320,
    );
  };

  useEffect(
    () => () => {
      if (centerScrollTimerRef.current !== null) {
        window.clearTimeout(centerScrollTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) {
      setActiveCoreMovementTabKey(null);
      setSpotlightCardKey(null);
      setSpotlightShift("center");
      setScrollState({
        canScrollLeft: false,
        canScrollRight: false,
        clientWidth: 0,
        currentPage: 1,
        isOverflowing: false,
        maxScrollLeft: 0,
        progressPercent: 100,
        scrollLeft: 0,
        scrollWidth: 0,
        totalPages: 1,
      });
      return;
    }

    const slider = sliderRef.current;
    if (!slider) return;

    slider.scrollTo({ left: 0 });
    updateScrollState();
    updateActiveCoreMovementTabFromScroll();

    const handleScroll = () => {
      updateScrollState();
      updateActiveCoreMovementTabFromScroll();
    };
    slider.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    const animationFrame = window.requestAnimationFrame(() => {
      updateScrollState();
      updateActiveCoreMovementTabFromScroll();
    });
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(handleScroll)
        : null;

    resizeObserver?.observe(slider);
    getShelfCards().forEach((card) => resizeObserver?.observe(card));

    return () => {
      slider.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
    };
  }, [isOpen, section.exercises.length]);

  useEffect(() => {
    if (!isOpen) return;

    setActiveCoreMovementTabKey((currentTabKey) =>
      currentTabKey &&
      coreMovementTabs.some((tab) => tab.key === currentTabKey)
        ? currentTabKey
        : coreMovementTabs[0]?.key ?? null,
    );
  }, [coreMovementTabSignature, isOpen]);

  const scrollShelf = (direction: "left" | "right") => {
    const slider = sliderRef.current;
    if (!slider) return;

    const positions = getShelfSnapPositions();
    if (positions.length <= 1) {
      updateScrollState();
      updateActiveCoreMovementTabFromScroll();
      return;
    }

    const currentIndex = getNearestShelfSnapIndex(slider.scrollLeft);
    const cardStep = getShelfCardsPerPage();
    const targetIndex =
      direction === "right"
        ? Math.min(currentIndex + cardStep, positions.length - 1)
        : Math.max(currentIndex - cardStep, 0);

    scrollShelfToSnapIndex(targetIndex);
  };
  const scrollShelfToPage = (page: number) => {
    const positions = getShelfSnapPositions();
    const cardsPerPage = getShelfCardsPerPage();
    const targetPage = Math.min(
      Math.max(page, 1),
      Math.max(scrollState.totalPages, 1),
    );
    const targetIndex = positions.length
      ? (targetPage - 1) * cardsPerPage
      : 0;

    scrollShelfToSnapIndex(targetIndex);
  };

  const scrollToCoreMovementTabCard = (coreMovementTabKey: string) => {
    const slider = sliderRef.current;
    if (!slider) return;

    const targetCard = Array.from(
      slider.querySelectorAll<HTMLElement>(".exercise-library-card-slide"),
    ).find((card) => card.dataset.coreMovementTab === coreMovementTabKey);

    if (!targetCard) return;

    setActiveCoreMovementTabKey(coreMovementTabKey);
    targetCard.focus({ preventScroll: true });
    scrollShelfCardIntoView(targetCard, "smooth", {
      cardKey: targetCard.dataset.cardKey,
      force: true,
    });
  };

  const scrollToCoreMovementTab = (coreMovementTabKey: string) => {
    if (!isOpen) {
      pendingCoreMovementTabKeyRef.current = coreMovementTabKey;
      onToggle();
      return;
    }

    scrollToCoreMovementTabCard(coreMovementTabKey);
  };

  const setSpotlightFromTarget = (
    target: EventTarget | null,
    trigger: "click" | "focus" | "hover",
  ) => {
    const dragState = shelfDragStateRef.current;
    if (dragState.isPointerDown || dragState.isDragging) return;

    if (typeof window !== "undefined") {
      const canHover = window.matchMedia("(hover: hover) and (pointer: fine)")
        .matches;
      if (trigger === "hover" && !canHover) return;
    }

    const slider = sliderRef.current;
    const targetElement = target instanceof Element ? target : null;
    const card = targetElement?.closest<HTMLElement>(
      ".exercise-library-card-slide",
    );
    const cardKey = card?.dataset.cardKey;

    if (!slider || !card || !cardKey) return;

    const sliderRect = slider.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const sliderCenter = sliderRect.left + sliderRect.width / 2;
    const cardCenter = cardRect.left + cardRect.width / 2;
    const centerDelta = cardCenter - sliderCenter;
    const nextShift =
      centerDelta < -32 ? "right" : centerDelta > 32 ? "left" : "center";

    setSpotlightCardKey((currentKey) =>
      currentKey === cardKey ? currentKey : cardKey,
    );
    setSpotlightShift((currentShift) =>
      currentShift === nextShift ? currentShift : nextShift,
    );

    const shouldCenterCard =
      trigger !== "hover" || cardKey !== spotlightCardKey;
    if (shouldCenterCard) {
      scrollShelfCardIntoView(card, "smooth", {
        cardKey,
        force: trigger !== "hover",
      });
    }
  };

  const clearSpotlight = () => {
    setSpotlightCardKey(null);
    setSpotlightShift("center");
  };

  useEffect(() => {
    if (!isOpen || !pendingCoreMovementTabKeyRef.current) return;

    const pendingCoreMovementTabKey = pendingCoreMovementTabKeyRef.current;
    pendingCoreMovementTabKeyRef.current = null;
    const timer = window.setTimeout(() => {
      scrollToCoreMovementTabCard(pendingCoreMovementTabKey);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [coreMovementTabSignature, isOpen]);

  const stopShelfDrag = () => {
    const slider = sliderRef.current;
    const dragState = shelfDragStateRef.current;
    const shouldSuppressClick = dragState.hasDragged;

    dragState.hasDragged = false;
    dragState.isDragging = false;
    dragState.isPointerDown = false;
    slider?.classList.remove("exercise-library-card-scroll-viewport--dragging");

    if (shouldSuppressClick) {
      shouldPreventShelfClickRef.current = true;
      settleShelfToNearestSnap();
      window.setTimeout(() => {
        shouldPreventShelfClickRef.current = false;
      }, 0);
    }
  };

  const handleShelfMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    const slider = sliderRef.current;
    const target = event.target instanceof Element ? event.target : null;
    const noDragTarget = target?.closest(
      "input,select,textarea,[data-no-drag-scroll='true']",
    );
    if (!slider || noDragTarget) return;

    shelfDragStateRef.current = {
      hasDragged: false,
      isDragging: false,
      isPointerDown: true,
      scrollLeft: slider.scrollLeft,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  const handleShelfMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const slider = sliderRef.current;
    const dragState = shelfDragStateRef.current;
    if (!slider || !dragState.isPointerDown) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    const isHorizontalDrag = Math.abs(deltaX) >= Math.max(8, Math.abs(deltaY));

    if (!dragState.isDragging && !isHorizontalDrag) return;

    if (!dragState.isDragging) {
      dragState.isDragging = true;
      dragState.hasDragged = true;
      slider.classList.add("exercise-library-card-scroll-viewport--dragging");
    }

    event.preventDefault();
    event.stopPropagation();
    slider.scrollLeft = dragState.scrollLeft - deltaX;
    updateScrollState();
  };

  const handleShelfClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!shouldPreventShelfClickRef.current) {
      setSpotlightFromTarget(event.target, "click");
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  };
  const handleShelfMouseOverCapture = (event: MouseEvent<HTMLDivElement>) => {
    setSpotlightFromTarget(event.target, "hover");
  };
  const handleShelfFocusCapture = (event: FocusEvent<HTMLDivElement>) => {
    setSpotlightFromTarget(event.target, "focus");
  };
  const handleShelfMouseLeave = () => {
    stopShelfDrag();
    clearSpotlight();
  };

  const hasShelfScrollControls = isOpen;
  const showLeftControl = hasShelfScrollControls;
  const showRightControl = hasShelfScrollControls;
  const leftControlDisabled =
    !hasShelfScrollControls || !scrollState.canScrollLeft;
  const rightControlDisabled =
    !hasShelfScrollControls || !scrollState.canScrollRight;
  const showPageSelector = isOpen && scrollState.totalPages > 1;
  const weeklyGoal = getWeeklySetGoalForSection(section.label);
  const isLatestSectionPulse = latestSetInsight?.sectionKey === section.key;
  const weeklyGoalFillPercent = Math.min(
    100,
    getWeeklySetGoalProgressPercent(weeklySets, weeklyGoal),
  );
  const weeklyGoalStatusId = getWeeklySetGoalStatusId(weeklySets, weeklyGoal);
  const weeklyWeightVolumeLabel = formatWeightMetric(
    weeklyWeightVolume,
    preferredWeightUnit,
    { compact: true, volume: true },
  );
  const sectionThemeCssVars = {
    ...getCategoryThemeCssVariables(sectionTheme),
    "--exercise-category-goal-progress": `${weeklyGoalFillPercent}%`,
  } as ExerciseLibraryThemeCssVariables;
  const renderedChildren = Children.map(children, (child) => {
    if (
      !isValidElement<{
        className?: string;
        "data-card-key"?: string;
        "data-spotlight-shift"?: SpotlightShift;
      }>(child)
    ) {
      return child;
    }

    const cardKey = child.props["data-card-key"];
    const isSpotlightCard =
      Boolean(cardKey) && cardKey === spotlightCardKey;
    const childClassName = child.props.className || "";

    return cloneElement(
      child as ReactElement<{
        className?: string;
        "data-card-key"?: string;
        "data-spotlight-shift"?: SpotlightShift;
      }>,
      {
        className: `${childClassName} ${
          isSpotlightCard ? "exercise-library-card-slide--spotlight" : ""
        }`.trim(),
        "data-spotlight-shift": isSpotlightCard ? spotlightShift : undefined,
      },
    );
  });

  return (
    <div
      style={sectionThemeCssVars}
      className={`relative w-full min-w-0 max-w-full overflow-visible rounded-[26px] border p-2.5 backdrop-blur-2xl backdrop-saturate-150 transition duration-200 ease-out sm:p-3 ${sectionTheme.surfaceClass} ${sectionTheme.cardClass} ${
        isLatestSectionPulse ? "exercise-library-volume-pulse" : ""
      } ${
        isOpen
          ? `${sectionTheme.hoverClass} z-[900] scale-[1.005]`
          : "opacity-[0.92] hover:opacity-100"
      }`}
    >
      <div className={`pointer-events-none absolute inset-0 z-0 ${sectionTheme.overlayClass} opacity-70`} />
      <div className={`pointer-events-none absolute inset-x-0 top-0 z-[1] h-px ${sectionTheme.accentClass}`} />

      <div className="relative z-10 min-w-0 space-y-2">
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={onToggle}
          title={`${section.label}. Set volume, ${weeklyVolumeRangeLabel}: ${Math.max(
            0,
            Math.round(weeklySets),
          )} of ${weeklyGoal} sets${
            weeklyWeightVolumeLabel
              ? ` - Weight volume: ${weeklyWeightVolumeLabel}`
              : ""
          }, ${weeklyVolumeStatusConfig[weeklyGoalStatusId].label}`}
          className={`group/category-heading relative flex min-h-[44px] w-full items-center justify-between gap-3 overflow-hidden rounded-[18px] border px-3 py-2 text-left shadow-[0_12px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.11)] transition duration-[240ms] ease-out focus:outline-none focus:ring-2 focus:ring-white/20 sm:min-h-[48px] sm:px-3.5 ${
            isOpen
              ? "scale-[1.006] border-white/28 bg-white/[0.105] shadow-[0_20px_58px_rgba(0,0,0,0.34),0_0_34px_rgba(255,255,255,0.075),inset_0_1px_0_rgba(255,255,255,0.20)]"
              : "border-white/10 bg-white/[0.045] hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.075] hover:shadow-[0_18px_48px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.15)]"
          }`}
        >
          <span
            aria-hidden="true"
            className={`absolute inset-0 ${sectionTheme.overlayClass} transition-opacity duration-[240ms] ${
              isOpen
                ? "opacity-[0.85]"
                : "opacity-[0.42] group-hover/category-heading:opacity-[0.65]"
            }`}
          />
          <span
            aria-hidden="true"
            className="exercise-library-category-heading__goal-fill"
          />
          <span
            aria-hidden="true"
            className={`absolute inset-x-0 top-0 h-px ${sectionTheme.accentClass} transition-opacity duration-[240ms] ${
              isOpen ? "opacity-100" : "opacity-60 group-hover/category-heading:opacity-90"
            }`}
          />
          <span
            aria-hidden="true"
            className={`absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/18 to-transparent transition duration-[260ms] ease-out ${
              isOpen
                ? "translate-x-[430%] opacity-70"
                : "translate-x-0 opacity-0 group-hover/category-heading:translate-x-[430%] group-hover/category-heading:opacity-[0.45]"
            }`}
          />

          <span className="relative z-10 flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className={`h-8 w-1.5 shrink-0 rounded-full ${sectionTheme.accentClass} shadow-[0_0_18px_rgba(255,255,255,0.12)] transition duration-[240ms] ${
                isOpen ? "opacity-100" : "opacity-[0.65] group-hover/category-heading:opacity-90"
              }`}
            />
            <span className="min-w-0">
              <span
                className={`block max-w-full truncate text-xs font-black uppercase leading-tight tracking-[0.13em] transition duration-[240ms] sm:text-sm ${
                  isOpen
                    ? "scale-[1.01] text-white"
                    : "text-slate-100 group-hover/category-heading:text-white"
                }`}
              >
                {section.label}
              </span>
              <span className="mt-0.5 inline-flex rounded-lg border border-cyan-100/16 bg-cyan-300/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-cyan-100/80">
                <WeeklySetGoalBadge
                  completedSets={weeklySets}
                  completedWeightVolume={weeklyWeightVolume}
                  goalSets={weeklyGoal}
                  rangeLabel={weeklyVolumeRangeLabel}
                  showWeightVolume={Boolean(weeklyWeightVolumeLabel)}
                  weightUnit={preferredWeightUnit}
                />
                {isLatestSectionPulse ? (
                  <span className="ml-1 exercise-library-volume-added-chip">
                    {latestSetInsight?.pulseLabel}
                  </span>
                ) : null}
              </span>
              <span
                className={`mt-1 block h-px w-24 max-w-full ${sectionTheme.accentClass} transition duration-[240ms] ${
                  isOpen
                    ? "opacity-100"
                    : "opacity-[0.55] group-hover/category-heading:opacity-[0.85]"
                }`}
              />
            </span>
          </span>

          <span className="relative z-10 flex shrink-0 items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] transition duration-[240ms] ${
                isOpen
                  ? `${sectionTheme.pillClass} scale-105`
                  : `${sectionTheme.pillClass} opacity-[0.88] group-hover/category-heading:opacity-100`
              }`}
            >
              {section.exercises.length}
            </span>
            {isOpen ? (
              <span
                aria-hidden="true"
                className={`flex h-7 w-7 items-center justify-center rounded-full border ${sectionTheme.pillClass}`}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-current shadow-[0_0_16px_currentColor]" />
              </span>
            ) : (
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/12 bg-slate-950/48 text-[10px] font-black text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] transition duration-[240ms] group-hover/category-heading:border-white/24 group-hover/category-heading:bg-white/[0.08] group-hover/category-heading:text-white"
              >
                v
              </span>
            )}
          </span>
        </button>

        {coreMovementTabs.length > 0 ? (
          <div
            className={`relative z-[45] -mt-1 overflow-visible rounded-2xl border px-2 py-1.5 shadow-[0_12px_34px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.10)] transition duration-200 ${
              isOpen
                ? "border-white/16 bg-slate-950/42"
                : "border-white/8 bg-slate-950/28 opacity-85"
            }`}
          >
            <div
              aria-label={`${section.label} core movement shortcuts`}
              className="exercise-library-core-tab-rail"
              role="tablist"
            >
              {coreMovementTabs.map((tab) => {
                const isActiveTab = activeCoreMovementTabKey === tab.key;
                const isLatestCoreTabPulse =
                  latestSetInsight?.coreMovementKey === tab.key;
                const tabWeeklySets =
                  coreMovementWeeklySetsByKey.get(tab.key) || 0;
                const tabWeeklyWeightVolume =
                  coreMovementWeeklyWeightVolumeByKey.get(tab.key) || 0;
                const tabWeeklyWeightVolumeLabel = formatWeightMetric(
                  tabWeeklyWeightVolume,
                  preferredWeightUnit,
                  { compact: true, volume: true },
                );
                const tabWeeklyGoal = getWeeklySetGoalForCoreMovement();
                const tabStatusId = getWeeklySetGoalStatusId(
                  tabWeeklySets,
                  tabWeeklyGoal,
                );
                const tabVolumeStyle = {
                  ...getCategoryThemeCssVariables(sectionTheme),
                  "--exercise-core-tab-volume-progress": `${getWeeklySetGoalFillPercent(
                    tabWeeklySets,
                    tabWeeklyGoal,
                  )}%`,
                } as ExerciseLibraryThemeCssVariables;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    aria-selected={isActiveTab}
                    style={tabVolumeStyle}
                    className={`exercise-library-core-tab ${
                      isLatestCoreTabPulse ? "exercise-library-volume-pulse" : ""
                    } ${
                      isActiveTab
                        ? `exercise-library-core-tab--active ${sectionTheme.pillClass}`
                        : `border-white/10 bg-white/[0.045] text-white/58 ${sectionTheme.tabHoverClass}`
                    }`}
                    onClick={(event) => {
                      event.stopPropagation();
                      scrollToCoreMovementTab(tab.key);
                    }}
                    role="tab"
                    title={`Jump to ${tab.label}. Set volume, ${weeklyVolumeRangeLabel}: ${Math.max(
                      0,
                      Math.round(tabWeeklySets),
                    )} of ${tabWeeklyGoal} sets${
                      tabWeeklyWeightVolumeLabel
                        ? ` - Weight volume: ${tabWeeklyWeightVolumeLabel}`
                        : ""
                    }, ${weeklyVolumeStatusConfig[tabStatusId].label}`}
                  >
                    <span
                      aria-hidden="true"
                      className="exercise-library-core-tab__fill"
                    />
                    <span className="exercise-library-core-tab__content">
                      {tab.label}
                      <span className="exercise-library-core-tab__stat">
                        <WeeklySetGoalBadge
                          completedSets={tabWeeklySets}
                          completedWeightVolume={tabWeeklyWeightVolume}
                          goalSets={tabWeeklyGoal}
                          rangeLabel={weeklyVolumeRangeLabel}
                          showWeightVolume={Boolean(tabWeeklyWeightVolumeLabel)}
                          weightUnit={preferredWeightUnit}
                        />
                        {isLatestCoreTabPulse ? (
                          <span className="exercise-library-volume-added-chip">
                            {latestSetInsight?.pulseLabel}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={`exercise-library-core-tab__underline ${sectionTheme.accentClass}`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {isOpen ? (
          <div className="min-h-0 min-w-0 overflow-visible">
            <div
              className="exercise-library-shelf-window"
            >
              {showPageSelector ? (
                <div className="mb-2 rounded-2xl border border-white/10 bg-slate-950/48 p-2 shadow-[0_12px_34px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                        {section.label}
                      </p>
                      <p className="mt-0.5 text-xs font-black text-white">
                        Page {scrollState.currentPage} of {scrollState.totalPages}
                      </p>
                    </div>

                    <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
                      <button
                        type="button"
                        aria-label={`Previous ${section.label} page`}
                        disabled={scrollState.currentPage <= 1}
                        onClick={() => scrollShelfToPage(scrollState.currentPage - 1)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-xs font-black text-slate-200 transition hover:border-white/24 hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        {"<"}
                      </button>

                      <div className="flex min-w-0 max-w-full gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.035] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {Array.from(
                          { length: scrollState.totalPages },
                          (_, pageIndex) => {
                            const page = pageIndex + 1;
                            const isCurrentPage =
                              page === scrollState.currentPage;

                            return (
                              <button
                                key={page}
                                type="button"
                                aria-current={isCurrentPage ? "page" : undefined}
                                aria-label={`Go to ${section.label} page ${page}`}
                                onClick={() => scrollShelfToPage(page)}
                                className={`flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-[9px] font-black uppercase tracking-[0.08em] transition ${
                                  isCurrentPage
                                    ? `${sectionTheme.pillClass} scale-105`
                                    : "border-white/8 bg-slate-950/46 text-slate-400 hover:border-white/18 hover:bg-white/[0.06] hover:text-white"
                                }`}
                              >
                                <span className="hidden sm:inline">Page&nbsp;</span>
                                {page}
                              </button>
                            );
                          },
                        )}
                      </div>

                      <button
                        type="button"
                        aria-label={`Next ${section.label} page`}
                        disabled={scrollState.currentPage >= scrollState.totalPages}
                        onClick={() => scrollShelfToPage(scrollState.currentPage + 1)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-xs font-black text-slate-200 transition hover:border-white/24 hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        {">"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full ${sectionTheme.accentClass} transition-all duration-300 ease-out`}
                      style={{ width: `${scrollState.progressPercent}%` }}
                    />
                  </div>
                </div>
              ) : null}

              <div
                ref={sliderRef}
                className="exercise-library-card-scroll-viewport exercise-library-themed-scrollbar relative z-20 w-full overflow-x-scroll overflow-y-visible"
                data-client-width={scrollState.clientWidth}
                data-max-scroll-left={scrollState.maxScrollLeft}
                data-scroll-left={scrollState.scrollLeft}
                data-scroll-width={scrollState.scrollWidth}
                aria-label={`${section.label} exercises`}
                onClickCapture={handleShelfClickCapture}
                onFocusCapture={handleShelfFocusCapture}
                onMouseDownCapture={handleShelfMouseDown}
                onMouseLeave={handleShelfMouseLeave}
                onMouseMoveCapture={handleShelfMouseMove}
                onMouseOverCapture={handleShelfMouseOverCapture}
                onMouseUpCapture={stopShelfDrag}
                onDragStart={(event) => event.preventDefault()}
                role="region"
              >
                <div
                  className="exercise-library-card-track"
                  data-selected-card={spotlightCardKey ? "true" : undefined}
                  role="list"
                >
                  {renderedChildren}
                </div>
              </div>

              <button
                type="button"
                aria-label={`Scroll ${section.label} exercises left`}
                className={`exercise-library-shelf-arrow exercise-library-shelf-arrow--left ${
                  showLeftControl ? "exercise-library-shelf-arrow--visible" : ""
                }`}
                disabled={leftControlDisabled}
                onClick={() => scrollShelf("left")}
              >
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.4"
                  viewBox="0 0 24 24"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                aria-label={`Scroll ${section.label} exercises right`}
                className={`exercise-library-shelf-arrow exercise-library-shelf-arrow--right ${
                  showRightControl ? "exercise-library-shelf-arrow--visible" : ""
                }`}
                disabled={rightControlDisabled}
                onClick={() => scrollShelf("right")}
              >
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.4"
                  viewBox="0 0 24 24"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CreateExerciseEmptyCard({ onCreate }: { onCreate: () => void }) {
  return (
    <article className="exercise-library-themed-card group/create-exercise flex min-h-[360px] flex-col overflow-hidden rounded-[28px] border border-cyan-200/22 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.20),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(250,204,21,0.15),transparent_30%),linear-gradient(145deg,rgba(15,23,42,0.94),rgba(2,6,23,0.90))] p-4 shadow-[0_24px_78px_rgba(0,0,0,0.48),0_0_34px_rgba(34,211,238,0.12),inset_0_1px_0_rgba(255,255,255,0.16)] transition duration-200 hover:-translate-y-1 hover:border-cyan-100/45 hover:shadow-[0_30px_96px_rgba(0,0,0,0.58),0_0_46px_rgba(34,211,238,0.18),inset_0_1px_0_rgba(255,255,255,0.22)]">
      <button
        type="button"
        onClick={onCreate}
        className="flex h-full min-h-[328px] flex-col items-center justify-center rounded-[24px] border border-dashed border-cyan-100/24 bg-white/[0.045] px-4 py-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] transition group-hover/create-exercise:bg-white/[0.07]"
      >
        <span
          aria-hidden="true"
          className="flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-100/30 bg-cyan-300/14 text-4xl font-black leading-none text-cyan-50 shadow-[0_0_34px_rgba(34,211,238,0.22),inset_0_1px_0_rgba(255,255,255,0.18)]"
        >
          +
        </span>
        <span className="mt-5 text-xl font-black uppercase tracking-[0.08em] text-white">
          Create an Exercise
        </span>
        <span className="mt-3 max-w-[18rem] text-sm font-semibold leading-6 text-slate-300">
          Create your own movement variation, coaching cue, and settings.
        </span>
        <span className="mt-6 rounded-2xl border border-emerald-200/25 bg-emerald-300/16 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,0.14)] transition group-hover/create-exercise:border-emerald-100/55 group-hover/create-exercise:bg-emerald-300 group-hover/create-exercise:text-slate-950">
          Create Exercise
        </span>
      </button>
    </article>
  );
}

const getExerciseCardCategoryTabLabel = (section: ExerciseLibrarySection) => {
  if (section.key === "favorites") {
    return { full: "Favorite", short: "Fav" };
  }

  if (section.key === myExercisesSectionKey) {
    return { full: "My Exercise", short: "Mine" };
  }

  const abbreviations: Record<string, string> = {
    "Lower Body Compound": "Lower Body",
    "Lower Body Isolation": "Lower Iso",
    "Upper Push": "Push",
    "Upper Pull": "Pull",
    "Arm Isolation": "Arms",
    "Cervical Isolation": "Cervical",
  };

  return {
    full: section.label,
    short: abbreviations[section.label] || section.label,
  };
};

function ExerciseCardCategoryTab({
  section,
  sectionTheme,
}: {
  section: ExerciseLibrarySection;
  sectionTheme: CategoryTheme;
}) {
  const label = getExerciseCardCategoryTabLabel(section);

  return (
    <div className="exercise-library-card-category-tab pointer-events-none absolute left-2 right-2 top-2 z-[70] sm:left-3 sm:right-3 sm:top-3">
      <div className={`exercise-library-card-category-tab__pill border ${sectionTheme.pillClass}`}>
        <span className="min-w-0 flex-1 truncate text-center">
          {label.full || label.short}
        </span>
      </div>
      <div
        aria-hidden="true"
        className={`exercise-library-card-category-tab__rail ${sectionTheme.accentClass}`}
      />
    </div>
  );
}

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
  equipment: string;
  id: string;
  level: string;
  name: string;
  reason: string;
  reasonBadges?: string[];
  score?: number;
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
  reasonBadges: string[] = [reason],
  score = 0,
): MovementSuggestion => ({
  equipment: item.legacyExercise.equipment,
  id: item.legacyExerciseId,
  level: item.legacyExercise.level,
  name: item.legacyExerciseName,
  reason,
  reasonBadges,
  score,
});

const getMovementSuggestions = (
  exercise: Exercise,
  metadata: NormalizedExerciseCatalogItem | null,
) => {
  const otherItems = normalizedCatalog.items.filter(
    (item) => item.legacyExerciseId !== exercise.id,
  );
  const currentPrimaryMuscles = new Set(
    getExerciseMuscleIntelligence(exercise, metadata).primary.map(
      normalizeFilterCompareValue,
    ),
  );
  const currentModifierIds = new Set(metadata?.modifierIds || []);
  const scoreCandidate = (item: NormalizedExerciseCatalogItem) => {
    const candidateExercise = item.legacyExercise as Exercise;
    const candidateMuscles = getExerciseMuscleIntelligence(
      candidateExercise,
      item,
    );
    const reasonBadges: string[] = [];
    let score = 0;

    if (metadata && item.coreMovementId === metadata.coreMovementId) {
      score += 36;
      reasonBadges.push("Same core");
    } else if (metadata && item.movementPatternId === metadata.movementPatternId) {
      score += 24;
      reasonBadges.push("Same pattern");
    }

    if (
      candidateMuscles.primary.some((muscle) =>
        currentPrimaryMuscles.has(normalizeFilterCompareValue(muscle)),
      )
    ) {
      score += 22;
      reasonBadges.push("Same muscles");
    }

    if (
      normalizeEquipmentLabel(candidateExercise.equipment) ===
      normalizeEquipmentLabel(exercise.equipment)
    ) {
      score += 14;
      reasonBadges.push("Equipment match");
    }

    if (candidateExercise.level === exercise.level) {
      score += 8;
      reasonBadges.push("Difficulty match");
    }

    if (candidateExercise.goal === exercise.goal) {
      score += 8;
      reasonBadges.push("Goal match");
    }

    const compatibleModifierCount = item.modifierIds.filter((modifierId) =>
      currentModifierIds.has(modifierId),
    ).length;
    if (compatibleModifierCount > 0) {
      score += Math.min(12, compatibleModifierCount * 3);
      reasonBadges.push("Compatible modifiers");
    }

    return { reasonBadges, score };
  };
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
  const substitutions = dedupeSuggestions(
    otherItems
      .map((item) => {
        const { reasonBadges, score } = scoreCandidate(item);
        const fallbackReason = sameCore.includes(item)
          ? "Same core movement"
          : samePattern.includes(item)
            ? "Same movement pattern"
            : sameRegionOrEquipment.includes(item)
              ? "Same region/equipment"
              : "";

        return score > 0 || fallbackReason
          ? toSuggestion(
              item,
              reasonBadges[0] || fallbackReason,
              reasonBadges.length ? reasonBadges : [fallbackReason],
              score,
            )
          : null;
      })
      .filter((suggestion): suggestion is MovementSuggestion =>
        Boolean(suggestion),
      )
      .sort((left, right) => (right.score || 0) - (left.score || 0)),
  ).slice(0, 8);
  const currentRank = levelRank(exercise.level);
  const progressionPool = sameCore.length ? sameCore : samePattern;
  const progressions = progressionPool
    .filter((item) => levelRank(item.legacyExercise.level) > currentRank)
    .map((item) => {
      const { reasonBadges, score } = scoreCandidate(item);
      return toSuggestion(
        item,
        "Higher skill/load option",
        ["Harder option", ...reasonBadges].slice(0, 3),
        score + 10,
      );
    })
    .sort((left, right) => (right.score || 0) - (left.score || 0))
    .slice(0, 6);
  const regressions = progressionPool
    .filter((item) => levelRank(item.legacyExercise.level) < currentRank)
    .map((item) => {
      const { reasonBadges, score } = scoreCandidate(item);
      return toSuggestion(
        item,
        "Lower complexity option",
        ["Easier option", ...reasonBadges].slice(0, 3),
        score + 10,
      );
    })
    .sort((left, right) => (right.score || 0) - (left.score || 0))
    .slice(0, 6);

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
        <div className="exercise-library-themed-scrollbar flex snap-x gap-1.5 overflow-x-auto overflow-y-hidden pb-1 pr-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
          {modifiers.map((modifier) => {
            const isSelected = selectedModifierIds.includes(modifier.id);

            return (
              <button
                key={modifier.id}
                type="button"
                onClick={() => onToggleModifier(modifier)}
                className={`min-h-[36px] shrink-0 snap-start whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-black transition ${
                  isSelected
                    ? "exercise-library-themed-option-selected border-emerald-300 bg-emerald-300 text-slate-950"
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
  themeStyle,
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
  themeStyle?: ExerciseLibraryThemeCssVariables;
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
        themeStyle={themeStyle}
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
              label === "Feet Width" ||
              label === "Body Position" ||
              label === "Elevation"
            ? "violet"
            : label === "Execution Style"
              ? "emerald"
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
  themeStyle,
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
  themeStyle?: ExerciseLibraryThemeCssVariables;
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
  const getModifierOptionLabel = (modifier: ExerciseModifier) =>
    getControlModifierDisplayLabel(label, modifier);
  const displayValue = selectedOption
    ? getModifierOptionLabel(selectedOption)
    : fallback;
  const fallbackOptionLabel =
    fallback.trim().toLowerCase() === "default" || !fallback.trim()
      ? label
      : fallback.trim();
  const fallbackOptionKey = normalizeFilterCompareValue(fallbackOptionLabel);
  const fallbackMatchesOption = displayOptions.some(
    (option) => normalizeFilterCompareValue(getModifierOptionLabel(option)) === fallbackOptionKey,
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
        className={`exercise-library-themed-select group/control flex w-full min-w-0 items-center justify-between gap-2 border text-left outline-none backdrop-blur-2xl transition ${
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
              style={{ ...dropdownMenuStyle, ...themeStyle }}
              data-exercise-library-floating-menu="true"
              className={`exercise-library-themed-floating-panel fixed overflow-hidden border ${accentClasses[accent].panel} p-1.5 backdrop-blur-2xl ${
                isGrid ? "rounded-xl" : "rounded-2xl"
              }`}
            >
          <div
            role="listbox"
            aria-label={label}
            style={{ maxHeight: dropdownMenuStyle.maxHeight }}
            className={`exercise-library-themed-scrollbar overflow-y-auto pr-1 ${accentClasses[accent].scrollbar} [scrollbar-width:thin]`}
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
                    ? `exercise-library-themed-option-selected ${accentClasses[accent].selected} ${accentClasses[accent].glow}`
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
                normalizeFilterCompareValue(modifierLabel) === fallbackOptionKey;
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
                      ? `exercise-library-themed-option-selected ${accentClasses[accent].selected} ${accentClasses[accent].glow}`
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
  onChipSelect,
  themeStyle,
  customizeSettingsModifierIds = [],
  customizeSettingsFallbackLabels = [],
  customizeSettingsCategoryIds = [],
}: {
  metadata: NormalizedExerciseCatalogItem | null;
  selectedModifierIds: ExerciseModifierId[];
  setSelectedModifierIds: Dispatch<SetStateAction<ExerciseModifierId[]>>;
  movementArchitectureChips: MovementArchitectureChip[];
  classificationChipClass?: string;
  onChipSelect?: (chip: MovementArchitectureChip) => void;
  themeStyle?: ExerciseLibraryThemeCssVariables;
  customizeSettingsModifierIds?: ExerciseModifierId[];
  customizeSettingsFallbackLabels?: string[];
  customizeSettingsCategoryIds?: ExerciseModifierCategoryId[];
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
        return normalizeModifierIdsForCoreMovement(
          metadata?.coreMovementId,
          prev.filter((modifierId) => modifierId !== modifier.id),
        );
      }

      return normalizeModifierIdsForCoreMovement(
        metadata?.coreMovementId,
        [
          ...prev.filter(
            (modifierId) =>
              getModifierCategoryId(modifierId) !== modifier.categoryId,
          ),
          modifier.id,
        ],
      );
    });
  };

  const isSquatUnilateralModifier = (modifier: ExerciseModifier) =>
    metadata?.coreMovementId === "squat" &&
    modifier.id === "execution-style:unilateral";

  const customizeSettingsModifierIdSet = new Set(customizeSettingsModifierIds);
  const customizeSettingsDedupKeys = new Set([
    ...customizeSettingsModifierIds.flatMap(getModifierDedupKeysForModifierId),
    ...customizeSettingsFallbackLabels.flatMap(getModifierDedupKeysForLabel),
  ]);
  const hiddenVariationModifierGroupCategoryIds =
    new Set<ExerciseModifierCategoryId>([
      "apparatus",
      "angle-position",
      "load-behavior",
      "training-intent",
      ...customizeSettingsCategoryIds,
      ...(metadata?.coreMovementId === "squat"
        ? (["direction", "limb-usage"] as ExerciseModifierCategoryId[])
        : []),
      ...(metadata?.coreMovementId === "hinge"
        ? (["direction"] as ExerciseModifierCategoryId[])
        : []),
      ...(metadata?.coreMovementId &&
      hipThrustBridgeCoreMovementIds.has(metadata.coreMovementId)
        ? (["range-of-motion", "tempo"] as ExerciseModifierCategoryId[])
        : []),
    ]);
  const isModifierRepresentedByCustomizeSettings = (
    modifier: ExerciseModifier,
  ) =>
    customizeSettingsModifierIdSet.has(modifier.id) ||
    getModifierDedupKeysForModifier(modifier).some((key) =>
      customizeSettingsDedupKeys.has(key),
    );
  const remainingModifierGroups = compatibleModifierGroups
    .filter(
      (group) => !hiddenVariationModifierGroupCategoryIds.has(group.categoryId),
    )
    .map((group) => ({
      ...group,
      modifiers: group.modifiers.filter(
        (modifier) =>
          !isSquatUnilateralModifier(modifier) &&
          !isModifierRepresentedByCustomizeSettings(modifier),
      ),
    }))
    .filter((group) => group.modifiers.length > 0);
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
    <div className="exercise-library-themed-intelligence mt-3 rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.06] p-3 backdrop-blur-2xl">
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
            onChipSelect={onChipSelect}
          />

          <div className="exercise-library-themed-panel rounded-2xl border border-cyan-200/25 bg-[linear-gradient(135deg,rgba(34,211,238,0.22),rgba(16,185,129,0.12))] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_34px_rgba(8,145,178,0.16)]">
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
                      style={{ ...modifierPopoverStyle, ...themeStyle }}
                      className="exercise-library-themed-floating-panel fixed max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[26px] border border-cyan-100/15 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(16,185,129,0.13),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.94))] shadow-[0_30px_100px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl sm:max-w-[calc(100vw-2rem)]"
                    >
                      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/45 to-transparent" />
                      <div
                        style={{ maxHeight: modifierPopoverStyle.maxHeight }}
                        className="exercise-library-themed-scrollbar relative overflow-y-auto overflow-x-hidden overscroll-contain p-4 [scrollbar-gutter:stable] sm:p-5"
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

function LatestSetInsightLine({
  compact = false,
  insight,
  preferredWeightUnit = "lbs",
}: {
  compact?: boolean;
  insight: LatestSetInsight;
  preferredWeightUnit?: WeightUnit;
}) {
  return (
    <div
      className={`exercise-library-latest-insight mt-2 rounded-xl border border-emerald-200/18 bg-emerald-300/10 text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] ${
        compact ? "px-2 py-1.5" : "px-3 py-2"
      }`}
    >
      <p
        className={`font-black leading-snug ${
          compact ? "text-[10px]" : "text-xs"
        }`}
      >
        {formatLatestSetInsightDisplayLine(insight, preferredWeightUnit)}
      </p>
      <p
        className={`mt-0.5 font-bold leading-snug text-emerald-100/76 ${
          compact ? "text-[9px]" : "text-[11px]"
        }`}
      >
        {[
          insight.summaryLine,
          insight.goalLine,
          insight.lastTrainedLine,
          insight.achievementLine,
          insight.remainingLine,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </div>
  );
}

function MiniPanelScroller({
  ariaLabel,
  children,
  className = "",
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollByDirection = (direction: "left" | "right") => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      behavior: "smooth",
      left: scroller.clientWidth * (direction === "right" ? 0.78 : -0.78),
    });
  };

  return (
    <div className={`exercise-library-mini-scroller relative ${className}`}>
      <button
        type="button"
        aria-label={`Scroll ${ariaLabel} left`}
        onClick={() => scrollByDirection("left")}
        className="exercise-library-mini-scroller__arrow exercise-library-mini-scroller__arrow--left"
      >
        <span aria-hidden="true">{"<"}</span>
      </button>
      <div
        ref={scrollRef}
        aria-label={ariaLabel}
        className="exercise-library-themed-scrollbar exercise-library-mini-scroller__viewport"
      >
        <div className="exercise-library-mini-scroller__track">{children}</div>
      </div>
      <button
        type="button"
        aria-label={`Scroll ${ariaLabel} right`}
        onClick={() => scrollByDirection("right")}
        className="exercise-library-mini-scroller__arrow exercise-library-mini-scroller__arrow--right"
      >
        <span aria-hidden="true">{">"}</span>
      </button>
    </div>
  );
}

type RecentStatsView = "recent" | "best" | "volume" | "history";

function StatMiniCard({
  cell,
  compact = false,
  preferredWeightUnit,
}: {
  cell: {
    detail: string;
    label: string;
    value: string | number;
    weightVolume?: number;
    weightVolumeComparisonLabel?: string;
    weightVolumeTarget?: number;
  };
  compact?: boolean;
  preferredWeightUnit: WeightUnit;
}) {
  return (
    <div
      className={`exercise-library-themed-stat-tile min-w-0 shrink-0 snap-start rounded-xl border border-white/10 bg-slate-950/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${
        compact ? "w-[9.5rem] px-2 py-2" : "w-[10.75rem] px-2.5 py-2.5"
      }`}
    >
      <p className="break-words text-[8px] font-black uppercase leading-[11px] tracking-[0.06em] text-white/35">
        {cell.label}
      </p>
      <p className="mt-1 break-words text-sm font-black leading-4 text-white">
        {cell.value}
      </p>
      {typeof cell.weightVolume === "number" ? (
        <WeightVolumeStat
          className="mt-1.5"
          comparisonLabel={cell.weightVolumeComparisonLabel}
          targetVolume={cell.weightVolumeTarget}
          volume={cell.weightVolume}
          weightUnit={preferredWeightUnit}
        />
      ) : null}
      <p className="mt-0.5 break-words text-[9px] font-semibold leading-3 text-slate-400">
        {cell.detail}
      </p>
    </div>
  );
}

function RecentStatsStrip({
  stats,
  compact = false,
  latestInsight,
  preferredWeightUnit = "lbs",
  weeklyVolumeRangeLabel = formatWeeklyVolumeRangeLabel(),
}: {
  stats: LocalExerciseStatEntry[];
  compact?: boolean;
  latestInsight?: LatestSetInsight | null;
  preferredWeightUnit?: WeightUnit;
  weeklyVolumeRangeLabel?: string;
}) {
  const [view, setView] = useState<RecentStatsView>("recent");
  const latest = stats[0];
  const recentStats = stats.slice(0, 3);
  const bestLoadStat = stats.reduce<LocalExerciseStatEntry | null>(
    (best, stat) =>
      !best || parseStatNumber(stat.weight) > parseStatNumber(best.weight)
        ? stat
        : best,
    null,
  );
  const bestRepsStat = stats.reduce<LocalExerciseStatEntry | null>(
    (best, stat) =>
      !best || parseStatNumber(stat.reps) > parseStatNumber(best.reps)
        ? stat
        : best,
    null,
  );
  const bestVolumeStat = stats.reduce<LocalExerciseStatEntry | null>(
    (best, stat) =>
      !best || getStatVolume(stat) > getStatVolume(best) ? stat : best,
    null,
  );
  const bestEstimatedOneRepMaxStat = stats.reduce<LocalExerciseStatEntry | null>(
    (best, stat) =>
      !best || getEstimatedOneRepMax(stat) > getEstimatedOneRepMax(best)
        ? stat
        : best,
    null,
  );
  const weeklyVolume = getWeeklyVolumeForStats(stats);
  const previousWeeklyWeightVolume =
    getPreviousTrailingSevenDayWeightVolumeForStats(stats);
  const weeklyWeightVolumeComparisonLabel = formatWeightVolumeComparison(
    weeklyVolume.weightVolume,
    previousWeeklyWeightVolume,
  );
  const recentWeightVolume = recentStats.reduce(
    (total, stat) => total + getStatVolume(stat),
    0,
  );
  const weeklyGoal = getWeeklySetGoalForExercise();
  const hasBestStats =
    Boolean(bestLoadStat && parseStatNumber(bestLoadStat.weight) > 0) ||
    Boolean(bestRepsStat && parseStatNumber(bestRepsStat.reps) > 0) ||
    Boolean(bestVolumeStat && getStatVolume(bestVolumeStat) > 0) ||
    Boolean(
      bestEstimatedOneRepMaxStat &&
        getEstimatedOneRepMax(bestEstimatedOneRepMaxStat) > 0,
    );
  const recentCells = latest
    ? [
        {
          label: "Last Load",
          value:
            formatWeightMetric(parseStatNumber(latest.weight), preferredWeightUnit) ||
            "--",
          detail: `${latest.reps || "--"} reps x ${latest.sets || "--"} sets`,
        },
        {
          label: "Last Reps",
          value: latest.reps || "--",
          detail: `${latest.sets || "--"} sets`,
        },
        {
          label: "Recent Weight Volume",
          value:
            formatWeightMetric(
              recentWeightVolume,
              preferredWeightUnit,
              { compact: true, volume: true },
            ) || "--",
          detail: "last 3 entries",
          weightVolume: recentWeightVolume,
        },
      ]
    : [];
  const bestCells = hasBestStats
    ? [
        {
          label: "Best Load",
          value:
            bestLoadStat && parseStatNumber(bestLoadStat.weight) > 0
              ? formatWeightMetric(
                  parseStatNumber(bestLoadStat.weight),
                  preferredWeightUnit,
                )
              : "--",
          detail: bestLoadStat
            ? `${bestLoadStat.reps || "--"} reps`
            : "No load yet",
        },
        {
          label: "Best Reps",
          value:
            bestRepsStat && parseStatNumber(bestRepsStat.reps) > 0
              ? formatMetric(parseStatNumber(bestRepsStat.reps))
              : "--",
          detail: bestRepsStat
            ? `${formatWeightMetric(
                parseStatNumber(bestRepsStat.weight),
                preferredWeightUnit,
              ) || "--"} load`
            : "No reps yet",
        },
        {
          label: "Best Weight Volume",
          value:
            bestVolumeStat && getStatVolume(bestVolumeStat) > 0
              ? formatWeightMetric(
                  getStatVolume(bestVolumeStat),
                  preferredWeightUnit,
                  { compact: true, volume: true },
                )
              : "--",
          detail: bestVolumeStat
            ? new Date(bestVolumeStat.date).toLocaleDateString()
            : "No volume yet",
          weightVolume: bestVolumeStat
            ? getStatVolume(bestVolumeStat)
            : 0,
        },
        {
          label: "Est. 1RM",
          value:
            bestEstimatedOneRepMaxStat &&
            getEstimatedOneRepMax(bestEstimatedOneRepMaxStat) > 0
              ? formatWeightMetric(
                  getEstimatedOneRepMax(bestEstimatedOneRepMaxStat),
                  preferredWeightUnit,
                )
              : "--",
          detail: bestEstimatedOneRepMaxStat
            ? `${formatWeightMetric(
                parseStatNumber(bestEstimatedOneRepMaxStat.weight),
                preferredWeightUnit,
              ) || "--"} x ${
                bestEstimatedOneRepMaxStat.reps || "--"
              }`
            : "No estimate yet",
        },
      ]
    : [];
  const volumeCells = [
    {
      label: "Set Volume",
      value: `${Math.max(0, Math.round(weeklyVolume.sets))}`,
      detail: `${Math.max(0, Math.round(weeklyVolume.sets))} / ${weeklyGoal} sets`,
    },
    {
      label: "Weekly Reps",
      value: formatMetric(weeklyVolume.reps),
      detail: weeklyVolumeRangeLabel,
    },
    {
      label: "Weight Volume",
      value:
        formatWeightMetric(weeklyVolume.weightVolume, preferredWeightUnit, {
          compact: true,
          volume: true,
        }) || "--",
      detail: weeklyVolume.weightVolume > 0 ? weeklyVolumeRangeLabel : "No load volume yet",
      weightVolumeComparisonLabel: weeklyWeightVolumeComparisonLabel,
      weightVolumeTarget: previousWeeklyWeightVolume,
      weightVolume: weeklyVolume.weightVolume,
    },
    {
      label: "Goal Progress",
      value: `${Math.round(
        getWeeklySetGoalFillPercent(weeklyVolume.sets, weeklyGoal),
      )}%`,
      detail: "weekly target",
    },
  ];
  const historyCells = stats.slice(0, 8).map((stat) => ({
    label: new Date(stat.date).toLocaleDateString(),
    value: `${stat.sets || "--"} x ${stat.reps || "--"}`,
    detail: `${formatWeightMetric(parseStatNumber(stat.weight), preferredWeightUnit) || "--"} load`,
  }));
  const activeCells =
    view === "recent"
      ? recentCells
      : view === "best"
        ? bestCells
        : view === "volume"
          ? volumeCells
          : historyCells;
  const activeDate =
    view === "recent" && latest
      ? new Date(latest.date).toLocaleDateString()
      : view === "best" && bestVolumeStat
        ? "Best"
        : view === "volume"
          ? weeklyVolumeRangeLabel
          : view === "history"
            ? `${stats.length} logs`
        : "";
  const statsViewLabel =
    view === "recent"
      ? "Recent"
      : view === "best"
        ? "Best"
        : view === "volume"
          ? "Volume"
          : "History";
  const emptyStatsMessage =
    view === "best"
      ? "No best stats yet"
      : view === "history"
        ? "No history yet"
        : view === "volume"
          ? "No weekly volume yet"
          : "No recent stats yet. Log this movement to build history.";
  const containerClass = `exercise-library-themed-stats rounded-2xl border border-emerald-300/15 bg-[linear-gradient(135deg,rgba(16,185,129,0.13),rgba(34,211,238,0.06))] shadow-[inset_0_1px_0_rgba(255,255,255,0.10)${
    compact ? "" : ",0_10px_30px_rgba(16,185,129,0.08)"
  }] ${compact ? "mt-3 px-3 py-2.5" : "mt-2.5 p-3"}`;
  const toggle = (
    <div
      aria-label="Stats view"
      className="exercise-library-recent-stats-tabs exercise-library-themed-scrollbar flex min-w-0 max-w-[min(100%,15rem)] flex-nowrap gap-1 overflow-x-auto rounded-xl border border-white/10 bg-slate-950/42 p-0.5"
    >
      {(["recent", "best", "volume", "history"] as RecentStatsView[]).map((option) => {
        const isActive = view === option;
        const label =
          compact && option === "history"
            ? "Hist"
            : option === "volume"
              ? "Volume"
              : titleCase(option);

        return (
          <button
            key={option}
            type="button"
            aria-pressed={isActive}
            onClick={() => setView(option)}
            className={`min-w-[3.25rem] max-w-[4.75rem] shrink-0 truncate rounded-lg px-2 py-1 text-center text-[8px] font-black uppercase tracking-[0.08em] transition ${
              isActive
                ? "exercise-library-themed-toggle-active bg-emerald-300 text-slate-950 shadow-[0_0_18px_rgba(16,185,129,0.22)]"
                : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
            }`}
            title={titleCase(option)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  if (!latest) {
    return (
      <div
        className={`exercise-library-themed-stats rounded-2xl border border-emerald-300/12 bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(34,211,238,0.045))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${
          compact ? "mt-2 px-3 py-2.5" : "mt-2.5 px-3.5 py-3"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
            Recent Stats
          </p>
          {toggle}
        </div>
        {latestInsight ? (
          <LatestSetInsightLine
            compact
            insight={latestInsight}
            preferredWeightUnit={preferredWeightUnit}
          />
        ) : null}
        {activeCells.length ? (
          <MiniPanelScroller ariaLabel={`${statsViewLabel} stats`} className="mt-2">
            {activeCells.map((cell) => (
              <StatMiniCard
                key={`${view}-${cell.label}`}
                cell={cell}
                compact
                preferredWeightUnit={preferredWeightUnit}
              />
            ))}
          </MiniPanelScroller>
        ) : (
          <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-400">
            {emptyStatsMessage}
          </p>
        )}
      </div>
    );
  }

  if (compact) {
    return (
      <div className={containerClass}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
            {statsViewLabel}
          </p>
          {toggle}
        </div>
        {latestInsight ? (
          <LatestSetInsightLine
            compact
            insight={latestInsight}
            preferredWeightUnit={preferredWeightUnit}
          />
        ) : null}
        {(view === "best" && !hasBestStats) ||
        (view === "history" && historyCells.length === 0) ||
        (view === "recent" && recentCells.length === 0) ? (
          <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-400">
            {emptyStatsMessage}
          </p>
        ) : (
          <MiniPanelScroller ariaLabel={`${statsViewLabel} stats`} className="mt-2">
            {activeCells.map((cell) => (
              <StatMiniCard
                key={`${view}-${cell.label}`}
                cell={cell}
                compact
                preferredWeightUnit={preferredWeightUnit}
              />
            ))}
          </MiniPanelScroller>
        )}
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/30">
            {activeDate}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
            {stats.length} logs
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">
          {statsViewLabel} Stats
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {activeDate ? (
            <p className="hidden text-[10px] font-bold uppercase tracking-[0.12em] text-white/35 sm:block">
              {activeDate}
            </p>
          ) : null}
          {toggle}
        </div>
      </div>

      {latestInsight ? (
        <LatestSetInsightLine
          insight={latestInsight}
          preferredWeightUnit={preferredWeightUnit}
        />
      ) : null}

      {(view === "best" && !hasBestStats) ||
      (view === "history" && historyCells.length === 0) ||
      (view === "recent" && recentCells.length === 0) ? (
        <p className="mt-2.5 rounded-xl border border-white/10 bg-slate-950/35 px-3 py-3 text-xs font-semibold text-slate-400">
          {emptyStatsMessage}
        </p>
      ) : (
        <MiniPanelScroller ariaLabel={`${statsViewLabel} stats`} className="mt-2.5">
          {activeCells.map((cell) => (
            <StatMiniCard
              key={`${view}-${cell.label}`}
              cell={cell}
              preferredWeightUnit={preferredWeightUnit}
            />
          ))}
        </MiniPanelScroller>
      )}
    </div>
  );
}

function MovementSuggestionList({
  title,
  suggestions,
  empty,
  onSelectSuggestion,
}: {
  title: string;
  suggestions: MovementSuggestion[];
  empty: string;
  onSelectSuggestion: (suggestion: MovementSuggestion) => void;
}) {
  return (
    <div className="exercise-library-themed-panel rounded-2xl border border-white/10 bg-slate-950/35 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
        {title}
      </p>

      {suggestions.length ? (
        <MiniPanelScroller ariaLabel={`${title} exercise matches`} className="mt-2">
          {suggestions.map((suggestion) => (
            <button
              key={`${title}-${suggestion.id}`}
              type="button"
              onClick={() => onSelectSuggestion(suggestion)}
              className="exercise-library-themed-stat-tile min-h-[112px] w-[13.5rem] shrink-0 snap-start rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-left transition hover:-translate-y-0.5 hover:border-cyan-100/28 hover:bg-cyan-300/10 focus:outline-none focus:ring-2 focus:ring-cyan-100/28"
            >
              <p className="text-xs font-black text-white">
                {suggestion.name}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-cyan-100/60">
                {suggestion.equipment} · {suggestion.level}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {(suggestion.reasonBadges?.length
                  ? suggestion.reasonBadges
                  : [suggestion.reason]
                ).map((reason) => (
                  <span
                    key={`${suggestion.id}-${reason}`}
                    className="rounded-lg border border-cyan-100/14 bg-cyan-300/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.06em] text-cyan-100/76"
                  >
                    {reason}
                  </span>
                ))}
              </div>
              {typeof suggestion.score === "number" && suggestion.score > 0 ? (
                <p className="mt-2 text-[9px] font-black uppercase tracking-[0.1em] text-white/35">
                  Match {Math.min(99, Math.round(suggestion.score))}%
                </p>
              ) : null}
            </button>
          ))}
        </MiniPanelScroller>
      ) : (
        <p className="mt-2 text-xs leading-5 text-slate-400">{empty}</p>
      )}
    </div>
  );
}

function MovementSuggestionsPanel({
  suggestions,
  isOpen,
  onSelectSuggestion,
  onToggle,
}: {
  suggestions: ReturnType<typeof getMovementSuggestions>;
  isOpen: boolean;
  onSelectSuggestion: (suggestion: MovementSuggestion) => void;
  onToggle: () => void;
}) {
  return (
    <div className="exercise-library-themed-panel group mt-3 rounded-2xl border border-white/10 bg-slate-950/45">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        className="flex w-full cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left"
      >
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
          className={`text-sm font-black text-cyan-100 transition ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          v
        </span>
      </button>

      {isOpen ? (
        <div className="border-t border-white/10 p-3">
          <MovementSuggestionList
            title="Best Matches"
            suggestions={suggestions.substitutions}
            empty="No close substitutions found yet."
            onSelectSuggestion={onSelectSuggestion}
          />
        </div>
      ) : null}
    </div>
  );
}

function MovementProgressPanel({
  suggestions,
  isOpen,
  onSelectSuggestion,
  onToggle,
}: {
  suggestions: ReturnType<typeof getMovementSuggestions>;
  isOpen: boolean;
  onSelectSuggestion: (suggestion: MovementSuggestion) => void;
  onToggle: () => void;
}) {
  return (
    <div className="exercise-library-themed-panel group mt-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.07]">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        className="flex w-full cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left"
      >
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
          className={`text-sm font-black text-emerald-100 transition ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          v
        </span>
      </button>

      {isOpen ? (
        <div className="grid gap-2 border-t border-white/10 p-3">
          <MovementSuggestionList
            title="Progress"
            suggestions={suggestions.progressions}
            empty="No clear progression mapped yet."
            onSelectSuggestion={onSelectSuggestion}
          />
          <MovementSuggestionList
            title="Regress"
            suggestions={suggestions.regressions}
            empty="No simpler regression mapped yet."
            onSelectSuggestion={onSelectSuggestion}
          />
        </div>
      ) : null}
    </div>
  );
}

type CoachingCueCard = {
  label: string;
  text: string;
};

const splitCueTextIntoCards = (cue: string): CoachingCueCard[] => {
  const parts = cue
    .split(/\s*(?:\n+|;|\s+\|\s+)\s*/g)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) return cue.trim() ? [{ label: "Cue", text: cue.trim() }] : [];

  return parts.map((text, index) => ({
    label: `Cue ${index + 1}`,
    text,
  }));
};

const getCoachingCueCards = (
  exercise: Exercise,
  metadata: NormalizedExerciseCatalogItem | null,
) => {
  const coreMovement = metadata?.coreMovementId
    ? CORE_MOVEMENT_BY_ID[metadata.coreMovementId]
    : null;
  const cueCandidates: CoachingCueCard[] = [
    ...splitCueTextIntoCards(exercise.cue || ""),
    ...(exercise.coachingCue && exercise.coachingCue !== exercise.cue
      ? splitCueTextIntoCards(exercise.coachingCue).map((cue) => ({
          ...cue,
          label: cue.label === "Cue" ? "Coaching Cue" : cue.label,
        }))
      : []),
    ...(coreMovement?.defaultCue && coreMovement.defaultCue !== exercise.cue
      ? [{ label: "Setup Cue", text: coreMovement.defaultCue }]
      : []),
  ];
  const seen = new Set<string>();

  return cueCandidates.filter((cue) => {
    const key = normalizeFilterCompareValue(cue.text);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

function CoachingCueScroller({ cues }: { cues: CoachingCueCard[] }) {
  if (cues.length <= 1) {
    return (
      <div className="exercise-library-themed-panel mt-3 rounded-2xl border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(16,185,129,0.05))] p-4 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-200/80 drop-shadow-[0_0_8px_rgba(16,185,129,0.35)]">
          Coaching Cue
        </p>
        <p className="mt-2 text-sm leading-5 text-emerald-100/80 drop-shadow-[0_0_10px_rgba(16,185,129,0.25)]">
          {cues[0]?.text || "No coaching cue mapped yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="exercise-library-themed-panel mt-3 rounded-2xl border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(16,185,129,0.05))] p-3 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-200/80 drop-shadow-[0_0_8px_rgba(16,185,129,0.35)]">
          Coaching Cues
        </p>
        <span className="rounded-full border border-emerald-100/14 bg-emerald-300/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-emerald-100/65">
          {cues.length} cues
        </span>
      </div>
      <MiniPanelScroller ariaLabel="Coaching cues">
        {cues.map((cue) => (
          <div
            key={`${cue.label}-${cue.text}`}
            className="exercise-library-themed-stat-tile min-h-[104px] w-[15rem] shrink-0 snap-start rounded-xl border border-emerald-100/12 bg-emerald-300/10 px-3 py-2"
          >
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-100/58">
              {cue.label}
            </p>
            <p className="mt-2 text-sm font-semibold leading-5 text-emerald-50/86">
              {cue.text}
            </p>
          </div>
        ))}
      </MiniPanelScroller>
      <div className="mt-2 flex justify-center gap-1">
        {cues.map((cue) => (
          <span
            key={`dot-${cue.label}-${cue.text}`}
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-emerald-200/45"
          />
        ))}
      </div>
    </div>
  );
}

function ExerciseLibraryCard({
  exercise,
  cardInstanceId,
  sectionTheme,
  metadata,
  suggestions,
  latestSetInsight,
  planAddToParam,
  preferredWeightUnit,
  savedExerciseStats,
  viewMode,
  weeklyVolumeRangeLabel,
  searchedEquipmentModifierId,
  isFavorite,
  onToggleFavorite,
  onAddToPlan,
  onDeleteCustom,
  onAddStats,
  onCreateVariation,
  onBodyFilterSelect,
  onDifficultyFilterSelect,
  onMovementChipSelect,
  onMuscleSelect,
  onSuggestionSelect,
  weeklySetsByMuscleLabel,
  isExerciseDetailsOpen,
  onToggleExerciseDetails,
  isMovementDetailsOpen,
  onToggleMovementDetails,
}: {
  exercise: Exercise;
  cardInstanceId: string;
  sectionTheme: CategoryTheme;
  metadata: NormalizedExerciseCatalogItem | null;
  suggestions: ReturnType<typeof getMovementSuggestions>;
  latestSetInsight?: LatestSetInsight | null;
  planAddToParam: string;
  preferredWeightUnit: WeightUnit;
  savedExerciseStats: LocalExerciseStatEntry[];
  viewMode: ExerciseLibraryViewMode;
  weeklyVolumeRangeLabel: string;
  searchedEquipmentModifierId: ExerciseModifierId | null;
  isFavorite: boolean;
  onToggleFavorite: (exerciseId: string) => void;
  onAddToPlan: (exercise: Exercise) => void;
  onDeleteCustom: (id: string) => void;
  onAddStats: (
    exercise: Exercise,
    mode: ExerciseStatsMenuMode,
    anchorElement?: HTMLElement | null,
  ) => void;
  onCreateVariation: (coreMovementId?: CoreMovementId | string) => void;
  onBodyFilterSelect: (body: string) => void;
  onDifficultyFilterSelect: (level: string) => void;
  onMovementChipSelect: (chip: MovementArchitectureChip) => void;
  onMuscleSelect: (muscle: string) => void;
  onSuggestionSelect: (suggestion: MovementSuggestion) => void;
  weeklySetsByMuscleLabel: Map<string, number>;
  isExerciseDetailsOpen: boolean;
  onToggleExerciseDetails: (exerciseId: string | null) => void;
  isMovementDetailsOpen: boolean;
  onToggleMovementDetails: (cardInstanceId: string | null) => void;
}) {
  const [selectedModifierIds, setSelectedModifierIds] = useState<
    ExerciseModifierId[]
  >(() =>
    normalizeModifierIdsForCoreMovement(
      metadata?.coreMovementId,
      getDefaultSelectedModifierIds(metadata),
    ),
  );
  const [isVariationDropdownOpen, setIsVariationDropdownOpen] =
    useState(false);
  const [isSemanticDropdownOpen, setIsSemanticDropdownOpen] = useState(false);
  const [activeMovementDetailsSubPanel, setActiveMovementDetailsSubPanel] =
    useState<MovementDetailsSubPanel | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const gridDetailsDropdownRef = useRef<HTMLDivElement | null>(null);
  const gridDetailsButtonRef = useRef<HTMLButtonElement | null>(null);
  const gridDetailsFloatingPanelRef = useRef<HTMLDivElement | null>(null);
  const settingsDropdownRef = useRef<HTMLDivElement | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsFloatingPanelRef = useRef<HTMLDivElement | null>(null);
  const movementDetailsDropdownRef = useRef<HTMLDivElement | null>(null);
  const movementDetailsButtonRef = useRef<HTMLButtonElement | null>(null);
  const movementDetailsFloatingPanelRef = useRef<HTMLDivElement | null>(null);
  const lockedGridDetailsPanelWidthRef = useRef<number | null>(null);
  const lockedGridSettingsPanelWidthRef = useRef<number | null>(null);
  const lockedMovementDetailsPanelWidthRef = useRef<number | null>(null);
  const [gridDetailsPanelStyle, setGridDetailsPanelStyle] =
    useState<CSSProperties | null>(null);
  const [gridSettingsPanelStyle, setGridSettingsPanelStyle] =
    useState<CSSProperties | null>(null);
  const [movementDetailsPanelStyle, setMovementDetailsPanelStyle] =
    useState<CSSProperties | null>(null);
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
  const categoryTheme = sectionTheme || getCategoryTheme(cardClassificationLabel);
  const categoryThemeStyle = getCategoryThemeCssVariables(categoryTheme);
  const difficultyTheme = getDifficultyTheme(exercise.level);
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
    selectedModifierIds,
  });
  const goalLabel = getSelectedGoalLabel(exercise, selectedModifierIds, metadata);
  const selectedSemanticVariationId =
    selectedSemanticVariation?.id || exercise.semanticVariationId;
  const exerciseStatHistory = getExerciseStatHistory(
    savedExerciseStats,
    exercise,
    activeExerciseName,
    metadata,
    selectedSemanticVariationId,
  );
  const weeklyExerciseVolume = getWeeklyVolumeForStats(exerciseStatHistory);
  const weeklyExerciseWeightVolumeLabel = formatWeightMetric(
    weeklyExerciseVolume.weightVolume,
    preferredWeightUnit,
    { compact: true, volume: true },
  );
  const weeklyExerciseGoal = getWeeklySetGoalForExercise();
  const weeklyExerciseStatusId = getWeeklySetGoalStatusId(
    weeklyExerciseVolume.sets,
    weeklyExerciseGoal,
  );
  const cardLatestSetInsight =
    latestSetInsight?.exerciseId === exercise.id ? latestSetInsight : null;
  const cardVolumeStyle = {
    ...categoryThemeStyle,
    "--exercise-card-volume-progress": `${getWeeklySetGoalFillPercent(
      weeklyExerciseVolume.sets,
      weeklyExerciseGoal,
    )}%`,
  } as ExerciseLibraryThemeCssVariables;
  const lifetimeSetsComplete = getLifetimeSetsComplete(
    savedExerciseStats,
    exercise,
    metadata,
    activeExerciseName,
    selectedSemanticVariationId,
  );
  const lifetimeSetsCompleteLabel =
    formatLifetimeSetsComplete(lifetimeSetsComplete);
  const weeklyExerciseVolumePill = (
    <span
      className={`rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.08em] sm:px-2 sm:text-[8px] ${categoryTheme.pillClass}`}
      title={`${cardTitle}: ${Math.max(
        0,
        Math.round(weeklyExerciseVolume.sets),
      )} of ${weeklyExerciseGoal} weekly sets, ${weeklyVolumeStatusConfig[weeklyExerciseStatusId].label}`}
    >
      <WeeklySetGoalBadge
        completedSets={weeklyExerciseVolume.sets}
        completedReps={weeklyExerciseVolume.reps}
        completedWeightVolume={weeklyExerciseVolume.weightVolume}
        goalSets={weeklyExerciseGoal}
        rangeLabel={weeklyVolumeRangeLabel}
        showReps
        showWeightVolume={Boolean(weeklyExerciseWeightVolumeLabel)}
        weightUnit={preferredWeightUnit}
      />
    </span>
  );
  const movementArchitectureChips = getMovementArchitectureChips(
    exercise,
    metadata,
    selectedModifierIds,
  );
  const muscleIntelligence = getExerciseMuscleIntelligence(exercise, metadata);
  const coachingCueCards = getCoachingCueCards(exercise, metadata);
  const isGridView = viewMode === "grid";
  const isGridDetailsOpen = isGridView && isExerciseDetailsOpen;
  const isDetailExerciseDetailsOpen = !isGridView && isExerciseDetailsOpen;
  const semanticVariationStatsById = useMemo(
    () =>
      Object.fromEntries(
        semanticVariationOptions.map((variation) => [
          variation.id,
          getSemanticVariationStatsSummary(
            savedExerciseStats,
            exercise,
            variation,
          ),
        ]),
      ) as Record<string, SemanticVariationStatsSummary>,
    [exercise, savedExerciseStats, semanticVariationOptions],
  );
  const compatibleModifierGroups = getCompatibleModifierGroups(metadata);
  const coreMovementId = metadata?.coreMovementId || null;
  const rawGoalModifierGroup = compatibleModifierGroups.find(
    (group) => group.categoryId === "training-intent",
  );
  const goalModifierGroup =
    coreMovementId && hipThrustBridgeCoreMovementIds.has(coreMovementId) && rawGoalModifierGroup
      ? {
          ...rawGoalModifierGroup,
          modifiers: rawGoalModifierGroup.modifiers.filter(
            (modifier) => modifier.id !== "training-intent:stability",
          ),
        }
      : rawGoalModifierGroup;
  const selectedGoalModifierId =
    getSelectedModifiersByCategory(selectedModifierIds, "training-intent").find(
      (modifier) =>
        goalModifierGroup?.modifiers.some((option) => option.id === modifier.id),
    )?.id || "";
  const modifierGroupsByCategory = new Map(
    compatibleModifierGroups.map((group) => [group.categoryId, group]),
  );
  const modifierControlDefinitions =
    (coreMovementId && cardModifierControlPresets[coreMovementId]) ||
    [
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
    const explicitOptionSourceById = control.categories.includes("apparatus")
      ? new Map(
          Object.values(EXERCISE_MODIFIER_BY_ID).map((modifier) => [
            modifier.id,
            modifier,
          ]),
        )
      : availableOptionsById;
    const standardRangeOfMotionOptions = getStandardRangeOfMotionOptions();

    if (isRangeOfMotionControl(control)) {
      return standardRangeOfMotionOptions;
    }

    const orderedOptions = control.optionIds
      ? control.optionIds
          .map((modifierId) => explicitOptionSourceById.get(modifierId))
          .filter((modifier): modifier is ExerciseModifier => Boolean(modifier))
      : categoryOptions;
    const normalizedOptions = hasRangeOfMotionControlCategory(control)
      ? [
          ...orderedOptions.filter(
            (modifier) => modifier.categoryId !== "range-of-motion",
          ),
          ...standardRangeOfMotionOptions,
        ]
      : orderedOptions;

    return dedupeModifierOptionsByDisplayLabel(normalizedOptions);
  };
  const getSelectedModifierIdForControl = (
    control: CardModifierControlDefinition,
    options: ExerciseModifier[],
  ) => {
    const selectedModifierId = selectedModifierIds.find((modifierId) =>
      options.some((option) => option.id === modifierId),
    );
    if (selectedModifierId) return selectedModifierId;

    if (
      isRangeOfMotionControl(control) &&
      options.some((option) => option.id === defaultRangeOfMotionModifierId)
    ) {
      return defaultRangeOfMotionModifierId;
    }

    return "";
  };
  const getFallbackForControl = (
    control: CardModifierControlDefinition,
    options: ExerciseModifier[],
  ) => {
    if (control.categories.includes("apparatus")) return equipmentLabel;
    if (isLoadPositionControl(control)) return nonApplicableModifierControlLabel;
    if (isRangeOfMotionControl(control)) return "Full ROM";
    if (isFeetWidthControlLabel(control.label)) return "Standard";
    if (control.key === "hinge-position") return "Standing";
    if (control.label === "Stability") return "Support";

    return patternLabel || control.label;
  };
  const modifierControls = modifierControlDefinitions
    .map((control) => {
      const options = getOptionsForControl(control);

      return {
        ...control,
        options,
        value: getSelectedModifierIdForControl(control, options),
        fallback: getFallbackForControl(control, options),
      };
    })
    .filter((control) => control.options.length > 0);
  const customizeSettingsOptionIdSet = new Set(
    modifierControls.flatMap((control) =>
      control.options.map((option) => option.id),
    ),
  );
  const customizeSettingsModifierIds = uniqueModifierIds(
    selectedModifierIds.filter((modifierId) =>
      customizeSettingsOptionIdSet.has(modifierId),
    ),
  );
  const customizeSettingsCategoryIds = Array.from(
    new Set(
      modifierControls.flatMap((control) => control.categories),
    ),
  );
  const customizeSettingsFallbackLabels = modifierControls
    .filter((control) => !control.value)
    .map((control) => control.fallback)
    .filter(Boolean);
  const searchedEquipmentControl = modifierControls.find((control) =>
    control.categories.includes("apparatus"),
  );
  const searchedEquipmentOptionIds =
    searchedEquipmentControl?.options.map((option) => option.id) || [];
  const searchedEquipmentOptionKey = searchedEquipmentOptionIds.join("|");
  const searchedEquipmentIsAvailable = searchedEquipmentModifierId
    ? searchedEquipmentOptionIds.includes(searchedEquipmentModifierId)
    : false;
  const searchedEquipmentCanPreserveOrSwitchSemantic = (() => {
    if (
      !searchedEquipmentModifierId ||
      !searchedEquipmentIsAvailable ||
      !selectedSemanticVariation
    ) {
      return true;
    }

    const allowedApparatusIds = getSemanticVariationAllowedApparatusIds(
      selectedSemanticVariation,
    );
    if (
      !selectedSemanticVariation.equipmentStrict ||
      allowedApparatusIds.includes(searchedEquipmentModifierId)
    ) {
      return true;
    }

    const candidateModifierIds = uniqueModifierIds([
      ...getNonApparatusModifierIds(selectedModifierIds),
      searchedEquipmentModifierId,
    ]);
    const selectedNonApparatusIdSet = new Set(
      getNonApparatusModifierIds(selectedModifierIds),
    );

    return semanticVariationOptions.some((variation) => {
      if (variation.id === selectedSemanticVariation.id) return false;
      if (
        !getSemanticVariationAllowedApparatusIds(variation).includes(
          searchedEquipmentModifierId,
        )
      ) {
        return false;
      }

      const candidateDefiningIds = variation.definingModifierIds?.length
        ? variation.definingModifierIds
        : getNonApparatusModifierIds(variation.modifierIds);
      const hasNonEquipmentOverlap = candidateDefiningIds.some((modifierId) =>
        selectedNonApparatusIdSet.has(modifierId),
      );

      return Boolean(
        hasNonEquipmentOverlap ||
          getSemanticVariationMatchDetails(variation, candidateModifierIds),
      );
    });
  })();
  const setModifierForCategories = (
    categoryIds: ExerciseModifierCategoryId[],
    modifierId: string,
    controlOptionIds: ExerciseModifierId[] = [],
  ) => {
    const selectedModifierCategoryId = modifierId
      ? getModifierCategoryId(modifierId as ExerciseModifierId)
      : null;
    const categoriesToClear = selectedModifierCategoryId
      ? [selectedModifierCategoryId]
      : categoryIds;
    const controlOptionIdSet = new Set(controlOptionIds);

    setSelectedModifierIds((prev) =>
      normalizeModifierIdsForCoreMovement(metadata?.coreMovementId, [
        ...prev.filter((id) => {
          const categoryId = getModifierCategoryId(id);
          if (controlOptionIdSet.size > 0) return !controlOptionIdSet.has(id);
          return !categoryId || !categoriesToClear.includes(categoryId);
        }),
        ...(modifierId ? [modifierId as ExerciseModifierId] : []),
      ]),
    );
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
      normalizeModifierIdsForCoreMovement(
        metadata?.coreMovementId,
        applySemanticVariationModifierPreset(prev, variation),
      ),
    );
  };

  useEffect(() => {
    setSelectedModifierIds(
      normalizeModifierIdsForCoreMovement(
        metadata?.coreMovementId,
        getDefaultSelectedModifierIds(metadata),
      ),
    );
    setExplicitSemanticVariationId("");
    setActiveMovementDetailsSubPanel(null);
    setIsSettingsOpen(false);
  }, [exercise.id, metadata?.id]);

  useEffect(() => {
    if (
      !searchedEquipmentModifierId ||
      !searchedEquipmentIsAvailable ||
      !searchedEquipmentCanPreserveOrSwitchSemantic
    ) {
      return;
    }

    setSelectedModifierIds((prev) => {
      if (prev.includes(searchedEquipmentModifierId)) return prev;

      const equipmentOptionIdSet = new Set(searchedEquipmentOptionIds);

      return normalizeModifierIdsForCoreMovement(metadata?.coreMovementId, [
          ...prev.filter((modifierId) => !equipmentOptionIdSet.has(modifierId)),
          searchedEquipmentModifierId,
        ]);
    });
  }, [
    exercise.id,
    metadata?.id,
    searchedEquipmentCanPreserveOrSwitchSemantic,
    searchedEquipmentIsAvailable,
    searchedEquipmentModifierId,
    searchedEquipmentOptionKey,
  ]);

  const safeExerciseDomId = exercise.id.replace(/[^a-zA-Z0-9_-]/g, "-");
  const safeCardInstanceDomId = cardInstanceId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const gridDetailsDropdownId = `details-${safeExerciseDomId}`;
  const gridDetailsPanelId = `details-panel-${exercise.id.replace(
    /[^a-zA-Z0-9_-]/g,
    "-",
  )}`;
  const detailExerciseDetailsPanelId = `exercise-details-panel-${exercise.id.replace(
    /[^a-zA-Z0-9_-]/g,
    "-",
  )}`;
  const settingsDropdownId = `settings-${exercise.id.replace(
    /[^a-zA-Z0-9_-]/g,
    "-",
  )}`;
  const movementDetailsPanelId = `movement-details-${safeCardInstanceDomId}`;
  const dropdownEventKeepsPanelOpen = (
    detail: ExerciseLibraryDropdownOpenDetail | undefined,
    panelId: string,
  ) =>
    detail?.id === panelId ||
    detail?.parentId === panelId ||
    Boolean(detail?.keepOpenIds?.includes(panelId));
  const updateGridFloatingPanelPosition = ({
    anchor,
    maxHeight,
    maxWidth,
    minHeight,
    preferredWidth,
    setStyle,
    lockedWidthRef,
    zIndex,
  }: {
    anchor: HTMLElement | null;
    maxHeight: number;
    maxWidth: number;
    minHeight: number;
    preferredWidth: number;
    setStyle: Dispatch<SetStateAction<CSSProperties | null>>;
    lockedWidthRef: { current: number | null };
    zIndex: number;
  }) => {
    if (!anchor || typeof window === "undefined") return;

    const rect = anchor.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 12;
    const measuredWidth = Math.min(
      Math.max(rect.width, preferredWidth),
      maxWidth,
      viewportWidth - margin * 2,
    );
    const width = lockedWidthRef.current ?? measuredWidth;

    lockedWidthRef.current = width;

    const left = Math.min(
      Math.max(rect.left, margin),
      viewportWidth - width - margin,
    );
    const belowTop = rect.bottom + 8;
    const availableBelow = viewportHeight - belowTop - margin;
    const availableAbove = rect.top - margin - 8;
    const opensAbove =
      availableBelow < minHeight && availableAbove > availableBelow;
    const maxPanelHeight = Math.max(
      minHeight,
      Math.min(
        maxHeight,
        opensAbove ? availableAbove : Math.max(availableBelow, minHeight),
      ),
    );
    const preferredTop = opensAbove
      ? Math.max(margin, rect.top - 8 - maxPanelHeight)
      : belowTop;
    const top = Math.min(
      Math.max(preferredTop, margin),
      Math.max(margin, viewportHeight - maxPanelHeight - margin),
    );
    const adjustedMaxHeight = Math.max(
      minHeight,
      Math.min(maxPanelHeight, viewportHeight - top - margin),
    );

    setStableFixedDropdownStyle(setStyle, createFixedDropdownStyle({
      left,
      top,
      width,
      maxHeight: adjustedMaxHeight,
      zIndex,
    }));
  };
  const updateGridSettingsPanelPosition = () =>
    updateGridFloatingPanelPosition({
      anchor: settingsButtonRef.current,
      maxHeight: 360,
      maxWidth: 392,
      minHeight: 176,
      preferredWidth: 320,
      setStyle: setGridSettingsPanelStyle,
      lockedWidthRef: lockedGridSettingsPanelWidthRef,
      zIndex: 2147483020,
    });
  const updateGridDetailsPanelPosition = () =>
    updateGridFloatingPanelPosition({
      anchor: gridDetailsButtonRef.current,
      maxHeight: 460,
      maxWidth: 680,
      minHeight: 240,
      preferredWidth: 560,
      setStyle: setGridDetailsPanelStyle,
      lockedWidthRef: lockedGridDetailsPanelWidthRef,
      zIndex: 2147483010,
    });
  const updateMovementDetailsPanelPosition = () =>
    updateGridFloatingPanelPosition({
      anchor: movementDetailsButtonRef.current,
      maxHeight: 560,
      maxWidth: 740,
      minHeight: 260,
      preferredWidth: 640,
      setStyle: setMovementDetailsPanelStyle,
      lockedWidthRef: lockedMovementDetailsPanelWidthRef,
      zIndex: 2147483005,
    });

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
    let animationFrame: number | null = null;
    const scheduleGridSettingsPositionUpdate = (
      event?: Event,
      unlockWidth = false,
    ) => {
      const target = event?.target;
      if (
        target instanceof Node &&
        settingsFloatingPanelRef.current?.contains(target)
      ) {
        return;
      }

      if (unlockWidth) lockedGridSettingsPanelWidthRef.current = null;
      if (animationFrame !== null) return;

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        updateGridSettingsPanelPosition();
      });
    };
    const handleGridSettingsResize = () =>
      scheduleGridSettingsPositionUpdate(undefined, true);

    if (isGridView) {
      updateGridSettingsPanelPosition();
      document.addEventListener(
        "scroll",
        scheduleGridSettingsPositionUpdate,
        true,
      );
      window.addEventListener("resize", handleGridSettingsResize);
    }

    window.addEventListener(
      exerciseLibraryDropdownOpenEvent,
      closeWhenAnotherDropdownOpens,
    );
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

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
      if (isGridView) {
        document.removeEventListener(
          "scroll",
          scheduleGridSettingsPositionUpdate,
          true,
        );
        window.removeEventListener("resize", handleGridSettingsResize);
      }
    };
  }, [isGridView, isSettingsOpen, settingsDropdownId]);
  useEffect(() => {
    if (!isGridDetailsOpen) return;

    const closeWhenAnotherDropdownOpens = (event: Event) => {
      const detail = (event as CustomEvent<ExerciseLibraryDropdownOpenDetail>)
        .detail;
      if (
        !dropdownEventKeepsPanelOpen(detail, gridDetailsDropdownId) &&
        !dropdownEventKeepsPanelOpen(detail, settingsDropdownId)
      ) {
        onToggleExerciseDetails(null);
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
        onToggleExerciseDetails(null);
        setIsSettingsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onToggleExerciseDetails(null);
        setIsSettingsOpen(false);
      }
    };
    let animationFrame: number | null = null;
    const scheduleGridDetailsPositionUpdate = (
      event?: Event,
      unlockWidth = false,
    ) => {
      const target = event?.target;
      if (
        target instanceof Node &&
        gridDetailsFloatingPanelRef.current?.contains(target)
      ) {
        return;
      }

      if (unlockWidth) lockedGridDetailsPanelWidthRef.current = null;
      if (animationFrame !== null) return;

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        updateGridDetailsPanelPosition();
      });
    };
    const handleGridDetailsResize = () =>
      scheduleGridDetailsPositionUpdate(undefined, true);

    updateGridDetailsPanelPosition();

    window.addEventListener(
      exerciseLibraryDropdownOpenEvent,
      closeWhenAnotherDropdownOpens,
    );
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("scroll", scheduleGridDetailsPositionUpdate, true);
    window.addEventListener("resize", handleGridDetailsResize);

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
      document.removeEventListener(
        "scroll",
        scheduleGridDetailsPositionUpdate,
        true,
      );
      window.removeEventListener("resize", handleGridDetailsResize);
    };
  }, [
    gridDetailsDropdownId,
    isGridDetailsOpen,
    onToggleExerciseDetails,
    settingsDropdownId,
  ]);
  useEffect(() => {
    if (!isMovementDetailsOpen || isGridView) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;

      if (
        target instanceof Node &&
        movementDetailsDropdownRef.current &&
        !movementDetailsDropdownRef.current.contains(target) &&
        !movementDetailsFloatingPanelRef.current?.contains(target) &&
        !(
          target instanceof Element &&
          target.closest('[data-exercise-library-floating-menu="true"]')
        )
      ) {
        onToggleMovementDetails(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onToggleMovementDetails(null);
    };
    let animationFrame: number | null = null;
    const scheduleMovementDetailsPositionUpdate = (
      event?: Event,
      unlockWidth = false,
    ) => {
      const target = event?.target;
      if (
        target instanceof Node &&
        movementDetailsFloatingPanelRef.current?.contains(target)
      ) {
        return;
      }

      if (unlockWidth) lockedMovementDetailsPanelWidthRef.current = null;
      if (animationFrame !== null) return;

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        updateMovementDetailsPanelPosition();
      });
    };
    const handleMovementDetailsResize = () =>
      scheduleMovementDetailsPositionUpdate(undefined, true);

    updateMovementDetailsPanelPosition();
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener(
      "scroll",
      scheduleMovementDetailsPositionUpdate,
      true,
    );
    window.addEventListener("resize", handleMovementDetailsResize);

    return () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener(
        "scroll",
        scheduleMovementDetailsPositionUpdate,
        true,
      );
      window.removeEventListener("resize", handleMovementDetailsResize);
    };
  }, [isGridView, isMovementDetailsOpen, onToggleMovementDetails]);
  useEffect(() => {
    if (isSettingsOpen && isGridView) return;

    lockedGridSettingsPanelWidthRef.current = null;
    setGridSettingsPanelStyle(null);
  }, [isGridView, isSettingsOpen]);
  useEffect(() => {
    if (isGridDetailsOpen) return;

    lockedGridDetailsPanelWidthRef.current = null;
    setGridDetailsPanelStyle(null);
  }, [isGridDetailsOpen]);
  useEffect(() => {
    if (!isMovementDetailsOpen) {
      setActiveMovementDetailsSubPanel(null);
      lockedMovementDetailsPanelWidthRef.current = null;
      setMovementDetailsPanelStyle(null);
    }
  }, [isMovementDetailsOpen]);

  const closeMovementDetailsAccordion = () => {
    setActiveMovementDetailsSubPanel(null);
    if (isMovementDetailsOpen) onToggleMovementDetails(null);
  };
  const toggleMovementDetailsSubPanel = (
    panel: MovementDetailsSubPanel,
  ) => {
    setActiveMovementDetailsSubPanel((current) =>
      current === panel ? null : panel,
    );
  };
  const handleMovementDetailsToggle = () => {
    if (isMovementDetailsOpen) {
      setActiveMovementDetailsSubPanel(null);
      onToggleMovementDetails(null);
      return;
    }

    announceExerciseLibraryDropdownOpen(
      movementDetailsPanelId,
      isGridView
        ? {
            parentId: gridDetailsDropdownId,
            keepOpenIds: [gridDetailsDropdownId],
          }
        : undefined,
    );
    if (!isGridView) updateMovementDetailsPanelPosition();
    setActiveMovementDetailsSubPanel(null);
    onToggleMovementDetails(cardInstanceId);
  };
  const handleDetailExerciseDetailsToggle = () => {
    if (isDetailExerciseDetailsOpen) {
      onToggleExerciseDetails(null);
      closeMovementDetailsAccordion();
      setIsSettingsOpen(false);
      return;
    }

    announceExerciseLibraryDropdownOpen(detailExerciseDetailsPanelId);
    onToggleExerciseDetails(exercise.id);
    closeMovementDetailsAccordion();
  };
  const handleAddStats = (event?: MouseEvent<HTMLButtonElement>) =>
    onAddStats(
      {
        ...exercise,
        name: activeExerciseName,
        pattern: patternLabel,
        equipment: equipmentLabel,
        goal: goalLabel,
        coreMovementPattern: metadata?.coreMovementId,
        semanticVariationId: selectedSemanticVariation?.id,
        semanticVariationName: activeSemanticVariationName,
        generatedTitle: variationName,
        selectedModifierIds,
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
          className="exercise-library-themed-action min-h-[48px] rounded-2xl border border-cyan-300/25 bg-cyan-400/15 px-4 py-3 text-sm font-black text-cyan-200 transition hover:bg-cyan-400 hover:text-slate-950"
        >
          Add to Plan
        </button>
      ) : null}

      {!exercise.custom ? (
        <a
          href={ROUTES.workoutBuilder.exerciseDemo}
          className="exercise-library-themed-action flex min-h-[48px] items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-center text-sm font-black text-cyan-300 transition hover:bg-cyan-400 hover:text-slate-950"
        >
          View Demo
        </a>
      ) : null}

      <button
        type="button"
        onClick={handleAddStats}
        className="exercise-library-themed-action min-h-[48px] rounded-2xl border border-yellow-300/30 bg-yellow-400/15 px-4 py-3 text-sm font-black text-yellow-300 transition hover:bg-yellow-400 hover:text-slate-950"
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
            setModifierForCategories(
              control.categories,
              modifierId,
              control.options.map((option) => option.id),
            )
          }
          parentDropdownId={settingsDropdownId}
          keepOpenDropdownIds={[settingsDropdownId, gridDetailsDropdownId]}
          accent={control.accent}
          themeStyle={categoryThemeStyle}
          size={isGridView ? "grid" : "detail"}
        />
      ))}
    </div>
  ) : null;
  const settingsButtonClass = `exercise-library-themed-control flex w-full items-center justify-between border border-cyan-200/20 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.16),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.88),rgba(2,6,23,0.70))] text-left font-black uppercase text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_26px_rgba(0,0,0,0.24)] transition hover:border-cyan-100/45 hover:bg-cyan-300/10 ${
    isGridView
      ? "min-h-[34px] rounded-xl px-2.5 py-1.5 text-[9px] tracking-[0.08em] sm:text-[10px]"
      : "min-h-[42px] rounded-2xl px-3.5 py-2 text-[11px] tracking-[0.12em]"
  }`;
  const renderSettingsChevron = (open: boolean) => (
    <span
      aria-hidden="true"
      className={`exercise-library-themed-chevron flex items-center justify-center rounded-full border border-cyan-200/20 bg-cyan-300/10 text-cyan-100 transition ${
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
    floatingPanelClassName,
  }: {
    label: string;
    wrapperClassName: string;
    panelClassName: string;
    floatingPanelClassName?: string;
  }) =>
    modifierControls.length ? (
      <div ref={settingsDropdownRef} className={wrapperClassName}>
        <button
          ref={settingsButtonRef}
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
              if (isGridView) updateGridSettingsPanelPosition();
            }
            setIsSettingsOpen((current) => !current);
          }}
          className={settingsButtonClass}
        >
          <span>{label}</span>
          {renderSettingsChevron(isSettingsOpen)}
        </button>

        {isSettingsOpen && isGridView && floatingPanelClassName
          ? typeof document !== "undefined" && gridSettingsPanelStyle
            ? createPortal(
                <div
                  ref={settingsFloatingPanelRef}
                  style={{ ...gridSettingsPanelStyle, ...categoryThemeStyle }}
                  data-exercise-library-floating-menu="true"
                  className={floatingPanelClassName}
                >
                  {settingsPanelHeader}
                  {settingsControls}
                </div>,
                document.body,
              )
            : null
          : isSettingsOpen ? (
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
      "exercise-library-themed-panel relative z-[80] mt-2.5 rounded-2xl border border-cyan-100/30 bg-slate-950/95 p-2.5 shadow-[0_24px_74px_rgba(0,0,0,0.72),0_0_34px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.16)] ring-1 ring-cyan-200/10 backdrop-blur-2xl",
  });
  const gridSettingsDropdown = renderExerciseSettingsDropdown({
    label: "Customize Settings",
    wrapperClassName: "relative z-[140] mt-1.5 sm:mt-2",
    panelClassName:
      "exercise-library-themed-panel exercise-library-themed-scrollbar absolute left-0 right-0 top-full z-[940] mt-1.5 max-h-[210px] overflow-y-auto overscroll-contain rounded-2xl border border-cyan-100/35 bg-slate-950/98 p-2.5 shadow-[0_24px_76px_rgba(0,0,0,0.78),0_0_34px_rgba(34,211,238,0.18),inset_0_1px_0_rgba(255,255,255,0.16)] ring-1 ring-cyan-200/14 backdrop-blur-2xl [scrollbar-color:rgba(34,211,238,0.42)_transparent] [scrollbar-width:thin]",
    floatingPanelClassName:
      "exercise-library-themed-floating-panel exercise-library-themed-scrollbar fixed overflow-y-auto overscroll-contain rounded-2xl border border-cyan-100/35 bg-slate-950/98 p-2.5 shadow-[0_28px_86px_rgba(0,0,0,0.82),0_0_38px_rgba(34,211,238,0.20),inset_0_1px_0_rgba(255,255,255,0.16)] ring-1 ring-cyan-200/14 backdrop-blur-2xl [scrollbar-color:rgba(34,211,238,0.42)_transparent] [scrollbar-width:thin]",
  });
  const movementDetailsPanelContent = (
    <div className="[&>div:first-child]:mt-0">
      <MovementMetadataPanel
        metadata={metadata}
        selectedModifierIds={selectedModifierIds}
        setSelectedModifierIds={setSelectedModifierIds}
        movementArchitectureChips={movementArchitectureChips}
        classificationChipClass={categoryTheme.pillClass}
        onChipSelect={onMovementChipSelect}
        themeStyle={categoryThemeStyle}
        customizeSettingsModifierIds={customizeSettingsModifierIds}
        customizeSettingsFallbackLabels={customizeSettingsFallbackLabels}
        customizeSettingsCategoryIds={customizeSettingsCategoryIds}
      />

      <MovementSuggestionsPanel
        suggestions={suggestions}
        isOpen={activeMovementDetailsSubPanel === "similar"}
        onSelectSuggestion={onSuggestionSelect}
        onToggle={() => toggleMovementDetailsSubPanel("similar")}
      />

      <MovementProgressPanel
        suggestions={suggestions}
        isOpen={activeMovementDetailsSubPanel === "progress"}
        onSelectSuggestion={onSuggestionSelect}
        onToggle={() => toggleMovementDetailsSubPanel("progress")}
      />

      <CoachingCueScroller cues={coachingCueCards} />
    </div>
  );
  const movementDetails = (
    <div
      ref={movementDetailsDropdownRef}
      className="exercise-library-themed-panel group mt-2.5 rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_14px_40px_rgba(8,145,178,0.12)] backdrop-blur-2xl"
    >
      <button
        ref={movementDetailsButtonRef}
        type="button"
        aria-controls={movementDetailsPanelId}
        aria-expanded={isMovementDetailsOpen}
        aria-haspopup="dialog"
        onClick={(event) => {
          event.stopPropagation();
          handleMovementDetailsToggle();
        }}
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
          className={`exercise-library-themed-chevron flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-100/15 bg-white/[0.06] text-sm font-black text-cyan-100 transition ${
            isMovementDetailsOpen ? "rotate-180 border-cyan-200/30" : ""
          }`}
        >
          v
        </span>
      </button>

      {typeof document !== "undefined" &&
      isMovementDetailsOpen &&
      !isGridView &&
      movementDetailsPanelStyle
        ? createPortal(
            <div
              ref={movementDetailsFloatingPanelRef}
              id={movementDetailsPanelId}
              role="dialog"
              aria-label={`${cardTitle} movement details`}
              style={{ ...movementDetailsPanelStyle, ...categoryThemeStyle }}
              data-exercise-library-floating-menu="true"
              className="exercise-library-themed-floating-panel exercise-library-themed-scrollbar fixed overflow-y-auto overscroll-contain rounded-2xl border border-cyan-100/24 bg-[radial-gradient(circle_at_14%_0%,rgba(34,211,238,0.16),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.985),rgba(2,6,23,0.965))] p-3 shadow-[0_30px_92px_rgba(0,0,0,0.84),0_0_42px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.14)] ring-1 ring-cyan-200/12 backdrop-blur-2xl [scrollbar-color:rgba(34,211,238,0.36)_transparent] [scrollbar-width:thin]"
            >
              <div className="mb-3 flex items-start justify-between gap-3 border-b border-cyan-100/14 pb-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-black leading-6 text-white drop-shadow-[0_0_14px_rgba(255,255,255,0.28)]">
                    {cardTitle}
                  </p>
                  {coreMovementLabel ? (
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/65">
                      Core Movement:{" "}
                      <span className="text-cyan-50">{coreMovementLabel}</span>
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label={`Close ${cardTitle} movement details`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleMovementDetails(null);
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-100/18 bg-white/[0.06] text-xs font-black text-cyan-100 transition hover:border-cyan-100/42 hover:bg-cyan-300/12 hover:text-white"
                >
                  X
                </button>
              </div>
              {movementDetailsPanelContent}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
  const gridDetailsPanelContent = (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]">
      <div className="min-w-0">
        <MuscleIntelligenceBlock
          muscles={muscleIntelligence}
          compact
          latestSetInsight={cardLatestSetInsight}
          onMuscleSelect={onMuscleSelect}
          showSourceBadge={false}
          weeklySetsByMuscleLabel={weeklySetsByMuscleLabel}
        />
      </div>

      <div className="min-w-0 space-y-2">
        <div className="exercise-library-themed-panel rounded-2xl border border-white/10 bg-white/[0.035] p-2">
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
            onChipSelect={onMovementChipSelect}
          />
        </div>
      </div>
    </div>
  );
  const gridDetailsDropdown = (
    <div
      ref={gridDetailsDropdownRef}
      className="relative mt-1.5 w-full max-w-none sm:mt-2"
    >
      <button
        ref={gridDetailsButtonRef}
        type="button"
        aria-controls={gridDetailsPanelId}
        aria-expanded={isGridDetailsOpen}
        onClick={() => {
          if (isGridDetailsOpen) {
            onToggleExerciseDetails(null);
          } else {
            announceExerciseLibraryDropdownOpen(gridDetailsDropdownId);
            updateGridDetailsPanelPosition();
            onToggleExerciseDetails(exercise.id);
            setIsSettingsOpen(false);
          }
          closeMovementDetailsAccordion();
        }}
        className={settingsButtonClass}
      >
        <span>Details</span>
        {renderSettingsChevron(isGridDetailsOpen)}
      </button>

      {typeof document !== "undefined" &&
      isGridDetailsOpen &&
      gridDetailsPanelStyle
        ? createPortal(
            <div
              ref={gridDetailsFloatingPanelRef}
              style={{ ...gridDetailsPanelStyle, ...categoryThemeStyle }}
              data-exercise-library-floating-menu="true"
              className="exercise-library-themed-floating-panel exercise-library-themed-scrollbar fixed overflow-y-auto overscroll-contain rounded-2xl border border-cyan-100/24 bg-[radial-gradient(circle_at_14%_0%,rgba(34,211,238,0.14),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] p-3 shadow-[0_30px_92px_rgba(0,0,0,0.82),0_0_40px_rgba(34,211,238,0.13),inset_0_1px_0_rgba(255,255,255,0.14)] ring-1 ring-cyan-200/10 backdrop-blur-2xl [scrollbar-color:rgba(34,211,238,0.36)_transparent] [scrollbar-width:thin]"
            >
              <div id={gridDetailsPanelId}>{gridDetailsPanelContent}</div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
  const goalSelectorBlock = (
    <div className={isGridView ? "mt-1.5 text-xs sm:mt-2" : "mt-3 text-xs"}>
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
        themeStyle={categoryThemeStyle}
        size={isGridView ? "grid" : "detail"}
      />
      <GoalTrainingTips goalLabel={goalLabel} compact={isGridView} />
    </div>
  );
  const detailExerciseDetails = (
    <div className="mt-3 w-full max-w-none">
      <button
        type="button"
        aria-controls={detailExerciseDetailsPanelId}
        aria-expanded={isDetailExerciseDetailsOpen}
        onClick={handleDetailExerciseDetailsToggle}
        className={settingsButtonClass}
      >
        <span>Exercise Details</span>
        {renderSettingsChevron(isDetailExerciseDetailsOpen)}
      </button>

      {isDetailExerciseDetailsOpen ? (
        <div
          id={detailExerciseDetailsPanelId}
          className="exercise-library-themed-panel mt-2.5 w-full max-w-none rounded-2xl border border-cyan-100/18 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.92))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_16px_46px_rgba(0,0,0,0.34)] ring-1 ring-cyan-200/10"
        >
          <MuscleIntelligenceBlock
            muscles={muscleIntelligence}
            latestSetInsight={cardLatestSetInsight}
            onMuscleSelect={onMuscleSelect}
            weeklySetsByMuscleLabel={weeklySetsByMuscleLabel}
          />
          {movementDetails}
          {goalSelectorBlock}
        </div>
      ) : null}
    </div>
  );

  if (isGridView) {
    return (
      <article
        style={cardVolumeStyle}
        className={`exercise-library-themed-card group relative mb-2 inline-block w-full break-inside-avoid self-start overflow-visible rounded-2xl border backdrop-blur-2xl backdrop-saturate-150 transition sm:mb-3 ${categoryTheme.surfaceClass} ${categoryTheme.cardClass} ${categoryTheme.hoverClass} ${
          cardLatestSetInsight ? "exercise-library-volume-pulse" : ""
        } ${
          isVariationDropdownOpen ||
          isSemanticDropdownOpen ||
          isGridDetailsOpen ||
          isSettingsOpen
            ? "z-[520]"
            : "z-0 hover:z-20"
        }`}
      >
        <div className={`pointer-events-none absolute inset-0 z-0 rounded-2xl ${categoryTheme.overlayClass} opacity-70`} />
        <div
          aria-hidden="true"
          className="exercise-library-card-volume-fill rounded-2xl"
        />
        <div className={`pointer-events-none absolute inset-x-0 top-0 z-[12] h-px ${categoryTheme.accentClass}`} />
        <FavoriteButton
          isFavorite={isFavorite}
          onToggle={() => onToggleFavorite(exercise.id)}
          compact
        />

        <div className="relative z-10 h-16 overflow-hidden rounded-t-2xl bg-slate-950/70 sm:h-24">
          <img
            src={exercise.image || defaultImage}
            alt={cardTitle}
            className="h-full w-full object-cover opacity-78 transition duration-500 group-hover:scale-105 group-hover:opacity-95"
          />
        </div>

        <div className="relative z-10 p-2 sm:p-3">
          <div className="mb-1.5 flex flex-wrap items-center gap-1 sm:mb-2 sm:gap-1.5">
            <button
              type="button"
              aria-label={`Filter body region ${exercise.body}`}
              onClick={() => onBodyFilterSelect(exercise.body)}
              className={`rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.08em] transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-100/30 sm:px-2 sm:text-[8px] ${categoryTheme.pillClass}`}
              title={`Filter by ${exercise.body}`}
            >
              {exercise.body}
            </button>

            <button
              type="button"
              aria-label="Lifetime Sets Complete"
              className={`rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.08em] transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-yellow-100/30 sm:px-2 sm:text-[8px] ${categoryTheme.pillClass}`}
              title="Open stats for Lifetime Sets Complete"
              onClick={(event) =>
                onAddStats(exercise, "grid", event.currentTarget)
              }
            >
              {lifetimeSetsCompleteLabel}
            </button>

            {weeklyExerciseVolumePill}

            <button
              type="button"
              aria-label={`Filter difficulty ${exercise.level}`}
              onClick={() => onDifficultyFilterSelect(exercise.level)}
              className={`rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.08em] transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/30 sm:px-2 sm:text-[8px] ${difficultyTheme.pill}`}
              title={`Filter by ${exercise.level}`}
            >
              {exercise.level}
            </button>
          </div>

          {coreMovementLabel ? (
            <p className="mb-1 text-[8px] font-black uppercase leading-3 tracking-[0.1em] text-cyan-100/70 sm:text-[9px]">
              Core Movement:{" "}
              <button
                type="button"
                className="text-cyan-50 underline decoration-cyan-200/0 underline-offset-2 transition hover:decoration-cyan-200/70 focus:outline-none focus:ring-2 focus:ring-cyan-100/30"
                onClick={() =>
                  onMovementChipSelect({
                    key: `core-${coreMovementLabel}`,
                    label: coreMovementLabel,
                    tone: "movement",
                  })
                }
                title={`Filter by ${coreMovementLabel}`}
              >
                {coreMovementLabel}
              </button>
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
            onAddNewVariation={() =>
              onCreateVariation(metadata?.coreMovementId || exercise.coreMovementPattern)
            }
            coreMovementLabel={coreMovementLabel}
            statsByVariationId={semanticVariationStatsById}
            themeStyle={categoryThemeStyle}
            compact
          />

          {gridSettingsDropdown}
          {gridDetailsDropdown}
          {goalSelectorBlock}

          <RecentStatsStrip
            stats={exerciseStatHistory}
            compact
            latestInsight={cardLatestSetInsight}
            preferredWeightUnit={preferredWeightUnit}
            weeklyVolumeRangeLabel={weeklyVolumeRangeLabel}
          />

          <div className="mt-1.5 grid grid-cols-2 gap-1 sm:mt-2 sm:gap-1.5">
            {!exercise.custom ? (
              <a
                href={ROUTES.workoutBuilder.exerciseDemo}
                className="exercise-library-themed-action flex min-h-[40px] items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-1.5 py-2 text-center text-[9px] font-black uppercase tracking-[0.08em] text-cyan-200 transition hover:bg-cyan-400 hover:text-slate-950 sm:min-h-[38px] sm:rounded-xl sm:px-3 sm:text-[10px] sm:tracking-[0.12em]"
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
              className="exercise-library-themed-action min-h-[40px] rounded-lg border border-yellow-300/30 bg-yellow-400/15 px-1.5 py-2 text-[9px] font-black uppercase tracking-[0.08em] text-yellow-300 transition hover:bg-yellow-400 hover:text-slate-950 sm:min-h-[38px] sm:rounded-xl sm:px-3 sm:text-[10px] sm:tracking-[0.12em]"
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
      style={cardVolumeStyle}
      className={`exercise-library-themed-card group relative mb-4 inline-block w-full break-inside-avoid self-start overflow-visible rounded-[30px] border backdrop-blur-2xl backdrop-saturate-150 transition ${categoryTheme.surfaceClass} ${categoryTheme.cardClass} ${categoryTheme.hoverClass} ${
        cardLatestSetInsight ? "exercise-library-volume-pulse" : ""
      } ${
        isVariationDropdownOpen ||
        isSemanticDropdownOpen ||
        isGridDetailsOpen ||
        isDetailExerciseDetailsOpen ||
        isSettingsOpen
          ? "z-[520]"
          : "z-0 hover:z-20"
      }`}
    >
      <div className={`pointer-events-none absolute inset-0 z-0 rounded-[30px] ${categoryTheme.overlayClass} opacity-70`} />
      <div
        aria-hidden="true"
        className="exercise-library-card-volume-fill rounded-[30px]"
      />
      <div className={`pointer-events-none absolute inset-x-0 top-0 z-[12] h-px ${categoryTheme.accentClass}`} />
      <FavoriteButton
        isFavorite={isFavorite}
        onToggle={() => onToggleFavorite(exercise.id)}
      />

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
          <button
            type="button"
            aria-label={`Filter body region ${exercise.body}`}
            onClick={() => onBodyFilterSelect(exercise.body)}
            className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-100/30 ${categoryTheme.pillClass}`}
            title={`Filter by ${exercise.body}`}
          >
            {exercise.body}
          </button>

          <button
            type="button"
            aria-label="Lifetime Sets Complete"
            className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-yellow-100/30 ${categoryTheme.pillClass}`}
            title="Open stats for Lifetime Sets Complete"
            onClick={(event) =>
              onAddStats(exercise, "detail", event.currentTarget)
            }
          >
            {lifetimeSetsCompleteLabel}
          </button>

          {weeklyExerciseVolumePill}

          <button
            type="button"
            aria-label={`Filter difficulty ${exercise.level}`}
            onClick={() => onDifficultyFilterSelect(exercise.level)}
            className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/30 ${difficultyTheme.pill}`}
            title={`Filter by ${exercise.level}`}
          >
            {exercise.level}
          </button>
        </div>

        {coreMovementLabel ? (
          <p className="mt-3.5 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/70">
            Core Movement:{" "}
            <button
              type="button"
              className="text-cyan-50 underline decoration-cyan-200/0 underline-offset-2 transition hover:decoration-cyan-200/70 focus:outline-none focus:ring-2 focus:ring-cyan-100/30"
              onClick={() =>
                onMovementChipSelect({
                  key: `core-${coreMovementLabel}`,
                  label: coreMovementLabel,
                  tone: "movement",
                })
              }
              title={`Filter by ${coreMovementLabel}`}
            >
              {coreMovementLabel}
            </button>
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
          onAddNewVariation={() =>
            onCreateVariation(metadata?.coreMovementId || exercise.coreMovementPattern)
          }
          coreMovementLabel={coreMovementLabel}
          statsByVariationId={semanticVariationStatsById}
          themeStyle={categoryThemeStyle}
        />
        {settingsDropdown}
        {detailExerciseDetails}
      </div>

      <div className="relative z-10 px-5 pb-5 pt-3">
        <RecentStatsStrip
          stats={exerciseStatHistory}
          latestInsight={cardLatestSetInsight}
          preferredWeightUnit={preferredWeightUnit}
          weeklyVolumeRangeLabel={weeklyVolumeRangeLabel}
        />

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
    useState<ExerciseLibrarySortMode>(defaultExerciseLibrarySortMode);
  const exerciseSectionsPerPage = 4;
  const [bodyFilters, setBodyFilters] = useState<string[]>([]);
  const [bodyRegionLayer, setBodyRegionLayer] =
    useState<BodyRegionLayer | null>(null);
  const [goalFilter, setGoalFilter] = useState("All");
  const [levelFilter, setLevelFilter] = useState("All");
  const [movementTypeFilter, setMovementTypeFilter] = useState("All");
  const [apparatusFilter, setApparatusFilter] = useState("All");
  const [loadBehaviorFilter, setLoadBehaviorFilter] = useState("All");
  const [planAddToParam, setPlanAddToParam] = useState("");
  const [activeExerciseDetailsCardId, setActiveExerciseDetailsCardId] =
    useState<string | null>(null);
  const [activeMovementDetailsPopupId, setActiveMovementDetailsPopupId] = useState<
    string | null
  >(null);
  const [favoriteExerciseIds, setFavoriteExerciseIds] = useState<Set<string>>(
    () => new Set(),
  );

  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const addExerciseFormRef = useRef<HTMLDivElement | null>(null);
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
  const [preferredWeightUnit, setPreferredWeightUnit] =
    useState<WeightUnit>("lbs");
  const [uiThemeId, setUiThemeId] =
    useState<ExerciseLibraryUiThemeId>("space-glass");
  const [profileSummary, setProfileSummary] =
    useState<ExerciseLibraryProfileSummary>(
      defaultExerciseLibraryProfileSummary,
    );
  const [latestSetInsight, setLatestSetInsight] =
    useState<LatestSetInsight | null>(null);

  const [newExercise, setNewExercise] = useState<PrivateExerciseDraft>(
    emptyPrivateExerciseDraft,
  );
  const privateExerciseCoreOptions = useMemo(
    () =>
      [...normalizedCatalog.filterOptions.coreMovements].sort((left, right) =>
        left.label.localeCompare(right.label),
      ),
    [],
  );
  const privateExerciseMetadata = useMemo(
    () =>
      getPrivateExerciseMetadataForCoreMovement(
        newExercise.coreMovementPattern,
      ),
    [newExercise.coreMovementPattern],
  );
  const privateExerciseSettingControls = useMemo(
    () =>
      getPrivateExerciseModifierControls(
        newExercise.coreMovementPattern,
        privateExerciseMetadata,
      ),
    [newExercise.coreMovementPattern, privateExerciseMetadata],
  );
  const privateExerciseEquipmentOptions = useMemo(() => {
    const equipmentControl = privateExerciseSettingControls.find((control) =>
      control.categories.includes("apparatus"),
    );

    return (
      equipmentControl?.options ||
      getPrivateExerciseOptionsForControl(
        defaultEquipmentControl,
        privateExerciseMetadata,
      )
    );
  }, [privateExerciseSettingControls, privateExerciseMetadata]);
  const privateExerciseSemanticVariationOptions =
    privateExerciseMetadata?.semanticVariations || [];
  const privateExerciseSelectedSemanticVariation =
    privateExerciseSemanticVariationOptions.find(
      (variation) => variation.id === newExercise.semanticVariationId,
    ) || null;
  const privateExerciseSelectedEquipmentModifierId =
    getSelectedModifiersByCategory(newExercise.modifierIds, "apparatus")[0]
      ?.id || "";

  useEffect(() => {
    setCustomExercises(readCustomExercises<Exercise>());
    setFavoriteExerciseIds(new Set(readExerciseLibraryFavoriteIds()));
    setPreferredWeightUnit(readExerciseLibraryPreferredWeightUnit());
    setUiThemeId(readExerciseLibraryUiTheme());
  }, []);

  useEffect(() => {
    writeCustomExercises(customExercises);
  }, [customExercises]);

  const updatePreferredWeightUnit = (unit: WeightUnit) => {
    setPreferredWeightUnit(unit);
    writeExerciseLibraryPreferredWeightUnit(unit);
  };

  const updateExerciseLibraryUiTheme = (
    nextThemeId: ExerciseLibraryUiThemeId,
  ) => {
    setUiThemeId(nextThemeId);
    writeExerciseLibraryUiTheme(nextThemeId);
  };

  useEffect(() => {
    let isActive = true;

    const loadProfileSummary = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData.user;

        if (!user || !isActive) {
          if (isActive) {
            setProfileSummary(defaultExerciseLibraryProfileSummary);
          }
          return;
        }

        const [{ data: profile }, { data: savedBio }] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", user.id)
            .single(),
          supabase.from("client_bios").select("*").eq("id", user.id).single(),
        ]);

        if (!isActive) return;

        const fullName =
          profile?.full_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          "";
        const firstName =
          savedBio?.preferred_name ||
          fullName.trim().split(/\s+/)[0] ||
          "";
        const emailPrefix = user.email?.split("@")[0] || "";
        const displayName = firstName || fullName || emailPrefix || "Athlete";
        const primaryGoal = savedBio?.primary_goal || "No goal set";
        const secondaryGoal =
          savedBio?.motivation ||
          savedBio?.nutrition_focus ||
          savedBio?.notes ||
          "Add profile details";
        const currentFocus =
          savedBio?.nutrition_focus ||
          savedBio?.motivation ||
          savedBio?.primary_goal ||
          "Add profile details";
        const preferredTrainingStyle =
          savedBio?.coaching_style || "Add profile details";
        const bioParts = [
          savedBio?.age ? `Age ${savedBio.age}` : "",
          savedBio?.training_experience || "",
          savedBio?.location || "",
          savedBio?.nutrition_focus ? `Focus: ${savedBio.nutrition_focus}` : "",
        ].filter(Boolean);

        setProfileSummary({
          avatarUrl:
            profile?.avatar_url ||
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture ||
            null,
          bio: bioParts.length ? bioParts.join(" / ") : "Add profile details",
          currentFocus,
          displayName,
          email: user.email || "",
          preferredTrainingStyle,
          primaryGoal,
          secondaryGoal,
          trainingLevel: savedBio?.training_experience || "",
        });
      } catch {
        if (isActive) {
          setProfileSummary(defaultExerciseLibraryProfileSummary);
        }
      }
    };

    void loadProfileSummary();

    return () => {
      isActive = false;
    };
  }, []);

  const toggleFavoriteExercise = (exerciseId: string) => {
    setFavoriteExerciseIds((current) => {
      const next = new Set(current);

      if (next.has(exerciseId)) {
        next.delete(exerciseId);
      } else {
        next.add(exerciseId);
      }

      writeExerciseLibraryFavoriteIds(next);
      return next;
    });
  };

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

  useEffect(() => {
    if (!latestSetInsight) return;

    const timer = window.setTimeout(() => {
      setLatestSetInsight((currentInsight) =>
        currentInsight?.id === latestSetInsight.id ? null : currentInsight,
      );
    }, 6200);

    return () => window.clearTimeout(timer);
  }, [latestSetInsight]);

  const allExercises: Exercise[] = useMemo(() => {
    return [...normalizedSystemExercises, ...customExercises];
  }, [customExercises]);
  const weeklySetsSummary = useMemo(
    () => buildWeeklySetsSummary(savedExerciseStats, allExercises),
    [savedExerciseStats, allExercises],
  );
  const weeklyVolumeRangeLabel = useMemo(
    () => formatWeeklyVolumeRangeLabel(),
    [],
  );
  const exerciseStatLookup = useMemo(
    () => createExerciseStatLookup(allExercises),
    [allExercises],
  );

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

  const bodyOptions = useMemo(() => {
    const baseBodyOptions = getUniqueOptions(allExercises, "body");
    const mappedMuscleBodyOptions = allExercises.flatMap((exercise) => {
      const metadata = getMetadataForExercise(exercise);
      return getExerciseMuscleMappingOverride(exercise, metadata)
        ? getExerciseVolumeBodyLabels(exercise, metadata)
        : [];
    });
    const mergedOptions = [
      "All",
      ...Array.from(
        new Set([
          ...baseBodyOptions.filter((option) => option !== "All"),
          ...mappedMuscleBodyOptions,
        ]),
      ).sort(),
    ];

    return reorderBodyRegionOptions(mergedOptions);
  }, [allExercises]);
  const bodyOptionsByLayer = useMemo(() => {
    const grouped = new Map<BodyRegionLayer, string[]>();

    bodyRegionLayerConfigs.forEach((config) => grouped.set(config.id, []));
    bodyOptions
      .filter((body) => body !== "All")
      .forEach((body) => {
        const layer = getBodyRegionLayerForLabel(body);
        if (!layer) return;
        grouped.set(layer, [...(grouped.get(layer) || []), body]);
      });

    return grouped;
  }, [bodyOptions]);
  const visibleBodyOptions = useMemo(() => {
    if (!bodyRegionLayer) return bodyOptions;
    const layerOptions = bodyOptionsByLayer.get(bodyRegionLayer) || [];

    return layerOptions.length ? ["All", ...layerOptions] : bodyOptions;
  }, [bodyOptions, bodyOptionsByLayer, bodyRegionLayer]);

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
          aliases: getEquipmentSearchAliasesForLabel(option.label),
        });
      });

    resistanceProfileSuggestionModifierIds.forEach((modifierId) => {
      const modifier = EXERCISE_MODIFIER_BY_ID[modifierId];
      if (!modifier) return;

      addSuggestion({
        id: `modifier-${modifier.id}`,
        label: getModifierDisplayLabel(modifier),
        group: getModifierCategoryLabel(modifier.categoryId),
        query: getModifierDisplayLabel(modifier),
        aliases: [modifier.slug, ...(modifier.aliases || [])],
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

  const searchedEquipmentModifierId = useMemo(
    () => getSearchedEquipmentModifierId(search),
    [search],
  );
  const searchedModifierIds = useMemo(
    () => getSearchedModifierIds(search),
    [search],
  );

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
      const compatibleSearchedModifierMatch =
        metadata && searchedModifierIds.length
          ? getCompatibleModifiersForMovement(metadata.coreMovementId).some(
              (modifier) => searchedModifierIds.includes(modifier.id),
            )
          : false;

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
        compatibleSearchedModifierMatch ||
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

      const exerciseBodyLabels = getExerciseVolumeBodyLabels(exercise, metadata);
      const matchesBody =
        bodyFilters.length === 0 ||
        bodyFilters.some((bodyFilter) =>
          exerciseBodyLabels.some(
            (label) =>
              normalizeFilterCompareValue(label) ===
              normalizeFilterCompareValue(bodyFilter),
          ),
        );
      const matchesBodyRegionLayer = exerciseMatchesBodyRegionLayer(
        exercise,
        metadata,
        bodyRegionLayer,
      );

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
        matchesBodyRegionLayer &&
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
    searchedModifierIds,
    bodyRegionLayer,
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
  const favoriteCount = favoriteExerciseIds.size;
  const hasActiveExerciseFilters =
    Boolean(search.trim()) ||
    Boolean(bodyRegionLayer) ||
    bodyFilters.length > 0 ||
    goalFilter !== "All" ||
    levelFilter !== "All" ||
    movementTypeFilter !== "All" ||
    apparatusFilter !== "All" ||
    loadBehaviorFilter !== "All";

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
      {
        value: "favorites",
        label: favoriteCount
          ? `${sortModeLabels.favorites} (${favoriteCount})`
          : sortModeLabels.favorites,
        helper: "Favorited cards first",
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
  }, [favoriteCount, savedExerciseStats.length]);

  useEffect(() => {
    if (!sortOptions.some((option) => option.value === sortMode)) {
      setSortMode(defaultExerciseLibrarySortMode);
    }
  }, [sortMode, sortOptions]);

  const sortedFocusedExercises = useMemo(
    () =>
      sortExercisesForLibrary(
        focusedExercises,
        sortMode,
        savedExerciseStats,
        favoriteExerciseIds,
      ),
    [focusedExercises, sortMode, savedExerciseStats, favoriteExerciseIds],
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

  const exerciseSections = useMemo(() => {
    const sections = groupExercisesIntoSections(
      sortedFocusedExercises,
      sortMode,
      favoriteExerciseIds,
    );
    const shouldShowCreateExerciseEmptyState =
      sortMode === defaultExerciseLibrarySortMode &&
      !hasActiveExerciseFilters &&
      customExercises.length === 0 &&
      !sections.some((section) => section.key === myExercisesSectionKey);

    return shouldShowCreateExerciseEmptyState
      ? [
          ...sections,
          {
            key: myExercisesSectionKey,
            label: myExercisesSectionLabel,
            exercises: [],
          },
        ]
      : sections;
  }, [
    sortedFocusedExercises,
    sortMode,
    favoriteExerciseIds,
    hasActiveExerciseFilters,
    customExercises.length,
  ]);
  const hasUserSelectedExerciseSectionRef = useRef(false);
  const [activeExerciseSectionKey, setActiveExerciseSectionKey] = useState<
    string | null
  >(() => getDefaultActiveExerciseSectionKey(exerciseSections));

  const totalPages = Math.ceil(exerciseSections.length / exerciseSectionsPerPage);

  const paginatedExerciseSections = useMemo(() => {
    const startIndex = (currentPage - 1) * exerciseSectionsPerPage;
    return exerciseSections.slice(
      startIndex,
      startIndex + exerciseSectionsPerPage,
    );
  }, [currentPage, exerciseSections, exerciseSectionsPerPage]);
  const weeklySetsBySectionKey = useMemo(() => {
    const sectionSets = new Map<string, number>();

    exerciseSections.forEach((section) => {
      sectionSets.set(
        section.key,
        getWeeklySetsForExercises(
          section.exercises,
          weeklySetsSummary.exerciseSetsById,
        ),
      );
    });

    return sectionSets;
  }, [exerciseSections, weeklySetsSummary.exerciseSetsById]);
  const weeklyWeightVolumeBySectionKey = useMemo(() => {
    const sectionWeightVolume = new Map<string, number>();

    exerciseSections.forEach((section) => {
      sectionWeightVolume.set(
        section.key,
        getWeeklyWeightVolumeForExercises(
          section.exercises,
          weeklySetsSummary.exerciseWeightVolumeById,
        ),
      );
    });

    return sectionWeightVolume;
  }, [exerciseSections, weeklySetsSummary.exerciseWeightVolumeById]);
  const activeExerciseSectionForCurrentPage =
    paginatedExerciseSections.find(
      (section) => section.key === activeExerciseSectionKey,
    ) ||
    paginatedExerciseSections[0] ||
    exerciseSections[0];
  const activeExerciseSectionTheme = getExerciseSectionTheme(
    activeExerciseSectionForCurrentPage,
    sortMode,
  );
  const activeExercisePageSelectorTheme = getExercisePageSelectorTheme(
    activeExerciseSectionTheme,
  );

  useEffect(() => {
    setActiveExerciseSectionKey((currentKey) => {
      if (!paginatedExerciseSections.length) return null;

      const currentKeyIsVisible =
        Boolean(currentKey) &&
        paginatedExerciseSections.some((section) => section.key === currentKey);
      const visibleLowerBodyCompoundSection = paginatedExerciseSections.find(
        (section) => section.key === defaultOpenExerciseSectionKey,
      );
      const desiredKey =
        sortMode === defaultExerciseLibrarySortMode
          ? hasActiveExerciseFilters
            ? visibleLowerBodyCompoundSection?.key ||
              getFirstVisibleExerciseSectionKey(paginatedExerciseSections)
            : getDefaultActiveExerciseSectionKey(paginatedExerciseSections)
          : getFirstVisibleExerciseSectionKey(paginatedExerciseSections);

      if (
        currentKeyIsVisible &&
        ((!hasActiveExerciseFilters &&
          hasUserSelectedExerciseSectionRef.current) ||
          currentKey === desiredKey)
      ) {
        return currentKey;
      }

      return desiredKey;
    });
  }, [hasActiveExerciseFilters, paginatedExerciseSections, sortMode]);

  const toggleExerciseSection = (sectionKey: string) => {
    hasUserSelectedExerciseSectionRef.current = true;
    setActiveExerciseSectionKey((currentKey) => {
      if (currentKey === sectionKey) return currentKey;
      return sectionKey;
    });
  };

  const selectExerciseSectionFromNavigator = (sectionKey: string) => {
    const sectionIndex = exerciseSections.findIndex(
      (section) => section.key === sectionKey,
    );

    if (sectionIndex >= 0) {
      setCurrentPage(Math.floor(sectionIndex / exerciseSectionsPerPage) + 1);
    }

    toggleExerciseSection(sectionKey);
  };

  useEffect(() => {
    setCurrentPage(1);
    setActiveExerciseDetailsCardId(null);
    setActiveMovementDetailsPopupId(null);
  }, [
    search,
    bodyRegionLayer,
    bodyFilters,
    goalFilter,
    levelFilter,
    movementTypeFilter,
    apparatusFilter,
    loadBehaviorFilter,
    sortMode,
  ]);

  useEffect(() => {
    setActiveExerciseDetailsCardId(null);
    setActiveMovementDetailsPopupId(null);
  }, [currentPage, viewMode]);

  useEffect(() => {
    setActiveMovementDetailsPopupId(null);
  }, [activeExerciseDetailsCardId]);

  const resetFilters = () => {
    setSearch("");
    setBodyFilters([]);
    setBodyRegionLayer(null);
    setGoalFilter("All");
    setLevelFilter("All");
    setMovementTypeFilter("All");
    setApparatusFilter("All");
    setLoadBehaviorFilter("All");
    setSortMode(defaultExerciseLibrarySortMode);
    setCurrentPage(1);
    setActiveExerciseDetailsCardId(null);
    setActiveMovementDetailsPopupId(null);
    hasUserSelectedExerciseSectionRef.current = false;
    setActiveExerciseSectionKey(defaultOpenExerciseSectionKey);
  };
  const getLayerForSelectedBodyFilters = (filters: string[]) => {
    const selectedLayers = Array.from(
      new Set(
        filters
          .map((filter) => getBodyRegionLayerForLabel(filter))
          .filter((layer): layer is BodyRegionLayer => Boolean(layer)),
      ),
    );

    return selectedLayers.length === 1 ? selectedLayers[0] : null;
  };

  const toggleBodyFilter = (body: string) => {
    if (body === "All") {
      setBodyFilters([]);
      setBodyRegionLayer(null);
      return;
    }

    setBodyFilters((currentFilters) => {
      const nextFilters = currentFilters.includes(body)
        ? currentFilters.filter((activeBody) => activeBody !== body)
        : [...currentFilters, body];

      setBodyRegionLayer(getLayerForSelectedBodyFilters(nextFilters));
      return nextFilters;
    });
  };
  const selectBodyRegionLayer = (layer: BodyRegionLayer) => {
    setBodyRegionLayer((currentLayer) => {
      const nextLayer = currentLayer === layer ? null : layer;

      if (!nextLayer) {
        setBodyFilters([]);
        return null;
      }

      if (nextLayer) {
        const allowedBodies = new Set(bodyOptionsByLayer.get(nextLayer) || []);
        setBodyFilters((currentFilters) =>
          currentFilters.filter((body) => allowedBodies.has(body)),
        );
      }

      return nextLayer;
    });
  };
  const toggleAnatomyBodyFilter = (body: string, layer: BodyRegionLayer) => {
    setBodyFilters((currentFilters) => {
      const nextFilters = currentFilters.includes(body)
        ? currentFilters.filter((activeBody) => activeBody !== body)
        : [...currentFilters, body];

      setBodyRegionLayer(
        nextFilters.length ? getLayerForSelectedBodyFilters(nextFilters) : null,
      );
      return nextFilters;
    });
  };
  const toggleDifficultyFilter = (level: string) => {
    setLevelFilter((currentLevel) => (currentLevel === level ? "All" : level));
  };
  const toggleEquipmentFilter = (equipment: string) => {
    setApparatusFilter((currentEquipment) =>
      normalizeFilterCompareValue(currentEquipment) === normalizeFilterCompareValue(equipment)
        ? "All"
        : equipment,
    );
  };
  const filterByMuscleLabel = (muscle: string) => {
    const exactBodyMatch = bodyOptions.find(
      (body) => normalizeFilterCompareValue(body) === normalizeFilterCompareValue(muscle),
    );

    if (exactBodyMatch) {
      toggleBodyFilter(exactBodyMatch);
      return;
    }

    setSearch(muscle);
  };
  const handleArchitectureChipSelect = (chip: MovementArchitectureChip) => {
    if (chip.tone === "equipment") {
      toggleEquipmentFilter(chip.label);
      return;
    }

    if (chip.tone === "classification") {
      const matchingSection = exerciseSections.find(
        (section) =>
          normalizeFilterCompareValue(section.label) === normalizeFilterCompareValue(chip.label),
      );
      if (matchingSection) {
        setSortMode(defaultExerciseLibrarySortMode);
        selectExerciseSectionFromNavigator(matchingSection.key);
        return;
      }
    }

    const matchingMovementType = movementTypeOptions.find(
      (option) =>
        normalizeFilterCompareValue(option.label) === normalizeFilterCompareValue(chip.label) ||
        option.coreMovementIds.some(
          (coreMovementId) =>
            normalizeFilterCompareValue(CORE_MOVEMENT_BY_ID[coreMovementId]?.label || "") ===
            normalizeFilterCompareValue(chip.label),
        ) ||
        option.movementPatternIds.some(
          (movementPatternId) =>
            normalizeFilterCompareValue(
              MOVEMENT_PATTERN_BY_ID[movementPatternId]?.label || "",
            ) === normalizeFilterCompareValue(chip.label),
        ),
    );

    if (matchingMovementType) {
      setMovementTypeFilter((currentMovementType) =>
        currentMovementType === matchingMovementType.value
          ? "All"
          : matchingMovementType.value,
      );
      return;
    }

    setSearch(chip.label);
  };
  const handleSuggestionSelect = (suggestion: MovementSuggestion) => {
    const scrollToSuggestionCard = () => {
      const safeExerciseId = suggestion.id
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"');
      const target = document.querySelector<HTMLElement>(
        `[data-exercise-id="${safeExerciseId}"]`,
      );

      if (!target) return;

      target.focus({ preventScroll: true });
      target.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    };
    const matchingSectionIndex = exerciseSections.findIndex((section) =>
      section.exercises.some((exercise) => exercise.id === suggestion.id),
    );

    if (matchingSectionIndex >= 0) {
      const matchingSection = exerciseSections[matchingSectionIndex];

      setSortMode(defaultExerciseLibrarySortMode);
      setCurrentPage(
        Math.floor(matchingSectionIndex / exerciseSectionsPerPage) + 1,
      );
      hasUserSelectedExerciseSectionRef.current = true;
      setActiveExerciseSectionKey(matchingSection.key);
      window.setTimeout(scrollToSuggestionCard, 180);
      return;
    }

    setSearch(suggestion.name);
    setCurrentPage(1);
    window.setTimeout(scrollToSuggestionCard, 240);
  };

  const scrollToExerciseCardById = (exerciseId: string) => {
    const safeExerciseId = exerciseId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const target = document.querySelector<HTMLElement>(
      `[data-exercise-id="${safeExerciseId}"]`,
    );

    if (!target) return false;

    target.focus({ preventScroll: true });
    target.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
    return true;
  };

  const navigateToExerciseCard = (exercise: Exercise | null) => {
    if (!exercise) return;

    const matchingSectionIndex = exerciseSections.findIndex((section) =>
      section.exercises.some((sectionExercise) => sectionExercise.id === exercise.id),
    );

    if (matchingSectionIndex >= 0) {
      const matchingSection = exerciseSections[matchingSectionIndex];
      setCurrentPage(
        Math.floor(matchingSectionIndex / exerciseSectionsPerPage) + 1,
      );
      hasUserSelectedExerciseSectionRef.current = true;
      setActiveExerciseSectionKey(matchingSection.key);
      window.setTimeout(() => scrollToExerciseCardById(exercise.id), 180);
      return;
    }

    setSearch(getExerciseSortTitle(exercise) || exercise.name);
    setCurrentPage(1);
    window.setTimeout(() => scrollToExerciseCardById(exercise.id), 240);
  };

  const focusBodyVolumeFilter = (body: string) => {
    if (!body || body === "All") return;

    setBodyFilters([body]);
    setBodyRegionLayer(getLayerForSelectedBodyFilters([body]));
  };

  const navigateToExerciseSectionKey = (sectionKey: string) => {
    const matchingSection = exerciseSections.find(
      (section) => section.key === sectionKey,
    );

    if (!matchingSection) return;

    setSortMode(defaultExerciseLibrarySortMode);
    selectExerciseSectionFromNavigator(matchingSection.key);
  };

  const updatePrivateExerciseCoreMovement = (coreMovementId: string) => {
    const nextCoreMovementId = coreMovementId as CoreMovementId | "";
    const nextMetadata =
      getPrivateExerciseMetadataForCoreMovement(nextCoreMovementId);
    const nextControls = getPrivateExerciseModifierControls(
      nextCoreMovementId,
      nextMetadata,
    );
    const coreMovement =
      nextCoreMovementId ? CORE_MOVEMENT_BY_ID[nextCoreMovementId] : null;
    const nextGoal =
      coreMovement?.defaultIntentIds?.[0]
        ? titleCase(coreMovement.defaultIntentIds[0])
        : "Hypertrophy";
    const nextDifficulty = coreMovement?.defaultLevel
      ? titleCase(coreMovement.defaultLevel)
      : "Beginner";

    setNewExercise((prev) => ({
      ...prev,
      coreMovementPattern: nextCoreMovementId,
      semanticVariationId: "",
      modifierIds: nextCoreMovementId
        ? getPrivateExerciseDefaultModifierIds(nextCoreMovementId, nextControls)
        : [],
      goal: nextGoal,
      difficulty: nextDifficulty,
      primaryMuscles:
        prev.primaryMuscles ||
        coreMovement?.primaryMuscles.join(" • ") ||
        "",
      secondaryMuscles:
        prev.secondaryMuscles ||
        coreMovement?.secondaryMuscles.join(" • ") ||
        "",
      cue: prev.cue || coreMovement?.defaultCue || "",
    }));
  };

  const updatePrivateExerciseEquipment = (modifierId: string) => {
    setNewExercise((prev) => ({
      ...prev,
      modifierIds: normalizeModifierIdsForCoreMovement(
        prev.coreMovementPattern || undefined,
        [
          ...prev.modifierIds.filter(
            (id) => getModifierCategoryId(id) !== "apparatus",
          ),
          ...(modifierId ? [modifierId as ExerciseModifierId] : []),
        ],
      ),
    }));
  };

  const updatePrivateExerciseSemanticVariation = (variationId: string) => {
    const variation = privateExerciseSemanticVariationOptions.find(
      (option) => option.id === variationId,
    );

    setNewExercise((prev) => {
      const semanticFreeModifierIds = prev.coreMovementPattern
        ? [
            ...getPrivateExerciseDefaultModifierIds(
              prev.coreMovementPattern,
              privateExerciseSettingControls,
            ).filter((id) => getModifierCategoryId(id) !== "apparatus"),
            ...prev.modifierIds.filter(
              (id) => getModifierCategoryId(id) === "apparatus",
            ),
          ]
        : prev.modifierIds;

      return {
        ...prev,
        semanticVariationId: variationId,
        name: prev.name.trim() || variation?.name || prev.name,
        modifierIds: variation
          ? normalizeModifierIdsForCoreMovement(
              prev.coreMovementPattern || undefined,
              applySemanticVariationModifierPreset(prev.modifierIds, variation),
            )
          : normalizeModifierIdsForCoreMovement(
              prev.coreMovementPattern || undefined,
              semanticFreeModifierIds,
            ),
      };
    });
  };

  const openCreateExerciseForm = (coreMovementId?: CoreMovementId | string) => {
    const nextCoreMovementId =
      coreMovementId && CORE_MOVEMENT_BY_ID[coreMovementId as CoreMovementId]
        ? (coreMovementId as CoreMovementId)
        : "";

    if (nextCoreMovementId) {
      const nextMetadata =
        getPrivateExerciseMetadataForCoreMovement(nextCoreMovementId);
      const nextControls = getPrivateExerciseModifierControls(
        nextCoreMovementId,
        nextMetadata,
      );
      const coreMovement = CORE_MOVEMENT_BY_ID[nextCoreMovementId];

      setNewExercise((prev) => ({
        ...prev,
        coreMovementPattern: nextCoreMovementId,
        semanticVariationId: "",
        modifierIds: getPrivateExerciseDefaultModifierIds(
          nextCoreMovementId,
          nextControls,
        ),
        goal: coreMovement?.defaultIntentIds?.[0]
          ? titleCase(coreMovement.defaultIntentIds[0])
          : prev.goal || "Hypertrophy",
        difficulty: coreMovement?.defaultLevel
          ? titleCase(coreMovement.defaultLevel)
          : prev.difficulty || "Beginner",
        primaryMuscles:
          coreMovement?.primaryMuscles.join(" â€¢ ") ||
          prev.primaryMuscles ||
          "",
        secondaryMuscles:
          coreMovement?.secondaryMuscles.join(" â€¢ ") ||
          prev.secondaryMuscles ||
          "",
        cue: prev.cue || coreMovement?.defaultCue || "",
      }));
    }

    setShowAddForm(true);
    window.setTimeout(() => {
      addExerciseFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  };

  const addExercise = () => {
    if (!newExercise.name.trim() || !newExercise.coreMovementPattern) return;

    const coreMovement = CORE_MOVEMENT_BY_ID[newExercise.coreMovementPattern];
    const selectedEquipment =
      getSelectedModifiersByCategory(newExercise.modifierIds, "apparatus")[0]
        ?.label ||
      "Bodyweight";
    const primaryMuscles = newExercise.primaryMuscles
      .split(/[•,]/)
      .map((muscle) => muscle.trim())
      .filter(Boolean);
    const secondaryMuscles = newExercise.secondaryMuscles
      .split(/[•,]/)
      .map((muscle) => muscle.trim())
      .filter(Boolean);
    const customExerciseId = `custom-${Date.now()}`;

    const exercise: Exercise = {
      id: customExerciseId,
      customExerciseId,
      name: newExercise.name.trim(),
      exerciseName: newExercise.name.trim(),
      body: coreMovement?.bodyRegion || "General",
      muscles:
        [...primaryMuscles, ...secondaryMuscles].join(" • ") ||
        coreMovement?.primaryMuscles.join(" • ") ||
        "General",
      pattern: coreMovement?.label || "General",
      goal: newExercise.goal.trim() || "Hypertrophy",
      equipment: selectedEquipment,
      level: newExercise.difficulty.trim() || "Beginner",
      image: newExercise.image.trim() || defaultImage,
      cue:
        newExercise.cue.trim() ||
        coreMovement?.defaultCue ||
        "Move with control, own the position, and make every rep count.",
      custom: true,
      coreMovementPattern: newExercise.coreMovementPattern,
      semanticVariationId: privateExerciseSelectedSemanticVariation?.id,
      semanticVariationName: privateExerciseSelectedSemanticVariation?.name,
      semanticVariation: privateExerciseSelectedSemanticVariation?.name || "",
      generatedTitle: newExercise.name.trim(),
      selectedModifierIds: newExercise.modifierIds,
      primaryMuscles,
      secondaryMuscles,
      coachingCue:
        newExercise.cue.trim() ||
        coreMovement?.defaultCue ||
        "Move with control, own the position, and make every rep count.",
      imageUrl: newExercise.image.trim() || defaultImage,
    };

    setCustomExercises((prev) => [exercise, ...prev]);
    setNewExercise(emptyPrivateExerciseDraft());

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
    const enteredWeight = parseStatNumber(statWeight);
    const savedWeightInPounds =
      preferredWeightUnit === "kg"
        ? enteredWeight / kilogramsPerPound
        : enteredWeight;
    const savedWeightValue =
      savedWeightInPounds > 0
        ? String(Math.round(savedWeightInPounds * 10) / 10)
        : statWeight.trim();

    const newStat: LocalExerciseStatEntry = {
      exerciseId: statsExercise.id,
      exerciseName: statsExercise.name,
      body: statsExercise.body,
      pattern: statsExercise.pattern,
      equipment: statsExercise.equipment,
      coreMovementPattern: statsExercise.coreMovementPattern,
      semanticVariationId: statsExercise.semanticVariationId,
      semanticVariationName: statsExercise.semanticVariationName,
      generatedTitle: statsExercise.generatedTitle,
      selectedModifierIds: statsExercise.selectedModifierIds,
      weight: savedWeightValue,
      reps: statReps.trim(),
      sets: statSets.trim(),
      date: new Date().toISOString(),
      source: "exercise-library",
    };

    try {
      prependExerciseStats(newStat);
    } catch {
      return;
    }

    const nextLatestSetInsight = buildLatestSetInsight({
      exercise: statsExercise,
      previousStats: savedExerciseStats,
      previousWeeklySetsSummary: weeklySetsSummary,
      stat: newStat,
    });

    setSavedExerciseStats((prev) => [newStat, ...prev]);
    setLatestSetInsight(nextLatestSetInsight);
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
        trigger:
          "border-cyan-200/24 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.16),transparent_34%),linear-gradient(135deg,rgba(8,47,73,0.42),rgba(15,23,42,0.84))] text-cyan-100 hover:border-cyan-100/48 hover:bg-cyan-300/12 hover:shadow-[0_18px_42px_rgba(0,0,0,0.32),0_0_26px_rgba(34,211,238,0.14),inset_0_1px_0_rgba(255,255,255,0.16)] focus-visible:ring-cyan-200/30",
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
        trigger:
          "border-emerald-200/24 bg-[radial-gradient(circle_at_12%_0%,rgba(16,185,129,0.16),transparent_34%),linear-gradient(135deg,rgba(6,78,59,0.42),rgba(15,23,42,0.84))] text-emerald-100 hover:border-emerald-100/48 hover:bg-emerald-300/12 hover:shadow-[0_18px_42px_rgba(0,0,0,0.32),0_0_26px_rgba(16,185,129,0.14),inset_0_1px_0_rgba(255,255,255,0.16)] focus-visible:ring-emerald-200/30",
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
        trigger:
          "border-sky-200/24 bg-[radial-gradient(circle_at_12%_0%,rgba(56,189,248,0.16),transparent_34%),linear-gradient(135deg,rgba(12,74,110,0.42),rgba(15,23,42,0.84))] text-sky-100 hover:border-sky-100/48 hover:bg-sky-300/12 hover:shadow-[0_18px_42px_rgba(0,0,0,0.32),0_0_26px_rgba(56,189,248,0.14),inset_0_1px_0_rgba(255,255,255,0.16)] focus-visible:ring-sky-200/30",
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
        trigger:
          "border-violet-200/24 bg-[radial-gradient(circle_at_12%_0%,rgba(167,139,250,0.16),transparent_34%),linear-gradient(135deg,rgba(76,29,149,0.42),rgba(15,23,42,0.84))] text-violet-100 hover:border-violet-100/48 hover:bg-violet-300/12 hover:shadow-[0_18px_42px_rgba(0,0,0,0.32),0_0_26px_rgba(167,139,250,0.14),inset_0_1px_0_rgba(255,255,255,0.16)] focus-visible:ring-violet-200/30",
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
          className={`group/filter-control flex min-h-[42px] w-full items-center justify-between rounded-2xl border px-2.5 py-1.5 text-left shadow-[0_12px_34px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.12)] outline-none ring-1 ring-white/[0.03] backdrop-blur-2xl transition duration-200 hover:-translate-y-0.5 md:min-h-[40px] md:px-2.5 md:py-1.5 min-[1100px]:min-h-[46px] min-[1100px]:rounded-[22px] min-[1100px]:px-3.5 min-[1100px]:py-2.5 ${accentClasses[accent].trigger}`}
        >
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.12em] opacity-70 md:text-[9px] md:tracking-[0.14em] min-[1100px]:text-[10px] min-[1100px]:tracking-[0.18em]">
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70 shadow-[0_0_10px_currentColor]" />
              {label}
            </p>
            <p className="mt-0.5 truncate text-xs font-black leading-4 text-white md:text-[13px] md:leading-4 min-[1100px]:text-sm">
              {selectedOption?.label || value}
            </p>
            {(selectedOption?.group || selectedOption?.helper) ? (
              <p className="mt-0.5 hidden text-[10px] font-bold uppercase tracking-[0.12em] text-white/45 md:block md:text-[9px] md:leading-3 md:tracking-[0.1em] min-[1100px]:text-[10px] min-[1100px]:tracking-[0.12em]">
                {[selectedOption.group, selectedOption.helper]
                  .filter(Boolean)
                  .join(" / ")}
              </p>
            ) : null}
          </div>

          <span
            aria-hidden="true"
            className={`relative ml-2 flex h-5 w-5 items-center justify-center rounded-full border text-sm font-black text-transparent transition after:absolute after:content-['v'] md:h-6 md:w-6 min-[1100px]:ml-3 min-[1100px]:h-7 min-[1100px]:w-7 ${accentClasses[accent].arrow} ${
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
                className={`exercise-library-filter-menu-panel fixed overflow-hidden rounded-[26px] border p-2 backdrop-blur-xl ${accentClasses[accent].panel}`}
              >
                {optionList}
              </div>,
              document.body,
            )
          : null}

        {open && !widePanel && (
          <div className={`exercise-library-filter-menu-panel absolute left-0 right-0 z-[9999] mt-2 overflow-hidden rounded-[24px] border p-2 backdrop-blur-xl ${accentClasses[accent].panel}`}>
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
      className="grid min-h-[42px] grid-cols-3 overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.74))] p-0.5 shadow-[0_14px_38px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/[0.035] backdrop-blur-2xl md:min-h-[40px] min-[1100px]:min-h-[46px] min-[1100px]:rounded-[22px]"
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
              className={`min-w-0 border px-0.5 py-1 text-[8px] font-black uppercase leading-3 tracking-[0.02em] transition focus:relative focus:z-10 focus:outline-none focus:ring-2 sm:px-1.5 sm:text-[10px] md:py-1 md:text-[9px] min-[1100px]:py-1.5 min-[1100px]:text-[10px] ${segment.focusRing} ${
                isActive ? segment.active : segment.tone
              } ${radiusClass}`}
            >
              <span className="block truncate">{segment.label}</span>
              <span className="mt-0.5 block truncate text-[7px] font-black leading-3 opacity-70 sm:text-[9px] md:text-[8px] min-[1100px]:text-[9px]">
                {count} available
              </span>
            </button>
          );
        })}
    </div>
  );

  const privateExerciseFieldClass =
    "min-h-[46px] w-full rounded-[16px] border border-white/10 bg-slate-950/70 px-3.5 py-2.5 text-sm font-bold text-white outline-none placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition focus:border-emerald-300/70 focus:bg-slate-950/90";
  const privateExerciseLabelClass =
    "grid gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/60";
  const privateExerciseSectionClass =
    "exercise-library-create-section rounded-[24px] border border-white/10 bg-white/[0.035] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-4";
  const weeklyTotalSets = Array.from(
    weeklySetsSummary.exerciseSetsById.values(),
  ).reduce((total, sets) => total + sets, 0);
  const weeklyTotalReps = Array.from(
    weeklySetsSummary.exerciseRepsById.values(),
  ).reduce((total, reps) => total + reps, 0);
  const weeklyTotalWeightVolume = Array.from(
    weeklySetsSummary.exerciseWeightVolumeById.values(),
  ).reduce((total, volume) => total + volume, 0);
  const weeklyTotalWeightVolumeLabel = formatWeightMetric(
    weeklyTotalWeightVolume,
    preferredWeightUnit,
    { compact: true, volume: true },
  );
  const previousWeeklyTotalWeightVolume =
    getPreviousTrailingSevenDayWeightVolumeForStats(savedExerciseStats);
  const weeklyWeightVolumeComparisonLabel = formatWeightVolumeComparison(
    weeklyTotalWeightVolume,
    previousWeeklyTotalWeightVolume,
  );
  const weeklyExercisesTrained = weeklySetsSummary.exerciseSetsById.size;
  const weeklyMuscleGroupsHit = Array.from(
    weeklySetsSummary.bodySetsByLabel.entries(),
  ).filter(
    ([label, sets]) => label !== "All" && Math.max(0, Math.round(sets)) > 0,
  ).length;
  const latestTrainingRecord = useMemo(() => {
    const latestStat = savedExerciseStats.reduce<LocalExerciseStatEntry | null>(
      (latest, stat) =>
        !latest || getStatTime(stat) > getStatTime(latest) ? stat : latest,
      null,
    );

    return {
      exercise: latestStat
        ? resolveStatExercise(latestStat, exerciseStatLookup)
        : null,
      stat: latestStat,
    };
  }, [exerciseStatLookup, savedExerciseStats]);
  const bestRecentTrainingRecord = useMemo(() => {
    const bestStat = savedExerciseStats
      .filter(isStatWithinTrailingSevenDays)
      .reduce<LocalExerciseStatEntry | null>((best, stat) => {
        if (!best) return stat;

        const statVolume = getStatVolume(stat);
        const bestVolume = getStatVolume(best);
        if (statVolume !== bestVolume) {
          return statVolume > bestVolume ? stat : best;
        }

        return getEstimatedOneRepMax(stat) > getEstimatedOneRepMax(best)
          ? stat
          : best;
      }, null);

    return {
      exercise: bestStat ? resolveStatExercise(bestStat, exerciseStatLookup) : null,
      stat: bestStat,
    };
  }, [exerciseStatLookup, savedExerciseStats]);
  const trainingBodyVolumeRows = useMemo(() => {
    return bodyOptions
      .filter((body) => body !== "All")
      .map((body) => {
        const sets = getWeeklySetsForVolumeLabel(
          weeklySetsSummary.bodySetsByLabel,
          body,
        );
        const weightVolume = getWeeklySetsForVolumeLabel(
          weeklySetsSummary.bodyWeightVolumeByLabel,
          body,
        );
        const goal = getWeeklySetGoalForBodyPart(body);
        const progress = getWeeklySetGoalProgressPercent(sets, goal);
        const statusId = getWeeklySetGoalStatusId(sets, goal);
        const lastTrainedTime = getLastTrainedForVolumeLabel(
          weeklySetsSummary.lastTrainedByLabel,
          body,
        );

        return {
          body,
          goal,
          lastTrainedTime,
          progress,
          sets,
          statusId,
          theme: getBodyRegionTheme(body),
          weightVolume,
        };
      })
      .sort(
        (left, right) =>
          left.progress - right.progress ||
          left.sets - right.sets ||
          left.body.localeCompare(right.body),
      );
  }, [
    bodyOptions,
    weeklySetsSummary.bodySetsByLabel,
    weeklySetsSummary.bodyWeightVolumeByLabel,
    weeklySetsSummary.lastTrainedByLabel,
  ]);
  const undertrainedBodyTarget =
    trainingBodyVolumeRows.find((row) => row.statusId === "undertrained") ||
    null;
  const almostThereBodyTarget =
    trainingBodyVolumeRows.find((row) => row.statusId === "almost-there") ||
    null;
  const trainedBodyTarget =
    trainingBodyVolumeRows.find((row) => row.statusId === "trained") || null;
  const needsRecoveryBodyTarget =
    trainingBodyVolumeRows.find((row) => row.statusId === "risk") || null;
  const highestVolumeBodyTarget =
    [...trainingBodyVolumeRows].sort(
      (left, right) =>
        right.sets - left.sets || left.body.localeCompare(right.body),
    )[0] || null;
  const trainingCategoryVolumeRows = useMemo(() => {
    return exerciseSections
      .map((section) => {
        const sets = weeklySetsBySectionKey.get(section.key) || 0;
        const weightVolume = weeklyWeightVolumeBySectionKey.get(section.key) || 0;
        const goal = getWeeklySetGoalForSection(section.label);

        return {
          goal,
          key: section.key,
          label: section.label,
          progress: getWeeklySetGoalProgressPercent(sets, goal),
          section,
          sets,
          statusId: getWeeklySetGoalStatusId(sets, goal),
          theme: getExerciseSectionTheme(section, sortMode),
          weightVolume,
        };
      })
      .filter((row) => row.section.exercises.length > 0)
      .sort(
        (left, right) =>
          left.progress - right.progress ||
          left.sets - right.sets ||
          left.label.localeCompare(right.label),
      );
  }, [
    exerciseSections,
    sortMode,
    weeklySetsBySectionKey,
    weeklyWeightVolumeBySectionKey,
  ]);
  const undertrainedCategoryTarget =
    trainingCategoryVolumeRows.find(
      (row) => row.statusId === "undertrained",
    ) || null;
  const almostThereCategoryTarget =
    trainingCategoryVolumeRows.find(
      (row) => row.statusId === "almost-there",
    ) || null;
  const needsRecoveryCategoryTarget =
    trainingCategoryVolumeRows.find((row) => row.statusId === "risk") || null;
  const suggestedExerciseTarget = useMemo(() => {
    if (undertrainedBodyTarget) {
      const normalizedTarget = normalizeBodySelectorValue(
        undertrainedBodyTarget.body,
      );
      const bodyMatchedExercise = focusedExercises.find((exercise) => {
        const metadata = getMetadataForExercise(exercise);

        return getExerciseVolumeBodyLabels(exercise, metadata).some(
          (label) => normalizeBodySelectorValue(label) === normalizedTarget,
        );
      });

      if (bodyMatchedExercise) return bodyMatchedExercise;
    }

    return (
      activeExerciseSectionForCurrentPage?.exercises[0] ||
      focusedExercises[0] ||
      null
    );
  }, [
    activeExerciseSectionForCurrentPage,
    focusedExercises,
    undertrainedBodyTarget,
  ]);
  const activeTrainingFilterChips = useMemo(() => {
    const chips: string[] = [];
    const movementTypeLabel =
      movementTypeOptionByValue.get(movementTypeFilter)?.label ||
      movementTypeFilter;

    if (search.trim()) chips.push(`Search: ${search.trim()}`);
    if (bodyRegionLayer) chips.push(`${bodyRegionLayer} region`);
    if (bodyFilters.length) {
      chips.push(
        bodyFilters.length <= 2
          ? `Body: ${bodyFilters.join(", ")}`
          : `Body: ${bodyFilters.slice(0, 2).join(", ")} +${bodyFilters.length - 2}`,
      );
    }
    if (movementTypeFilter !== "All") chips.push(`Movement: ${movementTypeLabel}`);
    if (apparatusFilter !== "All") chips.push(`Equipment: ${apparatusFilter}`);
    if (goalFilter !== "All") chips.push(`Goal: ${goalFilter}`);
    if (levelFilter !== "All") chips.push(`Level: ${levelFilter}`);
    if (loadBehaviorFilter !== "All") {
      chips.push(`Load: ${loadBehaviorFilter}`);
    }
    chips.push(
      sortMode === defaultExerciseLibrarySortMode
        ? "Sort: Category Order"
        : `Sort: ${sortModeLabels[sortMode]}`,
    );

    return chips;
  }, [
    apparatusFilter,
    bodyFilters,
    bodyRegionLayer,
    goalFilter,
    levelFilter,
    loadBehaviorFilter,
    movementTypeFilter,
    search,
    sortMode,
  ]);
  const latestTrainingExerciseName =
    latestTrainingRecord.exercise?.generatedTitle ||
    latestTrainingRecord.exercise?.name ||
    latestTrainingRecord.stat?.generatedTitle ||
    latestTrainingRecord.stat?.exerciseName ||
    "";
  const latestTrainingLine = latestTrainingRecord.stat
    ? `${Math.max(0, Math.round(parseStatNumber(latestTrainingRecord.stat.sets)))} sets / ${Math.max(
        0,
        Math.round(parseStatNumber(latestTrainingRecord.stat.reps)),
      )} reps`
    : "No recent training logged";
  const bestRecentExerciseName =
    bestRecentTrainingRecord.exercise?.generatedTitle ||
    bestRecentTrainingRecord.exercise?.name ||
    bestRecentTrainingRecord.stat?.generatedTitle ||
    bestRecentTrainingRecord.stat?.exerciseName ||
    "";
  const bestRecentLiftLine = bestRecentTrainingRecord.stat
    ? `${Math.max(0, Math.round(parseStatNumber(bestRecentTrainingRecord.stat.sets)))} x ${Math.max(
        0,
        Math.round(parseStatNumber(bestRecentTrainingRecord.stat.reps)),
      )}${
        parseStatNumber(bestRecentTrainingRecord.stat.weight) > 0
          ? ` @ ${formatWeightMetric(
              parseStatNumber(bestRecentTrainingRecord.stat.weight),
              preferredWeightUnit,
            )}`
          : ""
      }`
    : "No best stats yet";
  const lastTrainedTime = latestTrainingRecord.stat
    ? getStatTime(latestTrainingRecord.stat)
    : 0;
  const lastTrainedLabel = formatTrainingRecencyLabel(lastTrainedTime);
  const trainingStreakLabel = getTrainingStreakLabel(savedExerciseStats);
  const weeklyCompletionPercent = getWeeklySetGoalProgressPercent(
    weeklyTotalSets,
    allBodyRegionWeeklySetGoal,
  );
  const currentFocusLabel =
    undertrainedBodyTarget?.body ||
    undertrainedCategoryTarget?.label ||
    activeExerciseSectionForCurrentPage?.label ||
    "Exercise Library";
  const goalLogicBase = getGoalLogicCopy(profileSummary.primaryGoal);
  const goalLogicSummary: GoalLogicSummary = {
    emphasisLabel: goalLogicBase.emphasisLabel,
    forecastLabel: getVolumeForecastLabel(
      savedExerciseStats,
      weeklyTotalSets,
      allBodyRegionWeeklySetGoal,
    ),
    futureLoadCapacityLabel: getFutureLoadCapacityLabel(
      savedExerciseStats,
      preferredWeightUnit,
    ),
    goalCue: goalLogicBase.goalCue,
    primaryGoalLabel: profileSummary.primaryGoal || "General Fitness",
    recoveryRiskLabel: getRecoveryRiskLabel(
      weeklyTotalSets,
      allBodyRegionWeeklySetGoal,
    ),
    stimulusLabel: getGoalStimulusLabel(
      profileSummary.primaryGoal,
      weeklyTotalSets,
      allBodyRegionWeeklySetGoal,
    ),
  };
  const trainingStatCards: TrainingIntelligenceStatCard[] = [
    {
      detail: `${Math.round(weeklyCompletionPercent)}% complete`,
      helper: weeklyVolumeRangeLabel,
      id: "sets-this-week",
      progressPercent: getWeeklySetGoalFillPercent(
        weeklyTotalSets,
        allBodyRegionWeeklySetGoal,
      ),
      pulse: Boolean(latestSetInsight),
      statusId: getWeeklySetGoalStatusId(
        weeklyTotalSets,
        allBodyRegionWeeklySetGoal,
      ),
      theme: activeExerciseSectionTheme,
      value: weeklyTotalSets.toLocaleString(undefined, {
        maximumFractionDigits: 0,
      }),
      label: "Sets this week",
    },
    {
      helper: weeklyTotalWeightVolumeLabel
        ? weeklyWeightVolumeComparisonLabel
        : "No load volume yet",
      id: "weight-volume-this-week",
      pulse: Boolean(latestSetInsight),
      theme: getCategoryTheme("Upper Pull"),
      value: weeklyTotalWeightVolumeLabel || "--",
      weightVolumeComparisonLabel: weeklyWeightVolumeComparisonLabel,
      weightVolumeTarget: previousWeeklyTotalWeightVolume,
      weightVolume: weeklyTotalWeightVolume,
      label: "Weight volume",
    },
    {
      helper: "Completed reps from logged sets",
      id: "reps-this-week",
      pulse: Boolean(latestSetInsight),
      theme: getCategoryTheme("Upper Push"),
      value: weeklyTotalReps.toLocaleString(undefined, {
        maximumFractionDigits: 0,
      }),
      label: "Reps this week",
    },
    {
      helper: "Unique exercise cards with logs",
      id: "exercises-trained",
      theme: getCategoryTheme("Integrated"),
      value: weeklyExercisesTrained.toLocaleString(),
      label: "Exercises trained",
    },
    {
      helper: "Body regions with weekly sets",
      id: "muscle-groups-hit",
      theme: getCategoryTheme("Mobility"),
      value: weeklyMuscleGroupsHit.toLocaleString(),
      label: "Muscle groups hit",
    },
    {
      detail: latestTrainingRecord.stat
        ? formatTrainingRecencyLabel(getStatTime(latestTrainingRecord.stat))
        : "",
      helper: latestTrainingLine,
      id: "most-recent-workout",
      onClick: latestTrainingRecord.exercise
        ? () => navigateToExerciseCard(latestTrainingRecord.exercise)
        : undefined,
      theme: getCategoryTheme("Athletic"),
      value: latestTrainingExerciseName || "No recent workout",
      label: "Most recent workout",
    },
    {
      helper: bestRecentLiftLine,
      id: "best-recent-lift",
      onClick: bestRecentTrainingRecord.exercise
        ? () => navigateToExerciseCard(bestRecentTrainingRecord.exercise)
        : undefined,
      theme: getCategoryTheme("Upper Pull"),
      value: bestRecentExerciseName || "No best stats yet",
      label: "Best recent lift",
    },
    {
      detail: `${Math.max(0, Math.round(weeklyTotalSets))} / ${allBodyRegionWeeklySetGoal} sets`,
      helper: "Default weekly set target",
      id: "weekly-goal-completion",
      progressPercent: getWeeklySetGoalFillPercent(
        weeklyTotalSets,
        allBodyRegionWeeklySetGoal,
      ),
      statusId: getWeeklySetGoalStatusId(
        weeklyTotalSets,
        allBodyRegionWeeklySetGoal,
      ),
      theme: getCategoryTheme("Core"),
      value: `${Math.round(weeklyCompletionPercent)}%`,
      label: "Weekly goal",
    },
    {
      detail: undertrainedBodyTarget
        ? `${Math.max(0, Math.round(undertrainedBodyTarget.sets))} / ${
            undertrainedBodyTarget.goal
          } sets${
            undertrainedBodyTarget.weightVolume
              ? ` - ${formatWeightMetric(
                  undertrainedBodyTarget.weightVolume,
                  preferredWeightUnit,
                  { compact: true, volume: true },
                )}`
              : ""
          }`
        : "No target yet",
      helper: undertrainedBodyTarget
        ? getBodyTrainingSignal(
            undertrainedBodyTarget.sets,
            undertrainedBodyTarget.lastTrainedTime,
            undertrainedBodyTarget.goal,
          )
        : "Log sets to unlock focus",
      id: "undertrained-body",
      onClick: undertrainedBodyTarget
        ? () => focusBodyVolumeFilter(undertrainedBodyTarget.body)
        : undefined,
      statusId: undertrainedBodyTarget?.statusId,
      theme: undertrainedBodyTarget?.theme || getCategoryTheme("Core"),
      value: undertrainedBodyTarget?.body || "No data yet",
      label: "Undertrained",
    },
    {
      detail: highestVolumeBodyTarget
        ? `${Math.max(0, Math.round(highestVolumeBodyTarget.sets))} / ${
            highestVolumeBodyTarget.goal
          } sets${
            highestVolumeBodyTarget.weightVolume
              ? ` - ${formatWeightMetric(
                  highestVolumeBodyTarget.weightVolume,
                  preferredWeightUnit,
                  { compact: true, volume: true },
                )}`
              : ""
          }`
        : "No data yet",
      helper: highestVolumeBodyTarget
        ? `${formatTrainingRecencyLabel(highestVolumeBodyTarget.lastTrainedTime)}`
        : "Highest volume body part appears after logs",
      id: "highest-volume-body",
      onClick: highestVolumeBodyTarget
        ? () => focusBodyVolumeFilter(highestVolumeBodyTarget.body)
        : undefined,
      statusId: highestVolumeBodyTarget?.statusId,
      theme: highestVolumeBodyTarget?.theme || getCategoryTheme("Lower Body Compound"),
      value: highestVolumeBodyTarget?.body || "No data yet",
      label: "Highest volume",
    },
  ];
  const trainingShortcuts: TrainingIntelligenceShortcut[] = [
    {
      disabled: !exerciseSections.some((section) => section.key === "favorites"),
      helper: "Open favorite cards",
      id: "favorites",
      label: "Favorites",
      onClick: () => navigateToExerciseSectionKey("favorites"),
      theme: getCategoryTheme("Favorites"),
    },
    {
      disabled: !latestTrainingRecord.exercise,
      helper: "Jump to the latest logged exercise",
      id: "recent",
      label: "Recent",
      onClick: () => navigateToExerciseCard(latestTrainingRecord.exercise),
      theme: getCategoryTheme("Athletic"),
    },
    {
      disabled: !bestRecentTrainingRecord.exercise,
      helper: "Jump to the strongest recent logged exercise",
      id: "best",
      label: "Best",
      onClick: () => navigateToExerciseCard(bestRecentTrainingRecord.exercise),
      theme: getCategoryTheme("Upper Pull"),
    },
    {
      disabled: !undertrainedBodyTarget,
      helper: undertrainedBodyTarget?.body,
      id: "undertrained",
      label: "Undertrained",
      onClick: () =>
        undertrainedBodyTarget && focusBodyVolumeFilter(undertrainedBodyTarget.body),
      theme: undertrainedBodyTarget?.theme || getCategoryTheme("Core"),
    },
    {
      disabled: !almostThereBodyTarget,
      helper: almostThereBodyTarget?.body,
      id: "almost-there",
      label: "Almost There",
      onClick: () =>
        almostThereBodyTarget && focusBodyVolumeFilter(almostThereBodyTarget.body),
      theme: almostThereBodyTarget?.theme || getCategoryTheme("Arm Isolation"),
    },
    {
      disabled: !trainedBodyTarget,
      helper: trainedBodyTarget?.body,
      id: "trained",
      label: "Trained",
      onClick: () => trainedBodyTarget && focusBodyVolumeFilter(trainedBodyTarget.body),
      theme: trainedBodyTarget?.theme || getCategoryTheme("Lower Body Compound"),
    },
    {
      disabled: !needsRecoveryBodyTarget,
      helper: needsRecoveryBodyTarget?.body,
      id: "needs-recovery",
      label: "Needs Recovery",
      onClick: () =>
        needsRecoveryBodyTarget && focusBodyVolumeFilter(needsRecoveryBodyTarget.body),
      theme: needsRecoveryBodyTarget?.theme || getCategoryTheme("Upper Pull"),
    },
    {
      disabled: !exerciseSections.some(
        (section) => section.key === myExercisesSectionKey,
      ),
      helper: "Open private exercises",
      id: "my-exercises",
      label: "My Exercises",
      onClick: () => navigateToExerciseSectionKey(myExercisesSectionKey),
      theme: getCategoryTheme(myExercisesSectionLabel),
    },
    {
      helper: "Open the private exercise form",
      id: "create-exercise",
      label: "Create Exercise",
      onClick: () => openCreateExerciseForm(),
      theme: getCategoryTheme("Integrated"),
    },
  ];
  const trainingLogicInsights: TrainingLogicInsight[] = [];

  if (savedExerciseStats.length === 0) {
    trainingLogicInsights.push({
      detail:
        "No recent training is logged yet. Add a set and the library will start pointing to the freshest next focus.",
      eyebrow: "Starting point",
      id: "empty-training-log",
      theme: getCategoryTheme("Integrated"),
      title: "Log a set to unlock live guidance",
    });
  } else {
    if (undertrainedBodyTarget) {
      const remainingSets = Math.max(
        0,
        Math.ceil(undertrainedBodyTarget.goal - undertrainedBodyTarget.sets),
      );
      trainingLogicInsights.push({
        detail: `${undertrainedBodyTarget.body} is ${remainingSets} ${
          remainingSets === 1 ? "set" : "sets"
        } from its weekly target.`,
        eyebrow: "Next focus",
        id: "undertrained-body-insight",
        onClick: () => focusBodyVolumeFilter(undertrainedBodyTarget.body),
        statusId: undertrainedBodyTarget.statusId,
        theme: undertrainedBodyTarget.theme,
        title: `${undertrainedBodyTarget.body} needs attention`,
      });
    }

    if (undertrainedCategoryTarget) {
      trainingLogicInsights.push({
        detail: `${undertrainedCategoryTarget.label} is at ${Math.max(
          0,
          Math.round(undertrainedCategoryTarget.sets),
        )} / ${undertrainedCategoryTarget.goal} sets. Opening that shelf is the cleanest balance move.`,
        eyebrow: "Category balance",
        id: "undertrained-category-insight",
        onClick: () => navigateToExerciseSectionKey(undertrainedCategoryTarget.key),
        statusId: undertrainedCategoryTarget.statusId,
        theme: undertrainedCategoryTarget.theme,
        title: `${undertrainedCategoryTarget.label} is under target`,
      });
    }

    if (almostThereBodyTarget) {
      trainingLogicInsights.push({
        detail: `${almostThereBodyTarget.body} is close to the trained zone with ${Math.max(
          0,
          Math.round(almostThereBodyTarget.sets),
        )} / ${almostThereBodyTarget.goal} sets.`,
        eyebrow: "Near goal",
        id: "almost-there-body-insight",
        onClick: () => focusBodyVolumeFilter(almostThereBodyTarget.body),
        statusId: almostThereBodyTarget.statusId,
        theme: almostThereBodyTarget.theme,
        title: `${almostThereBodyTarget.body} is almost there`,
      });
    }

    if (needsRecoveryBodyTarget || needsRecoveryCategoryTarget) {
      const recoveryLabel =
        needsRecoveryBodyTarget?.body || needsRecoveryCategoryTarget?.label || "";
      trainingLogicInsights.push({
        detail: `${recoveryLabel} is above the default weekly target, so a lower-fatigue or alternate area may fit better next.`,
        eyebrow: "Recovery signal",
        id: "recovery-signal-insight",
        onClick: needsRecoveryBodyTarget
          ? () => focusBodyVolumeFilter(needsRecoveryBodyTarget.body)
          : needsRecoveryCategoryTarget
            ? () => navigateToExerciseSectionKey(needsRecoveryCategoryTarget.key)
            : undefined,
        statusId:
          needsRecoveryBodyTarget?.statusId ||
          needsRecoveryCategoryTarget?.statusId,
        theme:
          needsRecoveryBodyTarget?.theme ||
          needsRecoveryCategoryTarget?.theme ||
          getCategoryTheme("Mobility"),
        title: `${recoveryLabel} may need recovery`,
      });
    }

    if (suggestedExerciseTarget) {
      trainingLogicInsights.push({
        detail: `Based on the visible library state, ${getExerciseSortTitle(
          suggestedExerciseTarget,
        )} is a useful card to inspect next.`,
        eyebrow: "Suggested card",
        id: "suggested-exercise-insight",
        onClick: () => navigateToExerciseCard(suggestedExerciseTarget),
        theme: activeExerciseSectionTheme,
        title: getExerciseSortTitle(suggestedExerciseTarget),
      });
    }
  }

  const renderedTrainingLogicInsights = trainingLogicInsights.slice(0, 4);
  const activeRenderedExerciseSectionKey = paginatedExerciseSections.some(
    (section) => section.key === activeExerciseSectionKey,
  )
    ? activeExerciseSectionKey
    : activeExerciseSectionForCurrentPage?.key;
  const profileInitial =
    profileSummary.displayName.trim().charAt(0).toUpperCase() || "A";

  return (
    <main
      data-ui-theme={uiThemeId}
      className={`exercise-library-page-theme exercise-library-page-theme--${uiThemeId} relative isolate min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white`}
    >
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
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <a
                    href={ROUTES.dashboard.stats}
                    className="exercise-library-logic-pill inline-flex min-h-[44px] items-center rounded-2xl border border-cyan-100/24 bg-cyan-300/12 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:border-cyan-100/55 hover:bg-cyan-300 hover:text-slate-950"
                  >
                    Training Analytics
                  </a>
                  <span className="rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">
                    {weeklyVolumeRangeLabel}
                  </span>
                </div>
              </div>

            <div className="rounded-[28px] border border-cyan-300/20 bg-cyan-400/10 p-5 flex flex-col justify-between">
              <div className="exercise-library-goal-engine mb-4 rounded-[24px] border border-white/12 bg-[radial-gradient(circle_at_10%_0%,rgba(250,204,21,0.16),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.70),rgba(2,6,23,0.50))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_14px_34px_rgba(0,0,0,0.18)]">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-yellow-200/80">
                      Goal Command
                    </p>
                    <h2 className="mt-1 truncate text-lg font-black leading-6 text-white">
                      {goalLogicSummary.primaryGoalLabel}
                    </h2>
                    <p className="mt-1 text-[11px] font-bold leading-4 text-cyan-100/78">
                      {goalLogicSummary.emphasisLabel}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-4 text-slate-300">
                      {goalLogicSummary.stimulusLabel}
                    </p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-200/80">
                      {profileSummary.displayName} · {goalLogicSummary.recoveryRiskLabel}
                    </p>
                  </div>
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-cyan-100/20 bg-slate-950/60 text-xl font-black text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.12)]">
                    {profileSummary.avatarUrl ? (
                      <img
                        src={profileSummary.avatarUrl}
                        alt={`${profileSummary.displayName} avatar`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      profileInitial
                    )}
                  </div>
                </div>
              </div>
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

        <TrainingIntelligenceHeader
          currentFocusLabel={currentFocusLabel}
          goalLogic={goalLogicSummary}
          insights={renderedTrainingLogicInsights}
          lastTrainedLabel={lastTrainedLabel}
          latestSetInsight={latestSetInsight}
          onPreferredWeightUnitChange={updatePreferredWeightUnit}
          preferredWeightUnit={preferredWeightUnit}
          profileSummary={profileSummary}
          sectionTheme={activeExerciseSectionTheme}
          shortcuts={trainingShortcuts}
          statCards={trainingStatCards}
          trainingStreakLabel={trainingStreakLabel}
          weeklyGoalSets={allBodyRegionWeeklySetGoal}
          weeklyWeightVolumeComparisonLabel={weeklyWeightVolumeComparisonLabel}
          weeklyVolumeRangeLabel={weeklyVolumeRangeLabel}
          weeklyWeightVolume={weeklyTotalWeightVolume}
          weeklyReps={weeklyTotalReps}
          weeklySets={weeklyTotalSets}
        />

        <ExerciseLibraryWidgetDock
          bodyBalanceLabel={
            highestVolumeBodyTarget
              ? `${highestVolumeBodyTarget.body} leads this range`
              : "Log sets to compare regions"
          }
          currentFocusLabel={currentFocusLabel}
          latestTrainingExerciseName={latestTrainingExerciseName}
          latestTrainingLine={latestTrainingLine}
          onCreateExercise={openCreateExerciseForm}
          onThemeChange={updateExerciseLibraryUiTheme}
          sectionTheme={activeExerciseSectionTheme}
          shortcuts={trainingShortcuts}
          themeId={uiThemeId}
          preferredWeightUnit={preferredWeightUnit}
          weeklyGoalSets={allBodyRegionWeeklySetGoal}
          weeklyMuscleGroupsHit={weeklyMuscleGroupsHit}
          weeklyWeightVolume={weeklyTotalWeightVolume}
          weeklyWeightVolumeComparisonLabel={weeklyWeightVolumeComparisonLabel}
          weeklyVolumeRangeLabel={weeklyVolumeRangeLabel}
          weeklySets={weeklyTotalSets}
        />

        <section className="exercise-library-filter-command-center relative z-30 overflow-visible rounded-[26px] border border-cyan-100/16 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.12),transparent_34%),radial-gradient(circle_at_86%_14%,rgba(16,185,129,0.10),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.88),rgba(2,6,23,0.78))] p-2.5 shadow-[0_24px_80px_rgba(0,0,0,0.42),0_0_46px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.16)] ring-1 ring-white/[0.045] backdrop-blur-2xl backdrop-saturate-150 sm:rounded-[32px] sm:p-4 md:p-3 min-[1100px]:p-4">
          <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />
          <div className="grid grid-cols-2 gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end min-[1100px]:grid-cols-[1fr_auto_auto] min-[1100px]:items-start">
            <div className="col-span-2 md:col-span-2 min-[1100px]:col-span-1">
              <p className="inline-flex rounded-full border border-emerald-200/16 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.10)]">
                Movement Filters
              </p>

              <SearchInputWithSuggestions
                value={search}
                onChange={setSearch}
                suggestions={searchSuggestions}
              />
            </div>

            <div className="flex min-h-[42px] items-center gap-2 rounded-2xl border border-cyan-100/14 bg-[linear-gradient(135deg,rgba(15,23,42,0.88),rgba(8,47,73,0.42))] px-2.5 py-1.5 shadow-[0_14px_34px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/[0.035] md:min-h-[40px] md:min-w-[12rem] md:justify-self-start md:gap-2.5 md:px-3 md:py-1.5 min-[1100px]:block min-[1100px]:rounded-[22px] min-[1100px]:px-4 min-[1100px]:py-2.5">
              <p className="text-[9px] font-bold uppercase leading-none tracking-[0.1em] text-slate-400 md:text-[10px] md:leading-none md:tracking-[0.12em] min-[1100px]:text-xs min-[1100px]:font-normal min-[1100px]:normal-case min-[1100px]:tracking-normal">
                Showing
              </p>
              <p className="text-xl font-black leading-none text-cyan-300 md:text-xl min-[1100px]:mt-1 min-[1100px]:text-2xl">
                {focusedExercises.length}
              </p>
              <p className="hidden text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 min-[390px]:block md:text-[9px] md:leading-none md:tracking-[0.1em] min-[1100px]:mt-1 min-[1100px]:text-[10px] min-[1100px]:tracking-[0.14em]">
                Core cards
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="min-h-[42px] rounded-2xl border border-emerald-200/24 bg-[radial-gradient(circle_at_12%_0%,rgba(16,185,129,0.20),transparent_34%),linear-gradient(135deg,rgba(6,78,59,0.52),rgba(15,23,42,0.82))] px-3 py-2 text-xs font-black text-emerald-100 shadow-[0_14px_34px_rgba(0,0,0,0.28),0_0_22px_rgba(16,185,129,0.10),inset_0_1px_0_rgba(255,255,255,0.14)] ring-1 ring-white/[0.035] transition hover:-translate-y-0.5 hover:border-emerald-100/55 hover:bg-emerald-400 hover:text-slate-950 md:min-h-[40px] md:justify-self-end md:px-3.5 md:py-2 min-[1100px]:min-h-[44px] min-[1100px]:rounded-[22px] min-[1100px]:px-5 min-[1100px]:py-3 min-[1100px]:text-sm"
            >
              <span className="min-[1100px]:hidden">
                {showAddForm ? "Close" : "+ Add"}
              </span>
              <span className="hidden min-[1100px]:inline">
                {showAddForm ? "Close Form" : "+ Add Exercise"}
              </span>
            </button>
          </div>

          {showAddForm && (
            <div
              ref={addExerciseFormRef}
              className="exercise-library-create-panel mt-6 overflow-hidden rounded-[30px] border border-emerald-200/20 bg-[radial-gradient(circle_at_12%_0%,rgba(16,185,129,0.18),transparent_32%),radial-gradient(circle_at_92%_10%,rgba(34,211,238,0.12),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.90),rgba(2,6,23,0.82))] p-3 shadow-[0_22px_70px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.14)] sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="inline-flex rounded-lg border border-emerald-200/22 bg-emerald-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-100">
                    Private Exercise
                  </p>
                  <h2 className="mt-3 text-2xl font-black text-white">
                    Add Private Exercise
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                    Build a custom card using the current movement-engine
                    structure without forcing a semantic variation.
                  </p>
                </div>
                <div className="rounded-2xl border border-cyan-200/14 bg-cyan-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">
                  Core first
                </div>
              </div>

              <div className="mt-5 grid gap-3 xl:grid-cols-[1.05fr_1fr]">
                <section className={privateExerciseSectionClass}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">
                        01 Identity
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        Name the card and choose an exercise type.
                      </p>
                    </div>
                    <span className="rounded-xl border border-emerald-200/18 bg-emerald-300/10 px-2 py-1 text-[9px] font-black uppercase text-emerald-100">
                      Custom
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={`${privateExerciseLabelClass} sm:col-span-2`}>
                      Exercise Name
                  <input
                    placeholder="Exercise Name"
                    value={newExercise.name}
                    onChange={(event) =>
                      setNewExercise((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                        className={privateExerciseFieldClass}
                  />
                </label>

                    <label className={`${privateExerciseLabelClass} sm:col-span-2`}>
                      Semantic Variation / Exercise Type
                  <select
                    value={newExercise.semanticVariationId}
                    onChange={(event) =>
                      updatePrivateExerciseSemanticVariation(event.target.value)
                    }
                    disabled={!newExercise.coreMovementPattern}
                        className={`${privateExerciseFieldClass} disabled:cursor-not-allowed disabled:opacity-55`}
                  >
                        <option value="">
                          {newExercise.coreMovementPattern
                            ? "N/A - custom/private variation"
                            : "Select core movement first"}
                        </option>
                    {privateExerciseSemanticVariationOptions.map((variation) => (
                      <option key={variation.id} value={variation.id}>
                        {variation.name}
                      </option>
                    ))}
                  </select>
                </label>
                  </div>
                </section>

                <section className={privateExerciseSectionClass}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
                        02 Movement Architecture
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        Pick the core pattern, default load, goal, and level.
                      </p>
                    </div>
                    <span className="rounded-xl border border-cyan-200/18 bg-cyan-300/10 px-2 py-1 text-[9px] font-black uppercase text-cyan-100">
                      Engine
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={`${privateExerciseLabelClass} sm:col-span-2`}>
                      Core Movement Pattern
                      <select
                        value={newExercise.coreMovementPattern}
                        onChange={(event) =>
                          updatePrivateExerciseCoreMovement(event.target.value)
                        }
                        className={privateExerciseFieldClass}
                      >
                        <option value="">Select core movement</option>
                        {privateExerciseCoreOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className={privateExerciseLabelClass}>
                      Primary Equipment
                  <select
                    value={privateExerciseSelectedEquipmentModifierId}
                    onChange={(event) =>
                      updatePrivateExerciseEquipment(event.target.value)
                    }
                    disabled={
                      !newExercise.coreMovementPattern ||
                      privateExerciseEquipmentOptions.length === 0
                    }
                        className={`${privateExerciseFieldClass} focus:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-55`}
                  >
                    <option value="">Select equipment</option>
                    {privateExerciseEquipmentOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {getControlModifierDisplayLabel("Equipment", option)}
                      </option>
                    ))}
                  </select>
                </label>

                    <label className={privateExerciseLabelClass}>
                      Primary Goal
                  <select
                    value={newExercise.goal}
                    onChange={(event) =>
                      setNewExercise((prev) => ({
                        ...prev,
                        goal: event.target.value,
                      }))
                    }
                        className={`${privateExerciseFieldClass} focus:border-yellow-300`}
                  >
                    {baseGoals.map((goal) => (
                      <option key={goal} value={goal}>
                        {goal}
                      </option>
                    ))}
                  </select>
                </label>

                    <label className={privateExerciseLabelClass}>
                      Difficulty
                  <select
                    value={newExercise.difficulty}
                    onChange={(event) =>
                      setNewExercise((prev) => ({
                        ...prev,
                        difficulty: event.target.value,
                      }))
                    }
                        className={`${privateExerciseFieldClass} focus:border-yellow-300`}
                  >
                    {difficultyOrder.map((difficulty) => (
                      <option key={difficulty} value={difficulty}>
                        {difficulty}
                      </option>
                    ))}
                  </select>
                </label>
                  </div>
                </section>

                <section className={privateExerciseSectionClass}>
                  <div className="mb-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-200">
                      03 Muscles
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      These power search, filters, and weekly set rollups.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={privateExerciseLabelClass}>
                      Primary Muscles
                  <input
                    placeholder="Pecs | Triceps"
                    value={newExercise.primaryMuscles}
                    onChange={(event) =>
                      setNewExercise((prev) => ({
                        ...prev,
                        primaryMuscles: event.target.value,
                      }))
                    }
                        className={`${privateExerciseFieldClass} focus:border-violet-300`}
                  />
                </label>

                    <label className={privateExerciseLabelClass}>
                      Secondary Muscles
                  <input
                    placeholder="Shoulders | Core"
                    value={newExercise.secondaryMuscles}
                    onChange={(event) =>
                      setNewExercise((prev) => ({
                        ...prev,
                        secondaryMuscles: event.target.value,
                      }))
                    }
                        className={`${privateExerciseFieldClass} focus:border-violet-300`}
                  />
                </label>
                  </div>
                </section>

                <section className={privateExerciseSectionClass}>
                  <div className="mb-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-200">
                      04 Coaching / Media
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      Add the cue and optional image used by the private card.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    <label className={privateExerciseLabelClass}>
                      Image URL
                  <input
                    placeholder="Image URL"
                    value={newExercise.image}
                    onChange={(event) =>
                      setNewExercise((prev) => ({
                        ...prev,
                        image: event.target.value,
                      }))
                    }
                        className={`${privateExerciseFieldClass} focus:border-cyan-300`}
                  />
                </label>

                    <label className={privateExerciseLabelClass}>
                      Coaching Cue
                <textarea
                  placeholder="Move with control, own the position, and make every rep count."
                  value={newExercise.cue}
                  onChange={(event) =>
                    setNewExercise((prev) => ({
                      ...prev,
                      cue: event.target.value,
                    }))
                  }
                        className={`${privateExerciseFieldClass} min-h-[96px] resize-y`}
                />
              </label>
                  </div>
                </section>
              </div>

              <button
                type="button"
                onClick={addExercise}
                disabled={!newExercise.name.trim() || !newExercise.coreMovementPattern}
                className="mt-4 min-h-[48px] w-full rounded-[18px] border border-emerald-100/30 bg-[linear-gradient(135deg,rgba(52,211,153,0.98),rgba(34,211,238,0.76))] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_18px_42px_rgba(16,185,129,0.18),inset_0_1px_0_rgba(255,255,255,0.38)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_58px_rgba(16,185,129,0.24)] disabled:cursor-not-allowed disabled:translate-y-0 disabled:border-slate-600 disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none sm:w-auto"
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

          <div className="mt-2 grid grid-cols-2 gap-2 rounded-[22px] border border-white/10 bg-white/[0.035] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:mt-2.5 md:grid-cols-3 min-[1100px]:grid-cols-4 min-[1100px]:gap-2.5 min-[1100px]:rounded-[26px] min-[1100px]:p-2">
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

          <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-stretch gap-1.5 rounded-[22px] border border-cyan-100/12 bg-[linear-gradient(135deg,rgba(15,23,42,0.76),rgba(2,6,23,0.56))] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] sm:gap-2 md:flex md:flex-nowrap md:items-center md:p-2">
            <div className="rounded-2xl border border-cyan-300/16 bg-slate-950/55 p-0.5 shadow-[0_12px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.10)] sm:p-1">
              <div className="grid grid-cols-2 gap-1">
                {(["detail", "grid"] as ExerciseLibraryViewMode[]).map(
                  (mode) => (
                    <button
                      key={mode}
                      type="button"
                      aria-label={viewModeLabels[mode]}
                      title={viewModeLabels[mode]}
                      onClick={() => setViewMode(mode)}
                      className={`flex min-h-[38px] min-w-[36px] items-center justify-center rounded-lg px-2 py-1.5 text-xs font-black uppercase tracking-[0.12em] transition sm:min-w-[42px] sm:rounded-xl sm:px-3 sm:py-2 ${
                        viewMode === mode
                          ? "bg-cyan-300 text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.26)]"
                          : "text-slate-400 hover:bg-cyan-300/10 hover:text-cyan-50"
                      }`}
                    >
                      <ViewModeIcon mode={mode} />
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="min-w-0 md:w-full md:max-w-[15rem]">
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
              className="min-h-[42px] rounded-2xl border border-white/12 bg-white/[0.045] px-3 py-2 text-xs font-black text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-cyan-200/40 hover:bg-cyan-300/10 hover:text-white sm:min-w-[116px] sm:px-5 sm:py-3 sm:text-sm"
            >
              Clear
            </button>
          </div>

          <div className="-mx-2.5 -mb-2.5 mt-2 box-border overflow-hidden rounded-b-[26px] border-t border-cyan-100/14 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.08),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.70),rgba(2,6,23,0.76))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:-mx-4 sm:-mb-4 sm:mt-3 sm:rounded-b-[32px] md:-mx-3 md:-mb-3 min-[1100px]:-mx-4 min-[1100px]:-mb-4">
            <ExerciseBodyAnatomySelector
              activeLayer={bodyRegionLayer}
              bodyOptions={bodyOptions}
              exercises={allExercises}
              latestSetInsight={latestSetInsight}
              selectedBodies={bodyFilters}
              preferredWeightUnit={preferredWeightUnit}
              weeklyVolumeRangeLabel={weeklyVolumeRangeLabel}
              weeklySetsSummary={weeklySetsSummary}
              onBodySelect={toggleAnatomyBodyFilter}
              onLayerSelect={selectBodyRegionLayer}
              onPopularExerciseSelect={navigateToExerciseCard}
            />
            <div className="box-border flex w-full flex-wrap gap-px">
              {visibleBodyOptions.map((body) => {
                const isActive =
                  body === "All"
                    ? bodyFilters.length === 0
                    : bodyFilters.includes(body);
                const bodyTheme = getBodyRegionTheme(body);
                const weeklySets =
                  body === "All"
                    ? Array.from(weeklySetsSummary.exerciseSetsById.values()).reduce(
                        (total, sets) => total + sets,
                        0,
                      )
                    : getWeeklySetsForVolumeLabel(
                        weeklySetsSummary.bodySetsByLabel,
                        body,
                      );
                const weeklyWeightVolume =
                  body === "All"
                    ? Array.from(
                        weeklySetsSummary.exerciseWeightVolumeById.values(),
                      ).reduce((total, volume) => total + volume, 0)
                    : getWeeklySetsForVolumeLabel(
                        weeklySetsSummary.bodyWeightVolumeByLabel,
                        body,
                      );
                const weeklyWeightVolumeLabel = formatWeightMetric(
                  weeklyWeightVolume,
                  preferredWeightUnit,
                  { compact: true, volume: true },
                );
                const lastTrainedTime =
                  body === "All"
                    ? Math.max(
                        0,
                        ...Array.from(
                          weeklySetsSummary.lastTrainedByLabel.values(),
                        ),
                      )
                    : getLastTrainedForVolumeLabel(
                        weeklySetsSummary.lastTrainedByLabel,
                        body,
                      );
                const latestSessionSets =
                  body === "All"
                    ? Math.max(
                        0,
                        ...Array.from(
                          weeklySetsSummary.latestSessionSetsByLabel.values(),
                        ),
                      )
                    : getWeeklySetsForVolumeLabel(
                        weeklySetsSummary.latestSessionSetsByLabel,
                        body,
                      );
                const bodyWeeklyGoal = getWeeklySetGoalForBodyPart(body);
                const cooldownSummary = getCooldownCounterSummary({
                  lastTrainedTime,
                  sessionSetsCompleted: latestSessionSets,
                  weeklySetGoal: bodyWeeklyGoal,
                });
                const isLatestBodyPulse = Boolean(
                  latestSetInsight?.bodyLabels.some(
                    (label) =>
                      normalizeBodySelectorValue(label) ===
                      normalizeBodySelectorValue(body),
                  ),
                );
                const bodyVolumeStatusId = getWeeklySetGoalStatusId(
                  weeklySets,
                  bodyWeeklyGoal,
                );
                const bodyVolumeStyle = {
                  ...getCategoryThemeCssVariables(bodyTheme),
                  "--exercise-body-volume-progress": `${getWeeklySetGoalFillPercent(
                    weeklySets,
                    bodyWeeklyGoal,
                  )}%`,
                } as ExerciseLibraryThemeCssVariables;
                const bodyVolumeStatus =
                  weeklyVolumeStatusConfig[bodyVolumeStatusId];

                return (
                  <button
                    key={body}
                    type="button"
                    aria-pressed={isActive}
                    aria-label={`${isActive ? "Remove" : "Add"} ${body} body filter, weekly volume ${weeklyVolumeRangeLabel}, ${Math.max(
                      0,
                      Math.round(weeklySets),
                    )} of ${bodyWeeklyGoal} sets${
                      weeklyWeightVolumeLabel
                        ? `, weight volume ${weeklyWeightVolumeLabel}`
                        : ""
                    }, ${bodyVolumeStatus.label}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleBodyFilter(body);
                    }}
                    style={bodyVolumeStyle}
                    title={`${body}. Weekly Volume, ${weeklyVolumeRangeLabel}: ${Math.max(
                      0,
                      Math.round(weeklySets),
                    )} of ${bodyWeeklyGoal} sets${
                      weeklyWeightVolumeLabel
                        ? ` - Weight volume: ${weeklyWeightVolumeLabel}`
                        : ""
                    }, ${bodyVolumeStatus.label}. Cooldown: ${cooldownSummary.label}`}
                    className={`exercise-library-body-volume-button ${getBodyPartButtonSizeClass(body)} relative min-w-0 px-2 py-2 text-center text-[8px] font-black uppercase leading-[1.08] tracking-[0.04em] transition duration-200 focus:relative focus:z-10 focus:outline-none focus:ring-2 focus:ring-white/30 sm:px-3 sm:py-2.5 sm:text-[11px] sm:tracking-[0.07em] ${
                      isLatestBodyPulse ? "exercise-library-volume-pulse" : ""
                    } ${
                      isActive
                        ? bodyTheme.tabClass
                        : `bg-[linear-gradient(135deg,rgba(15,23,42,0.86),rgba(2,6,23,0.74))] text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] ${bodyTheme.tabHoverClass}`
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="exercise-library-body-volume-button__fill"
                    />
                    <span className="relative z-10 flex max-w-full items-center justify-center gap-1.5 whitespace-normal break-normal [hyphens:none] [overflow-wrap:normal] [text-wrap:balance]">
                      <span>{body}</span>
                    </span>
                    <span className="relative z-10 mt-1 block text-[7px] font-black uppercase leading-3 tracking-[0.08em] opacity-85 sm:text-[8px]">
                      <WeeklySetGoalBadge
                        completedSets={weeklySets}
                        completedWeightVolume={weeklyWeightVolume}
                        goalSets={bodyWeeklyGoal}
                        rangeLabel={weeklyVolumeRangeLabel}
                        showWeightVolume={Boolean(weeklyWeightVolumeLabel)}
                        weightUnit={preferredWeightUnit}
                      />
                      {isLatestBodyPulse ? (
                        <span className="ml-1 exercise-library-volume-added-chip">
                          {latestSetInsight?.pulseLabel}
                        </span>
                      ) : null}
                    </span>
                    <CooldownCounterBar
                      className="relative z-10 mt-1"
                      summary={cooldownSummary}
                    />
                  </button>
                );
              })}
            </div>
            <ActiveFilterStatusPanel
              activeFilterChips={activeTrainingFilterChips}
              bodyRegionLayer={bodyRegionLayer}
              matchingCount={focusedExercises.length}
              onClear={resetFilters}
              sectionTheme={activeExerciseSectionTheme}
            />
          </div>
        </section>

        {latestSetInsight ? (
          <div className="exercise-library-volume-pulse rounded-[24px] border border-emerald-200/20 bg-[radial-gradient(circle_at_12%_0%,rgba(16,185,129,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.86),rgba(2,6,23,0.72))] px-4 py-3 shadow-[0_18px_52px_rgba(0,0,0,0.32),0_0_34px_rgba(16,185,129,0.12),inset_0_1px_0_rgba(255,255,255,0.12)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200/80">
                  Latest set insight
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-black text-white">
                  {latestSetInsight.exerciseName} -{" "}
                  {formatLatestSetInsightDisplayLine(
                    latestSetInsight,
                    preferredWeightUnit,
                  )}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-300">
                  {[
                    latestSetInsight.summaryLine,
                    latestSetInsight.goalLine,
                    latestSetInsight.lastTrainedLine,
                    latestSetInsight.achievementLine,
                    latestSetInsight.remainingLine,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <span className="rounded-2xl border border-emerald-100/24 bg-emerald-300/14 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-100">
                {latestSetInsight.pulseLabel}
              </span>
            </div>
          </div>
        ) : null}
      </section>

      <section className="exercise-library-slider-shelf relative z-0 space-y-5 overflow-visible pb-6 sm:space-y-4 sm:pb-8">
        <ExerciseLibraryResultsPageSelector
          activeSectionKey={activeExerciseSectionKey}
          activeSectionLabel={
            activeExerciseSectionForCurrentPage?.label || "Exercise Library"
          }
          currentPage={currentPage}
          latestSetInsight={latestSetInsight}
          onPageChange={setCurrentPage}
          onSectionSelect={selectExerciseSectionFromNavigator}
          placement="top"
          preferredWeightUnit={preferredWeightUnit}
          sections={paginatedExerciseSections}
          sectionTheme={activeExercisePageSelectorTheme}
          weeklySetsBySectionKey={weeklySetsBySectionKey}
          weeklyVolumeRangeLabel={weeklyVolumeRangeLabel}
          weeklyWeightVolumeBySectionKey={weeklyWeightVolumeBySectionKey}
          sortMode={sortMode}
          totalPages={totalPages}
        />

          {paginatedExerciseSections
            .filter(
              (section) =>
                section.key === activeRenderedExerciseSectionKey,
            )
            .map((section) => (
            (() => {
              const sectionTheme = getExerciseSectionTheme(section, sortMode);

              return (
                <ExerciseCategoryShelf
                  key={section.key}
                  isOpen={activeExerciseSectionKey === section.key}
                  latestSetInsight={latestSetInsight}
                  onToggle={() => toggleExerciseSection(section.key)}
                  preferredWeightUnit={preferredWeightUnit}
                  section={section}
                  sectionTheme={sectionTheme}
                  weeklySets={weeklySetsBySectionKey.get(section.key) || 0}
                  weeklyVolumeRangeLabel={weeklyVolumeRangeLabel}
                  weeklyWeightVolume={
                    weeklyWeightVolumeBySectionKey.get(section.key) || 0
                  }
                  coreMovementWeeklySetsByKey={
                    weeklySetsSummary.coreMovementSetsByKey
                  }
                  coreMovementWeeklyWeightVolumeByKey={
                    weeklySetsSummary.coreMovementWeightVolumeByKey
                  }
                >
                  {section.key === myExercisesSectionKey &&
                  section.exercises.length === 0 ? (
                    <div
                      className={`exercise-library-card-slide ${
                        viewMode === "grid"
                          ? "exercise-library-card-slide--grid"
                          : "exercise-library-card-slide--detail"
                      }`}
                      data-card-key={`${section.key}:create`}
                      role="listitem"
                      tabIndex={-1}
                    >
                      <ExerciseCardCategoryTab
                        section={section}
                        sectionTheme={sectionTheme}
                      />
                      <CreateExerciseEmptyCard onCreate={openCreateExerciseForm} />
                    </div>
                  ) : (
                    section.exercises.map((exercise) => {
                    const metadata = getMetadataForExercise(exercise);
                    const suggestions = getMovementSuggestions(exercise, metadata);
                    const cardInstanceId = `${section.key}:${exercise.id}`;
                    const coreMovementTabKey = getExerciseCoreMovementTabKey(exercise);

                    return (
                      <div
                        key={exercise.id}
                        className={`exercise-library-card-slide ${
                          viewMode === "grid"
                            ? "exercise-library-card-slide--grid"
                            : "exercise-library-card-slide--detail"
                        }`}
                        data-card-key={cardInstanceId}
                        data-core-movement-tab={coreMovementTabKey}
                        data-exercise-id={exercise.id}
                        role="listitem"
                        tabIndex={-1}
                      >
                        <ExerciseCardCategoryTab
                          section={section}
                          sectionTheme={sectionTheme}
                        />
                        <ExerciseLibraryCard
                          exercise={exercise}
                          cardInstanceId={cardInstanceId}
                          sectionTheme={sectionTheme}
                          metadata={metadata}
                          suggestions={suggestions}
                          latestSetInsight={latestSetInsight}
                          planAddToParam={planAddToParam}
                          preferredWeightUnit={preferredWeightUnit}
                          savedExerciseStats={savedExerciseStats}
                          viewMode={viewMode}
                          weeklyVolumeRangeLabel={weeklyVolumeRangeLabel}
                          searchedEquipmentModifierId={searchedEquipmentModifierId}
                          isFavorite={favoriteExerciseIds.has(exercise.id)}
                          onToggleFavorite={toggleFavoriteExercise}
                          onAddToPlan={addExerciseToPlanBuilder}
                          onDeleteCustom={deleteCustomExercise}
                          onAddStats={openStatsMenu}
                          onCreateVariation={openCreateExerciseForm}
                          onBodyFilterSelect={toggleBodyFilter}
                          onDifficultyFilterSelect={toggleDifficultyFilter}
                          onMovementChipSelect={handleArchitectureChipSelect}
                          onMuscleSelect={filterByMuscleLabel}
                          onSuggestionSelect={handleSuggestionSelect}
                          weeklySetsByMuscleLabel={
                            weeklySetsSummary.bodySetsByLabel
                          }
                          isExerciseDetailsOpen={
                            activeExerciseDetailsCardId === exercise.id
                          }
                          onToggleExerciseDetails={setActiveExerciseDetailsCardId}
                          isMovementDetailsOpen={
                            activeMovementDetailsPopupId === cardInstanceId
                          }
                          onToggleMovementDetails={setActiveMovementDetailsPopupId}
                        />
                      </div>
                    );
                    })
                  )}
                </ExerciseCategoryShelf>
              );
            })()
          ))}

        <ExerciseLibraryResultsPageSelector
          activeSectionKey={activeExerciseSectionKey}
          activeSectionLabel={
            activeExerciseSectionForCurrentPage?.label || "Exercise Library"
          }
          currentPage={currentPage}
          latestSetInsight={latestSetInsight}
          onPageChange={setCurrentPage}
          onSectionSelect={selectExerciseSectionFromNavigator}
          placement="bottom"
          preferredWeightUnit={preferredWeightUnit}
          sections={paginatedExerciseSections}
          sectionTheme={activeExercisePageSelectorTheme}
          weeklySetsBySectionKey={weeklySetsBySectionKey}
          weeklyVolumeRangeLabel={weeklyVolumeRangeLabel}
          weeklyWeightVolumeBySectionKey={weeklyWeightVolumeBySectionKey}
          sortMode={sortMode}
          totalPages={totalPages}
        />

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
                Weight x Reps x Sets
                <span className="ml-2 rounded-lg border border-yellow-200/20 bg-yellow-300/10 px-2 py-0.5 text-yellow-100">
                  {preferredWeightUnit}
                </span>
              </p>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <input
                  value={statWeight}
                  onChange={(e) => setStatWeight(e.target.value)}
                  placeholder={`Weight (${preferredWeightUnit})`}
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
                                  {formatWeightMetric(
                                    parseStatNumber(stat.weight),
                                    preferredWeightUnit,
                                  ) || "--"}
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
                          Weight x Reps x Sets
                          <span className="ml-2 rounded-lg border border-yellow-200/20 bg-yellow-300/10 px-2 py-0.5 text-yellow-100">
                            {preferredWeightUnit}
                          </span>
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
                        placeholder={`Weight (${preferredWeightUnit})`}
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
