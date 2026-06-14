"use client";

import UserMenu from "@/components/UserMenu";
import { ROUTES } from "@/lib/routes";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BedDouble,
  BicepsFlexed,
  Bone,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  ClipboardCheck,
  ClipboardList,
  Dumbbell,
  Footprints,
  Gauge,
  Globe2,
  GraduationCap,
  HandHelping,
  HeartPulse,
  Home,
  Mail,
  MapPinned,
  Megaphone,
  MessageCircle,
  MoveHorizontal,
  Phone,
  Rocket,
  Ruler,
  Salad,
  Scale,
  ScanHeart,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  Trophy,
  Users,
  Utensils,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { type CSSProperties, useMemo, useState } from "react";

const steps: { label: string; helper: string; Icon: LucideIcon }[] = [
  {
    label: "Goals",
    helper: "What matters most right now",
    Icon: Target,
  },
  {
    label: "Body",
    helper: "Pain, limitations, and movement context",
    Icon: HeartPulse,
  },
  {
    label: "Experience",
    helper: "Training background and confidence",
    Icon: UserRound,
  },
  {
    label: "Schedule",
    helper: "Where the work fits your week",
    Icon: CalendarDays,
  },
  {
    label: "Next Steps",
    helper: "We will reach out within 2 business days",
    Icon: Sparkles,
  },
];

type FormState = {
  welcomeAgreement: string;
  referralSource: string;
  referralOther: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  email: string;
  phone: string;
  contactMethod: string;
  homeAddress: string;
  cityNeighborhood: string;
  cityNeighborhoodOther: string;
  birthMonth: string;
  birthDay: string;
  birthYear: string;
  dateOfBirth: string;
  gender: string;
  heightFeet: string;
  heightInches: string;
  height: string;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
  ageRange: string;
  topGoals: string;
  goal: string[];
  goalTimeline: string;
  goalImportance: string;
  struggle: string;
  fitnessLevel: string;
  trainerExperience: string;
  trainerFeedback: string;
  recentTraining: string[];
  activeDays: string;
  heartCondition: string;
  chestPain: string;
  dizzyOrFaint: string;
  medicalConditions: string[];
  medicationsAffect: string;
  medicationsList: string;
  recentSurgery: string;
  surgeryDetails: string;
  healthNotes: string;
  currentPain: string;
  painAreas: string[];
  painSeverity: string;
  painNotes: string;
  experience: string;
  confidence: string;
  jobRoutine: string;
  sleepHours: string;
  stressLevel: string;
  typicalDay: string;
  eatingHabits: string;
  dietaryRestrictions: string[];
  foodTracking: string;
  nutritionInterest: string;
  trainingPlaces: string[];
  equipment: string[];
  preferredDays: string[];
  availabilitySlots: string[];
  sessionsPerWeek: string;
  serviceInterests: string[];
  daysAvailable: string;
  readinessScore: string;
  coachingStyle: string;
  riskAgreement: string;
  resultsAgreement: string;
  finalNotes: string;
  signature: string;
  signatureDate: string;
};

type CardOptionProps = {
  Icon?: LucideIcon;
  label: string;
  onClick: () => void;
  selected: boolean;
  sublabel?: string;
  tone?: CardTone;
};

type CardTone = "sky" | "emerald" | "amber" | "rose";

const defaultForm: FormState = {
  welcomeAgreement: "",
  referralSource: "",
  referralOther: "",
  firstName: "",
  lastName: "",
  preferredName: "",
  email: "",
  phone: "",
  contactMethod: "",
  homeAddress: "",
  cityNeighborhood: "",
  cityNeighborhoodOther: "",
  birthMonth: "",
  birthDay: "",
  birthYear: "",
  dateOfBirth: "",
  gender: "",
  heightFeet: "",
  heightInches: "",
  height: "",
  emergencyName: "",
  emergencyRelationship: "",
  emergencyPhone: "",
  ageRange: "",
  topGoals: "",
  goal: [],
  goalTimeline: "",
  goalImportance: "",
  struggle: "",
  fitnessLevel: "",
  trainerExperience: "",
  trainerFeedback: "",
  recentTraining: [],
  activeDays: "",
  heartCondition: "",
  chestPain: "",
  dizzyOrFaint: "",
  medicalConditions: [],
  medicationsAffect: "",
  medicationsList: "",
  recentSurgery: "",
  surgeryDetails: "",
  healthNotes: "",
  currentPain: "",
  painAreas: [],
  painSeverity: "Low",
  painNotes: "",
  experience: "",
  confidence: "",
  jobRoutine: "",
  sleepHours: "",
  stressLevel: "",
  typicalDay: "",
  eatingHabits: "",
  dietaryRestrictions: [],
  foodTracking: "",
  nutritionInterest: "",
  trainingPlaces: ["In-home"],
  equipment: [],
  preferredDays: [],
  availabilitySlots: [],
  sessionsPerWeek: "",
  serviceInterests: [],
  daysAvailable: "",
  readinessScore: "",
  coachingStyle: "",
  riskAgreement: "",
  resultsAgreement: "",
  finalNotes: "",
  signature: "",
  signatureDate: "",
};

const defaultTrainingPlaces = ["In-home"];

type ArrayFieldKey = {
  [Key in keyof FormState]: FormState[Key] extends string[] ? Key : never;
}[keyof FormState];

type ChoiceOption = {
  Icon?: LucideIcon;
  label: string;
  sublabel?: string;
  tone?: CardTone;
};

const cardToneClasses: Record<
  CardTone,
  {
    iconSelected: string;
    iconUnselected: string;
    selected: string;
    unselected: string;
  }
> = {
  sky: {
    selected:
      "border-sky-300/55 bg-sky-400/12 shadow-[0_0_26px_rgba(14,165,233,0.18)]",
    unselected:
      "border-white/10 bg-slate-950/58 hover:border-sky-300/30 hover:bg-sky-500/8",
    iconSelected: "text-sky-100",
    iconUnselected: "text-slate-500 group-hover:text-sky-100",
  },
  emerald: {
    selected:
      "border-emerald-300/55 bg-emerald-400/12 shadow-[0_0_26px_rgba(16,185,129,0.18)]",
    unselected:
      "border-white/10 bg-slate-950/58 hover:border-emerald-300/30 hover:bg-emerald-500/8",
    iconSelected: "text-emerald-100",
    iconUnselected: "text-slate-500 group-hover:text-emerald-100",
  },
  amber: {
    selected:
      "border-amber-200/60 bg-amber-300/12 shadow-[0_0_26px_rgba(250,204,21,0.16)]",
    unselected:
      "border-white/10 bg-slate-950/58 hover:border-amber-200/35 hover:bg-amber-300/8",
    iconSelected: "text-amber-100",
    iconUnselected: "text-slate-500 group-hover:text-amber-100",
  },
  rose: {
    selected:
      "border-rose-300/55 bg-rose-400/12 shadow-[0_0_26px_rgba(251,113,133,0.16)]",
    unselected:
      "border-white/10 bg-slate-950/58 hover:border-rose-300/30 hover:bg-rose-500/8",
    iconSelected: "text-rose-100",
    iconUnselected: "text-slate-500 group-hover:text-rose-100",
  },
};

const yesNoOptions: ChoiceOption[] = [
  { label: "Yes", Icon: CheckCircle2, tone: "emerald" },
  { label: "No", Icon: CircleAlert, tone: "rose" },
];

const referralOptions: ChoiceOption[] = [
  { label: "Google", Icon: Globe2, tone: "sky" },
  { label: "Instagram", Icon: Megaphone, tone: "rose" },
  { label: "Facebook", Icon: Users, tone: "sky" },
  { label: "Youtube", Icon: MessageCircle, tone: "rose" },
  { label: "Referral", Icon: HandHelping, tone: "emerald" },
  { label: "Flyer", Icon: ClipboardList, tone: "amber" },
  { label: "Other", Icon: Sparkles, tone: "sky" },
];

const contactMethodOptions: ChoiceOption[] = [
  { label: "Text Message", Icon: MessageCircle, tone: "sky" },
  { label: "Phone Call", Icon: Phone, tone: "emerald" },
  { label: "Email", Icon: Mail, tone: "amber" },
];

const cityNeighborhoodOptions = [
  "Seattle",
  "Belltown",
  "Capitol Hill",
  "Queen Anne",
  "Ballard",
  "Fremont",
  "Wallingford",
  "Green Lake",
  "West Seattle",
  "Bellevue",
  "Kirkland",
  "Redmond",
  "Issaquah",
  "Sammamish",
  "Mercer Island",
  "Bothell",
  "Woodinville",
  "Renton",
  "Other",
];

const genderOptions: ChoiceOption[] = [
  { label: "Male", Icon: UserRound, tone: "sky" },
  { label: "Female", Icon: UserRound, tone: "rose" },
  { label: "Non-binary / Gender diverse", Icon: Users, tone: "emerald" },
  { label: "Prefer not to share", Icon: ShieldCheck, tone: "amber" },
];

const goalOptions: ChoiceOption[] = [
  {
    label: "Strength",
    sublabel: "Build strength, confidence, and better movement quality.",
    Icon: Dumbbell,
    tone: "sky",
  },
  {
    label: "Fat Loss",
    sublabel: "Improve consistency, training, and body composition.",
    Icon: Scale,
    tone: "emerald",
  },
  {
    label: "Mobility",
    sublabel: "Move better, feel better, and reduce stiffness.",
    Icon: HeartPulse,
    tone: "sky",
  },
  {
    label: "Pain-Free Movement",
    sublabel: "Train with more control and less irritation.",
    Icon: ShieldCheck,
    tone: "emerald",
  },
  { label: "Improve posture", Icon: MoveHorizontal, tone: "amber" },
  { label: "Improve energy / daily performance", Icon: Activity, tone: "sky" },
  {
    label: "Improve athletic / sports performance",
    Icon: Trophy,
    tone: "amber",
  },
  { label: "General health and longevity", Icon: HeartPulse, tone: "emerald" },
  { label: "Other", Icon: Sparkles, tone: "sky" },
];

const progressTimelineOptions: ChoiceOption[] = [
  { label: "Within 4 weeks", Icon: Rocket, tone: "sky" },
  { label: "1-3 months", Icon: CalendarClock, tone: "emerald" },
  { label: "3-6 months", Icon: CalendarDays, tone: "amber" },
  { label: "I'm in it for the long game", Icon: Trophy, tone: "rose" },
];

const fitnessLevelOptions: ChoiceOption[] = [
  {
    label: "Beginner (little to no experience)",
    Icon: GraduationCap,
    tone: "emerald",
  },
  {
    label: "Getting back into it after a break",
    Icon: Sparkles,
    tone: "sky",
  },
  {
    label: "Consistent, but need structure / progression",
    Icon: ClipboardCheck,
    tone: "amber",
  },
  {
    label: "Advanced / experienced lifter",
    Icon: Rocket,
    tone: "rose",
  },
];

const trainerExperienceOptions: ChoiceOption[] = [
  { label: "Yes, in-person", Icon: Users, tone: "sky" },
  { label: "Yes, online", Icon: MessageCircle, tone: "emerald" },
  { label: "Yes, both", Icon: HandHelping, tone: "amber" },
  { label: "No", Icon: ShieldCheck, tone: "rose" },
];

const recentTrainingOptions: ChoiceOption[] = [
  { label: "Walking", Icon: Footprints, tone: "emerald" },
  { label: "Running / cardio machine", Icon: Activity, tone: "sky" },
  { label: "I haven't been active recently", Icon: CircleAlert, tone: "amber" },
  { label: "Group fitness classes", Icon: Users, tone: "rose" },
  { label: "Strength training / weights", Icon: Dumbbell, tone: "sky" },
  { label: "CrossFit / HIIT", Icon: Gauge, tone: "amber" },
  { label: "Yoga / Pilates", Icon: MoveHorizontal, tone: "emerald" },
  { label: "Sports", Icon: Trophy, tone: "rose" },
  { label: "I haven't been active as of recent", Icon: CircleAlert, tone: "amber" },
  { label: "Other", Icon: Sparkles, tone: "sky" },
];

const activeDaysOptions: ChoiceOption[] = [
  { label: "0 days", Icon: Clock3, tone: "rose" },
  { label: "1 day", Icon: Clock3, tone: "amber" },
  { label: "2 days", Icon: CalendarDays, tone: "sky" },
  { label: "3 days", Icon: CalendarDays, tone: "emerald" },
  { label: "4+ days", Icon: Trophy, tone: "emerald" },
];

const medicalConditionOptions: ChoiceOption[] = [
  { label: "High blood pressure", Icon: HeartPulse, tone: "rose" },
  { label: "Heart condition", Icon: HeartPulse, tone: "rose" },
  { label: "Low blood pressure", Icon: HeartPulse, tone: "amber" },
  { label: "Diabetes or blood sugar issues", Icon: Stethoscope, tone: "amber" },
  { label: "Asthma or breathing issues", Icon: Activity, tone: "sky" },
  { label: "Joint problems", Icon: Bone, tone: "amber" },
  { label: "Arthritis", Icon: Bone, tone: "rose" },
  { label: "None of the above", Icon: ShieldCheck, tone: "emerald" },
  { label: "Other", Icon: Sparkles, tone: "sky" },
];

const currentPainOptions: ChoiceOption[] = [
  { label: "No", Icon: ShieldCheck, tone: "emerald" },
  { label: "Yes, minor pain / discomfort", Icon: HeartPulse, tone: "amber" },
  { label: "Yes, significant pain or active injury", Icon: CircleAlert, tone: "rose" },
];

const painAreaOptions: ChoiceOption[] = [
  { label: "Neck", Icon: ScanHeart, tone: "sky" },
  { label: "Shoulders", Icon: BicepsFlexed, tone: "sky" },
  { label: "Upper back", Icon: Bone, tone: "amber" },
  { label: "Lower back", Icon: Bone, tone: "amber" },
  { label: "Hips", Icon: MoveHorizontal, tone: "emerald" },
  { label: "Knees", Icon: Footprints, tone: "sky" },
  { label: "Ankles / feet", Icon: Footprints, tone: "rose" },
  { label: "Other", Icon: Sparkles, tone: "sky" },
];

const jobRoutineOptions: ChoiceOption[] = [
  { label: "Mostly sitting", Icon: BriefcaseBusiness, tone: "sky" },
  { label: "Mix of sitting and standing", Icon: MoveHorizontal, tone: "emerald" },
  { label: "On my feet most of the day", Icon: Footprints, tone: "amber" },
  { label: "Physically demanding / manual labor", Icon: Dumbbell, tone: "rose" },
];

const sleepOptions: ChoiceOption[] = [
  { label: "Less than 5", Icon: BedDouble, tone: "rose" },
  { label: "5-6", Icon: BedDouble, tone: "amber" },
  { label: "6-7", Icon: BedDouble, tone: "sky" },
  { label: "7-8", Icon: BedDouble, tone: "emerald" },
  { label: "8+", Icon: BedDouble, tone: "emerald" },
];

const eatingHabitOptions: ChoiceOption[] = [
  { label: "Very consistent and intentional", Icon: Salad, tone: "emerald" },
  { label: "Pretty decent, but could improve", Icon: Utensils, tone: "sky" },
  { label: "Inconsistent / all over the place", Icon: CircleAlert, tone: "amber" },
  { label: "I don't really pay attention yet", Icon: Sparkles, tone: "rose" },
];

const dietaryRestrictionOptions: ChoiceOption[] = [
  { label: "No specific restrictions", Icon: ShieldCheck, tone: "emerald" },
  { label: "Vegetarian", Icon: Salad, tone: "emerald" },
  { label: "Vegan", Icon: Salad, tone: "emerald" },
  { label: "Kosher", Icon: Utensils, tone: "sky" },
  { label: "Halal", Icon: Utensils, tone: "sky" },
  { label: "Gluten-free", Icon: Utensils, tone: "amber" },
  { label: "Dairy-free", Icon: Utensils, tone: "amber" },
  { label: "Low carb / keto", Icon: Scale, tone: "rose" },
  { label: "Other", Icon: Sparkles, tone: "sky" },
];

const foodTrackingOptions: ChoiceOption[] = [
  { label: "Yes, regularly", Icon: ClipboardCheck, tone: "emerald" },
  { label: "Sometimes", Icon: ClipboardList, tone: "sky" },
  { label: "No", Icon: CircleAlert, tone: "amber" },
];

const nutritionInterestOptions: ChoiceOption[] = [
  { label: "Yes", Icon: Salad, tone: "emerald" },
  { label: "No", Icon: ShieldCheck, tone: "rose" },
  { label: "Maybe later", Icon: Clock3, tone: "amber" },
];

const trainingLocationOptions: ChoiceOption[] = [
  { label: "In-home", Icon: Home, tone: "sky" },
  { label: "Gym", Icon: Dumbbell, tone: "emerald" },
  { label: "In my apartment / condo gym", Icon: Dumbbell, tone: "emerald" },
  { label: "Outdoor space nearby", Icon: MapPinned, tone: "amber" },
  { label: "Other", Icon: Sparkles, tone: "rose" },
];

const equipmentOptions: ChoiceOption[] = [
  { label: "Dumbbells", Icon: Dumbbell, tone: "sky" },
  { label: "Kettlebell", Icon: Dumbbell, tone: "sky" },
  { label: "Resistance bands", Icon: MoveHorizontal, tone: "emerald" },
  { label: "Bench or sturdy chair", Icon: Home, tone: "amber" },
  { label: "Barbell / rack", Icon: Dumbbell, tone: "rose" },
  { label: "Cardio machines", Icon: Activity, tone: "sky" },
  {
    label: "None - I need bodyweight-focused training",
    Icon: HandHelping,
    tone: "emerald",
  },
  { label: "Other", Icon: Sparkles, tone: "sky" },
];

const availabilityDays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const formatAvailabilityTime = (totalMinutes: number) => {
  const hour24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
};

const availabilityTimeSlots = Array.from({ length: 31 }, (_, index) => {
  const totalMinutes = 5 * 60 + index * 30;

  return {
    label: formatAvailabilityTime(totalMinutes),
    value: formatAvailabilityTime(totalMinutes),
  };
});

const birthMonthOptions = [
  { label: "January", value: "01" },
  { label: "February", value: "02" },
  { label: "March", value: "03" },
  { label: "April", value: "04" },
  { label: "May", value: "05" },
  { label: "June", value: "06" },
  { label: "July", value: "07" },
  { label: "August", value: "08" },
  { label: "September", value: "09" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
];

const birthYearOptions = Array.from({ length: 101 }, (_, index) =>
  String(new Date().getFullYear() - index),
);

const heightFeetOptions = Array.from({ length: 6 }, (_, index) =>
  String(index + 3),
);

const heightInchOptions = Array.from({ length: 12 }, (_, index) =>
  String(index),
);

const getDaysInBirthMonth = (month: string, year: string) => {
  if (!month) {
    return 31;
  }

  return new Date(Number(year || new Date().getFullYear()), Number(month), 0).getDate();
};

const composeDateOfBirth = ({
  birthDay,
  birthMonth,
  birthYear,
}: {
  birthDay: string;
  birthMonth: string;
  birthYear: string;
}) => {
  if (!birthDay || !birthMonth || !birthYear) {
    return "";
  }

  return `${birthYear}-${birthMonth}-${birthDay.padStart(2, "0")}`;
};

const composeHeight = (feet: string, inches: string) => {
  if (!feet || inches === "") {
    return "";
  }

  return `${feet} ft ${inches} in`;
};

const getPhoneDigits = (value: string) => value.replace(/\D/g, "").slice(0, 10);

const formatPhoneNumber = (value: string) => {
  const digits = getPhoneDigits(value);

  if (digits.length <= 3) {
    return digits ? `(${digits}` : "";
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const isValidPhoneNumber = (value: string) =>
  /^[2-9]\d{2}[2-9]\d{6}$/.test(getPhoneDigits(value));

const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

type StepValidationIssue = {
  detail?: string;
  label: string;
};

const hasText = (value: string) => value.trim().length > 0;
const hasSelection = (values: string[]) => values.length > 0;
const isPainSelected = (form: FormState) =>
  Boolean(form.currentPain) && form.currentPain !== "No";
const formatSummaryList = (
  values: string[],
  fallback: string,
  limit = 2,
) => {
  if (values.length === 0) {
    return fallback;
  }

  const visibleValues = values.slice(0, limit).join(" + ");
  const hiddenCount = values.length - limit;

  return hiddenCount > 0 ? `${visibleValues} +${hiddenCount}` : visibleValues;
};

const getStepValidationIssues = (step: number, form: FormState) => {
  const issues: StepValidationIssue[] = [];
  const addIssue = (label: string, detail?: string) =>
    issues.push({ label, detail });

  if (step === 0) {
    if (form.welcomeAgreement !== "Yes, I agree") {
      addIssue("Welcome agreement", "Confirm the form will be completed honestly.");
    }

    if (!hasText(form.referralSource)) {
      addIssue("Referral source", "Choose how you heard about Sound Fitness.");
    }

    if (form.referralSource === "Other" && !hasText(form.referralOther)) {
      addIssue("Referral details", "Tell us where you found us.");
    }

    if (!hasText(form.firstName)) {
      addIssue("First name");
    }

    if (!hasText(form.lastName)) {
      addIssue("Last name");
    }

    if (!isValidEmail(form.email)) {
      addIssue("Email address", "Use a valid email address.");
    }

    if (!isValidPhoneNumber(form.phone)) {
      addIssue("Phone number", "Use a 10-digit number with area code.");
    }

    if (!hasText(form.contactMethod)) {
      addIssue("Best contact method");
    }

    if (!hasText(form.homeAddress)) {
      addIssue("Home address");
    }

    if (!hasText(form.cityNeighborhood)) {
      addIssue("City / neighborhood");
    }

    if (
      form.cityNeighborhood === "Other" &&
      !hasText(form.cityNeighborhoodOther)
    ) {
      addIssue("Other city / neighborhood", "Add your city or neighborhood.");
    }

    if (!form.birthMonth || !form.birthDay || !form.birthYear) {
      addIssue("Date of birth");
    }

    if (!form.heightFeet || form.heightInches === "") {
      addIssue("Height");
    }

    if (!hasText(form.emergencyName)) {
      addIssue("Emergency contact name");
    }

    if (!hasText(form.emergencyRelationship)) {
      addIssue("Emergency contact relationship");
    }

    if (!isValidPhoneNumber(form.emergencyPhone)) {
      addIssue("Emergency contact phone", "Use a 10-digit number with area code.");
    }

    if (!hasSelection(form.goal)) {
      addIssue("Goals", "Choose at least one goal.");
    }

    if (!hasText(form.goalTimeline)) {
      addIssue("Progress timeline");
    }

    if (!hasText(form.goalImportance)) {
      addIssue("Goal importance");
    }
  }

  if (step === 1) {
    if (!hasText(form.heartCondition)) {
      addIssue("Heart condition screening");
    }

    if (!hasText(form.chestPain)) {
      addIssue("Chest pain screening");
    }

    if (!hasText(form.dizzyOrFaint)) {
      addIssue("Dizziness / fainting screening");
    }

    if (!hasSelection(form.medicalConditions)) {
      addIssue("Medical conditions", "Choose all that apply or none of the above.");
    }

    if (!hasText(form.medicationsAffect)) {
      addIssue("Medication screening");
    }

    if (!hasText(form.recentSurgery)) {
      addIssue("Surgery screening");
    }

    if (form.recentSurgery === "Yes" && !hasText(form.surgeryDetails)) {
      addIssue("Surgery details", "Add the surgery and approximate year.");
    }

    if (!hasText(form.currentPain)) {
      addIssue("Current pain / injuries");
    }

    if (isPainSelected(form) && !hasSelection(form.painAreas)) {
      addIssue("Pain area", "Choose where you feel pain or limitations.");
    }

    if (isPainSelected(form) && !hasText(form.painNotes)) {
      addIssue("Pain notes", "Add what makes it better or worse.");
    }
  }

  if (step === 2) {
    if (!hasText(form.fitnessLevel)) {
      addIssue("Current fitness level");
    }

    if (!hasText(form.trainerExperience)) {
      addIssue("Trainer experience");
    }

    if (!hasSelection(form.recentTraining)) {
      addIssue("Recent training", "Choose all that apply.");
    }

    if (!hasText(form.activeDays)) {
      addIssue("Active days per week");
    }

    if (!hasText(form.experience)) {
      addIssue("Experience level");
    }

    if (!hasText(form.confidence)) {
      addIssue("Movement confidence");
    }

    if (!hasText(form.ageRange)) {
      addIssue("Age range");
    }

    if (!hasText(form.jobRoutine)) {
      addIssue("Job / daily routine");
    }

    if (!hasText(form.sleepHours)) {
      addIssue("Sleep");
    }

    if (!hasText(form.stressLevel)) {
      addIssue("Stress level");
    }

    if (!hasText(form.eatingHabits)) {
      addIssue("Eating habits");
    }

    if (!hasSelection(form.dietaryRestrictions)) {
      addIssue("Dietary preferences", "Choose all that apply or no restrictions.");
    }

    if (!hasText(form.foodTracking)) {
      addIssue("Food tracking");
    }

    if (!hasText(form.nutritionInterest)) {
      addIssue("Nutrition coaching interest");
    }
  }

  if (step === 3) {
    if (!hasSelection(form.trainingPlaces)) {
      addIssue("Training location", "Choose at least one location.");
    }

    if (!hasSelection(form.equipment)) {
      addIssue("Equipment access", "Choose all that apply.");
    }

    if (!hasSelection(form.availabilitySlots)) {
      addIssue("Best day and time windows", "Choose at least one 30-minute window.");
    }

    if (!hasText(form.sessionsPerWeek)) {
      addIssue("Sessions per week");
    }

    if (!hasSelection(form.serviceInterests)) {
      addIssue("Service interests", "Choose all that apply.");
    }
  }

  if (step === 4) {
    if (!hasText(form.readinessScore)) {
      addIssue("Readiness score");
    }

    if (form.riskAgreement !== "Yes, I agree and understand") {
      addIssue("Risk acknowledgement");
    }

    if (form.resultsAgreement !== "Yes, I agree and understand") {
      addIssue("Results acknowledgement");
    }

    if (!hasText(form.signature)) {
      addIssue("Digital signature");
    }

    if (!hasText(form.signatureDate)) {
      addIssue("Signature date");
    }
  }

  return issues;
};

const sessionOptions: ChoiceOption[] = [
  { label: "1x per week", Icon: Clock3, tone: "sky" },
  { label: "2x per week", Icon: Clock3, tone: "emerald" },
  { label: "3x per week", Icon: Clock3, tone: "amber" },
  { label: "4x+ per week", Icon: Clock3, tone: "rose" },
  { label: "Not sure yet", Icon: Sparkles, tone: "sky" },
];

const serviceInterestOptions: ChoiceOption[] = [
  { label: "1:1 personal training", Icon: UserRound, tone: "sky" },
  { label: "Partner or small-group training", Icon: Users, tone: "emerald" },
  { label: "Assisted stretch sessions", Icon: HandHelping, tone: "amber" },
  { label: "Hybrid (in-person + remote programming)", Icon: MessageCircle, tone: "rose" },
];

const painSeverityOptions: {
  Icon: LucideIcon;
  mood: "happy" | "soft" | "neutral" | "uneasy" | "sad";
  label: string;
  note: string;
  selectedClass: string;
}[] = [
  {
    label: "Low",
    note: "Manageable",
    Icon: ShieldCheck,
    mood: "happy",
    selectedClass: "border-emerald-200/55 bg-emerald-300/12 text-emerald-50",
  },
  {
    label: "Mild",
    note: "Aware but okay",
    Icon: HeartPulse,
    mood: "soft",
    selectedClass: "border-cyan-200/55 bg-cyan-300/12 text-cyan-50",
  },
  {
    label: "Moderate",
    note: "Noticeable",
    Icon: Activity,
    mood: "neutral",
    selectedClass: "border-amber-200/55 bg-amber-300/12 text-amber-50",
  },
  {
    label: "Elevated",
    note: "Limits some moves",
    Icon: Activity,
    mood: "uneasy",
    selectedClass: "border-orange-200/55 bg-orange-300/12 text-orange-50",
  },
  {
    label: "High",
    note: "Needs care",
    Icon: CircleAlert,
    mood: "sad",
    selectedClass: "border-rose-200/55 bg-rose-400/12 text-rose-50",
  },
];

const experienceOptions: {
  Icon: LucideIcon;
  label: string;
  sublabel: string;
  tone: CardTone;
}[] = [
  {
    label: "Beginner",
    sublabel: "Learning the basics or restarting after time away.",
    Icon: GraduationCap,
    tone: "emerald",
  },
  {
    label: "Intermediate",
    sublabel: "Comfortable training with guidance and progression.",
    Icon: Gauge,
    tone: "sky",
  },
  {
    label: "Advanced",
    sublabel: "Ready for tighter targets, volume, and performance detail.",
    Icon: Rocket,
    tone: "amber",
  },
];

const confidenceOptions: {
  Icon: LucideIcon;
  label: string;
  tone: CardTone;
}[] = [
  { label: "Need lots of guidance", Icon: HandHelping, tone: "emerald" },
  { label: "Pretty comfortable", Icon: BadgeCheck, tone: "sky" },
  { label: "Very confident", Icon: Trophy, tone: "amber" },
];

const ageRangeOptions: {
  Icon: LucideIcon;
  label: string;
  tone: CardTone;
}[] = [
  { label: "18-29", Icon: CalendarClock, tone: "sky" },
  { label: "30-44", Icon: CalendarClock, tone: "emerald" },
  { label: "45-59", Icon: CalendarClock, tone: "amber" },
  { label: "60+", Icon: CalendarClock, tone: "rose" },
];

function CardOption({
  Icon,
  label,
  selected,
  onClick,
  sublabel,
  tone = "sky",
}: CardOptionProps) {
  const toneClasses = cardToneClasses[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group flex min-h-24 w-full items-start gap-3 rounded-lg border p-4 text-left transition",
        selected ? toneClasses.selected : toneClasses.unselected,
      ].join(" ")}
    >
      {Icon ? (
        <span
          className={[
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center transition",
            selected ? toneClasses.iconSelected : toneClasses.iconUnselected,
          ].join(" ")}
        >
          <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={2.4} />
        </span>
      ) : null}
      <span className="min-w-0">
        <span className="block break-words text-sm font-black uppercase leading-tight tracking-[0.08em] text-white">
          {label}
        </span>
        {sublabel ? (
          <span className="mt-2 block text-sm leading-6 text-slate-400">
            {sublabel}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function SeverityFace({
  className = "",
  mood,
}: {
  className?: string;
  mood: (typeof painSeverityOptions)[number]["mood"];
}) {
  const face = {
    happy: {
      bg: "from-emerald-200 via-cyan-200 to-sky-300",
      eyeY: 20,
      mouth: "M16 29 C20 36 32 36 36 29",
      browLeft: "M14 15 C17 13 20 13 23 15",
      browRight: "M29 15 C32 13 35 13 38 15",
    },
    soft: {
      bg: "from-cyan-200 via-sky-200 to-blue-300",
      eyeY: 20,
      mouth: "M17 30 C21 34 31 34 35 30",
      browLeft: "M14 16 C17 15 20 15 23 16",
      browRight: "M29 16 C32 15 35 15 38 16",
    },
    neutral: {
      bg: "from-yellow-100 via-amber-200 to-orange-300",
      eyeY: 21,
      mouth: "M17 31 L35 31",
      browLeft: "M14 16 L23 16",
      browRight: "M29 16 L38 16",
    },
    uneasy: {
      bg: "from-amber-200 via-orange-300 to-rose-300",
      eyeY: 21,
      mouth: "M16 35 C21 30 31 30 36 35",
      browLeft: "M14 16 L23 18",
      browRight: "M29 18 L38 16",
    },
    sad: {
      bg: "from-orange-200 via-rose-300 to-pink-400",
      eyeY: 22,
      mouth: "M15 37 C20 28 32 28 37 37",
      browLeft: "M14 17 L23 20",
      browRight: "M29 20 L38 17",
    },
  }[mood];

  return (
    <span
      className={[
        "inline-flex items-center justify-center rounded-full bg-gradient-to-br shadow-[0_0_0_4px_rgba(14,165,233,0.2),0_0_28px_rgba(125,211,252,0.38)] ring-1 ring-white/35",
        face.bg,
        className,
      ].join(" ")}
    >
      <svg
        aria-hidden="true"
        className="h-[78%] w-[78%] text-slate-950"
        fill="none"
        viewBox="0 0 52 52"
      >
        <path
          d={face.browLeft}
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="3.2"
        />
        <path
          d={face.browRight}
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="3.2"
        />
        <circle cx="19" cy={face.eyeY} fill="currentColor" r="2.8" />
        <circle cx="33" cy={face.eyeY} fill="currentColor" r="2.8" />
        <path
          d={face.mouth}
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="3.6"
        />
      </svg>
    </span>
  );
}

function SeveritySlider({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const selectedIndex = painSeverityOptions.findIndex(
    (option) => option.label === value,
  );
  const sliderIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const selectedOption = painSeverityOptions[sliderIndex];
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const sliderPosition =
    (sliderIndex / Math.max(painSeverityOptions.length - 1, 1)) * 100;
  const setSliderIndex = (index: number) => {
    const clampedIndex = Math.min(
      Math.max(index, 0),
      painSeverityOptions.length - 1,
    );
    onChange(painSeverityOptions[clampedIndex].label);
  };
  const setSliderFromClientX = (clientX: number, rect: DOMRect) => {
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    setSliderIndex(Math.round(ratio * (painSeverityOptions.length - 1)));
  };
  const isSliderActive = isDragging || isFocused;

  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/58 p-4">
      <div
        className={[
          "relative py-5 transition",
          isFocused ? "rounded-lg ring-2 ring-sky-300/60" : "",
        ].join(" ")}
      >
        <input
          type="range"
          min={0}
          max={painSeverityOptions.length - 1}
          step={1}
          value={sliderIndex}
          aria-label="Pain limitation severity"
          aria-valuetext={`${selectedOption.label}: ${selectedOption.note}`}
          onChange={(event) => setSliderIndex(Number(event.currentTarget.value))}
          onInput={(event) => setSliderIndex(Number(event.currentTarget.value))}
          onClick={(event) =>
            setSliderFromClientX(
              event.clientX,
              event.currentTarget.getBoundingClientRect(),
            )
          }
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            setIsDragging(false);
          }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setIsDragging(true);
            setSliderFromClientX(
              event.clientX,
              event.currentTarget.getBoundingClientRect(),
            );
          }}
          onPointerMove={(event) => {
            if (event.buttons !== 1) {
              return;
            }
            setSliderFromClientX(
              event.clientX,
              event.currentTarget.getBoundingClientRect(),
            );
          }}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture(event.pointerId);
            setIsDragging(false);
          }}
          onPointerCancel={() => setIsDragging(false)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowUp") {
              event.preventDefault();
              setSliderIndex(sliderIndex + 1);
            }
            if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
              event.preventDefault();
              setSliderIndex(sliderIndex - 1);
            }
            if (event.key === "Home") {
              event.preventDefault();
              setSliderIndex(0);
            }
            if (event.key === "End") {
              event.preventDefault();
              setSliderIndex(painSeverityOptions.length - 1);
            }
          }}
          className={[
            "assessment-severity-range relative z-10 h-12 w-full cursor-grab focus:outline-none active:cursor-grabbing",
            isSliderActive ? "assessment-severity-range--active" : "",
          ].join(" ")}
        />
        <div
          className={[
            "pointer-events-none absolute top-1/2 z-20 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center transition-all duration-300",
            isSliderActive
              ? "scale-110 opacity-100"
              : "scale-100 opacity-90",
          ].join(" ")}
          style={{ left: `${sliderPosition}%` }}
        >
          <SeverityFace
            className="h-12 w-12"
            mood={selectedOption.mood}
          />
        </div>
      </div>

      <div
        className={[
          "mt-1 rounded-lg border px-4 py-3 transition",
          selectedOption.selectedClass,
        ].join(" ")}
      >
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
          Current status
        </div>
        <div className="mt-2 flex items-center gap-3">
          <SeverityFace className="h-9 w-9 shrink-0" mood={selectedOption.mood} />
          <div>
            <div className="text-lg font-black uppercase leading-none tracking-[0.08em]">
              {selectedOption.label}
            </div>
            <div className="mt-1 text-sm font-bold text-slate-300">
              {selectedOption.note}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[11px] font-black uppercase leading-relaxed tracking-[0.17em] text-sky-300 sm:text-xs">
      {children}
    </div>
  );
}

function FormSection({
  children,
  eyebrow,
  Icon,
  title,
}: {
  children: React.ReactNode;
  eyebrow: string;
  Icon: LucideIcon;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/36 p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center text-sky-200 drop-shadow-[0_0_14px_rgba(125,211,252,0.35)]">
          <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={2.4} />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">
            {eyebrow}
          </div>
          <h3 className="mt-2 text-lg font-black uppercase tracking-[0.08em] text-white">
            {title}
          </h3>
        </div>
      </div>
      {children}
    </section>
  );
}

function TextInputField({
  autoComplete,
  errorText,
  helperText,
  inputMode,
  label,
  maxLength,
  name,
  onChange,
  pattern,
  placeholder,
  required = false,
  type = "text",
  value,
}: {
  autoComplete?: string;
  errorText?: string;
  helperText?: string;
  inputMode?: "decimal" | "email" | "none" | "numeric" | "search" | "tel" | "text" | "url";
  label: string;
  maxLength?: number;
  name?: string;
  onChange: (value: string) => void;
  pattern?: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value: string;
}) {
  const message = errorText || helperText;
  const hasValue = value.trim().length > 0;
  const isInvalid = Boolean(errorText);

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div
        className={[
          "group relative mt-2 overflow-hidden rounded-2xl border bg-slate-950/66 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_16px_34px_rgba(2,6,23,0.22)] transition duration-200",
          isInvalid
            ? "border-rose-300/55 focus-within:border-rose-300/85 focus-within:shadow-[0_0_0_3px_rgba(251,113,133,0.12)]"
            : hasValue
              ? "border-cyan-300/35 bg-cyan-950/18 focus-within:border-cyan-200/65 focus-within:shadow-[0_0_0_3px_rgba(34,211,238,0.1)]"
              : "border-white/10 hover:border-sky-300/30 focus-within:border-sky-300/60 focus-within:shadow-[0_0_0_3px_rgba(56,189,248,0.1)]",
        ].join(" ")}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(56,189,248,0.18),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.045),transparent)] opacity-70 transition group-focus-within:opacity-100"
        />
        <div
          aria-hidden="true"
          className={[
            "pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent to-transparent transition",
            isInvalid
              ? "via-rose-200/70"
              : hasValue
                ? "via-cyan-200/70"
                : "via-sky-300/45",
          ].join(" ")}
        />
        <input
          aria-invalid={isInvalid ? true : undefined}
          aria-required={required || undefined}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={maxLength}
          name={name}
          pattern={pattern}
          required={required}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="relative z-10 h-16 w-full bg-transparent px-4 text-base text-white outline-none transition placeholder:text-slate-500 group-focus-within:placeholder:text-slate-400"
        />
        <div className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent opacity-0 transition group-focus-within:opacity-100" />
      </div>
      {message ? (
        <p
          className={[
            "mt-2 text-xs font-bold leading-5",
            errorText ? "text-rose-200" : "text-slate-400",
          ].join(" ")}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

function DropdownSelect({
  ariaLabel,
  children,
  className = "",
  Icon = ChevronDown,
  label,
  onChange,
  placeholder,
  value,
}: {
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
  Icon?: LucideIcon;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const hasValue = value !== "";

  return (
    <div
      className={[
        "group relative min-w-0 overflow-hidden rounded-2xl border bg-slate-950/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_36px_rgba(2,6,23,0.24)] transition duration-200",
        hasValue
          ? "border-cyan-300/45 bg-cyan-950/26"
          : "border-white/10 hover:border-sky-300/35 hover:bg-slate-900/55",
        className,
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(56,189,248,0.2),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.045),transparent)] opacity-75 transition group-hover:opacity-100"
      />
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent transition",
          hasValue
            ? "via-cyan-200/70 to-transparent opacity-100"
            : "via-sky-300/35 to-transparent opacity-65",
        ].join(" ")}
      />
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute left-4 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center transition",
          hasValue
            ? "text-cyan-100 drop-shadow-[0_0_10px_rgba(125,211,252,0.35)]"
            : "text-slate-500 group-hover:text-sky-200",
        ].join(" ")}
      >
        <Icon className="h-4 w-4" strokeWidth={2.4} />
      </div>
      <div className="pointer-events-none absolute left-11 right-9 top-2.5 z-10 truncate text-[9px] font-black uppercase tracking-[0.18em] text-sky-300/80">
        {label}
      </div>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={[
          "relative z-10 h-[68px] w-full min-w-0 appearance-none bg-transparent pb-2 pl-11 pr-9 pt-7 text-xs font-black uppercase outline-none transition sm:text-sm",
          hasValue ? "text-white" : "text-slate-500 group-hover:text-slate-400",
        ].join(" ")}
      >
        <option value="" className="bg-slate-950 text-slate-400">
          {placeholder}
        </option>
        {children}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-slate-950/70 text-sky-200/70 transition group-focus-within:border-sky-300/45 group-focus-within:bg-sky-300/10 group-focus-within:text-sky-100">
        <ChevronDown
          aria-hidden="true"
          className="h-3.5 w-3.5"
          strokeWidth={2.4}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/55 to-transparent opacity-0 transition group-focus-within:opacity-100" />
    </div>
  );
}

function DateOfBirthDropdowns({
  birthDay,
  birthMonth,
  birthYear,
  onChange,
}: {
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  onChange: (part: "birthMonth" | "birthDay" | "birthYear", value: string) => void;
}) {
  const dayOptions = Array.from(
    { length: getDaysInBirthMonth(birthMonth, birthYear) },
    (_, index) => String(index + 1),
  );

  return (
    <div>
      <FieldLabel>Date of birth</FieldLabel>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,1fr)]">
        <DropdownSelect
          Icon={CalendarDays}
          ariaLabel="Birth month"
          label="Month"
          placeholder="Select"
          value={birthMonth}
          onChange={(value) => onChange("birthMonth", value)}
        >
          {birthMonthOptions.map((month) => (
            <option
              key={month.value}
              value={month.value}
              className="bg-slate-950 text-white"
            >
              {month.label.slice(0, 3)}
            </option>
          ))}
        </DropdownSelect>

        <DropdownSelect
          Icon={CalendarDays}
          ariaLabel="Birth day"
          label="Day"
          placeholder="Select"
          value={birthDay}
          onChange={(value) => onChange("birthDay", value)}
        >
          {dayOptions.map((day) => (
            <option key={day} value={day} className="bg-slate-950 text-white">
              {day}
            </option>
          ))}
        </DropdownSelect>

        <DropdownSelect
          className="col-span-2 xl:col-span-1"
          Icon={CalendarDays}
          ariaLabel="Birth year"
          label="Year"
          placeholder="Select"
          value={birthYear}
          onChange={(value) => onChange("birthYear", value)}
        >
          {birthYearOptions.map((year) => (
            <option key={year} value={year} className="bg-slate-950 text-white">
              {year}
            </option>
          ))}
        </DropdownSelect>
      </div>
    </div>
  );
}

function HeightDropdowns({
  feet,
  inches,
  onChange,
}: {
  feet: string;
  inches: string;
  onChange: (part: "heightFeet" | "heightInches", value: string) => void;
}) {
  return (
    <div>
      <FieldLabel>Height</FieldLabel>
      <div className="grid gap-3 sm:grid-cols-2">
        <DropdownSelect
          Icon={Ruler}
          ariaLabel="Height feet"
          label="Feet"
          placeholder="Select"
          value={feet}
          onChange={(value) => onChange("heightFeet", value)}
        >
          {heightFeetOptions.map((foot) => (
            <option key={foot} value={foot} className="bg-slate-950 text-white">
              {foot} ft
            </option>
          ))}
        </DropdownSelect>

        <DropdownSelect
          Icon={Ruler}
          ariaLabel="Height inches"
          label="Inches"
          placeholder="Select"
          value={inches}
          onChange={(value) => onChange("heightInches", value)}
        >
          {heightInchOptions.map((inch) => (
            <option key={inch} value={inch} className="bg-slate-950 text-white">
              {inch} in
            </option>
          ))}
        </DropdownSelect>
      </div>
    </div>
  );
}

function TextAreaField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  const hasValue = value.trim().length > 0;

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div
        className={[
          "group relative mt-2 overflow-hidden rounded-2xl border bg-slate-950/66 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_16px_34px_rgba(2,6,23,0.22)] transition duration-200",
          hasValue
            ? "border-cyan-300/35 bg-cyan-950/18 focus-within:border-cyan-200/65 focus-within:shadow-[0_0_0_3px_rgba(34,211,238,0.1)]"
            : "border-white/10 hover:border-sky-300/30 focus-within:border-sky-300/60 focus-within:shadow-[0_0_0_3px_rgba(56,189,248,0.1)]",
        ].join(" ")}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(56,189,248,0.16),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)] opacity-70 transition group-focus-within:opacity-100"
        />
        <div
          aria-hidden="true"
          className={[
            "pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent to-transparent transition",
            hasValue ? "via-cyan-200/70" : "via-sky-300/45",
          ].join(" ")}
        />
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="relative z-10 min-h-32 w-full resize-y bg-transparent px-4 py-4 text-base leading-7 text-white outline-none transition placeholder:text-slate-500 group-focus-within:placeholder:text-slate-400"
        />
        <div className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent opacity-0 transition group-focus-within:opacity-100" />
      </div>
    </div>
  );
}

function ChoiceGroup({
  columns = "md:grid-cols-2",
  onChange,
  options,
  value,
}: {
  columns?: string;
  onChange: (value: string) => void;
  options: ChoiceOption[];
  value: string;
}) {
  return (
    <div className={["grid gap-3", columns].join(" ")}>
      {options.map(({ Icon, label, sublabel, tone }) => (
        <CardOption
          key={label}
          Icon={Icon}
          label={label}
          sublabel={sublabel}
          tone={tone}
          selected={value === label}
          onClick={() => onChange(label)}
        />
      ))}
    </div>
  );
}

function SlimChoiceGroup({
  columns = "sm:grid-cols-2",
  onChange,
  options,
  value,
}: {
  columns?: string;
  onChange: (value: string) => void;
  options: ChoiceOption[];
  value: string;
}) {
  return (
    <div className={["grid gap-2", columns].join(" ")}>
      {options.map(({ Icon = Sparkles, label, tone = "sky" }) => {
        const selected = value === label;
        const toneClasses = cardToneClasses[tone];

        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(label)}
            className={[
              "group flex min-h-12 items-center gap-2 rounded-lg border px-3 py-2 text-left transition",
              selected ? toneClasses.selected : toneClasses.unselected,
            ].join(" ")}
          >
            <Icon
              aria-hidden="true"
              className={[
                "h-4 w-4 shrink-0 transition",
                selected ? toneClasses.iconSelected : toneClasses.iconUnselected,
              ].join(" ")}
              strokeWidth={2.4}
            />
            <span className="min-w-0 break-words text-xs font-black uppercase leading-tight tracking-[0.08em] text-white">
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MultiChoiceGroup({
  columns = "md:grid-cols-2",
  onToggle,
  options,
  values,
}: {
  columns?: string;
  onToggle: (value: string) => void;
  options: ChoiceOption[];
  values: string[];
}) {
  return (
    <div className={["grid gap-3", columns].join(" ")}>
      {options.map(({ Icon = Sparkles, label, sublabel, tone = "sky" }) => {
        const selected = values.includes(label);
        const toneClasses = cardToneClasses[tone];

        return (
          <button
            key={label}
            type="button"
            onClick={() => onToggle(label)}
            className={[
              "group flex min-h-20 w-full items-start gap-3 rounded-lg border p-4 text-left transition",
              selected ? toneClasses.selected : toneClasses.unselected,
            ].join(" ")}
          >
            <span
              className={[
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center transition",
                selected ? toneClasses.iconSelected : toneClasses.iconUnselected,
              ].join(" ")}
            >
              {selected ? (
                <Check aria-hidden="true" className="h-5 w-5" strokeWidth={2.5} />
              ) : (
                <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={2.4} />
              )}
            </span>
            <span className="min-w-0">
              <span className="block break-words text-sm font-black uppercase leading-tight tracking-[0.08em] text-white">
                {label}
              </span>
              {sublabel ? (
                <span className="mt-2 block text-sm leading-6 text-slate-400">
                  {sublabel}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function AvailabilityGrid({
  onSetSlot,
  selectedSlots,
}: {
  onSetSlot: (value: string, selected: boolean) => void;
  selectedSlots: string[];
}) {
  const [dragMode, setDragMode] = useState<boolean | null>(null);

  const applySlotFromPoint = (clientX: number, clientY: number) => {
    if (dragMode === null) {
      return;
    }

    const target = document.elementFromPoint(clientX, clientY);
    const slotButton =
      target instanceof Element
        ? target.closest<HTMLButtonElement>("button[data-slot-key]")
        : null;

    if (slotButton?.dataset.slotKey) {
      onSetSlot(slotButton.dataset.slotKey, dragMode);
    }
  };

  return (
    <div
      className="rounded-lg border border-sky-400/25 bg-slate-950/55 p-3 shadow-[0_18px_55px_rgba(14,165,233,0.08)]"
      data-availability-grid="true"
      onPointerCancel={() => setDragMode(null)}
      onPointerLeave={() => setDragMode(null)}
      onPointerMove={(event) => applySlotFromPoint(event.clientX, event.clientY)}
      onPointerUp={() => setDragMode(null)}
    >
      <div className="flex flex-col gap-2 border-b border-white/10 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <CalendarClock
            aria-hidden="true"
            className="h-4 w-4 text-cyan-300"
            strokeWidth={2.4}
          />
          <span>Click or drag across 30-minute windows that could work.</span>
        </div>
        <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">
          {selectedSlots.length} selected
        </span>
      </div>

      <div className="mt-3 max-h-[34rem] overflow-x-hidden overflow-y-auto pr-1">
        <div className="grid w-full grid-cols-7 gap-1">
          {availabilityDays.map((day) => (
            <div
              key={day}
              className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]"
            >
              <div className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/95 px-1 py-2 text-center">
                <span className="text-[8px] font-black uppercase tracking-[0.08em] text-sky-200 sm:text-[9px] lg:text-[10px]">
                  <span className="sm:hidden">{day.slice(0, 3)}</span>
                  <span className="hidden sm:inline">{day}</span>
                </span>
              </div>
              <div className="grid gap-1 p-1">
                {availabilityTimeSlots.map((slot) => {
                  const key = `${day}|${slot.value}`;
                  const selected = selectedSlots.includes(key);

                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={selected}
                      data-day={day}
                      data-slot-key={key}
                      data-time={slot.value}
                      onClick={(event) => {
                        if (event.detail === 0) {
                          onSetSlot(key, !selected);
                        }
                      }}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        const nextSelected = !selected;

                        setDragMode(nextSelected);
                        onSetSlot(key, nextSelected);
                      }}
                      onPointerEnter={() => {
                        if (dragMode !== null) {
                          onSetSlot(key, dragMode);
                        }
                      }}
                      className={[
                        "min-h-7 select-none rounded-md border px-0.5 py-1 text-center text-[8px] font-black uppercase tracking-[0.02em] transition sm:text-[9px]",
                        selected
                          ? "border-cyan-200/70 bg-cyan-300/20 text-cyan-50 shadow-[0_0_16px_rgba(34,211,238,0.2)]"
                          : "border-white/8 bg-slate-950/75 text-slate-400 hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-cyan-50",
                      ].join(" ")}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScaleChoiceGroup({
  highLabel,
  lowLabel,
  onChange,
  value,
}: {
  highLabel: string;
  lowLabel: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const [isSliderActive, setIsSliderActive] = useState(false);
  const scaleValue = Number(value || "5");
  const selectedValue = Number.isFinite(scaleValue)
    ? Math.min(Math.max(scaleValue, 1), 10)
    : 5;
  const sliderPercent = ((selectedValue - 1) / 9) * 100;
  const currentLabel = value
    ? selectedValue <= 3
      ? lowLabel
      : selectedValue >= 8
        ? highLabel
        : "Middle range"
    : "Slide to choose";
  const scaleTrackStyle = {
    "--scale-percent": `${sliderPercent}%`,
  } as CSSProperties & { "--scale-percent": string };
  const setScaleValue = (nextValue: number) => {
    const clampedValue = Math.min(Math.max(Math.round(nextValue), 1), 10);
    onChange(String(clampedValue));
  };
  const setScaleFromClientX = (clientX: number, rect: DOMRect) => {
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    setScaleValue(1 + ratio * 9);
  };

  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/50 p-4">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>

      <div className="relative mt-4 h-14">
        <div className="pointer-events-none absolute inset-x-4 top-1/2 z-0 flex -translate-y-1/2 justify-between">
          {Array.from({ length: 10 }, (_, index) => (
            <span
              key={index}
              className={[
                "h-1.5 w-1.5 rounded-full border transition",
                index + 1 <= selectedValue
                  ? "border-cyan-100/60 bg-cyan-100"
                  : "border-white/15 bg-slate-950",
              ].join(" ")}
            />
          ))}
        </div>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={selectedValue}
          aria-label={`${lowLabel} to ${highLabel}`}
          aria-valuetext={value ? `${selectedValue} out of 10` : "Not selected"}
          onChange={(event) => setScaleValue(Number(event.currentTarget.value))}
          onInput={(event) => setScaleValue(Number(event.currentTarget.value))}
          style={scaleTrackStyle}
          onFocus={() => setIsSliderActive(true)}
          onBlur={() => setIsSliderActive(false)}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setIsSliderActive(true);
            setScaleFromClientX(
              event.clientX,
              event.currentTarget.getBoundingClientRect(),
            );
          }}
          onPointerMove={(event) => {
            if (event.buttons !== 1) {
              return;
            }
            setScaleFromClientX(
              event.clientX,
              event.currentTarget.getBoundingClientRect(),
            );
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
            setIsSliderActive(false);
          }}
          onPointerCancel={() => setIsSliderActive(false)}
          className={[
            "assessment-scale-range absolute inset-x-0 top-1/2 z-10 h-10 w-full -translate-y-1/2 cursor-grab focus:outline-none active:cursor-grabbing",
            isSliderActive ? "assessment-scale-range--active" : "",
          ].join(" ")}
        />
      </div>

      <div className="rounded-lg border border-sky-300/20 bg-sky-400/10 px-4 py-3">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-200/70">
          Current answer
        </div>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div className="text-3xl font-black leading-none text-white">
            {value ? selectedValue : "--"}
            <span className="ml-1 text-sm text-slate-400">/10</span>
          </div>
          <div className="text-sm font-black uppercase tracking-[0.12em] text-sky-100">
            {currentLabel}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AssessmentPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [showStepErrors, setShowStepErrors] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const progress = useMemo(
    () => Math.round(((step + 1) / steps.length) * 100),
    [step],
  );
  const activeStep = steps[step];
  const ActiveStepIcon = activeStep.Icon;

  const setValue = (key: keyof FormState, value: string) => {
    setIsSubmitted(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  const toggleArrayValue = (key: ArrayFieldKey, value: string) => {
    setIsSubmitted(false);
    setForm((prev) => {
      const current = prev[key] ?? [];
      const nextValues = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      return { ...prev, [key]: nextValues };
    });
  };
  const setAvailabilitySlot = (value: string, selected: boolean) => {
    setIsSubmitted(false);
    setForm((prev) => {
      const current = prev.availabilitySlots ?? [];
      const alreadySelected = current.includes(value);

      if (alreadySelected === selected) {
        return prev;
      }

      return {
        ...prev,
        availabilitySlots: selected
          ? [...current, value]
          : current.filter((item) => item !== value),
      };
    });
  };
  const setBirthDatePart = (
    part: "birthMonth" | "birthDay" | "birthYear",
    value: string,
  ) => {
    setIsSubmitted(false);
    setForm((prev) => {
      const nextBirthDate = {
        birthDay: part === "birthDay" ? value : prev.birthDay,
        birthMonth: part === "birthMonth" ? value : prev.birthMonth,
        birthYear: part === "birthYear" ? value : prev.birthYear,
      };
      const daysInMonth = getDaysInBirthMonth(
        nextBirthDate.birthMonth,
        nextBirthDate.birthYear,
      );

      if (
        nextBirthDate.birthDay &&
        Number(nextBirthDate.birthDay) > daysInMonth
      ) {
        nextBirthDate.birthDay = String(daysInMonth);
      }

      return {
        ...prev,
        ...nextBirthDate,
        dateOfBirth: composeDateOfBirth(nextBirthDate),
      };
    });
  };
  const setHeightPart = (
    part: "heightFeet" | "heightInches",
    value: string,
  ) => {
    setIsSubmitted(false);
    setForm((prev) => {
      const heightFeet = part === "heightFeet" ? value : prev.heightFeet;
      const heightInches = part === "heightInches" ? value : prev.heightInches;

      return {
        ...prev,
        heightFeet,
        heightInches,
        height: composeHeight(heightFeet, heightInches),
      };
    });
  };
  const setPhoneField = (key: "emergencyPhone" | "phone", value: string) =>
    setValue(key, formatPhoneNumber(value));
  const setCityNeighborhoodChoice = (value: string) => {
    setIsSubmitted(false);
    setForm((prev) => ({
      ...prev,
      cityNeighborhood: value,
      cityNeighborhoodOther:
        value === "Other" ? prev.cityNeighborhoodOther : "",
    }));
  };
  const phoneError =
    form.phone && !isValidPhoneNumber(form.phone)
      ? "Enter a valid 10-digit phone number with area code."
      : undefined;
  const emergencyPhoneError =
    form.emergencyPhone && !isValidPhoneNumber(form.emergencyPhone)
      ? "Enter a valid 10-digit phone number with area code."
      : undefined;
  const stepValidationIssues = useMemo(
    () => getStepValidationIssues(step, form),
    [form, step],
  );
  const hasStepValidationIssues = stepValidationIssues.length > 0;
  const visibleStepIssues = stepValidationIssues.slice(0, 6);
  const hiddenStepIssueCount = Math.max(stepValidationIssues.length - 6, 0);
  const next = () => {
    if (hasStepValidationIssues) {
      setShowStepErrors(true);
      return;
    }

    setShowStepErrors(false);
    setStep((value) => Math.min(value + 1, steps.length - 1));
  };
  const submitAssessment = () => {
    if (hasStepValidationIssues) {
      setShowStepErrors(true);
      setIsSubmitted(false);
      return;
    }

    setShowStepErrors(false);
    setIsSubmitted(true);
  };
  const back = () => {
    setShowStepErrors(false);
    setStep((value) => Math.max(value - 1, 0));
  };
  const selectedTrainingPlaces = form.trainingPlaces ?? defaultTrainingPlaces;
  const answerSummaryItems = useMemo(
    () => {
      const legalName = `${form.firstName} ${form.lastName}`.trim();
      const displayName =
        form.preferredName || legalName || "Name pending";
      const contactDetail =
        form.contactMethod || form.email || form.phone || "Contact pending";
      const goalDetail =
        form.goalTimeline ||
        (form.goalImportance
          ? `${form.goalImportance}/10 importance`
          : "Timeline pending");
      const bodyValue =
        form.currentPain === "No"
          ? "No current pain noted"
          : isPainSelected(form)
            ? `${form.painSeverity || "Pain"}: ${formatSummaryList(
                form.painAreas,
                "area pending",
              )}`
            : "Body context pending";
      const bodyDetail =
        form.healthNotes || form.painNotes
          ? "Notes added for coach review"
          : "Health details pending";
      const scheduleValue =
        form.availabilitySlots.length > 0
          ? `${form.availabilitySlots.length} time window${
              form.availabilitySlots.length === 1 ? "" : "s"
            }`
          : form.sessionsPerWeek ||
            formatSummaryList(selectedTrainingPlaces, "Schedule pending");
      const scheduleDetail =
        form.serviceInterests.length > 0
          ? formatSummaryList(form.serviceInterests, "Service pending")
          : formatSummaryList(selectedTrainingPlaces, "Location pending");

      return [
        {
          Icon: UserRound,
          detail: contactDetail,
          label: "Contact",
          value: displayName,
        },
        {
          Icon: Target,
          detail: goalDetail,
          label: "Goals",
          value: formatSummaryList(form.goal, "Goals pending"),
        },
        {
          Icon: HeartPulse,
          detail: bodyDetail,
          label: "Body",
          value: bodyValue,
        },
        {
          Icon: CalendarDays,
          detail: scheduleDetail,
          label: "Schedule",
          value: scheduleValue,
        },
      ];
    },
    [form, selectedTrainingPlaces],
  );

  const recommendation = useMemo(() => {
    const goal =
      form.goal.length > 0 ? form.goal.join(" + ") : "Strength + mobility";
    const sessions = form.sessionsPerWeek || "2x per week";
    const place =
      selectedTrainingPlaces.length > 0
        ? selectedTrainingPlaces.join(" + ")
        : "In-home";
    const painArea =
      form.painAreas.length > 0
        ? form.painAreas.join(", ").toLowerCase()
        : "";

    return {
      title: `${sessions} ${goal} plan`,
      subtitle: `${place} coaching with a focus on consistency, pain-aware progress, and a realistic starting point.`,
      bullets: [
        painArea
          ? `Programming should respect ${painArea} limitations while rebuilding confidence gradually.`
          : "Programming can start with a broad full-body approach and build momentum quickly.",
        form.experience === "Beginner"
          ? "Your first phase should emphasize simple movement patterns, clear coaching cues, and manageable volume."
          : "Your first phase can move into structured progression and progress tracking sooner.",
        `A ${sessions} rhythm is the strongest initial fit based on your answers.`,
      ],
    };
  }, [form, selectedTrainingPlaces]);

  return (
    <main className="min-h-screen overflow-x-clip bg-[#020713] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_14%_0%,rgba(14,165,233,0.22),transparent_32%),radial-gradient(circle_at_88%_10%,rgba(250,204,21,0.12),transparent_28%),linear-gradient(180deg,#020713_0%,#07111f_52%,#020713_100%)]" />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#020713]/78 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-3 sm:px-8 md:flex-row md:items-center md:justify-between">
          <Link
            href={ROUTES.public.home}
            className="group flex min-w-0 items-center justify-center gap-3 text-center md:justify-start md:text-left"
          >
            <Image
              src="/sound-fitness-logo.png"
              alt="Sound Fitness"
              width={56}
              height={56}
              className="h-16 w-16 shrink-0 object-contain transition duration-300 group-hover:scale-105 sm:h-20 sm:w-20"
            />

            <div className="min-w-0">
              <div className="bg-gradient-to-r from-white via-slate-200 to-sky-100 bg-clip-text text-2xl font-black uppercase leading-none tracking-[0.13em] text-transparent sm:text-3xl">
                Sound Fitness
              </div>
              <div className="mt-1 text-[9px] font-black uppercase leading-none tracking-[0.2em] text-sky-300 sm:text-[10px]">
                In-home training & assisted stretch
              </div>
              <div className="mt-2 h-px w-full bg-gradient-to-r from-sky-400 via-amber-200 to-transparent opacity-70" />
              <div className="mt-2 inline-flex rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-sky-100">
                In-home training + app
              </div>
            </div>
          </Link>

          <div className="w-full md:w-auto">
            <UserMenu />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-10">
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl border border-sky-300/28 bg-[linear-gradient(135deg,rgba(8,22,41,0.94),rgba(5,13,29,0.88)_52%,rgba(12,41,68,0.8))] shadow-[0_34px_110px_rgba(2,6,23,0.46)]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(125,211,252,0.11),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.045),transparent_42%),repeating-linear-gradient(90deg,rgba(148,163,184,0.045)_0_1px,transparent_1px_96px)]" />
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
            <div className="relative grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.46fr)] lg:items-stretch lg:p-6">
              <div className="flex min-w-0 flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-sky-100">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    In-home pre-assessment
                  </div>

                  <h1 className="mt-4 max-w-4xl bg-gradient-to-r from-white via-sky-100 to-cyan-100 bg-clip-text text-4xl font-black uppercase leading-[0.92] tracking-tight text-transparent sm:text-5xl lg:text-6xl">
                    Start with the right first session.
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                    Share your goals, limitations, space, schedule, and training
                    history so the first in-home session starts with context.
                  </p>
                </div>
                <div className="mt-6 max-w-3xl">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    <span>Progress</span>
                    <span className="text-sky-100">{progress}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-amber-200 shadow-[0_0_24px_rgba(34,211,238,0.24)] transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-400">
                    <span>
                      Step {step + 1} of {steps.length}
                    </span>
                    <span>Private intake</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/48 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_60px_rgba(2,6,23,0.28)]">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-300/24 bg-sky-400/10 text-sky-100 shadow-[0_0_28px_rgba(14,165,233,0.16)]">
                    <ActiveStepIcon
                      aria-hidden="true"
                      className="h-7 w-7"
                      strokeWidth={2.35}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">
                      Current step
                    </div>
                    <div className="mt-1 text-2xl font-black uppercase leading-none tracking-[0.06em] text-white">
                      {activeStep.label}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {activeStep.helper}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.18em]">
                    <span className="text-sky-300">Answer summary</span>
                    <span className="text-slate-500">Updates live</span>
                  </div>
                  <div className="mt-3 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-slate-950/48">
                    {answerSummaryItems.map(({ detail, Icon, label, value }) => {
                      const SummaryIcon = Icon;

                      return (
                        <div
                          key={label}
                          className="flex items-start gap-3 px-3 py-3"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center text-sky-100 drop-shadow-[0_0_12px_rgba(125,211,252,0.34)]">
                            <SummaryIcon
                              aria-hidden="true"
                              className="h-5 w-5"
                              strokeWidth={2.35}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                              {label}
                            </div>
                            <div className="mt-1 break-words text-sm font-black leading-5 text-white">
                              {value}
                            </div>
                            <div className="mt-0.5 break-words text-xs font-bold leading-5 text-slate-400">
                              {detail}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative border-t border-white/10 bg-slate-950/20 p-3 sm:p-4">
              <div
                aria-label="Assessment progress"
                className="grid grid-cols-2 gap-2 md:grid-cols-5"
                role="list"
              >
                {steps.map(({ label, Icon }, index) => {
                  const isCurrent = index === step;
                  const isComplete = index < step;

                  return (
                    <div
                      key={label}
                      aria-current={isCurrent ? "step" : undefined}
                      role="listitem"
                      className={[
                        "flex min-h-12 cursor-default items-center justify-center gap-2 rounded-xl border px-3 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition",
                        isCurrent
                          ? "border-sky-300/55 bg-sky-400/14 shadow-[0_0_26px_rgba(14,165,233,0.14)]"
                          : isComplete
                            ? "border-emerald-300/28 bg-emerald-400/10"
                            : "border-white/10 bg-slate-950/54",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "flex h-5 w-5 shrink-0 items-center justify-center",
                          isCurrent
                            ? "text-sky-100 drop-shadow-[0_0_12px_rgba(125,211,252,0.42)]"
                            : isComplete
                              ? "text-emerald-200 drop-shadow-[0_0_10px_rgba(110,231,183,0.34)]"
                              : "text-slate-500",
                        ].join(" ")}
                      >
                        {isComplete ? (
                          <Check aria-hidden="true" className="h-4 w-4" />
                        ) : (
                          <Icon aria-hidden="true" className="h-4 w-4" />
                        )}
                      </span>
                      <span className="min-w-0 break-words text-[11px] font-black uppercase leading-tight tracking-[0.08em] text-white">
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <section className="min-w-0">
            <div className="rounded-lg border border-white/10 bg-white/[0.045] shadow-[0_28px_80px_rgba(2,6,23,0.28)] backdrop-blur">
              <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center text-sky-100 drop-shadow-[0_0_14px_rgba(125,211,252,0.45)]">
                    <ActiveStepIcon
                      aria-hidden="true"
                      className="h-7 w-7"
                      strokeWidth={2.4}
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">
                      Step {step + 1} of {steps.length}
                    </div>
                    <div className="mt-1 text-xl font-black uppercase tracking-[0.06em] text-white">
                      {activeStep.label}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-300/8 px-3 py-2 text-xs font-bold leading-5 text-emerald-100">
                  <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                  Private intake details
                </div>
              </div>

              <div className="p-5 lg:p-7">{renderStep()}</div>

              <div className="border-t border-white/10 p-5">
                {showStepErrors && hasStepValidationIssues ? (
                  <div
                    aria-live="polite"
                    className="mb-4 rounded-2xl border border-amber-200/28 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50 shadow-[0_18px_48px_rgba(2,6,23,0.2)]"
                  >
                    <div className="flex items-start gap-3">
                      <CircleAlert
                        aria-hidden="true"
                        className="mt-0.5 h-5 w-5 shrink-0 text-amber-200"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-black uppercase tracking-[0.16em] text-amber-100">
                          Finish these before continuing
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {visibleStepIssues.map(({ detail, label }) => (
                            <div
                              key={`${label}-${detail ?? ""}`}
                              className="rounded-xl border border-white/10 bg-slate-950/36 px-3 py-2"
                            >
                              <div className="font-black text-white">
                                {label}
                              </div>
                              {detail ? (
                                <div className="mt-1 text-xs font-bold text-amber-100/75">
                                  {detail}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                        {hiddenStepIssueCount > 0 ? (
                          <div className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-amber-100/75">
                            + {hiddenStepIssueCount} more required item
                            {hiddenStepIssueCount === 1 ? "" : "s"}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={back}
                    disabled={step === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black uppercase tracking-[0.1em] text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                    Back
                  </button>

                  {step < steps.length - 1 ? (
                    <button
                      type="button"
                      data-required-pending={hasStepValidationIssues}
                      onClick={next}
                      className={[
                        "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-black uppercase tracking-[0.1em] text-white shadow-[0_0_30px_rgba(14,165,233,0.28)] transition",
                        hasStepValidationIssues
                          ? "bg-sky-500 hover:bg-sky-400"
                          : "bg-emerald-500 hover:bg-emerald-400",
                      ].join(" ")}
                    >
                      Continue
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={submitAssessment}
                      disabled={isSubmitted}
                      className={[
                        "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-black uppercase tracking-[0.1em] text-white shadow-[0_0_30px_rgba(14,165,233,0.28)] transition",
                        isSubmitted
                          ? "cursor-default bg-emerald-500/80"
                          : "bg-sky-500 hover:bg-sky-400",
                      ].join(" ")}
                    >
                      <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                      {isSubmitted ? "Submitted" : "Submit pre-assessment"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );

  function renderStep() {
    if (step === 0) {
      return (
        <div className="space-y-5">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-300">
              Welcome + contact
            </p>
            <h2 className="mt-2 text-3xl font-black uppercase leading-none sm:text-4xl">
              Start with the basics.
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-300">
              This gives us the right person, the right place, and the right
              first conversation before we plan the session.
            </p>
          </div>

          <FormSection eyebrow="Section 1 of 14" Icon={Sparkles} title="Welcome">
            <div className="space-y-5">
              <div>
                <FieldLabel>
                  Before we get started, do you agree to complete this form
                  honestly and to the best of your ability?
                </FieldLabel>
                <ChoiceGroup
                  columns="sm:grid-cols-2"
                  options={[
                    { label: "Yes, I agree", Icon: CheckCircle2, tone: "emerald" },
                    { label: "No", Icon: CircleAlert, tone: "rose" },
                  ]}
                  value={form.welcomeAgreement}
                  onChange={(value) => setValue("welcomeAgreement", value)}
                />
              </div>

              <div>
                <FieldLabel>How did you hear about Sound Fitness?</FieldLabel>
                <ChoiceGroup
                  columns="sm:grid-cols-2 xl:grid-cols-4"
                  options={referralOptions}
                  value={form.referralSource}
                  onChange={(value) => setValue("referralSource", value)}
                />
              </div>

              {form.referralSource === "Other" ? (
                <TextInputField
                  label="Other"
                  value={form.referralOther}
                  onChange={(value) => setValue("referralOther", value)}
                  placeholder="Tell us where you found us"
                />
              ) : null}
            </div>
          </FormSection>

          <FormSection
            eyebrow="Section 2 of 14"
            Icon={Mail}
            title="Contact information"
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <TextInputField
                label="First name"
                value={form.firstName}
                onChange={(value) => setValue("firstName", value)}
                placeholder="First name"
              />
              <TextInputField
                label="Last name"
                value={form.lastName}
                onChange={(value) => setValue("lastName", value)}
                placeholder="Last name"
              />
              <TextInputField
                label="Preferred name (if different)"
                value={form.preferredName}
                onChange={(value) => setValue("preferredName", value)}
                placeholder="Preferred name"
              />
              <TextInputField
                label="Email address"
                type="email"
                value={form.email}
                onChange={(value) => setValue("email", value)}
                placeholder="you@example.com"
              />
              <TextInputField
                label="Phone number"
                autoComplete="tel"
                errorText={phoneError}
                helperText={
                  form.phone
                    ? "Use a 10-digit number with area code."
                    : "Required. Include area code, e.g. (206) 555-0198."
                }
                inputMode="tel"
                maxLength={14}
                name="phone"
                pattern="^\([2-9]\d{2}\) [2-9]\d{2}-\d{4}$"
                required
                type="tel"
                value={form.phone}
                onChange={(value) => setPhoneField("phone", value)}
                placeholder="(206) 555-0198"
              />
              <div>
                <FieldLabel>Best contact method</FieldLabel>
                <SlimChoiceGroup
                  columns="grid-cols-1 sm:grid-cols-3"
                  options={contactMethodOptions}
                  value={form.contactMethod}
                  onChange={(value) => setValue("contactMethod", value)}
                />
              </div>
              <TextInputField
                label="Home address (apartment or condo name)"
                value={form.homeAddress}
                onChange={(value) => setValue("homeAddress", value)}
                placeholder="Address or building name"
              />
              <div>
                <FieldLabel>City / neighborhood</FieldLabel>
                <DropdownSelect
                  Icon={MapPinned}
                  ariaLabel="City or neighborhood"
                  label="Area"
                  placeholder="Select area"
                  value={form.cityNeighborhood}
                  onChange={setCityNeighborhoodChoice}
                >
                  {cityNeighborhoodOptions.map((option) => (
                    <option
                      key={option}
                      value={option}
                      className="bg-slate-950 text-white"
                    >
                      {option}
                    </option>
                  ))}
                </DropdownSelect>
                {form.cityNeighborhood === "Other" ? (
                  <div className="mt-3">
                    <TextInputField
                      label="Other city / neighborhood"
                      value={form.cityNeighborhoodOther}
                      onChange={(value) =>
                        setValue("cityNeighborhoodOther", value)
                      }
                      placeholder="Enter your city, neighborhood, or service area"
                      required
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </FormSection>

          <FormSection
            eyebrow="Section 3 of 14"
            Icon={UserRound}
            title="Basic information"
          >
            <div className="grid gap-5">
              <DateOfBirthDropdowns
                birthDay={form.birthDay}
                birthMonth={form.birthMonth}
                birthYear={form.birthYear}
                onChange={setBirthDatePart}
              />

              <HeightDropdowns
                feet={form.heightFeet}
                inches={form.heightInches}
                onChange={setHeightPart}
              />

              <div>
                <FieldLabel>Gender (if you&apos;d prefer to share)</FieldLabel>
                <SlimChoiceGroup
                  columns="sm:grid-cols-2 xl:grid-cols-4"
                  options={genderOptions}
                  value={form.gender}
                  onChange={(value) => setValue("gender", value)}
                />
              </div>
            </div>
          </FormSection>

          <FormSection
            eyebrow="Section 4 of 14"
            Icon={Phone}
            title="Emergency contact"
          >
            <div className="grid gap-5 md:grid-cols-3">
              <TextInputField
                label="Emergency contact name"
                value={form.emergencyName}
                onChange={(value) => setValue("emergencyName", value)}
                placeholder="Name"
              />
              <TextInputField
                label="Relationship to you"
                value={form.emergencyRelationship}
                onChange={(value) => setValue("emergencyRelationship", value)}
                placeholder="Relationship"
              />
              <TextInputField
                label="Emergency contact phone number"
                autoComplete="tel"
                errorText={emergencyPhoneError}
                helperText={
                  form.emergencyPhone
                    ? "Use a 10-digit number with area code."
                    : "Include area code, e.g. (206) 555-0198."
                }
                inputMode="tel"
                maxLength={14}
                name="emergencyPhone"
                pattern="^\([2-9]\d{2}\) [2-9]\d{2}-\d{4}$"
                type="tel"
                value={form.emergencyPhone}
                onChange={(value) => setPhoneField("emergencyPhone", value)}
                placeholder="(206) 555-0198"
              />
            </div>
          </FormSection>

          <FormSection
            eyebrow="Section 5 of 14"
            Icon={Target}
            title="Goals and expectations"
          >
            <div className="space-y-5">
              <div>
                <FieldLabel>
                  Which of these best describes your goals? Select all that
                  apply.
                </FieldLabel>
                <MultiChoiceGroup
                  columns="md:grid-cols-2 xl:grid-cols-3"
                  options={goalOptions}
                  values={form.goal}
                  onToggle={(value) => toggleArrayValue("goal", value)}
                />
              </div>

              <div>
                <FieldLabel>
                  How soon would you like to start seeing noticeable progress?
                </FieldLabel>
                <ChoiceGroup
                  columns="sm:grid-cols-2 xl:grid-cols-4"
                  options={progressTimelineOptions}
                  value={form.goalTimeline}
                  onChange={(value) => setValue("goalTimeline", value)}
                />
              </div>

              <div>
                <FieldLabel>
                  On a scale from 1-10, how important is it for you to reach
                  these goals?
                </FieldLabel>
                <ScaleChoiceGroup
                  lowLabel="Not important"
                  highLabel="Very important"
                  value={form.goalImportance}
                  onChange={(value) => setValue("goalImportance", value)}
                />
              </div>

              <TextAreaField
                label="Biggest barrier"
                value={form.struggle}
                onChange={(value) => setValue("struggle", value)}
                placeholder="What has been getting in your way lately?"
              />
            </div>
          </FormSection>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="space-y-5">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-300">
              Body context
            </p>
            <h2 className="mt-2 text-3xl font-black uppercase leading-none sm:text-4xl">
              What does your body need us to respect?
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-300">
              Pain, soreness, and limitations change exercise selection,
              coaching cues, and the pace of progression.
            </p>
          </div>

          <FormSection
            eyebrow="Section 7 of 14"
            Icon={Stethoscope}
            title="Health & medical screening"
          >
            <div className="space-y-5">
              <div className="rounded-lg border border-amber-200/20 bg-amber-200/8 p-4 text-sm leading-6 text-amber-50">
                This is not a medical diagnosis. Please consult your doctor
                before starting any exercise program if you have concerns.
              </div>

              <div>
                <FieldLabel>
                  Have you ever been told by a doctor that you have a heart
                  condition or should only do physical activity recommended by a
                  doctor?
                </FieldLabel>
                <ChoiceGroup
                  columns="sm:grid-cols-2"
                  options={yesNoOptions}
                  value={form.heartCondition}
                  onChange={(value) => setValue("heartCondition", value)}
                />
              </div>

              <div>
                <FieldLabel>Do you feel chest pain during physical activity?</FieldLabel>
                <ChoiceGroup
                  columns="sm:grid-cols-2"
                  options={yesNoOptions}
                  value={form.chestPain}
                  onChange={(value) => setValue("chestPain", value)}
                />
              </div>

              <div>
                <FieldLabel>
                  Do you ever feel dizzy, lose balance, or lose consciousness?
                </FieldLabel>
                <ChoiceGroup
                  columns="sm:grid-cols-2"
                  options={yesNoOptions}
                  value={form.dizzyOrFaint}
                  onChange={(value) => setValue("dizzyOrFaint", value)}
                />
              </div>

              <div>
                <FieldLabel>
                  Do you have any diagnosed medical conditions? Select all that
                  apply.
                </FieldLabel>
                <MultiChoiceGroup
                  columns="sm:grid-cols-2 xl:grid-cols-3"
                  options={medicalConditionOptions}
                  values={form.medicalConditions}
                  onToggle={(value) => toggleArrayValue("medicalConditions", value)}
                />
              </div>

              <div>
                <FieldLabel>
                  Are you currently taking any medications that might affect
                  exercise?
                </FieldLabel>
                <ChoiceGroup
                  columns="sm:grid-cols-2"
                  options={yesNoOptions}
                  value={form.medicationsAffect}
                  onChange={(value) => setValue("medicationsAffect", value)}
                />
              </div>

              <TextAreaField
                label="If yes, please list your medications and what they're for (optional)."
                value={form.medicationsList}
                onChange={(value) => setValue("medicationsList", value)}
                placeholder="Medication notes"
              />

              <div>
                <FieldLabel>Have you had any surgeries in the past 5 years?</FieldLabel>
                <ChoiceGroup
                  columns="sm:grid-cols-2"
                  options={yesNoOptions}
                  value={form.recentSurgery}
                  onChange={(value) => setValue("recentSurgery", value)}
                />
              </div>

              <TextAreaField
                label="If yes, please briefly describe the surgery and the year."
                value={form.surgeryDetails}
                onChange={(value) => setValue("surgeryDetails", value)}
                placeholder="Surgery details and year"
              />

              <TextAreaField
                label="Is there anything about your health your trainer should know before planning your program?"
                value={form.healthNotes}
                onChange={(value) => setValue("healthNotes", value)}
                placeholder="Health notes, concerns, or context"
              />
            </div>
          </FormSection>

          <FormSection
            eyebrow="Section 8 of 14"
            Icon={ScanHeart}
            title="Pain, injuries & limitations"
          >
            <div className="space-y-5">
              <div>
                <FieldLabel>Do you currently have any pain or injuries?</FieldLabel>
                <ChoiceGroup
                  columns="sm:grid-cols-3"
                  options={currentPainOptions}
                  value={form.currentPain}
                  onChange={(value) => setValue("currentPain", value)}
                />
              </div>

              <div>
                <FieldLabel>
                  If yes, where do you feel pain or limitations? Select all that
                  apply.
                </FieldLabel>
                <MultiChoiceGroup
                  columns="sm:grid-cols-2 xl:grid-cols-4"
                  options={painAreaOptions}
                  values={form.painAreas}
                  onToggle={(value) => toggleArrayValue("painAreas", value)}
                />
              </div>

              <div>
                <FieldLabel>Pain / limitation severity</FieldLabel>
                <SeveritySlider
                  value={form.painSeverity}
                  onChange={(value) => setValue("painSeverity", value)}
                />
              </div>

              <TextAreaField
                label="Please describe your pain/injuries, what makes them better or worse, and any guidance you've received from a doctor or PT."
                value={form.painNotes}
                onChange={(value) => setValue("painNotes", value)}
                placeholder="Pain, injury, PT, or doctor guidance"
              />
            </div>
          </FormSection>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-5">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-300">
              Training background
            </p>
            <h2 className="mt-2 text-3xl font-black uppercase leading-none sm:text-4xl">
              Where are you starting from?
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-300">
              Experience and confidence help decide how much structure,
              teaching, and intensity belongs in the first phase.
            </p>
          </div>

          <FormSection
            eyebrow="Section 6 of 14"
            Icon={GraduationCap}
            title="Training experience"
          >
            <div className="space-y-5">
              <div>
                <FieldLabel>
                  How would you describe your current fitness level?
                </FieldLabel>
                <ChoiceGroup
                  columns="md:grid-cols-2"
                  options={fitnessLevelOptions}
                  value={form.fitnessLevel}
                  onChange={(value) => setValue("fitnessLevel", value)}
                />
              </div>

              <div>
                <FieldLabel>
                  Have you worked with a personal trainer or coach before?
                </FieldLabel>
                <ChoiceGroup
                  columns="sm:grid-cols-2 xl:grid-cols-4"
                  options={trainerExperienceOptions}
                  value={form.trainerExperience}
                  onChange={(value) => setValue("trainerExperience", value)}
                />
              </div>

              <TextAreaField
                label="If yes, what did you like or dislike about past training experiences?"
                value={form.trainerFeedback}
                onChange={(value) => setValue("trainerFeedback", value)}
                placeholder="What worked, what didn't, and what you want this to feel like"
              />

              <div>
                <FieldLabel>
                  What types of training have you done recently? Select all that
                  apply.
                </FieldLabel>
                <MultiChoiceGroup
                  columns="sm:grid-cols-2 xl:grid-cols-3"
                  options={recentTrainingOptions}
                  values={form.recentTraining}
                  onToggle={(value) => toggleArrayValue("recentTraining", value)}
                />
              </div>

              <div>
                <FieldLabel>On average, how many days per week are you active?</FieldLabel>
                <ChoiceGroup
                  columns="sm:grid-cols-2 xl:grid-cols-5"
                  options={activeDaysOptions}
                  value={form.activeDays}
                  onChange={(value) => setValue("activeDays", value)}
                />
              </div>

              <div>
                <FieldLabel>Experience level</FieldLabel>
                <div className="grid gap-3 md:grid-cols-3">
                  {experienceOptions.map(({ label, Icon, sublabel, tone }) => (
                    <CardOption
                      key={label}
                      Icon={Icon}
                      label={label}
                      sublabel={sublabel}
                      tone={tone}
                      selected={form.experience === label}
                      onClick={() => setValue("experience", label)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <FieldLabel>Movement confidence</FieldLabel>
                <div className="grid gap-3 md:grid-cols-3">
                  {confidenceOptions.map(({ label, Icon, tone }) => (
                    <CardOption
                      key={label}
                      Icon={Icon}
                      label={label}
                      tone={tone}
                      selected={form.confidence === label}
                      onClick={() => setValue("confidence", label)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <FieldLabel>Age range</FieldLabel>
                <div className="grid gap-3 md:grid-cols-4">
                  {ageRangeOptions.map(({ label, Icon, tone }) => (
                    <CardOption
                      key={label}
                      Icon={Icon}
                      label={label}
                      tone={tone}
                      selected={form.ageRange === label}
                      onClick={() => setValue("ageRange", label)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection
            eyebrow="Section 9 of 14"
            Icon={BedDouble}
            title="Lifestyle & routine"
          >
            <div className="space-y-5">
              <div>
                <FieldLabel>What best describes your job / daily routine?</FieldLabel>
                <ChoiceGroup
                  columns="sm:grid-cols-2 xl:grid-cols-4"
                  options={jobRoutineOptions}
                  value={form.jobRoutine}
                  onChange={(value) => setValue("jobRoutine", value)}
                />
              </div>

              <div>
                <FieldLabel>
                  How many hours of sleep do you get on most nights?
                </FieldLabel>
                <ChoiceGroup
                  columns="sm:grid-cols-2 xl:grid-cols-5"
                  options={sleepOptions}
                  value={form.sleepHours}
                  onChange={(value) => setValue("sleepHours", value)}
                />
              </div>

              <div>
                <FieldLabel>
                  How would you rate your average daily stress level?
                </FieldLabel>
                <ScaleChoiceGroup
                  lowLabel="Very low"
                  highLabel="Very high"
                  value={form.stressLevel}
                  onChange={(value) => setValue("stressLevel", value)}
                />
              </div>

              <TextAreaField
                label="What does a typical day look like for you?"
                value={form.typicalDay}
                onChange={(value) => setValue("typicalDay", value)}
                placeholder="Work, family, commute, energy, and routine context"
              />
            </div>
          </FormSection>

          <FormSection
            eyebrow="Section 10 of 14"
            Icon={Salad}
            title="Nutrition & eating habits"
          >
            <div className="space-y-5">
              <div>
                <FieldLabel>How would you describe your current eating habits?</FieldLabel>
                <ChoiceGroup
                  columns="sm:grid-cols-2"
                  options={eatingHabitOptions}
                  value={form.eatingHabits}
                  onChange={(value) => setValue("eatingHabits", value)}
                />
              </div>

              <div>
                <FieldLabel>
                  Do you have any dietary preferences or restrictions? Select
                  all that apply.
                </FieldLabel>
                <MultiChoiceGroup
                  columns="sm:grid-cols-2 xl:grid-cols-3"
                  options={dietaryRestrictionOptions}
                  values={form.dietaryRestrictions}
                  onToggle={(value) =>
                    toggleArrayValue("dietaryRestrictions", value)
                  }
                />
              </div>

              <div>
                <FieldLabel>Do you currently track your food?</FieldLabel>
                <ChoiceGroup
                  columns="sm:grid-cols-3"
                  options={foodTrackingOptions}
                  value={form.foodTracking}
                  onChange={(value) => setValue("foodTracking", value)}
                />
              </div>

              <div>
                <FieldLabel>
                  Is nutrition coaching something you&apos;re interested in as part
                  of your training?
                </FieldLabel>
                <ChoiceGroup
                  columns="sm:grid-cols-3"
                  options={nutritionInterestOptions}
                  value={form.nutritionInterest}
                  onChange={(value) => setValue("nutritionInterest", value)}
                />
              </div>
            </div>
          </FormSection>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-5">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-300">
              Schedule fit
            </p>
            <h2 className="mt-2 text-3xl font-black uppercase leading-none sm:text-4xl">
              What fits your real week?
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-300">
              The best plan is the one that can survive your schedule, commute,
              energy, and home setup.
            </p>
          </div>

          <FormSection
            eyebrow="Section 11 of 14"
            Icon={Home}
            title="Training logistics"
          >
            <div className="space-y-5">
              <div>
                <FieldLabel>Training location / where will we primarily train?</FieldLabel>
                <MultiChoiceGroup
                  columns="sm:grid-cols-2 xl:grid-cols-4"
                  options={trainingLocationOptions}
                  values={selectedTrainingPlaces}
                  onToggle={(value) => toggleArrayValue("trainingPlaces", value)}
                />
              </div>

              <div>
                <FieldLabel>
                  What equipment do you currently have access to? Select all
                  that apply.
                </FieldLabel>
                <MultiChoiceGroup
                  columns="sm:grid-cols-2 xl:grid-cols-4"
                  options={equipmentOptions}
                  values={form.equipment}
                  onToggle={(value) => toggleArrayValue("equipment", value)}
                />
              </div>

              <div>
                <FieldLabel>Best day and time windows</FieldLabel>
                <AvailabilityGrid
                  selectedSlots={form.availabilitySlots}
                  onSetSlot={setAvailabilitySlot}
                />
              </div>

              <TextAreaField
                label="Schedule notes"
                value={form.daysAvailable}
                onChange={(value) => setValue("daysAvailable", value)}
                placeholder="Anything flexible, recurring, or easier to explain in words?"
              />

              <div>
                <FieldLabel>
                  How many sessions per week are you ideally looking for?
                </FieldLabel>
                <ChoiceGroup
                  columns="sm:grid-cols-2 xl:grid-cols-5"
                  options={sessionOptions}
                  value={form.sessionsPerWeek}
                  onChange={(value) => setValue("sessionsPerWeek", value)}
                />
              </div>

              <div>
                <FieldLabel>Are you interested in: select all that apply</FieldLabel>
                <MultiChoiceGroup
                  columns="sm:grid-cols-2"
                  options={serviceInterestOptions}
                  values={form.serviceInterests}
                  onToggle={(value) =>
                    toggleArrayValue("serviceInterests", value)
                  }
                />
              </div>
            </div>
          </FormSection>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="max-w-3xl">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">
            {isSubmitted ? "Pre-assessment submitted" : "Ready for review"}
          </p>
          <h2 className="mt-2 text-3xl font-black uppercase leading-none sm:text-4xl">
            {isSubmitted
              ? "We will reach out within 2 business days."
              : "Submit your pre-assessment."}
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-300">
            Your answers give us the context we need to plan the first in-home
            session. The member app is included with in-home training, so there
            is nothing to purchase here.
          </p>
        </div>

        <FormSection
          eyebrow="Section 12 of 14"
          Icon={Gauge}
          title="Readiness & commitment"
        >
          <div className="space-y-5">
            <TextAreaField
              label="What do you think has held you back from reaching your goals in the past?"
              value={form.struggle}
              onChange={(value) => setValue("struggle", value)}
              placeholder="Habits, schedule, pain, motivation, confidence, or anything else"
            />

            <div>
              <FieldLabel>
                On a scale of 1-10, how ready are you to make changes to your
                habits over the next 3-6 months?
              </FieldLabel>
              <ScaleChoiceGroup
                lowLabel="Not ready yet"
                highLabel="All in"
                value={form.readinessScore}
                onChange={(value) => setValue("readinessScore", value)}
              />
            </div>

            <TextAreaField
              label="Is there anything you'd like your coach to know about your personality, learning style, or how you like to be coached?"
              value={form.coachingStyle}
              onChange={(value) => setValue("coachingStyle", value)}
              placeholder="Direct, supportive, detailed, visual, accountability-focused, etc."
            />
          </div>
        </FormSection>

        <FormSection
          eyebrow="Section 13 of 14"
          Icon={ShieldCheck}
          title="Agreements & acknowledgements"
        >
          <div className="space-y-5">
            <div>
              <FieldLabel>
                By training with Sound Fitness, you acknowledge that physical
                exercise carries some risk and you agree to communicate pain,
                discomfort, or concerns during any session. This form does not
                replace medical advice. Please consult your doctor before
                starting a new exercise program if you have any medical
                concerns.
              </FieldLabel>
              <ChoiceGroup
                columns="grid-cols-1"
                options={[
                  {
                    label: "Yes, I agree and understand",
                    Icon: ShieldCheck,
                    tone: "emerald",
                  },
                ]}
                value={form.riskAgreement}
                onChange={(value) => setValue("riskAgreement", value)}
              />
            </div>

            <div>
              <FieldLabel>
                I understand that results depend on my effort, consistency, and
                lifestyle, and no specific outcome can be guaranteed.
              </FieldLabel>
              <ChoiceGroup
                columns="grid-cols-1"
                options={[
                  {
                    label: "Yes, I agree and understand",
                    Icon: BadgeCheck,
                    tone: "emerald",
                  },
                ]}
                value={form.resultsAgreement}
                onChange={(value) => setValue("resultsAgreement", value)}
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          eyebrow="Section 14 of 14"
          Icon={ClipboardCheck}
          title="Final notes & signature"
        >
          <div className="space-y-5">
            <TextAreaField
              label="Is there anything else you'd like to share before we get started?"
              value={form.finalNotes}
              onChange={(value) => setValue("finalNotes", value)}
              placeholder="Anything else you want your coach to know"
            />

            <div className="grid gap-5 md:grid-cols-2">
              <TextInputField
                label="Type your full name as your digital signature confirming that all information provided is accurate to the best of your knowledge."
                value={form.signature}
                onChange={(value) => setValue("signature", value)}
                placeholder="Digital signature"
              />
              <TextInputField
                label="Today's date"
                type="date"
                value={form.signatureDate}
                onChange={(value) => setValue("signatureDate", value)}
              />
            </div>
          </div>
        </FormSection>

        {isSubmitted ? (
          <>
            <div className="rounded-lg border border-emerald-300/22 bg-emerald-300/10 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
                    Submitted
                  </div>
                  <div className="mt-3 text-3xl font-black uppercase leading-none text-white">
                    We will reach out within 2 business days.
                  </div>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-emerald-50/85">
                    Sound Fitness will review your pre-assessment and contact
                    you about scheduling, next steps, and the app access
                    included with your in-home training.
                  </p>
                </div>
                <CheckCircle2
                  aria-hidden="true"
                  className="h-10 w-10 shrink-0 text-emerald-300"
                />
              </div>
            </div>

            <div className="rounded-lg border border-sky-400/20 bg-sky-500/10 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">
                    First-session starting point
                  </div>
                  <div className="mt-3 text-3xl font-black uppercase leading-none text-white">
                    {recommendation.title}
                  </div>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-slate-100">
                    {recommendation.subtitle}
                  </p>
                </div>
                <CheckCircle2
                  aria-hidden="true"
                  className="h-10 w-10 shrink-0 text-emerald-300"
                />
              </div>
            </div>

            <div className="grid gap-3">
              {recommendation.bullets.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-lg border border-white/10 bg-slate-950/58 px-4 py-4 text-sm leading-7 text-slate-200"
                >
                  <Check
                    aria-hidden="true"
                    className="mt-1 h-4 w-4 shrink-0 text-cyan-300"
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    );
  }
}
