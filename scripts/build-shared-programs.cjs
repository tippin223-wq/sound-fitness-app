// Trusted authoring only. Generated JSON is committed and published once; clients never reroll it.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const definitions = [
  ['strength-foundations','Strength Foundations','strength',12,2,'Learn the main movement patterns','bodyweight, dumbbells','foundation'],
  ['balanced-strength','Balanced Strength','strength',12,3,'Build sustainable full-body strength','dumbbells, bench','strength'],
  ['muscle-building','Muscle Building','hypertrophy',12,4,'Build muscle with upper/lower sessions','dumbbells, machines','hypertrophy'],
  ['strength-maintenance','Strength Maintenance','strength',12,2,'Maintain strength alongside a busy schedule','dumbbells','strength'],
  ['barbell-foundations','Barbell Foundations','strength',12,3,'Develop squat, bench and deadlift technique','barbell, rack, safety arms','barbell'],
  ['strength-pr','Strength PR Preparation','pr',8,3,'Prepare for a controlled load personal best','barbell, rack, safety arms','barbell'],
  ['rep-pr','Rep PR Builder','pr',8,3,'Improve reps at a repeatable submaximal load','dumbbells','strength'],
  ['estimated-strength','Estimated Strength Progress','pr',8,3,'Track estimated strength without max attempts','barbell, rack','barbell'],
  ['cardio-foundations','Cardio Foundations','cardio',8,3,'Establish comfortable aerobic activity','walking route or cycle','cardio'],
  ['aerobic-base','Aerobic Base','cardio',12,4,'Build a consistent easy aerobic base','walking route or cycle','cardio'],
  ['run-walk-5k','Run / Walk 5K','cardio',8,3,'Build toward continuous comfortable running','running shoes, safe route','run'],
  ['running-endurance','Running Endurance','cardio',12,4,'Extend comfortable running duration','running shoes, safe route','run'],
  ['interval-conditioning','Interval Conditioning','cardio',8,3,'Add controlled intervals to an established base','cycle or rowing machine','interval'],
  ['5k-performance','5K Performance','pr',8,3,'Improve a repeatable timed 5K effort','running shoes, measured route','run'],
  ['mobility-foundations','Mobility Foundations','mobility',8,3,'Improve comfortable active range of motion','mat, wall','mobility'],
  ['recovery-rhythm','Recovery Rhythm','recovery',4,2,'Establish gentle movement and recovery habits','mat, walking route','mobility'],
  ['nutrition-maintenance','Nutrition Maintenance','nutrition',8,0,'Establish balanced meals around approved maintenance targets','','nutrition'],
  ['nutrition-fat-loss','Nutrition for Fat Loss','nutrition',12,0,'Build consistent habits around an individually approved energy target','','nutrition'],
  ['nutrition-muscle-gain','Nutrition for Muscle Gain','nutrition',12,0,'Support resistance training with consistent meals and approved targets','','nutrition'],
  ['nutrition-training-fuel','Training Fuel','nutrition',8,0,'Practice meals and hydration that support training','','nutrition'],
];
const strengthSessions = [
  [['Goblet squat', '8–12'],['Dumbbell bench press','8–12'],['Supported row','8–12'],['Romanian deadlift','8–12'],['Dead bug','6–10 / side']],
  [['Split squat','6–10 / side'],['Incline push-up','8–12'],['Lat pulldown','8–12'],['Glute bridge','10–15'],['Side plank','15–30 sec / side']],
  [['Step-up','6–10 / side'],['Dumbbell overhead press','8–12'],['Cable row','8–12'],['Hamstring curl','10–15'],['Farmer carry','20–30 sec']],
];
const barbellSessions = [
  [['Squat','5–8'],['Bench press','5–8'],['Supported row','8–12']],
  [['Deadlift','4–6'],['Overhead press','6–10'],['Lat pulldown','8–12']],
  [['Paused squat','5–8'],['Bench press','5–8'],['Romanian deadlift','8–10']],
];
const upperLower = [
  [['Dumbbell bench press','8–12'],['Supported row','8–12'],['Lateral raise','10–15'],['Cable triceps extension','10–15']],
  [['Goblet squat','8–12'],['Romanian deadlift','8–12'],['Split squat','8–12 / side'],['Calf raise','10–15']],
  [['Lat pulldown','8–12'],['Dumbbell overhead press','8–12'],['Incline dumbbell press','8–12'],['Dumbbell curl','10–15']],
  [['Leg press','8–12'],['Hamstring curl','10–15'],['Step-up','8–12 / side'],['Dead bug','6–10 / side']],
];
const phases = [
  'Foundation: use a comfortable starting dose, learn technique and record a baseline. Keep 2–3 repetitions in reserve.',
  'Build: repeat the same movements. Add repetitions within the range before adding the smallest practical load; never increase both at once.',
  'Consolidate: retain good technique and comfortable recovery. Reduce volume for fatigue, pain or disrupted sleep; review progress before the next plan.',
];
const programs = definitions.map(([id,title,category,weeks,sessionsPerWeek,goal,equipment,mode]) => {
  const activities=[];
  const add=(week,day,kind,name,points,prescription,exercises)=>activities.push({id:`${id}:v1:w${week}:d${day}:${kind}`,week,day,kind,title:name,points,prescription,...(exercises?{exercises}:{}),signal:{title:name,action:kind==='workout'?'Open session':kind==='meal'?'Log meal':kind==='hydration'?'Log hydration':kind==='review'?'Add weekly check-in':'Open activity',evidence:kind==='workout'?'Completed server-saved workout with recorded sets; linked to this activity':kind==='meal'?'Saved meal record for the scheduled day':kind==='hydration'?'Saved hydration record for the scheduled day':kind==='review'?'Saved weekly check-in':'Verified activity record; manual ticks do not award points'}});
  for(let week=1;week<=weeks;week++) {
    const phase=Math.min(2,Math.floor((week-1)*3/weeks));
    if(mode==='nutrition') {
      for(let day=1;day<=7;day++) {
        add(week,day,'meal','Balanced meal practice',25,'Use your saved, individually approved targets. Include a protein source, vegetables or fruit, and a suitable carbohydrate/fat source. Adapt for allergies and dietary preference. Logging more food does not earn more points.');
        add(week,day,'hydration','Hydration practice',25,'Follow your saved hydration target. Record actual intake; avoid forced overconsumption.');
      }
      add(week,7,'review','Weekly nutrition review',50,`${['Review meal regularity and tolerance.','Review training energy, appetite and adherence.','Review the trend with your coach; adjust approved targets if needed.'][phase]} No calorie target is generated from this catalog.`);
    } else {
      const days=sessionsPerWeek===2?[1,4]:sessionsPerWeek===3?[1,3,5]:[1,2,4,6];
      days.forEach((day,index)=>{
        let prescription,exercises;
        if(['foundation','strength','hypertrophy','barbell'].includes(mode)) {
          const source=mode==='barbell'?barbellSessions:mode==='hypertrophy'?upperLower:strengthSessions;
          exercises=source[index%source.length].map(([name,reps])=>({name,sets:phase===0?2:3,reps,restSeconds:mode==='barbell'?150:90}));
          prescription=`Warm up for 5–10 minutes, then perform comfortable practice sets. ${phases[phase]} Stop for sharp pain. No forced reps or unsupervised maximal attempts.`;
          if(category==='pr') prescription+=' Final week: repeat the baseline movement with the same setup. A PR is optional; use a controlled submaximal set and record load/reps, not a forced one-rep maximum.';
        } else if(mode==='mobility') {
          exercises=[['Cat-cow','6–8'],['Half-kneeling hip flexor movement','6–8 / side'],['Thoracic rotation','6–8 / side'],['Ankle rocks','8–10 / side'],['Easy walk','5–10 min']].map(([name,reps])=>({name,reps,sets:1,restSeconds:30}));
          prescription='Move slowly within comfortable active range. No ballistic or painful stretching. Use support for balance; record tolerance rather than forcing range.';
        } else {
          const minutes=(mode==='interval'?20:mode==='run'?15:10)+phase*5+(index===sessionsPerWeek-1?5:0);
          prescription=mode==='interval'?`5-minute easy warm-up, ${4+phase} rounds of 1 minute comfortably brisk / 2 minutes easy, then 5-minute cool-down. Keep control; no all-out sprints.`:mode==='run'?`${minutes} minutes including warm-up and cool-down. Start with 1 minute easy jog / 2 minutes walk. Extend jogging only if conversation remains comfortable and recovery is good. Repeat or shorten a week when needed.`:`${minutes} minutes easy walking, cycling or rowing, including warm-up and cool-down. You should be able to talk comfortably. Add duration gradually only when tolerated.`;
          if(id==='5k-performance') prescription+=' Use the same route for baseline and final review; an all-out test is optional and requires an established running base.';
        }
        add(week,day,'workout',`${mode==='hypertrophy'?(index%2?'Lower':'Upper'):mode==='mobility'?'Mobility':category==='cardio'||id==='5k-performance'?'Cardio':'Strength'} session ${index+1}`,100,prescription,exercises);
      });
      add(week,2,'recovery','Recovery check',25,'Record an easy recovery activity and how you feel. Adjust the next session for fatigue; rest is valid and never penalized.');
      add(week,6,'recovery','Recovery practice',25,'Choose gentle movement or a short comfortable mobility practice. Do not train through pain.');
      add(week,4,'technique','Technique review',25,'Review one movement or pacing skill, recording the adjustment with your coach or in the activity record.');
      add(week,7,'lesson','Weekly progress review',25,`Week ${week}: review recorded sessions, recovery and the next step. ${phases[phase]}`);
    }
  }
  const totalLevels=activities.reduce((sum,a)=>sum+a.points,0)/100;
  const rewards=Array.from({length:totalLevels},(_,i)=>{
    const level=i+1, milestone=level%5===0;
    const hash=crypto.createHash('sha256').update(`${id}:v1:${level}`).digest();
    const asset=milestone?`${id}-milestone-${level}`:hash[0]<153?'coins':hash[0]<204?'bolts':hash[0]<230?'sapphire':hash[0]<248?'topaz':'ruby';
    return {id:`${id}:v1:level:${level}`,level,kind:milestone?'cosmetic':'currency',asset,amount:asset==='coins'?50:asset==='bolts'?5:1,name:milestone?`${title} · ${level} ${level%10?'Calendar Horizon':'Avatar Atmosphere'}`:asset,fulfillment:milestone?'design':'ready'};
  });
  return {id,version:1,title,category,goal,weeks,sessionsPerWeek,totalLevels,pointsPerLevel:100,status:'review',audience:category==='pr'||mode==='interval'?'Adults with an established training base; coach review before enrollment':'General adult starter template; adapt to saved goals, experience and limitations',equipment:equipment?equipment.split(', '):[],progression:phases,activities,dietaryPreferences:mode==='nutrition'?['omnivore','vegetarian','vegan','pescatarian','Mediterranean']:[],exclusions:[],nutritionPolicy:'Use saved approved targets; respect allergies/exclusions. Dietary preferences change food choices, never add extra levels. Clinical and special-population plans require individual review.',sources:['https://acsm.org/resistance-training-guidelines-update-2026/','https://www.cdc.gov/physical-activity-basics/guidelines/adults.html/','https://www.nhs.uk/live-well/eat-well/how-to-eat-a-balanced-diet/the-vegetarian-diet/'],rewards};
});
const target=path.resolve(__dirname,'../lib/programs/catalog.v1.json');
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,JSON.stringify(programs,null,2)+'\n');
console.log(`Authored ${programs.length} review plans, ${programs.reduce((s,p)=>s+p.activities.length,0)} activities, ${programs.reduce((s,p)=>s+p.rewards.length,0)} fixed level rewards.`);
