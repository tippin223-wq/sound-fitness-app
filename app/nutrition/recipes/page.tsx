import PublishedContentBank from "@/components/content/PublishedContentBank";
import { NutritionModulePage } from "../_components/NutritionPortal";

export default function RecipesPage() {
  return <><NutritionModulePage moduleId="recipes" /><PublishedContentBank bank="nutrition" title="Meals & recipes" /></>;
}
