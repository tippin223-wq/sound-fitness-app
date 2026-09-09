const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

// Exercise the production render helper without changing a user's saved data.
const source = fs.readFileSync("components/dashboard/DashboardExperience.tsx", "utf8");
const start = source.indexOf("  const renderFavoriteWorkoutsHero = () => {");
const end = source.indexOf("  const renderDashboardHeroUtilityPanel = (", start);
assert.ok(start >= 0 && end > start);
const code = ts.transpileModule(
  source.slice(start, end) + "\nglobalThis.renderHero = renderFavoriteWorkoutsHero;",
  { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 } },
).outputText;
const icon = () => null;
const launches = [];
const context = vm.createContext({
  React, Link: "a", ChevronLeft: icon, ChevronRight: icon,
  Dumbbell: icon, Star: icon, Plus: icon, CalendarCheck: icon,
  meterCardStyles: new Proxy({}, { get: (_, key) => key }),
  ROUTES: { dashboard: { sessionWorkout: "/workout", sessionHistory: "/history" }, workoutBuilder: { home: "/builder" } },
  favoriteWorkoutTemplates: [], heroFavoriteWorkoutId: null, activeSessionTemplate: null,
  getWorkoutTemplateTag: () => "Strength", getWorkoutTemplateIcon: () => "Workout",
  buildTemplateWorkoutHref: (id) => `/workout?template=${encodeURIComponent(id)}`,
  launchFavoriteWorkout: (template) => launches.push(template.id),
});
context.setHeroFavoriteWorkoutId = (id) => { context.heroFavoriteWorkoutId = id; };
vm.runInContext(code, context);
function elements(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(elements);
  return [node, ...elements(node.props?.children)];
}
const tree = () => context.renderHero();
const html = () => renderToStaticMarkup(tree());
const click = (label) => elements(tree()).find((node) => node.props?.["aria-label"] === label).props.onClick({ stopPropagation() {} });
assert.match(html(), /Create a workout/);
assert.match(html(), /0 saved workouts/);
assert.doesNotMatch(html(), /Next favorite workout|Resume workout/);

const first = { id: "one", title: "A long lower-body strength workout", exercises: Array.from({ length: 6 }, (_, i) => ({ id: String(i), name: `Exercise ${i + 1}` })) };
const second = { id: "two", title: "Second workout", exercises: [{ id: "x", name: "Squat" }] };
context.favoriteWorkoutTemplates = [first];
assert.match(html(), /6 exercises/);
assert.match(html(), /\+4 more in this workout/);
assert.doesNotMatch(html(), /Exercise 3|Next favorite workout/);
elements(tree()).find((node) => node.props?.className === "favoriteStart").props.onClick({ stopPropagation() {} });
assert.deepEqual(launches, ["one"]);

context.favoriteWorkoutTemplates = [first, second];
click("Next favorite workout");
assert.equal(context.heroFavoriteWorkoutId, "two");
assert.match(html(), /Second workout/);
click("Next favorite workout");
assert.equal(context.heroFavoriteWorkoutId, "one");
click("Previous favorite workout");
assert.equal(context.heroFavoriteWorkoutId, "two");
context.activeSessionTemplate = second;
assert.match(html(), /Resume workout/);
elements(tree()).find((node) => node.props?.className === "favoriteStart").props.onClick({ stopPropagation() {} });
assert.deepEqual(launches, ["one"]);
context.favoriteWorkoutTemplates = [first];
assert.match(html(), /A long lower-body/); // Removed selection falls back safely.
console.log("PASS: empty/saved favorites, bounded preview, navigation wrap, deleted selection, launch, and resume");
