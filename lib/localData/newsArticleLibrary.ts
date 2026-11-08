/** Original educational briefs, researched November 7, 2026; not breaking-news reports.
 * Each entry links to the primary guidance behind its practical takeaway.
 * Events are deliberately excluded: those require actual business records.
 */
const sources = {
  activity: ["CDC", "https://www.cdc.gov/physical-activity-basics/guidelines/adults.html"],
  starting: ["NIH · NIDDK", "https://www.niddk.nih.gov/health-information/weight-management/tips-get-active/tips-starting-physical-activity"],
  benefits: ["CDC", "https://www.cdc.gov/physical-activity-basics/benefits/index.html"],
  intensity: ["CDC", "https://www.cdc.gov/physical-activity-basics/measuring/"],
  meals: ["CDC", "https://www.cdc.gov/healthy-weight-growth/healthy-eating/meals-snacks.html"],
  nutrition: ["CDC", "https://www.cdc.gov/nutrition/features/healthy-eating-tips.html"],
  sleep: ["NIH · NHLBI", "https://www.nhlbi.nih.gov/health/sleep-deprivation/healthy-sleep-habits"],
  sleepQuality: ["CDC", "https://www.cdc.gov/sleep/about/index.html"],
  watch: ["Apple Support", "https://support.apple.com/en-us/105002"],
  calibration: ["Apple Support", "https://support.apple.com/en-us/105048"],
  wellness: ["FDA", "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/general-wellness-policy-low-risk-devices"],
  barriers: ["CDC", "https://www.cdc.gov/physical-activity-basics/overcoming-barriers/"],
  moving: ["NIH · NIDDK", "https://www.niddk.nih.gov/health-information/weight-management/tips-get-active/tips-keep-moving"],
} as const;

type Brief = readonly [slug: string, title: string, summary: string, source: keyof typeof sources];
const library = [
  { topic: "training", tone: "cyan", image: "/news/strength-training.jpg", imageAlt: "Athlete preparing a barbell lift on a gym floor", stories: [
    ["short-sessions", "Short sessions still belong in your training week", "Activity can be split into smaller blocks. A busy day does not have to become a missed week: look for a manageable opening and get moving.", "activity"],
    ["strength-days", "Give strength its own place on the calendar", "Adult activity guidance includes muscle-strengthening work on at least two days weekly. Schedule those sessions alongside aerobic activity so neither part gets overlooked.", "activity"],
    ["whole-body", "Think beyond your favorite muscle group", "A balanced strength routine covers legs, hips, back, abdomen, chest, shoulders and arms. Review your week for areas that your usual exercise choices leave out.", "activity"],
    ["aerobic-mix", "Your cardio week can include different activities", "Brisk walking, running and other aerobic activities can contribute to your weekly activity. Choose a combination you enjoy instead of relying on one format every day.", "activity"],
    ["gradual-start", "Start with a session you can repeat", "Begin with a manageable amount of activity and build gradually. A realistic starting point gives you something repeatable before you add more time or effort.", "starting"],
    ["bands", "Resistance bands deserve a place in your toolkit", "Strength work does not require a full gym. Resistance bands provide another way to work your muscles when your available equipment or training space is limited.", "starting"],
    ["specific-goal", "Turn an exercise intention into a specific plan", "Choose an activity, a day and a time. A goal you can actually schedule is easier to act on than a general promise to exercise more.", "starting"],
    ["movement-break", "Break up the hours between workouts", "A scheduled workout is only one part of an active day. Add short movement breaks during long stretches at a desk or in front of a screen.", "starting"],
    ["progression", "Progress can mean another controlled repetition", "Strengthening work supports muscles and everyday function. Increase repetitions or resistance gradually, giving yourself time to adapt rather than chasing a larger jump every session.", "benefits"],
  ] satisfies readonly Brief[] },
  { topic: "nutrition", tone: "emerald", image: "/news/balanced-nutrition.jpg", imageAlt: "Fresh meal with eggs, avocado, leafy greens and vegetables", stories: [
    ["protein-variety", "Keep more than one protein option in rotation", "Eggs, seafood, beans, lentils and other protein foods offer variety. Plan a few options you enjoy so your meals do not depend on the same ingredient.", "meals"],
    ["freezer", "Make the freezer part of your meal plan", "Frozen vegetables and fruit can be practical staples. Look for options without added sugar and with less sodium, then keep them ready for quick meals.", "meals"],
    ["whole-grains", "Give your usual grain a whole-grain alternative", "Fiber-rich whole grains can fit into familiar meals. Try a whole-grain option you like and make it an easy repeat purchase for your kitchen.", "meals"],
    ["menu", "Check the menu before you arrive", "Looking at a restaurant menu in advance gives you time to choose. Decide on an appealing meal before a rushed order makes the choice for you.", "meals"],
    ["color", "Add another color to your next meal", "Different vegetables and fruits bring variety to your plate. Add peppers, leafy greens or tomatoes to a familiar dish instead of rebuilding your entire menu.", "nutrition"],
    ["breakfast", "Give plain yogurt a fruit topping", "Unsweetened yogurt with fruit is one simple breakfast or snack option. Build flavor with ingredients you enjoy while keeping an eye on added sugars.", "nutrition"],
    ["herbs", "Use herbs to make simple food more appealing", "Fresh herbs can add flavor and variety to salads and cooked dishes. Keep a small amount ready so familiar meals stay interesting through the week.", "nutrition"],
    ["vegetables", "Let vegetables join meals you already make", "Diced vegetables work in omelets and stews. Start with a dish already in your routine and add one vegetable rather than waiting for a perfect recipe.", "nutrition"],
    ["repeatable", "Build an eating pattern that fits your budget", "Healthy eating can reflect your preferences and budget. Choose nutrient-dense foods you can buy and prepare consistently; an expensive shopping list is not the goal.", "nutrition"],
  ] satisfies readonly Brief[] },
  { topic: "recovery", tone: "violet", image: "/news/sleep-recovery.jpg", imageAlt: "Calm bedroom with soft bedding and warm lighting", stories: [
    ["wind-down", "Make the hour before bed a quieter one", "Use the lead-up to bedtime for a calmer routine. Reduce bright screens and intense activity so your evening gives you room to settle down.", "sleep"],
    ["weekends", "Keep the weekend from resetting your sleep schedule", "Large shifts in bedtime and wake time can disrupt your rhythm. Try to keep weekends close to your usual schedule instead of starting over each Monday.", "sleep"],
    ["caffeine", "Late caffeine can follow you into bedtime", "Caffeine can affect sleep for hours. If settling down is difficult, review the timing of afternoon coffee, tea and other caffeinated drinks.", "sleep"],
    ["bedroom", "Give your bedroom a recovery-friendly reset", "A quiet, cool and dark bedroom supports healthy sleep habits. Check light, noise and temperature before adding another complicated step to your evening routine.", "sleep"],
    ["naps", "Keep naps from taking over your night", "If naps make falling asleep harder, try taking them earlier and keeping them short. Notice whether the change helps your usual bedtime feel easier.", "sleep"],
    ["quality", "Hours asleep are only part of the picture", "Sleep quality matters alongside duration. Repeated waking and feeling tired after enough time in bed are worth noticing rather than judging recovery by hours alone.", "sleepQuality"],
    ["diary", "A simple sleep diary can reveal your routine", "Record bedtime, waking, naps and caffeine timing. A short diary gives you concrete details to review and can help a healthcare provider understand persistent sleep problems.", "sleepQuality"],
    ["screens", "Create a screen-free buffer before sleep", "CDC guidance suggests turning off electronic devices at least 30 minutes before bed. Choose a quiet alternative you enjoy so the change is easier to maintain.", "sleepQuality"],
    ["persistent", "Know when sleep needs more than a routine change", "Persistent trouble sleeping deserves a conversation with a healthcare provider. Healthy habits are useful, but ongoing sleep problems may need evaluation beyond a new bedtime routine.", "sleepQuality"],
  ] satisfies readonly Brief[] },
  { topic: "gear", tone: "violet", image: "/news/fitness-watch.jpg", imageAlt: "Two silver watches with white straps on a light background", stories: [
    ["watch-fit", "Check watch fit before blaming the sensor", "A comfortable, secure fit helps wrist sensors work. Keep the watch against the top of your wrist without overtightening.", "watch"],
    ["workout-mode", "Choose the workout mode that matches your session", "Workout modes use different inputs. Select the closest activity type, such as an indoor run for a treadmill session.", "watch"],
    ["profile", "Your tracker needs current personal details", "Apple Watch uses profile details in activity calculations. Review those details when they change instead of leaving an old setup untouched.", "watch"],
    ["calibration", "Calibration is worth checking before a pace comparison", "Apple recommends calibration to improve distance, pace and calorie measurements. Follow its device-specific steps before comparing training records.", "calibration"],
    ["wrist-detection", "Missing background readings? Check Wrist Detection", "Turning Wrist Detection off stops background heart-rate readings on Apple Watch. Check that setting when expected records disappear.", "watch"],
    ["cold", "Cold weather can complicate wrist heart-rate readings", "Cold can reduce blood flow near the wrist and affect optical readings. A missing measurement does not describe your effort.", "watch"],
    ["motion", "Some movements are harder for wrist sensors to read", "Apple notes that irregular movements can affect readings. Tennis and boxing may be harder to capture than rhythmic running or cycling.", "watch"],
    ["chest-strap", "An external heart-rate sensor is another option", "For inconsistent wrist readings, Apple supports compatible Bluetooth heart-rate monitors. Check device compatibility before choosing an external sensor.", "watch"],
    ["wellness", "Wellness tracking and medical diagnosis have different jobs", "FDA guidance distinguishes general wellness functions from disease-related medical uses. Read what a feature is intended to do before treating its output as a diagnosis.", "wellness"],
    ["claims", "Look past the headline on a health-tech feature", "A product's intended use matters. Check its documentation for the exact claim: encouraging healthy habits is different from diagnosing or treating a health condition.", "wellness"],
  ] satisfies readonly Brief[] },
  { topic: "sports", tone: "sky", image: "/news/sports-court.jpg", imageAlt: "Basketball dropping through a hoop", stories: [
    ["tennis", "Singles and doubles tennis can ask different things of you", "CDC lists doubles tennis as moderate activity and singles as vigorous. Use how hard you are actually working to put your own session in context.", "intensity"],
    ["swimming", "A relaxed swim and lap training are different sessions", "Recreational swimming and swimming laps appear in different intensity examples. Track the session you performed rather than assuming every pool visit represents the same effort.", "intensity"],
    ["cycling", "Your cycling pace changes the training demand", "Cycling intensity depends on how you ride. An easy ride on level ground and a faster effort should not automatically receive the same training description.", "intensity"],
    ["talk-test", "Use the talk test during your next aerobic session", "At moderate effort you can generally talk but not sing. At vigorous effort, speaking more than a few words usually requires a breathing pause.", "intensity"],
    ["relative-effort", "The same pace does not mean the same effort", "Relative intensity depends on fitness. A pace that feels moderate to one person can feel vigorous to another, so record your own experience too.", "intensity"],
    ["return", "Return to your sport with a manageable first session", "Even a familiar activity can feel different after time away. Start gradually and build back up rather than expecting the first session to match an old routine.", "moving"],
    ["enjoyment", "Try a sport you actually want to come back to", "Enjoyment matters when choosing activity. Consider a different class or sport if your current routine feels like a chore instead of assuming exercise must feel that way.", "starting"],
    ["beyond-score", "A session can matter beyond the final score", "Physical activity supports health as well as performance. A recreational session still has value when you are not chasing a personal best or a competitive result.", "benefits"],
    ["strength-support", "Keep strength work alongside your sport", "Muscle-strengthening activity helps maintain strength and muscle. Include it as part of your wider routine rather than assuming time spent playing covers every training need.", "benefits"],
    ["everyday", "Fitness has a role outside the playing field", "Regular activity also supports everyday function. Stairs, carrying groceries and other daily tasks are useful reminders that progress is bigger than a single sport-specific result.", "benefits"],
  ] satisfies readonly Brief[] },
  { topic: "community", tone: "amber", image: "/onboarding-location-outdoors-travel.jpg", imageAlt: "Athlete exercising", stories: [
    ["walking-friend", "Turn your next catch-up into a walk", "Social time can include movement. Invite a friend for an easy walk and choose a pace that lets both of you enjoy the conversation.", "barriers"],
    ["calendar-buddy", "Put a shared workout on both calendars", "A regular appointment with a friend gives your plan a concrete time. Agree on a manageable session and write it down together.", "barriers"],
    ["ask-support", "Tell your people what support would help", "Explain your activity goals to friends or family. A specific request, such as joining a walk or protecting your workout time, makes support easier.", "barriers"],
    ["group", "Find a group built around an activity you enjoy", "A local activity group can combine movement with meeting people. Look for an appropriate pace and format rather than choosing the toughest option available.", "barriers"],
    ["walking-meeting", "Try a walking meeting when the task allows it", "Some conversations do not need a desk. When it is practical and safe, a walking meeting can add movement without finding another opening in your schedule.", "barriers"],
    ["shared-progress", "Share a repeatable habit instead of a leaderboard", "Tracking what you did and how you felt can reveal progress. A conversation about those habits gives friends more to celebrate than a single score.", "moving"],
    ["weather", "Give your activity plans a weather backup", "A disrupted plan does not have to end your routine. Agree on an indoor alternative before poor weather makes the decision for your group.", "moving"],
    ["inclusive", "Make room for different ways to participate", "Activities can suit different interests and abilities. Seated exercise, accessible routes and varied formats give people more ways to find movement they enjoy.", "moving"],
    ["milestone", "Celebrate a milestone with another good experience", "A nonfood reward can mark progress. Consider a class, a recreation-center visit or another experience that helps you keep enjoying an active routine.", "moving"],
    ["restart", "Make restarting part of the plan", "Setbacks happen. Regroup around the next achievable session and offer the same encouragement to a friend who is returning after a gap.", "moving"],
  ] satisfies readonly Brief[] },
] as const;

const storyPhotos: Record<string, readonly [string, string]> = {
  "sports-tennis": ["/news/tennis.jpg", "Tennis player serving on a clay court"],
  "sports-swimming": ["/news/swimming.jpg", "Swimmer performing butterfly in a lap pool"],
  "sports-cycling": ["/news/cycling.jpg", "Road bicycle beside a dark wall"],
  "sports-talk-test": ["/news/cycling.jpg", "Road bicycle beside a dark wall"],
  "sports-relative-effort": ["/news/swimming.jpg", "Swimmer performing butterfly in a lap pool"],
  "training-aerobic-mix": ["/news/cycling.jpg", "Road bicycle beside a dark wall"],
};

export const newsArticleLibrary = library.flatMap(group => group.stories.map(([slug, title, summary, sourceKey], index) => ({
  id: `editorial-2026-11-07-${group.topic}-${slug}`,
  kind: "world" as const,
  topic: group.topic,
  tone: group.tone,
  title,
  summary,
  image: storyPhotos[`${group.topic}-${slug}`]?.[0] ?? group.image,
  imageAlt: storyPhotos[`${group.topic}-${slug}`]?.[1] ?? group.imageAlt,
  // Original publication date of these briefs, not the date of the source guidance.
  publishedAt: `2026-11-07T08:${String(40 - index).padStart(2, "0")}:00-08:00`,
  source: sources[sourceKey][0],
  sourceUrl: sources[sourceKey][1],
})));
