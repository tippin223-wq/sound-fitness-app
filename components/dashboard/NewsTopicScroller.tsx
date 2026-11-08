"use client";
import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DASHBOARD_NEWS_FEED_FILTERS, type DashboardNewsFeedFilter } from "@/lib/localData/dashboardNewsFeed";
import styles from "./HeroMeterCards.module.css";

const colors: Record<DashboardNewsFeedFilter,string> = {all:"#67e8f9",events:"#fbbf24",training:"#fb923c",recovery:"#2dd4bf",nutrition:"#a3e635",gear:"#c4b5fd",sports:"#60a5fa",community:"#34d399",world:"#7dd3fc"};
export default function NewsTopicScroller({value,onChange,availableTopics}:{value:DashboardNewsFeedFilter;onChange:(value:DashboardNewsFeedFilter)=>void;availableTopics:DashboardNewsFeedFilter[]}) {
 const rail=useRef<HTMLDivElement>(null);
 const topics=DASHBOARD_NEWS_FEED_FILTERS.filter(topic=>availableTopics.includes(topic.id));
 const index=topics.findIndex(topic=>topic.id===value);
 const fallback=topics[0]?.id;
 useEffect(()=>{if(index<0&&fallback)onChange(fallback);},[index,fallback,onChange]);
 useEffect(()=>{
  const center=()=>{
   const container=rail.current, selected=container?.querySelector<HTMLElement>('[aria-selected="true"]');
   if(container&&selected)container.scrollTo({left:selected.offsetLeft-(container.clientWidth-selected.offsetWidth)/2,behavior:"smooth"});
  };
  center();
  const observer=new ResizeObserver(center);if(rail.current)observer.observe(rail.current);
  return()=>observer.disconnect();
 },[value]);
 const move=(direction:number)=>{if(topics.length)onChange(topics[(Math.max(0,index)+direction+topics.length)%topics.length].id);};
 if(!topics.length)return null;
 return <div className={styles.newsTopics} data-dashboard-orbiter-local-scroll="true" onPointerDown={event=>event.stopPropagation()} onClick={event=>event.stopPropagation()}>
  <div className={styles.newsTopicRail} role="tablist" aria-label="News topics" ref={rail} onKeyDown={event=>{if(event.key==="ArrowRight"||event.key==="ArrowLeft"){event.preventDefault();event.stopPropagation();move(event.key==="ArrowRight"?1:-1);}}}>
   {topics.map(topic=><button key={topic.id} type="button" role="tab" aria-selected={value===topic.id} aria-controls="dashboard-hero-news-feed" style={{"--topic-color":colors[topic.id]} as React.CSSProperties} onClick={()=>onChange(topic.id)}>{topic.label}</button>)}
  </div>
  <div className={styles.newsTopicArrows}><button type="button" aria-label="Previous news topic" onClick={()=>move(-1)}><ChevronLeft aria-hidden="true"/></button><button type="button" aria-label="Next news topic" onClick={()=>move(1)}><ChevronRight aria-hidden="true"/></button></div>
 </div>;
}
