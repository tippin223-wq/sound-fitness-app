import { Info } from "lucide-react";
import type { NewsPhotoCredit as Credit } from "@/lib/localData/newsPhotos";
import styles from "./HeroMeterCards.module.css";

export default function NewsPhotoCredit({ credit }: { credit?: Credit }) {
  if (!credit) return null;
  return <details className={styles.newsPhotoCredit}>
    <summary aria-label="Photo attribution"><Info aria-hidden="true" size={13} /></summary>
    <div>Photo: <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer">{credit.author}</a><br /><a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer">{credit.license}</a></div>
  </details>;
}
