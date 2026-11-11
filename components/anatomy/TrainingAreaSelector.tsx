"use client";

import Body, { type ExtendedBodyPart, type Slug } from "react-muscle-highlighter";
import { useRef } from "react";
import type { BodyModel } from "@/lib/anatomy/bodyModel";
import styles from "./TrainingAreaSelector.module.css";
import { painLevelColor } from "@/lib/trainingAreaCare";
import AreaPainDial from "./AreaPainDial";

const regions: {label: string; slugs: Slug[]}[] = [
  {label: "Neck", slugs: ["neck"]},
  {label: "Shoulders", slugs: ["deltoids"]},
  {label: "Elbows", slugs: []},
  {label: "Wrists / hands", slugs: ["hands"]},
  {label: "Back", slugs: ["upper-back","lower-back","trapezius"]},
  {label: "Hips", slugs: ["gluteal","adductors"]},
  {label: "Knees", slugs: ["knees"]},
  {label: "Ankles / feet", slugs: ["ankles","feet"]},
  {label: "Chest", slugs: ["chest"]},
  {label: "Upper arms", slugs: ["biceps","triceps"]},
  {label: "Forearms", slugs: ["forearm"]},
  {label: "Core", slugs: ["abs","obliques"]},
  {label: "Thighs", slugs: ["quadriceps","hamstring"]},
  {label: "Calves / shins", slugs: ["calves","tibialis"]},
];

const singularAreas: Record<string, string> = {
  Shoulders: "shoulder",
  Elbows: "elbow",
  "Wrists / hands": "wrist / hand",
  Knees: "knee",
  "Ankles / feet": "ankle / foot",
  "Upper arms": "upper arm",
  Forearms: "forearm",
  "Calves / shins": "calf / shin",
};

function selectedAreaLabel(value: string) {
  const match = /^(Left|Right) (.+)$/.exec(value);
  return match ? `${match[1]} ${singularAreas[match[2]] || match[2].toLowerCase()}` : value;
}

/** Controlled training preferences on the same 2D figures as the exercise library. */
export default function TrainingAreaSelector({selected, onChange, bodyModel, careLevels = {}, onCareChange, noConcerns = false, onNoConcernsChange}: {
  selected: string[]; onChange: (areas: string[]) => void; bodyModel: BodyModel;
  careLevels?: Record<string, number>; onCareChange?: (area: string, level: number) => void;
  noConcerns?: boolean; onNoConcernsChange?: (checked: boolean) => void;
}) {
  const sideDialog = useRef<HTMLDialogElement>(null);
  const namePopup = useRef<HTMLDivElement>(null);
  const selectionDrag = useRef<{ pointerId: number; startX: number; scrollLeft: number; dragging: boolean } | null>(null);
  const suppressSelectionClick = useRef(false);
  const toggle = (label: string) => onChange(selected.includes(label) ? selected.filter(item => item !== label) : [...selected, label]);
  const isPaired = (label: string) => ["Shoulders", "Elbows", "Wrists / hands", "Knees", "Ankles / feet", "Upper arms", "Forearms", "Calves / shins"].includes(label);
  const hasArea = (label: string) => selected.some(value => value === label || value === `Left ${label}` || value === `Right ${label}`);
  const chooseArea = (label: string) => {
    if (!isPaired(label)) { toggle(label); return; }
    const dialog = sideDialog.current;
    if (!dialog) return;
    dialog.dataset.area = label;
    const title = dialog.querySelector("h3");
    if (title) title.textContent = label;
    namePopup.current?.hidePopover();
    dialog.showModal();
  };
  const saveSide = (side: "Left" | "Right" | "Both") => {
    const label = sideDialog.current?.dataset.area;
    if (!label) return;
    const remaining = selected.filter(value => value !== label && value !== `Left ${label}` && value !== `Right ${label}`);
    onChange([...remaining, side === "Both" ? label : `${side} ${label}`]);
    sideDialog.current?.close();
  };
  const data: ExtendedBodyPart[] = regions.flatMap(region => region.slugs.flatMap(slug => {
    const sides = isPaired(region.label) ? (["left", "right"] as const) : [undefined];
    return sides.map(side => {
      const active = selected.includes(region.label) || selected.includes(`${side === "left" ? "Left" : "Right"} ${region.label}`);
      const areaKey = selected.includes(region.label) ? region.label : `${side === "left" ? "Left" : "Right"} ${region.label}`;
      const rating = careLevels[areaKey];
      const color = painLevelColor(Number.isInteger(rating) && rating >= 1 && rating <= 10 ? rating : undefined);
      return {slug, side, styles: {fill: active ? color : "#1e3448", stroke: active ? "#fef3c7" : "#94a3b844", strokeWidth: active ? 2 : 1}};
    });
  }));
  return <div className={styles.root}>

    <div className={styles.figures}>
      {(["front","back"] as const).map(side => <div key={side} className={styles.figureColumn}>
        <span className={styles.sideLabel}>{side}</span>
        <div className={styles.figure} onPointerDown={event => event.stopPropagation()} onPointerUp={event => event.stopPropagation()}>
          <Body data={data} side={side} gender={bodyModel} scale={.7} defaultFill="#142436" defaultStroke="#94a3b844" defaultStrokeWidth={1} border="#94a3b866" hiddenParts={["hair"]} onBodyPartPress={part => { const region = regions.find(item => item.slugs.includes(part.slug as Slug)); if (region) chooseArea(region.label); }} />

        </div>
      </div>)}
    </div>
    <p className={styles.hint}>Tap an area on either outline. Tap again to remove it.</p>
    <div className={styles.areaList}>
      <button type="button" className={styles.nameTrigger} aria-haspopup="dialog" onClick={event => {
        const popup = namePopup.current;
        if (!popup) return;
        if (popup.matches(":popover-open")) { popup.hidePopover(); return; }
        const anchor = event.currentTarget.getBoundingClientRect();
        popup.showPopover();
        const rect = popup.getBoundingClientRect();
        popup.style.left = `${Math.max(8, Math.min(window.innerWidth - rect.width - 8, anchor.left + anchor.width / 2 - rect.width / 2))}px`;
        popup.style.top = `${anchor.bottom + rect.height + 6 <= window.innerHeight - 8 ? anchor.bottom + 6 : Math.max(8, anchor.top - rect.height - 6)}px`;
      }}>Choose an area by name</button>
      <div ref={namePopup} popover="auto" className={styles.areaPopup} role="dialog" aria-label="Choose areas to go easy on">
        <div className={styles.areaChoices}>{regions.map(region => <button key={region.label} type="button" aria-label={`Toggle ${region.label} area`} aria-pressed={hasArea(region.label)} onClick={() => chooseArea(region.label)}>{region.label}</button>)}</div>
        <button type="button" className={styles.popupDone} onClick={() => namePopup.current?.hidePopover()}>Done</button>
      </div>
    </div>
    {!selected.length && <div className={styles.noConcernsRow}>
      <span>No areas selected</span>
      <label><input type="checkbox" checked={noConcerns} onChange={event => onNoConcernsChange?.(event.target.checked)} />No areas of concern</label>
    </div>}
    <div className={styles.selected} hidden={!selected.length} aria-live="polite" aria-label="Selected areas to go easy on"
      onPointerDown={event => {
        if ((event.target as HTMLElement).closest("input,button,[role=slider]")) { event.stopPropagation(); return; }
        if (event.pointerType !== "mouse" || event.button !== 0) return;
        event.stopPropagation();
        suppressSelectionClick.current = false;
        selectionDrag.current = {pointerId: event.pointerId, startX: event.clientX, scrollLeft: event.currentTarget.scrollLeft, dragging: false};
      }}
      onPointerMove={event => {
        const drag = selectionDrag.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const delta = event.clientX - drag.startX;
        if (!drag.dragging && Math.abs(delta) < 5) return;
        event.preventDefault();
        event.stopPropagation();
        drag.dragging = true;
        suppressSelectionClick.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.dataset.dragging = "true";
        event.currentTarget.scrollLeft = drag.scrollLeft - delta;
      }}
      onPointerUp={event => {
        if (!selectionDrag.current || selectionDrag.current.pointerId !== event.pointerId) return;
        event.stopPropagation();
        selectionDrag.current = null;
        delete event.currentTarget.dataset.dragging;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={event => {
        selectionDrag.current = null;
        suppressSelectionClick.current = false;
        delete event.currentTarget.dataset.dragging;
      }}
      onLostPointerCapture={event => {
        selectionDrag.current = null;
        delete event.currentTarget.dataset.dragging;
      }}
      onClickCapture={event => {
        if (!suppressSelectionClick.current) return;
        event.preventDefault();
        event.stopPropagation();
        suppressSelectionClick.current = false;
      }}>
      {selected.length ? selected.map(label => {
        const raw = careLevels[label];
        const level = Number.isInteger(raw) && raw >= 1 && raw <= 10 ? raw : undefined;
        return <div key={label} className={styles.careControl}>
          <AreaPainDial label={selectedAreaLabel(label)} value={level} onChange={next => onCareChange?.(label, next)} />
          <button type="button" className={styles.removeArea} onClick={() => toggle(label)} aria-label={`Remove ${selectedAreaLabel(label)} from areas to go easy on`}>×</button>
        </div>;
      }) : null}
    </div>

    <dialog ref={sideDialog} className={styles.sideDialog} aria-label="Choose body side" onClick={event => {if (event.target === event.currentTarget) event.currentTarget.close();}}>
      <div><h3>Choose an area</h3><p>Which side? Left and right refer to your body.</p>
        <div className={styles.sideChoices}>{(["Left", "Right", "Both"] as const).map(side => <button type="button" key={side} onClick={() => saveSide(side)}>{side === "Both" ? "Both sides" : `${side} only`}</button>)}</div>
        <button type="button" className={styles.sideCancel} onClick={() => sideDialog.current?.close()}>Cancel</button>
      </div>
    </dialog>
  </div>;
}
