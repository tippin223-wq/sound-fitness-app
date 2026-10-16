import TrainerHub from "@/components/trainer-hub/TrainerHub";
import { exerciseLibrary } from "@/lib/training/exerciseLibrary";

export const metadata = { title: "Trainer Hub preview" };
export default function TrainerHubPreviewPage() {
  return <TrainerHub mode="preview" exercises={exerciseLibrary} />;
}
