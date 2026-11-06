"use client";
import Link from "next/link";
import { CalendarDays, UsersRound, ClipboardList, MessageSquare, ArrowUpRight, Clock3, Wallet, BookOpen, Settings, CheckCircle2, type LucideIcon } from "lucide-react";
import { COACH_ROWS, coachWebsite } from "@/lib/coachDashboard";
import PublishedContentBank from "@/components/content/PublishedContentBank";
import styles from "./CoachDashboardRows.module.css";

type Action={title:string;description:string;href:string;icon:LucideIcon};
const actions:Action[][]=[
 [{title:"Open today’s schedule",description:"Appointments, session details and completion tools.",href:coachWebsite,icon:CalendarDays},{title:"Member follow-up",description:"Open your assigned member list and coaching records.",href:coachWebsite+'?view=clients',icon:UsersRound},{title:"Set availability",description:"Keep your bookable hours and time off up to date.",href:coachWebsite+'?view=availability',icon:Clock3}],
 [{title:"My members",description:"Review assigned members, goals and training records.",href:coachWebsite+'?view=clients',icon:UsersRound},{title:"Member feedback",description:"Read the feedback members have shared.",href:coachWebsite+'?view=feedback',icon:MessageSquare}],
 [{title:"Schedule & sessions",description:"Open the existing calendar, session details and completion workflow.",href:coachWebsite,icon:CalendarDays},{title:"Availability & time off",description:"Manage the hours members can book.",href:coachWebsite+'?view=availability',icon:Clock3},{title:"Session forms",description:"Open coaching forms and service records.",href:coachWebsite+'?view=forms',icon:ClipboardList}],
 [],
 [{title:"Member conversations",description:"Open your assigned members to contact them through the existing coach workspace.",href:coachWebsite+'?view=clients',icon:MessageSquare},{title:"Feedback",description:"Read member feedback and identify follow-ups.",href:coachWebsite+'?view=feedback',icon:CheckCircle2},{title:"Office support",description:"Contact the team for coaching and appointment support.",href:coachWebsite+'?view=help',icon:UsersRound}],
 [{title:"Payments",description:"Review your connected payout information.",href:coachWebsite+'?view=payments',icon:Wallet},{title:"Sessions & earnings",description:"Review recorded sessions, expenses and earnings.",href:coachWebsite+'?view=earnings',icon:ClipboardList},{title:"Equipment",description:"Maintain your coaching equipment record.",href:coachWebsite+'?view=equipment',icon:BookOpen}],
 [{title:"Coach profile",description:"Manage your professional bio and profile.",href:coachWebsite+'?view=bio',icon:UsersRound},{title:"Account & preferences",description:"Manage coaching account settings and notifications.",href:coachWebsite+'?view=settings',icon:Settings}],
];
function ActionCard({action}:{action:Action}){const Icon=action.icon;return <a className={styles.action} href={action.href} target="_blank" rel="noopener noreferrer"><Icon aria-hidden="true" className={styles.actionIcon}/><div><h3>{action.title}</h3><p>{action.description}</p></div><ArrowUpRight aria-hidden="true" className={styles.arrow}/></a>;}
export default function CoachDashboardRows({activeRow,onSelectRow}:{activeRow:number;onSelectRow:(row:number)=>void}){
 return <>{COACH_ROWS.map((row,index)=><section key={row.title} aria-label={row.title} aria-hidden={activeRow!==index} inert={activeRow!==index} className={`${styles.row} ${activeRow===index?styles.active:styles.inactive}`}>
  <header className={styles.heading}><div><p>Sound Fitness · Coaching</p><h1>{row.title}</h1><span>{row.helper}</span></div><span className={styles.marker}>{String(index+1).padStart(2,'0')}<small> / {String(COACH_ROWS.length).padStart(2,'0')}</small></span></header>
  <div className={styles.body} data-dashboard-orbiter-local-scroll="true">
   {index===0&&<div className={styles.overview}><div className={styles.focus}><span className={styles.eyebrow}>Start here</span><h2>Make room for<br/><em>better coaching.</em></h2><p>Your schedule first. Then the members who need you, the plan they follow and the conversation that keeps them moving.</p><a href={coachWebsite} target="_blank" rel="noopener noreferrer">Open my schedule <ArrowUpRight size={18}/></a></div><div className={styles.shortcuts}>{[1,2,3,4].map(i=><button key={i} onClick={()=>onSelectRow(i)}><span>{String(i).padStart(2,'0')}</span><strong>{COACH_ROWS[i].title}</strong><ArrowUpRight size={17}/></button>)}</div></div>}
   {index===3?<div className={styles.programs}><PublishedContentBank bank="plans" title="Programs"/><Link className={styles.libraryLink} href="/coach/library">Open exercises, nutrition and learning resources →</Link></div>:<div className={styles.cards}>{actions[index].map(action=><ActionCard key={action.title} action={action}/>)}</div>}
   <p className={styles.source}>Schedule, member records and business actions open the existing website coaching workspace in a new tab. Its sign-in may be required.</p>
  </div>
 </section>)}</>;
}
