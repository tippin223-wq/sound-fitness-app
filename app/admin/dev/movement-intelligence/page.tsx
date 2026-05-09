import Link from "next/link";
import {
  ALL_EXERCISE_MODIFIERS,
  CORE_MOVEMENT_COMPATIBILITY_RULES,
  CORE_MOVEMENT_BY_ID,
  CORE_MOVEMENTS,
  EXERCISE_MODIFIER_CATEGORIES,
  EXERCISE_MODIFIER_BY_ID,
  EXPANDED_MOVEMENT_EXAMPLE_GROUPS,
  getLegacyExerciseMappingReport,
  getMovementCompatibilityCoverageReport,
  getNormalizedExerciseCatalog,
  getNormalizedExerciseCatalogPreview,
  LEGACY_ADAPTED_MOVEMENT_EXAMPLES,
  MOVEMENT_PATTERN_BY_ID,
  MOVEMENT_PATTERNS,
  NORMALIZED_MOVEMENT_EXAMPLES,
  runMovementCompatibilityValidationExamples,
  summarizeLegacyExerciseMigrationReadiness,
} from "@/lib/training/movementIntelligence";
import type { ExerciseModifier, ExerciseModifierCategoryId } from "@/types";

const getModifiersByCategory = (categoryId: ExerciseModifierCategoryId) =>
  ALL_EXERCISE_MODIFIERS.filter(
    (modifier) => modifier.categoryId === categoryId,
  ) as ExerciseModifier[];

const formatList = (items: readonly string[]) => items.join(", ");

const getConfidenceClass = (confidence: string) => {
  if (confidence === "high") return "bg-emerald-400/10 text-emerald-200";
  if (confidence === "medium") return "bg-yellow-400/10 text-yellow-200";
  if (confidence === "low") return "bg-orange-400/10 text-orange-200";
  return "bg-rose-400/10 text-rose-200";
};

const getRecommendationClass = (action: string) => {
  if (action === "merge") return "bg-emerald-400/10 text-emerald-200";
  if (action === "review") return "bg-yellow-400/10 text-yellow-100";
  return "bg-cyan-400/10 text-cyan-100";
};

const getRecommendationLabel = (action: string) => {
  if (action === "merge") return "Merge";
  if (action === "review") return "Review";
  return "Keep Variation";
};

const getValidationClass = (passed: boolean) =>
  passed ? "bg-emerald-400/10 text-emerald-200" : "bg-rose-400/10 text-rose-200";

const statCards = [
  ["Core Movements", CORE_MOVEMENTS.length],
  ["Movement Patterns", MOVEMENT_PATTERNS.length],
  ["Modifier Categories", EXERCISE_MODIFIER_CATEGORIES.length],
  ["Modifier Seeds", ALL_EXERCISE_MODIFIERS.length],
] as const;

export default function MovementIntelligencePreviewPage() {
  const migrationReadiness = summarizeLegacyExerciseMigrationReadiness();
  const legacyMappingReport = getLegacyExerciseMappingReport();
  const normalizedCatalog = getNormalizedExerciseCatalogPreview();
  const normalizedCatalogService = getNormalizedExerciseCatalog();
  const compatibilityCoverage = getMovementCompatibilityCoverageReport();
  const compatibilityExamples = runMovementCompatibilityValidationExamples();
  const validCompatibilityExamples = compatibilityExamples.filter(
    (example) => example.expectedValid,
  );
  const rejectedCompatibilityExamples = compatibilityExamples.filter(
    (example) => !example.expectedValid,
  );
  const legacyByVariationId = new Map(
    NORMALIZED_MOVEMENT_EXAMPLES.map((variation, index) => [
      variation.id,
      LEGACY_ADAPTED_MOVEMENT_EXAMPLES[index],
    ]),
  );
  const exampleGroups = EXPANDED_MOVEMENT_EXAMPLE_GROUPS.map((group) => ({
    ...group,
    examples: group.examples.map((variation) => {
      const coreMovement = CORE_MOVEMENT_BY_ID[variation.coreMovementId];
      const movementPattern =
        MOVEMENT_PATTERN_BY_ID[variation.movementPatternId];
      const modifiers = variation.modifierIds
        .map((id) => EXERCISE_MODIFIER_BY_ID[id])
        .filter(Boolean);

      return {
        variation,
        coreMovement,
        movementPattern,
        modifiers,
        legacy: legacyByVariationId.get(variation.id),
      };
    }),
  }));

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_52%,#020617_100%)] px-3 py-5 text-white sm:px-5 sm:py-8">
      <section className="mx-auto w-full max-w-7xl space-y-6">
        <header className="rounded-[28px] border border-cyan-300/20 bg-slate-950/70 p-5 shadow-2xl shadow-black/30 sm:rounded-[36px] sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-300">
                Admin / Dev Preview
              </p>
              <h1 className="mt-3 max-w-4xl text-3xl font-black leading-tight sm:text-5xl">
                Movement Intelligence System
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
                Inspect the normalized movement layer before it replaces any
                exercise library, workout logging, stats, or MVP session flows.
              </p>
            </div>

            <Link
              href="/admin"
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-slate-200 transition hover:border-cyan-300/40 hover:text-white sm:w-auto"
            >
              Back to Admin
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
              >
                <p className="text-xs font-bold text-slate-400">{label}</p>
                <p className="mt-2 text-3xl font-black text-cyan-300">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl sm:rounded-[32px] sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">
                  Source Truth
                </p>
                <h2 className="mt-2 text-2xl font-black">Core Movements</h2>
              </div>
              <span className="w-fit rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200">
                Not replacing legacy library yet
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {CORE_MOVEMENTS.map((movement) => {
                const pattern = MOVEMENT_PATTERN_BY_ID[movement.patternId];

                return (
                  <article
                    key={movement.id}
                    className="rounded-[24px] border border-white/10 bg-slate-950/60 p-4"
                  >
                    <p className="text-lg font-black text-white">
                      {movement.label}
                    </p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
                      {pattern.label} / Legacy: {pattern.legacyPattern}
                    </p>
                    <p className="mt-3 text-sm leading-5 text-slate-300">
                      {movement.defaultCue}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[movement.bodyRegion, ...movement.primaryMuscles].map(
                        (item) => (
                          <span
                            key={item}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-slate-300"
                          >
                            {item}
                          </span>
                        ),
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl sm:rounded-[32px] sm:p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-violet-300">
              Pattern Layer
            </p>
            <h2 className="mt-2 text-2xl font-black">Movement Patterns</h2>

            <div className="mt-5 space-y-3">
              {MOVEMENT_PATTERNS.map((pattern) => (
                <article
                  key={pattern.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-black text-white">{pattern.label}</p>
                    <span className="w-fit rounded-full bg-violet-400/10 px-3 py-1 text-xs font-black text-violet-200">
                      {pattern.legacyPattern}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-slate-400">
                    {pattern.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl sm:rounded-[32px] sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-yellow-300">
                Modifier Systems
              </p>
              <h2 className="mt-2 text-2xl font-black">
                Categorized Variation Controls
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-400">
              These are separated so AI coaching, substitutions, progression,
              and recovery rules can reason about variation intent without
              parsing exercise names.
            </p>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {EXERCISE_MODIFIER_CATEGORIES.map((category) => {
              const modifiers = getModifiersByCategory(category.id);

              return (
                <article
                  key={category.id}
                  className="rounded-[24px] border border-white/10 bg-slate-950/60 p-4"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-lg font-black text-white">
                      {category.label}
                    </h3>
                    <span className="w-fit rounded-full border border-yellow-300/20 bg-yellow-400/10 px-3 py-1 text-xs font-black text-yellow-200">
                      {modifiers.length} modifiers
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-slate-400">
                    {category.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {modifiers.map((modifier) => (
                      <span
                        key={modifier.id}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-slate-300"
                      >
                        {modifier.label}
                      </span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-[28px] border border-emerald-300/20 bg-emerald-400/10 p-5 shadow-xl sm:rounded-[32px] sm:p-6">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-200">
                Compatibility Rules
              </p>
              <h2 className="mt-2 text-2xl font-black">
                Movement Safety Validation Layer
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-emerald-50/80">
              Every current core movement has an apparatus, pattern, modifier,
              and context rule before the normalized catalog is used in
              production pages.
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ["Core Movements", compatibilityCoverage.totalCoreMovements],
              ["Rules Defined", compatibilityCoverage.rulesDefined],
              [
                "Default Variations Valid",
                compatibilityCoverage.defaultVariationsValid,
              ],
              [
                "Rejected Examples",
                rejectedCompatibilityExamples.filter((example) => example.passed)
                  .length,
              ],
              [
                "Valid Examples",
                validCompatibilityExamples.filter((example) => example.passed)
                  .length,
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
              >
                <p className="text-xs font-bold text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-black text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-5">
              <section className="rounded-[24px] border border-rose-300/20 bg-rose-400/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-black text-white">
                    Rejected Validation Examples
                  </h3>
                  <span className="rounded-full bg-rose-400/10 px-3 py-1 text-xs font-black text-rose-100">
                    {rejectedCompatibilityExamples.length}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {rejectedCompatibilityExamples.map((example) => (
                    <article
                      key={example.id}
                      className="rounded-2xl border border-white/10 bg-slate-950/60 p-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-black text-white">
                            {example.label}
                          </p>
                          <p className="mt-1 text-xs text-rose-100/80">
                            {example.explanation}
                          </p>
                        </div>
                        <span
                          className={`w-fit rounded-full px-3 py-1 text-[11px] font-black ${getValidationClass(
                            example.passed,
                          )}`}
                        >
                          {example.passed ? "Passed" : "Failed"}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(example.variation.modifierIds || []).map(
                          (modifierId) => (
                            <span
                              key={modifierId}
                              className="rounded-full bg-black/20 px-2 py-1 text-[11px] font-bold text-slate-300"
                            >
                              {modifierId}
                            </span>
                          ),
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-[24px] border border-emerald-300/20 bg-emerald-400/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-black text-white">
                    Valid Validation Examples
                  </h3>
                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-100">
                    {validCompatibilityExamples.length}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {validCompatibilityExamples.map((example) => (
                    <article
                      key={example.id}
                      className="rounded-2xl border border-white/10 bg-slate-950/60 p-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-black text-white">
                            {example.label}
                          </p>
                          <p className="mt-1 text-xs text-emerald-100/80">
                            {example.explanation}
                          </p>
                        </div>
                        <span
                          className={`w-fit rounded-full px-3 py-1 text-[11px] font-black ${getValidationClass(
                            example.passed,
                          )}`}
                        >
                          {example.passed ? "Passed" : "Failed"}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(example.variation.modifierIds || []).map(
                          (modifierId) => (
                            <span
                              key={modifierId}
                              className="rounded-full bg-black/20 px-2 py-1 text-[11px] font-bold text-slate-300"
                            >
                              {modifierId}
                            </span>
                          ),
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <section className="rounded-[24px] border border-white/10 bg-slate-950/60 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-black text-white">
                  Compatibility Coverage By Core Movement
                </h3>
                <span className="w-fit rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-100">
                  {compatibilityCoverage.rulesDefined}/
                  {compatibilityCoverage.totalCoreMovements} covered
                </span>
              </div>

              <div className="mt-4 max-h-[740px] space-y-3 overflow-y-auto pr-1">
                {compatibilityCoverage.rows.map((row) => {
                  const rule = CORE_MOVEMENT_COMPATIBILITY_RULES[row.coreMovementId];

                  return (
                    <article
                      key={row.coreMovementId}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                    >
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="font-black text-white">{row.label}</p>
                          <p className="mt-1 break-words text-xs font-black uppercase tracking-[0.14em] text-emerald-200">
                            {row.coreMovementId}
                          </p>
                        </div>
                        <span
                          className={`w-fit rounded-full px-3 py-1 text-[11px] font-black ${getValidationClass(
                            row.hasRule && row.defaultVariationValid,
                          )}`}
                        >
                          {row.hasRule && row.defaultVariationValid
                            ? "Default Valid"
                            : "Needs Review"}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
                        <div>
                          <p className="text-slate-500">Apparatus</p>
                          <p className="font-bold text-white">
                            {row.allowedApparatusCount}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Patterns</p>
                          <p className="font-bold text-white">
                            {row.allowedPatternCount}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Modifiers</p>
                          <p className="font-bold text-white">
                            {row.allowedModifierCount}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Contexts</p>
                          <p className="font-bold text-white">
                            {row.requiredContextCount}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {rule ? (
                          rule.allowedApparatusIds.map((apparatusId) => (
                            <span
                              key={apparatusId}
                              className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-[11px] font-bold text-emerald-100"
                            >
                              {apparatusId}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full border border-yellow-300/20 bg-yellow-400/10 px-2 py-1 text-[11px] font-bold text-yellow-100">
                            Compatibility rules pending
                          </span>
                        )}
                      </div>

                      {rule && rule.requiredContext.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {rule.requiredContext.map((context) => (
                            <span
                              key={context.id}
                              className="rounded-full border border-yellow-300/20 bg-yellow-400/10 px-2 py-1 text-[11px] font-bold text-yellow-100"
                            >
                              {context.label}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {row.defaultIssues.length > 0 ? (
                        <p className="mt-3 text-xs leading-5 text-rose-100">
                          {row.defaultIssues
                            .map((issue) => issue.message)
                            .join(" ")}
                        </p>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </section>

        <section className="rounded-[28px] border border-sky-300/20 bg-sky-400/10 p-5 shadow-xl sm:rounded-[32px] sm:p-6">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-200">
                Shared Catalog Service
              </p>
              <h2 className="mt-2 text-2xl font-black">
                Compatibility-Validated Normalized Exercise Catalog
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-sky-50/80">
              This is the migration-safe service layer production pages can use
              later. It keeps legacy exercises attached, emits only valid
              normalized items, and can convert back to the current Exercise
              shape.
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {[
              ["Total Items", normalizedCatalogService.report.totalItems],
              ["Valid Items", normalizedCatalogService.report.validItems],
              ["Invalid Items", normalizedCatalogService.report.invalidItems],
              [
                "Low Confidence",
                normalizedCatalogService.report.lowConfidenceMappings,
              ],
              [
                "Duplicate Groups",
                normalizedCatalogService.report.duplicateSimilarGroups,
              ],
              ["Families", normalizedCatalogService.families.length],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
              >
                <p className="text-xs font-bold text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-black text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
            <section className="rounded-[24px] border border-white/10 bg-slate-950/60 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-black text-white">
                  Valid Normalized Catalog Items
                </h3>
                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-black ${getValidationClass(
                    normalizedCatalogService.report.invalidItems === 0,
                  )}`}
                >
                  {normalizedCatalogService.report.validItems}/
                  {normalizedCatalogService.report.totalItems} valid
                </span>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {normalizedCatalogService.items.slice(0, 10).map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-black text-white">
                          {item.legacyExerciseName}
                        </p>
                        <p className="mt-1 break-words text-xs font-black uppercase tracking-[0.14em] text-sky-200">
                          {item.coreMovementId} / {item.movementPatternId}
                        </p>
                      </div>
                      <span className="w-fit rounded-full bg-emerald-400/10 px-2 py-1 text-[11px] font-black text-emerald-100">
                        {item.confidenceScore}%
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        item.apparatus,
                        ...item.modifierIds.slice(0, 5),
                      ]
                        .filter(Boolean)
                        .map((token) => (
                          <span
                            key={token}
                            className="rounded-full bg-slate-950/70 px-2 py-1 text-[11px] font-bold text-slate-300"
                          >
                            {token}
                          </span>
                        ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <div className="space-y-5">
              <section className="rounded-[24px] border border-white/10 bg-slate-950/60 p-4">
                <h3 className="text-lg font-black text-white">
                  Normalized Filter Options
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    [
                      "Core Movements",
                      normalizedCatalogService.filterOptions.coreMovements,
                    ],
                    [
                      "Patterns",
                      normalizedCatalogService.filterOptions.movementPatterns,
                    ],
                    [
                      "Apparatus",
                      normalizedCatalogService.filterOptions.apparatus,
                    ],
                    ["Goals", normalizedCatalogService.filterOptions.goals],
                  ].map(([label, options]) => (
                    <div
                      key={label as string}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                    >
                      <p className="text-sm font-black text-white">
                        {label as string}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(options as Array<{ id: string; label: string; count: number }>)
                          .slice(0, 6)
                          .map((option) => (
                            <span
                              key={option.id}
                              className="rounded-full bg-slate-950/70 px-2 py-1 text-[11px] font-bold text-slate-300"
                            >
                              {option.label}: {option.count}
                            </span>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[24px] border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-black text-white">
                    Service Families
                  </h3>
                  <span className="rounded-full bg-sky-400/10 px-3 py-1 text-xs font-black text-sky-100">
                    {normalizedCatalogService.families.length}
                  </span>
                </div>

                <div className="mt-4 max-h-[320px] space-y-2 overflow-y-auto pr-1">
                  {normalizedCatalogService.families.slice(0, 12).map((family) => (
                    <article
                      key={family.familyId}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-bold text-white">
                          {family.familyLabel}
                        </p>
                        <span className="w-fit rounded-full bg-slate-950/70 px-2 py-1 text-[11px] font-black text-slate-200">
                          {family.items.length}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {family.apparatuses.slice(0, 5).map((apparatus) => (
                          <span
                            key={apparatus}
                            className="rounded-full bg-sky-400/10 px-2 py-1 text-[11px] font-bold text-sky-100"
                          >
                            {apparatus}
                          </span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </div>

          {normalizedCatalogService.report.invalidItems > 0 ? (
            <section className="mt-5 rounded-[24px] border border-rose-300/20 bg-rose-400/10 p-4">
              <h3 className="text-lg font-black text-white">
                Legacy Fallback Items
              </h3>
              <div className="mt-3 space-y-2">
                {normalizedCatalogService.report.invalid.map((entry) => (
                  <article
                    key={entry.legacyExercise.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 p-3"
                  >
                    <p className="font-bold text-white">
                      {entry.legacyExercise.name}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-rose-100/80">
                      {entry.compatibility?.issues
                        .map((issue) => issue.message)
                        .join(" ") || "No normalized compatibility result."}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </section>

        <section className="rounded-[28px] border border-cyan-300/20 bg-cyan-400/10 p-5 shadow-xl sm:rounded-[32px] sm:p-6">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">
                Generated Examples
              </p>
              <h2 className="mt-2 text-2xl font-black">
                Normalized Source Beside Legacy Adapter Output
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-cyan-50/80">
              The left side is the new movement truth. The right side is the
              current exercise shape existing pages can still consume.
            </p>
          </div>

          <div className="mt-5 space-y-5">
            {exampleGroups.map((group) => (
              <div
                key={group.title}
                className="rounded-[26px] border border-white/10 bg-slate-950/35 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-xl font-black text-white">
                      {group.title}
                    </h3>
                    <p className="mt-1 text-sm leading-5 text-cyan-50/75">
                      {group.description}
                    </p>
                  </div>
                  <span className="w-fit rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-200">
                    {group.examples.length} examples
                  </span>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  {group.examples.map(
                    ({
                      variation,
                      coreMovement,
                      movementPattern,
                      modifiers,
                      legacy,
                    }) => (
                      <article
                        key={variation.id}
                        className="rounded-[24px] border border-white/10 bg-slate-950/75 p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xl font-black text-white">
                              {variation.displayName}
                            </p>
                            <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
                              {coreMovement.label} / {movementPattern.label}
                            </p>
                          </div>
                          <span className="w-fit rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200">
                            {variation.source}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/10 p-4">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                              Normalized
                            </p>
                            <dl className="mt-3 space-y-2 text-sm">
                              <div>
                                <dt className="text-slate-500">Core</dt>
                                <dd className="font-bold text-white">
                                  {coreMovement.id}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-slate-500">Pattern</dt>
                                <dd className="font-bold text-white">
                                  {movementPattern.id}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-slate-500">Modifiers</dt>
                                <dd className="break-words font-bold text-white">
                                  {modifiers
                                    .map((modifier) => modifier.id)
                                    .join(", ")}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-slate-500">Intent</dt>
                                <dd className="font-bold text-white">
                                  {formatList(variation.intentIds)}
                                </dd>
                              </div>
                            </dl>
                          </div>

                          <div className="rounded-2xl border border-yellow-300/15 bg-yellow-400/10 p-4">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-200">
                              Legacy Adapter
                            </p>
                            {legacy ? (
                              <dl className="mt-3 space-y-2 text-sm">
                                <div>
                                  <dt className="text-slate-500">Name</dt>
                                  <dd className="font-bold text-white">
                                    {legacy.name}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-slate-500">Pattern</dt>
                                  <dd className="font-bold text-white">
                                    {legacy.pattern}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-slate-500">Equipment</dt>
                                  <dd className="font-bold text-white">
                                    {legacy.equipment}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-slate-500">Muscles</dt>
                                  <dd className="font-bold text-white">
                                    {legacy.muscles}
                                  </dd>
                                </div>
                              </dl>
                            ) : (
                              <p className="mt-3 text-sm text-yellow-100">
                                No legacy adapter output found.
                              </p>
                            )}
                          </div>
                        </div>
                      </article>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl sm:rounded-[32px] sm:p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-rose-300">
            Legacy Library Adapter Audit
          </p>
          <h2 className="mt-2 text-2xl font-black">
            Current Exercise Library Readiness
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            This is a static migration-readiness summary. It does not modify the
            legacy library or any local workout data.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Legacy Exercises", migrationReadiness.total],
              ["High Confidence", migrationReadiness.high],
              ["Medium Confidence", migrationReadiness.medium],
              ["Low Confidence", migrationReadiness.low],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
              >
                <p className="text-xs font-bold text-slate-400">{label}</p>
                <p className="mt-2 text-3xl font-black text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[24px] border border-cyan-300/15 bg-cyan-400/10 p-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200">
                  Detailed Legacy Mapping Layer
                </p>
                <h3 className="mt-2 text-xl font-black text-white">
                  Legacy exercises mapped into normalized movement intelligence
                </h3>
              </div>
              <span className="w-fit rounded-full border border-cyan-300/20 bg-slate-950/60 px-3 py-1 text-xs font-black text-cyan-200">
                Read-only report
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ["Mapped", legacyMappingReport.mapped.length],
                ["Unmapped", legacyMappingReport.summary.unmapped],
                ["Low Confidence", legacyMappingReport.summary.low],
                [
                  "Unsupported Equipment",
                  legacyMappingReport.summary.unsupportedEquipment,
                ],
                [
                  "Similar Groups",
                  legacyMappingReport.duplicateOrSimilar.length,
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                >
                  <p className="text-xs font-bold text-slate-400">{label}</p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <section className="mt-6 rounded-[24px] border border-emerald-300/15 bg-emerald-400/10 p-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-200">
                  Normalized Catalog Preview
                </p>
                <h3 className="mt-2 text-xl font-black text-white">
                  Legacy library grouped into movement families
                </h3>
              </div>
              <span className="w-fit rounded-full border border-emerald-300/20 bg-slate-950/60 px-3 py-1 text-xs font-black text-emerald-200">
                Read-only catalog projection
              </span>
            </div>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-emerald-50/80">
              This view shows how the current legacy exercise catalog would look
              after normalization. It groups entries by canonical movement and
              pattern, then compares apparatus and modifiers to suggest merge,
              review, or keep-as-variation decisions.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              {[
                ["Legacy Entries", normalizedCatalog.summary.legacyExercises],
                ["Movement Families", normalizedCatalog.summary.families],
                ["Duplicate Signatures", normalizedCatalog.summary.duplicateSignatures],
                ["Merge Candidates", normalizedCatalog.summary.mergeCandidates],
                ["Review Groups", normalizedCatalog.summary.reviewGroups],
                ["Keep Separate", normalizedCatalog.summary.keepSeparateGroups],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                >
                  <p className="text-xs font-bold text-slate-400">{label}</p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
              <aside className="space-y-4">
                {[
                  {
                    title: "Merge Candidates",
                    groups: normalizedCatalog.mergeCandidates,
                    empty: "No safe automatic merge candidates were found.",
                  },
                  {
                    title: "Review Before Merge",
                    groups: normalizedCatalog.reviewGroups,
                    empty: "No duplicate signatures need extra review.",
                  },
                  {
                    title: "Remain Separate Variations",
                    groups: normalizedCatalog.keepSeparateGroups.slice(0, 8),
                    empty: "No separate variation groups found.",
                  },
                ].map(({ title, groups, empty }) => (
                  <section
                    key={title}
                    className="rounded-[22px] border border-white/10 bg-slate-950/60 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-black text-white">{title}</h4>
                      <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-black text-slate-200">
                        {groups.length}
                      </span>
                    </div>

                    <div className="mt-3 space-y-3">
                      {groups.length > 0 ? (
                        groups.map((group) => (
                          <article
                            key={`${title}-${group.signature}`}
                            className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-sm font-black text-white">
                                  {group.familyLabel}
                                </p>
                                <p className="mt-1 break-words text-[11px] font-bold text-slate-400">
                                  {group.signature}
                                </p>
                              </div>
                              <span
                                className={`w-fit rounded-full px-3 py-1 text-[11px] font-black ${getRecommendationClass(
                                  group.recommendation.action,
                                )}`}
                              >
                                {getRecommendationLabel(
                                  group.recommendation.action,
                                )}
                              </span>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-slate-300">
                              {group.recommendation.reason}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {group.exercises.map((exercise) => (
                                <span
                                  key={exercise.legacyId}
                                  className="rounded-full bg-slate-950/70 px-2 py-1 text-[11px] font-bold text-slate-200"
                                >
                                  {exercise.legacyName}
                                </span>
                              ))}
                            </div>
                          </article>
                        ))
                      ) : (
                        <p className="text-sm text-slate-400">{empty}</p>
                      )}
                    </div>
                  </section>
                ))}
              </aside>

              <div className="max-h-[820px] space-y-4 overflow-y-auto pr-1">
                {normalizedCatalog.families.map((family) => (
                  <article
                    key={family.familyId}
                    className="rounded-[24px] border border-white/10 bg-slate-950/60 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-lg font-black text-white">
                          {family.familyLabel}
                        </p>
                        <p className="mt-1 break-words text-xs font-black uppercase tracking-[0.16em] text-emerald-200">
                          {family.canonicalMovementId} /{" "}
                          {family.movementPatternId}
                        </p>
                      </div>
                      <span className="w-fit rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-100">
                        {family.exercises.length} legacy entries
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {family.apparatuses.map((apparatus) => (
                        <span
                          key={apparatus}
                          className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-[11px] font-bold text-emerald-100"
                        >
                          {apparatus}
                        </span>
                      ))}
                      {family.sharedModifierIds.slice(0, 8).map((modifierId) => (
                        <span
                          key={modifierId}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-bold text-slate-300"
                        >
                          shared: {modifierId}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 grid gap-3 2xl:grid-cols-2">
                      {family.exercises.map((exercise) => (
                        <div
                          key={exercise.legacyId}
                          className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-black text-white">
                                {exercise.legacyName}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                Legacy: {exercise.legacyPattern} /{" "}
                                {exercise.legacyEquipment}
                              </p>
                            </div>
                            <span
                              className={`w-fit rounded-full px-2 py-1 text-[11px] font-black ${getConfidenceClass(
                                exercise.confidence,
                              )}`}
                            >
                              {exercise.confidenceScore}%
                            </span>
                          </div>

                          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                            <div>
                              <p className="text-slate-500">Canonical</p>
                              <p className="break-words font-bold text-white">
                                {exercise.coreMovementId}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500">Pattern</p>
                              <p className="break-words font-bold text-white">
                                {exercise.movementPatternId}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500">Apparatus</p>
                              <p className="break-words font-bold text-white">
                                {exercise.apparatus || "none"}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {exercise.modifierIds.slice(0, 9).map((modifierId) => (
                              <span
                                key={modifierId}
                                className="rounded-full bg-slate-950/70 px-2 py-1 text-[11px] font-bold text-slate-300"
                              >
                                {modifierId}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 space-y-2">
                      {family.recommendationGroups.map((group) => (
                        <div
                          key={`${family.familyId}-${group.signature}`}
                          className="rounded-2xl border border-white/10 bg-black/20 p-3"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="break-words text-xs font-bold text-slate-300">
                              {group.signature}
                            </p>
                            <span
                              className={`w-fit rounded-full px-3 py-1 text-[11px] font-black ${getRecommendationClass(
                                group.recommendation.action,
                              )}`}
                            >
                              {getRecommendationLabel(
                                group.recommendation.action,
                              )}
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-slate-400">
                            {group.recommendation.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-[24px] border border-white/10 bg-slate-950/60 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-black text-white">
                  Mapped Legacy Exercises
                </h3>
                <span className="w-fit rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200">
                  {legacyMappingReport.mapped.length} mapped
                </span>
              </div>

              <div className="mt-4 max-h-[620px] space-y-3 overflow-y-auto pr-1">
                {legacyMappingReport.mapped.map((mapping) => (
                  <article
                    key={mapping.legacyId}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-black text-white">
                          {mapping.legacyName}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {mapping.legacyPattern} / {mapping.legacyEquipment}
                        </p>
                      </div>
                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-black ${getConfidenceClass(
                          mapping.confidence,
                        )}`}
                      >
                        {mapping.confidenceScore}% {mapping.confidence}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                      <div>
                        <p className="text-slate-500">Core</p>
                        <p className="break-words font-bold text-white">
                          {mapping.coreMovementId}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Pattern</p>
                        <p className="break-words font-bold text-white">
                          {mapping.movementPatternId}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Apparatus</p>
                        <p className="break-words font-bold text-white">
                          {mapping.apparatus || "none"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {mapping.modifierIds.slice(0, 7).map((modifierId) => (
                        <span
                          key={modifierId}
                          className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[11px] font-bold text-slate-300"
                        >
                          {modifierId}
                        </span>
                      ))}
                    </div>

                    {mapping.warnings.length > 0 ? (
                      <p className="mt-3 text-xs leading-5 text-yellow-200">
                        {mapping.warnings.join(" ")}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>

            <div className="space-y-5">
              <section className="rounded-[24px] border border-rose-300/20 bg-rose-400/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-black text-white">
                    Unmapped Exercises
                  </h3>
                  <span className="rounded-full bg-rose-400/10 px-3 py-1 text-xs font-black text-rose-100">
                    {legacyMappingReport.unmapped.length}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {legacyMappingReport.unmapped.length > 0 ? (
                    legacyMappingReport.unmapped.map((mapping) => (
                      <div
                        key={mapping.legacyId}
                        className="rounded-2xl border border-white/10 bg-slate-950/60 p-3"
                      >
                        <p className="font-bold text-white">
                          {mapping.legacyName}
                        </p>
                        <p className="mt-1 text-xs text-rose-100/80">
                          {mapping.warnings.join(" ")}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-rose-100/80">
                      Every legacy entry has a candidate core movement.
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-[24px] border border-orange-300/20 bg-orange-400/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-black text-white">
                    Low-Confidence Mappings
                  </h3>
                  <span className="rounded-full bg-orange-400/10 px-3 py-1 text-xs font-black text-orange-100">
                    {legacyMappingReport.lowConfidence.length}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {legacyMappingReport.lowConfidence.slice(0, 18).map(
                    (mapping) => (
                      <div
                        key={mapping.legacyId}
                        className="rounded-2xl border border-white/10 bg-slate-950/60 p-3"
                      >
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <p className="font-bold text-white">
                            {mapping.legacyName}
                          </p>
                          <span
                            className={`w-fit rounded-full px-2 py-1 text-[11px] font-black ${getConfidenceClass(
                              mapping.confidence,
                            )}`}
                          >
                            {mapping.confidenceScore}%
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-orange-100/80">
                          {mapping.coreMovementId || "No core"} /{" "}
                          {mapping.apparatus || "No apparatus"}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </section>

              <section className="rounded-[24px] border border-violet-300/20 bg-violet-400/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-black text-white">
                    Duplicate / Similar Groups
                  </h3>
                  <span className="rounded-full bg-violet-400/10 px-3 py-1 text-xs font-black text-violet-100">
                    {legacyMappingReport.duplicateOrSimilar.length}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {legacyMappingReport.duplicateOrSimilar
                    .slice(0, 12)
                    .map((group) => (
                      <article
                        key={group.key}
                        className="rounded-2xl border border-white/10 bg-slate-950/60 p-3"
                      >
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-200">
                          {group.key}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {group.reason}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {group.exercises.map((mapping) => (
                            <span
                              key={mapping.legacyId}
                              className="rounded-full bg-white/[0.05] px-2 py-1 text-[11px] font-bold text-slate-200"
                            >
                              {mapping.legacyName}
                            </span>
                          ))}
                        </div>
                      </article>
                    ))}
                </div>
              </section>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
