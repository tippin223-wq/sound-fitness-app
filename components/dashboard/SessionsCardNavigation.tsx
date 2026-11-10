"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import DashboardRowMenu from "./DashboardRowMenu";
import DashboardScrollButton3D, { type DashboardScrollButtonGlyph } from "./DashboardScrollButton3D";
import DashboardTabIcon from "./DashboardTabIcon";
import styles from "./SessionsCardNavigation.module.css";

type Direction = "up" | "down" | "left" | "right";
type Row = { title: string; cards: { title: string; icon: string }[] };
export default function SessionsCardNavigation({ rows, row, card, onNavigate, onRow, onCard, labelPrefix = "session", showTitle = true, showHorizontalIndicators = true, disabled = false, accentColor }: {
  labelPrefix?: string; showTitle?: boolean; showHorizontalIndicators?: boolean; disabled?: boolean;
  accentColor?: string;
  rows: Row[]; row: number; card: number; onNavigate: (direction: Direction) => void;
  onRow: (row: number) => void; onCard: (card: number) => void;
}) {
  const [mode, setMode] = useState<"both" | "vertical" | "horizontal" | null>(null);
  const [dragging, setDragging] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offset = useRef({ x: 0, y: 0 });
  const pointer = useRef<{id:number;x:number;y:number;moved:boolean;last:number} | null>(null);
  const moved = useRef(false);
  const wheelTime = useRef(0);
  const previous = useRef({row,card});
  const reveal = useCallback((axis: "both" | "vertical" | "horizontal") => {
    if (!showHorizontalIndicators && axis === "horizontal") return;
    setMode(axis);
    if(timer.current)clearTimeout(timer.current);
    timer.current=setTimeout(()=>setMode(null),axis==='horizontal'?5000:3000);
  },[showHorizontalIndicators]);
  const hide = useCallback(()=>{setMode(null);if(timer.current)clearTimeout(timer.current);},[]);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  useEffect(()=>{
    if(previous.current.row!==row)reveal('vertical');
    else if(previous.current.card!==card)reveal('horizontal');
    previous.current={row,card};
  },[row,card,reveal]);
  const available = (direction:Direction) => !disabled && (direction==='up'?row>0:direction==='down'?row<rows.length-1:rows[row].cards.length>1);
  const navigate = (direction:Direction)=>{reveal(direction==='up'||direction==='down'?'vertical':'horizontal');if(available(direction))onNavigate(direction);};
  const title = rows[row].cards[card]?.title || rows[row].title;
  const glyph: DashboardScrollButtonGlyph = /plan/i.test(title)?'calendar':/builder/i.test(title)?'tools':/achieve/i.test(title)?'achievements':/profile|goal/i.test(title)?'challenges':/library/i.test(title)?'favorites':/history|stats/i.test(title)?'constellation':'body';
  const color = accentColor || (row===2?'#fbbf24':/plan/i.test(title)?'#6ee7b7':'#67e8f9');
  const vertical = mode==='both'||mode==='vertical';
  const horizontal = mode==='both'||mode==='horizontal';
  return <div className={styles.root} onPointerDown={event=>event.stopPropagation()} onPointerMove={event=>event.stopPropagation()} onPointerUp={event=>event.stopPropagation()}>
    <DashboardRowMenu open={vertical} onOpenChange={open=>{if(!open)hide();}} renderTrigger={()=> <>
      <button className="dashboard-card-joystick-knob" data-dashboard-page-analog="true" type="button" aria-label={`Toggle ${labelPrefix} card indicators; drag to navigate`} aria-expanded={mode!==null}
        style={{touchAction:'none'}}
        onClick={event=>{event.stopPropagation();if(moved.current){event.preventDefault();return;}if(mode==='both')hide();else reveal('both');}}
        onKeyDown={event=>{const direction=({ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'} as Record<string,Direction>)[event.key];if(direction){event.preventDefault();event.stopPropagation();navigate(direction);}if(event.key==='Escape')hide();}}
        onPointerDown={event=>{if(event.button!==0)return;event.stopPropagation();moved.current=false;pointer.current={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false,last:0};event.currentTarget.setPointerCapture(event.pointerId);}}
        onPointerMove={event=>{const start=pointer.current;if(!start)return;event.stopPropagation();const x=event.clientX-start.x,y=event.clientY-start.y;offset.current={x:Math.max(-1,Math.min(1,x/32)),y:Math.max(-1,Math.min(1,y/32))};if(Math.max(Math.abs(x),Math.abs(y))<12)return;start.moved=true;moved.current=true;setDragging(true);if(event.timeStamp-start.last<200)return;start.last=event.timeStamp;navigate(Math.abs(x)>Math.abs(y)?x>0?'right':'left':y>0?'down':'up');}}
        onPointerUp={event=>{event.stopPropagation();pointer.current=null;offset.current={x:0,y:0};setDragging(false);if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}}
        onPointerCancel={()=>{pointer.current=null;offset.current={x:0,y:0};setDragging(false);}}
        onLostPointerCapture={()=>{pointer.current=null;offset.current={x:0,y:0};setDragging(false);}}
        onWheel={event=>{event.stopPropagation();const horizontal=Math.abs(event.deltaX)>Math.abs(event.deltaY)||event.shiftKey;const delta=horizontal&&event.deltaX?event.deltaX:event.deltaY;if(Math.abs(delta)<8)return;const now=Date.now();if(now-wheelTime.current<200)return;wheelTime.current=now;navigate(horizontal?delta>0?'right':'left':delta>0?'down':'up');}}>
        <DashboardScrollButton3D knobOnly glyph={glyph} glyphColor={color} active={dragging} className="dashboard-card-joystick-scene" paused={!dragging} dragOffsetRef={offset} tone="cyan" />
      </button>
      {(['up','right','down','left'] as const).map(direction=>{const Arrow=direction==='up'?ChevronUp:direction==='down'?ChevronDown:direction==='left'?ChevronLeft:ChevronRight;return <button key={direction} type="button" data-card-joystick-arrow={direction} disabled={!available(direction)} aria-label={`Navigate ${labelPrefix} cards ${direction}`} onClick={event=>{event.stopPropagation();navigate(direction);}}><Arrow aria-hidden="true"/></button>;})}
    </>}>
      <nav className={styles.vertical} aria-label={`${labelPrefix} rows`}>{rows.map((item,index)=><button type="button" key={item.title} aria-current={index===row?'true':undefined} onClick={()=>{onRow(index);reveal('vertical');}}><DashboardTabIcon name={index===0?'Workout':index===1?'Plan':'Settings'} label={item.title}/><span>{item.title}</span></button>)}</nav>
    </DashboardRowMenu>
    {showTitle && <div className={styles.title} style={{color}}>{title}</div>}
    {horizontal&&showHorizontalIndicators&&<nav className={styles.horizontal} aria-label={`${labelPrefix} card indicators`} onPointerMove={()=>reveal(mode==='both'?'both':'horizontal')} onFocus={()=>reveal(mode==='both'?'both':'horizontal')}>
      {rows[row].cards.map((item,index)=><button type="button" key={item.title} aria-label={`Show ${item.title}`} aria-pressed={index===card} onClick={()=>{onCard(index);reveal(mode==='both'?'both':'horizontal');}}><DashboardTabIcon name={item.icon} label={item.title}/><span>{item.title}</span></button>)}
    </nav>}
  </div>;
}
