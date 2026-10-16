import type { Metadata } from "next";
import "./trainer-hub.css";

export const metadata: Metadata = { title: "Trainer Hub", description: "An organized foundation for learning, building programs, and running your coaching practice." };
export default function TrainerHubLayout({ children }: { children: React.ReactNode }) {
  return <div className="trainer-hub">{children}</div>;
}
