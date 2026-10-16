import TrainerHub from "@/components/trainer-hub/TrainerHub";
import { exerciseLibrary } from "@/lib/training/exerciseLibrary";

export const metadata = { title: "Your Trainer Hub workspace", robots: { index: false, follow: false } };
export default function TrainerHubWorkspacePage() {
  return <TrainerHub mode="live" exercises={exerciseLibrary} />;
}
