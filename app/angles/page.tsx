import type { Metadata } from "next";
import AnglesApp from "./AnglesApp";
import "./angles.css";

export const metadata: Metadata = {
  title: "Angles",
  description: "Movement practice, live squat tracking and your assessment history. Angles by Sound Fitness.",
};

export default function AnglesPage() { return <AnglesApp />; }
