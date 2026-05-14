import { asRecord } from "@/lib/profile-storage";

export type BodyModel = "male" | "female";

export const defaultBodyModel: BodyModel = "male";

export const bodyModelOptions: Array<{
  description: string;
  id: BodyModel;
  label: string;
}> = [
  {
    id: "male",
    label: "Male",
    description: "Use the male anatomy figure across heat maps and muscle views.",
  },
  {
    id: "female",
    label: "Female",
    description: "Use the female anatomy figure across heat maps and muscle views.",
  },
];

export function normalizeBodyModel(value: unknown): BodyModel {
  return typeof value === "string" && value.toLowerCase() === "female"
    ? "female"
    : defaultBodyModel;
}

export function getBodyModelFromProfile(profile: unknown): BodyModel {
  const record = asRecord(profile);

  return normalizeBodyModel(
    record.gender || record.bodyModel || record.anatomyBodyModel || record.bodyType,
  );
}

export function getBodyModelLabel(bodyModel: BodyModel) {
  return bodyModel === "female" ? "Female" : "Male";
}
