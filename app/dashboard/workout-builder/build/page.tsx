"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  hasWorkoutBuilderSelectedExercises,
  readWorkoutBuilderSelectedExerciseNames,
  toWorkoutBuilderSelectedExercise,
  type LocalWorkoutBuilderSelectedExercise,
  type LocalWorkoutBuilderTemplate,
  writeActiveWorkoutBuilderSessionTemplate,
  writeWorkoutBuilderSelectedExercises,
} from "@/lib/localData/workoutBuilderData";
import {
  loadWorkoutTemplatesWithFallback,
  saveWorkoutTemplateWithFallback,
} from "@/lib/data/workoutPersistence";
import { ROUTES } from "@/lib/routes";
import { getExerciseCatalogWithLegacyFallback } from "@/lib/training/normalizedExerciseCatalog";
import type { ExerciseCatalogItem } from "@/types";

const exerciseOptions: ExerciseCatalogItem[] =
  getExerciseCatalogWithLegacyFallback();
const defaultSelectedExerciseNames = ["Goblet Squat", "DB Romanian Deadlift"];

const resolveCatalogExerciseNames = (names: string[]) => {
  const catalogNames = new Set(exerciseOptions.map((exercise) => exercise.name));

  return Array.from(new Set(names)).filter((name) => catalogNames.has(name));
};

const getCatalogExercisesByName = (names: string[]) => {
  const selectedNames = new Set(names);

  return exerciseOptions.filter((exercise) => selectedNames.has(exercise.name));
};

const createLocalTemplateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const getNormalizedTemplateTitle = (value: string) =>
  value.trim() || "Untitled Workout Template";

const getTemplateSourceLabel = ({
  source,
  error,
}: {
  source: "supabase" | "localStorage";
  error: string | null;
}) => {
  if (source === "supabase") return "Supabase";

  return error && !error.includes("No authenticated Supabase user")
    ? "error fallback"
    : "localStorage fallback";
};

export default function BuildWorkoutPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(
    resolveCatalogExerciseNames(defaultSelectedExerciseNames),
  );
  const [title, setTitle] = useState("Lower Body Strength Template");
  const [savedTemplates, setSavedTemplates] = useState<
    LocalWorkoutBuilderTemplate[]
  >([]);
  const [templateStatus, setTemplateStatus] = useState("");
  const [templateSourceLabel, setTemplateSourceLabel] =
    useState("Loading templates");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadSavedTemplates = async () => {
      const result = await loadWorkoutTemplatesWithFallback();

      if (!isActive) return;

      setSavedTemplates(result.data);
      setTemplateSourceLabel(getTemplateSourceLabel(result));
    };

    loadSavedTemplates();

    if (!hasWorkoutBuilderSelectedExercises()) {
      writeWorkoutBuilderSelectedExercises(
        getCatalogExercisesByName(
          resolveCatalogExerciseNames(defaultSelectedExerciseNames),
        ),
      );
    } else {
      setSelected(
        resolveCatalogExerciseNames(readWorkoutBuilderSelectedExerciseNames()),
      );
    }

    return () => {
      isActive = false;
    };
  }, []);

  const selectedExercises = useMemo(
    () =>
      exerciseOptions.filter((exercise) => selected.includes(exercise.name)),
    [selected],
  );

  function toggleExercise(name: string) {
    setSelected((current) => {
      const updatedSelection = current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name];
      const resolvedSelection = resolveCatalogExerciseNames(updatedSelection);

      writeWorkoutBuilderSelectedExercises(
        getCatalogExercisesByName(resolvedSelection),
      );
      setTemplateStatus("");

      return resolvedSelection;
    });
  }

  async function refreshSavedTemplates() {
    const result = await loadWorkoutTemplatesWithFallback();

    setSavedTemplates(result.data);
    setTemplateSourceLabel(getTemplateSourceLabel(result));

    return result;
  }

  function buildCurrentTemplate(): LocalWorkoutBuilderTemplate {
    const now = new Date().toISOString();
    const normalizedTitle = getNormalizedTemplateTitle(title);
    const existingTemplate = savedTemplates.find(
      (template) =>
        template.title.trim().toLowerCase() === normalizedTitle.toLowerCase(),
    );
    const exercises: LocalWorkoutBuilderSelectedExercise[] =
      selectedExercises.map(toWorkoutBuilderSelectedExercise);

    return {
      id: existingTemplate?.id || createLocalTemplateId(),
      title: normalizedTitle,
      exercises,
      createdAt: existingTemplate?.createdAt || now,
      updatedAt: now,
    };
  }

  async function saveCurrentTemplate() {
    if (selectedExercises.length === 0) {
      setTemplateStatus("Add at least one exercise before saving a template.");
      return;
    }

    setIsSavingTemplate(true);
    setTemplateStatus("Saving template...");

    try {
      const result = await saveWorkoutTemplateWithFallback(
        buildCurrentTemplate(),
      );
      const refreshResult = await refreshSavedTemplates();
      const sourceLabel = getTemplateSourceLabel(result);
      const savedTemplate = result.data;

      setTitle(savedTemplate.title);
      setTemplateSourceLabel(getTemplateSourceLabel(refreshResult));
      setTemplateStatus(
        result.error
          ? `${savedTemplate.title} saved locally. Supabase sync can retry later.`
          : `${savedTemplate.title} saved via ${sourceLabel}.`,
      );
    } catch {
      setTemplateStatus("Template could not be saved. Try again.");
    } finally {
      setIsSavingTemplate(false);
    }
  }

  function loadTemplate(template: LocalWorkoutBuilderTemplate) {
    const exerciseNames = resolveCatalogExerciseNames(
      template.exercises.map((exercise) => exercise.name),
    );
    const catalogExercises = getCatalogExercisesByName(exerciseNames);

    setSelected(exerciseNames);
    setTitle(template.title);
    writeWorkoutBuilderSelectedExercises(catalogExercises);
    setTemplateStatus(`${template.title} loaded into the builder.`);
  }

  function startTemplateWorkout(template: LocalWorkoutBuilderTemplate) {
    const exerciseNames = resolveCatalogExerciseNames(
      template.exercises.map((exercise) => exercise.name),
    );
    const catalogExercises = getCatalogExercisesByName(exerciseNames);

    if (catalogExercises.length === 0) {
      setTemplateStatus(
        "This template has no available exercises to start right now.",
      );
      return;
    }

    writeWorkoutBuilderSelectedExercises(catalogExercises);
    writeActiveWorkoutBuilderSessionTemplate({
      ...template,
      exercises: catalogExercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        body: exercise.body,
        pattern: exercise.pattern,
        goal: exercise.goal,
        equipment: exercise.equipment,
      })),
    });
    router.push(`${ROUTES.dashboard.sessionWorkout}?template=${template.id}`);
  }

  return (
    <main className="buildPage">
      <section className="hero">
        <div>
          <p className="eyebrow">Workout Builder</p>
          <h1>Build Workout</h1>
          <p>
            Create a workout by choosing exercises, setting structure, and
            preparing it to save or assign.
          </p>
        </div>

        <div className="summaryCard">
          <span>{selected.length}</span>
          <h2>Exercises Added</h2>
          <p>{title}</p>
        </div>
      </section>

      <section className="layout">
        <aside className="libraryPanel">
          <p className="eyebrow">Library</p>
          <h2>Add Exercises</h2>

          {exerciseOptions.map((exercise) => (
            <button
              key={exercise.name}
              onClick={() => toggleExercise(exercise.name)}
              className={selected.includes(exercise.name) ? "active" : ""}
            >
              <strong>{exercise.name}</strong>
              <span>
                {exercise.pattern} • {exercise.equipment}
              </span>
            </button>
          ))}

          <a className="libraryLink" href="/dashboard/workout-builder/exercise-library">
            Open Full Exercise Library
          </a>
        </aside>

        <section className="builderPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Workout Setup</p>
              <h2>Workout Details</h2>
            </div>
            <a href="/dashboard/workout-builder/build/save">Save Workout</a>
          </div>

          <label className="field">
            <span>Workout Name</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <div className="tableHeader">
            <span>Exercise</span>
            <span>Sets</span>
            <span>Reps</span>
            <span>Rest</span>
            <span>Notes</span>
          </div>

          <div className="exerciseRows">
            {selectedExercises.length > 0 ? (
              selectedExercises.map((exercise, index) => (
                <div className="exerciseRow" key={exercise.name}>
                  <strong>
                    {index + 1}. {exercise.name}
                  </strong>
                  <input placeholder="3" />
                  <input placeholder="8-10" />
                  <input placeholder="75 sec" />
                  <input placeholder="Coaching notes..." />
                </div>
              ))
            ) : (
              <div className="emptyState">
                <strong>No exercises added yet</strong>
                <span>Use Add Exercises to build this workout.</span>
              </div>
            )}
          </div>

          <section className="templatePanel">
            <div className="templateHeader">
              <div>
                <p className="eyebrow">Saved Templates</p>
                <h2>Save or load this workout</h2>
              </div>

              <div className="templateHeaderActions">
                <span className="templateSource">{templateSourceLabel}</span>
                <button
                  type="button"
                  onClick={saveCurrentTemplate}
                  disabled={selectedExercises.length === 0 || isSavingTemplate}
                >
                  {isSavingTemplate ? "Saving..." : "Save Template"}
                </button>
              </div>
            </div>

            {templateStatus && <p className="templateStatus">{templateStatus}</p>}

            <div className="templateGrid">
              {savedTemplates.length > 0 ? (
                savedTemplates.map((template) => (
                  <article className="templateCard" key={template.id}>
                    <div className="templateCardHeader">
                      <strong>{template.title}</strong>
                      <span>
                        {template.exercises.length} exercise
                        {template.exercises.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <p>
                      {template.exercises
                        .slice(0, 3)
                        .map((exercise) => exercise.name)
                        .join(" / ")}
                      {template.exercises.length > 3 ? " / ..." : ""}
                    </p>

                    <div className="templateActions">
                      <button
                        type="button"
                        onClick={() => loadTemplate(template)}
                      >
                        Load Template
                      </button>
                      <button
                        type="button"
                        onClick={() => startTemplateWorkout(template)}
                      >
                        Start Workout
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="emptyState">
                  <strong>No saved templates yet</strong>
                  <span>
                    Name this workout, choose exercises, then save it here.
                  </span>
                </div>
              )}
            </div>
          </section>

          <div className="actions">
            <a href="/dashboard/workout-builder/build/add-exercises">Add Exercises</a>
            <a href="/dashboard/workout-builder/build/sets-reps">Edit Sets / Reps</a>
            <a href="/dashboard/workout-builder/saved">Saved Workouts</a>
          </div>
        </section>
      </section>

      <style>{`
        .buildPage {
          min-height: 100vh;
          padding: 28px;
          color: #f8fafc;
          background:
            radial-gradient(circle at top left, rgba(37,99,235,.25), transparent 34%),
            radial-gradient(circle at top right, rgba(249,115,22,.18), transparent 30%),
            #070707;
          font-family: Inter, system-ui, sans-serif;
        }

        .hero {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 22px;
          margin-bottom: 22px;
        }

        .eyebrow {
          color: #60a5fa;
          text-transform: uppercase;
          letter-spacing: .16em;
          font-size: 12px;
          font-weight: 900;
          margin: 0 0 10px;
        }

        h1 {
          font-size: clamp(44px, 8vw, 88px);
          line-height: .9;
          letter-spacing: -.07em;
          margin: 0;
        }

        .hero p {
          color: #cbd5e1;
          max-width: 760px;
          font-size: 18px;
          line-height: 1.7;
          margin-top: 18px;
        }

        .summaryCard,
        .libraryPanel,
        .builderPanel {
          background: rgba(15,23,42,.76);
          border: 1px solid rgba(148,163,184,.18);
          box-shadow: 0 24px 80px rgba(0,0,0,.35);
          border-radius: 28px;
          backdrop-filter: blur(18px);
          padding: 24px;
        }

        .summaryCard span {
          font-size: 68px;
          font-weight: 950;
          letter-spacing: -.07em;
        }

        .summaryCard h2 {
          margin: 4px 0 8px;
        }

        .summaryCard p {
          color: #94a3b8;
          margin: 0;
        }

        .layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 20px;
          align-items: start;
        }

        .libraryPanel {
          display: grid;
          gap: 10px;
          position: sticky;
          top: 20px;
        }

        .libraryPanel h2,
        .panelHeader h2 {
          margin: 0;
          font-size: 28px;
          letter-spacing: -.04em;
        }

        .libraryPanel button {
          border: 1px solid rgba(148,163,184,.14);
          background: rgba(255,255,255,.055);
          color: white;
          border-radius: 18px;
          padding: 14px;
          text-align: left;
          cursor: pointer;
          display: grid;
          gap: 5px;
          font-family: inherit;
        }

        .libraryPanel button.active,
        .libraryPanel button:hover {
          border-color: rgba(249,115,22,.55);
          background: rgba(249,115,22,.14);
        }

        .libraryPanel span {
          color: #94a3b8;
          font-size: 14px;
        }

        .libraryLink,
        .panelHeader a,
        .actions a {
          color: white;
          text-decoration: none;
          font-weight: 900;
          border-radius: 16px;
          padding: 12px 16px;
          background: linear-gradient(135deg, #2563eb, #0ea5e9);
          text-align: center;
        }

        .panelHeader {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: center;
          margin-bottom: 18px;
        }

        .panelHeader a {
          background: linear-gradient(135deg, #f97316, #fb923c);
        }

        .field {
          display: grid;
          gap: 8px;
          margin-bottom: 18px;
        }

        .field span {
          color: #94a3b8;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .08em;
          font-weight: 900;
        }

        input {
          width: 100%;
          box-sizing: border-box;
          border-radius: 14px;
          border: 1px solid rgba(148,163,184,.18);
          background: rgba(0,0,0,.22);
          color: white;
          padding: 12px;
          outline: none;
          font-family: inherit;
        }

        input::placeholder {
          color: #64748b;
        }

        .tableHeader,
        .exerciseRow {
          display: grid;
          grid-template-columns: 1.5fr .7fr .7fr .8fr 1.5fr;
          gap: 10px;
          align-items: center;
        }

        .tableHeader {
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: .08em;
          font-size: 12px;
          font-weight: 900;
          margin-bottom: 10px;
        }

        .exerciseRows {
          display: grid;
          gap: 10px;
        }

        .exerciseRow {
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(148,163,184,.12);
          border-radius: 18px;
          padding: 12px;
        }

        .exerciseRow strong {
          color: #e2e8f0;
        }

        .emptyState {
          border: 1px dashed rgba(148,163,184,.28);
          border-radius: 18px;
          color: #cbd5e1;
          display: grid;
          gap: 6px;
          padding: 18px;
        }

        .emptyState span {
          color: #94a3b8;
        }

        .templatePanel {
          border: 1px solid rgba(148,163,184,.16);
          border-radius: 24px;
          background: rgba(255,255,255,.04);
          display: grid;
          gap: 14px;
          margin-top: 18px;
          padding: 18px;
        }

        .templateHeader {
          align-items: center;
          display: flex;
          gap: 14px;
          justify-content: space-between;
        }

        .templateHeader h2 {
          font-size: 24px;
          letter-spacing: -.04em;
          margin: 0;
        }

        .templateHeaderActions {
          align-items: center;
          display: flex;
          gap: 10px;
        }

        .templateSource {
          border: 1px solid rgba(148,163,184,.16);
          border-radius: 999px;
          color: #bfdbfe;
          font-size: 12px;
          font-weight: 900;
          padding: 7px 10px;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .templateHeader button,
        .templateCard button {
          border: none;
          border-radius: 14px;
          color: white;
          cursor: pointer;
          font-family: inherit;
          font-weight: 900;
          padding: 11px 14px;
        }

        .templateHeader button {
          background: linear-gradient(135deg, #f97316, #fb923c);
          white-space: nowrap;
        }

        .templateHeader button:disabled {
          cursor: not-allowed;
          opacity: .5;
        }

        .templateStatus {
          color: #bfdbfe;
          font-size: 14px;
          margin: 0;
        }

        .templateGrid {
          display: grid;
          gap: 10px;
        }

        .templateCard {
          border: 1px solid rgba(148,163,184,.14);
          border-radius: 18px;
          background: rgba(15,23,42,.72);
          display: grid;
          gap: 10px;
          padding: 14px;
        }

        .templateCardHeader {
          display: flex;
          gap: 10px;
          justify-content: space-between;
        }

        .templateActions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .templateCard span,
        .templateCard p {
          color: #94a3b8;
        }

        .templateCard p {
          line-height: 1.5;
          margin: 0;
        }

        .templateCard button {
          background: linear-gradient(135deg, #2563eb, #0ea5e9);
          justify-self: start;
        }

        .templateActions button:last-child {
          background: linear-gradient(135deg, #f97316, #fb923c);
        }

        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .actions a:nth-child(2) {
          background: linear-gradient(135deg, #f97316, #fb923c);
        }

        .actions a:nth-child(3) {
          background: rgba(255,255,255,.1);
        }

        @media (max-width: 1000px) {
          .hero,
          .layout {
            grid-template-columns: 1fr;
          }

          .libraryPanel {
            position: static;
          }

          .panelHeader {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 760px) {
          .buildPage {
            padding: 16px;
          }

          .tableHeader {
            display: none;
          }

          .exerciseRow {
            grid-template-columns: 1fr;
          }

          .templateHeader,
          .templateCardHeader,
          .templateHeaderActions,
          .templateActions {
            align-items: stretch;
            flex-direction: column;
          }

          .templateHeader button,
          .templateCard button {
            width: 100%;
          }

          .actions a,
          .panelHeader a {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
