import { newsArticleLibrary } from "./newsArticleLibrary";
import { newsArticlePhoto, newsPhotoCredit } from "./newsPhotos";

/** Original weekly editorial summaries. Sources checked November 7, 2026. */
const weeklyNewsSeed = [
 {id:"weekly-2026-11-07-training",kind:"world",topic:"training",tone:"cyan",title:"Build a week you can repeat",summary:"Combine strength work with aerobic activity. CDC guidance recommends strengthening on at least two days and 150 minutes of moderate aerobic activity across the week. Start with a manageable schedule and build gradually.",image:"/news/strength-training.jpg",imageAlt:"Athlete preparing a barbell lift on a gym floor",publishedAt:"2026-11-07T09:00:00-08:00",source:"CDC · Adult activity guidance",sourceUrl:"https://www.cdc.gov/physical-activity-basics/guidelines/adults.html"},
 {id:"weekly-2026-11-07-nutrition",kind:"world",topic:"nutrition",tone:"emerald",title:"Make your next meal easier to get right",summary:"Plan a few dependable meals before the week starts. Include varied protein foods, vegetables or fruit, and fiber-rich whole grains. Keep simple ingredients ready for busy days.",image:"/news/balanced-nutrition.jpg",imageAlt:"Fresh meal with eggs, avocado, leafy greens and vegetables",publishedAt:"2026-11-07T08:55:00-08:00",source:"CDC · Healthier meals and snacks",sourceUrl:"https://www.cdc.gov/healthy-weight-growth/healthy-eating/meals-snacks.html"},
 {id:"weekly-2026-11-07-recovery",kind:"world",topic:"recovery",tone:"violet",title:"Give recovery a regular bedtime",summary:"A repeatable sleep schedule is a practical recovery habit. NHLBI recommends consistent bed and wake times, a quiet wind-down, and a cool, dark bedroom. Choose one small change to repeat this week.",image:"/news/sleep-recovery.jpg",imageAlt:"Calm bedroom with soft bedding and warm lighting",publishedAt:"2026-11-07T08:50:00-08:00",source:"NHLBI · Healthy sleep habits",sourceUrl:"https://www.nhlbi.nih.gov/health/sleep-deprivation/healthy-sleep-habits"},
 ...newsArticleLibrary,
] as const;

export const weeklyNews = weeklyNewsSeed.map(item => {
  const photo = newsArticlePhoto(item.id);
  return { ...item, image: photo?.image ?? item.image, imageAlt: photo?.alt ?? item.imageAlt, photoCredit: photo ? newsPhotoCredit(photo) : undefined };
});
