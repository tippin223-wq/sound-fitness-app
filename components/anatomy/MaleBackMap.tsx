"use client";

//region 📦 IMPORTS
import type { MuscleId } from "./muscleData";
import { getHeatColor, getHeatGlow } from "./heatColor";
//endregion

//region 🧠 TYPES
type MaleBackMapProps = {
  workload: Record<MuscleId, number>;
  selectedMuscle?: MuscleId | null;
  onSelectMuscle?: (muscleId: MuscleId) => void;
};
//endregion

//region 🧩 SMALL SHAPE COMPONENT
function MusclePath({
  id,
  d,
  workload,
  selectedMuscle,
  onSelectMuscle,
}: {
  id: MuscleId;
  d: string;
  workload: Record<MuscleId, number>;
  selectedMuscle?: MuscleId | null;
  onSelectMuscle?: (muscleId: MuscleId) => void;
}) {
  const value = workload[id] ?? 0;
  const isSelected = selectedMuscle === id;

  return (
    <path
      d={d}
      fill={getHeatColor(value)}
      stroke={isSelected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.35)"}
      strokeWidth={isSelected ? 3 : 1.35}
      style={{ filter: getHeatGlow(value) }}
      className="cursor-pointer transition duration-200 hover:brightness-125"
      onClick={() => onSelectMuscle?.(id)}
    />
  );
}
//endregion

//region 🧍 MALE BACK MAP
export default function MaleBackMap({
  workload,
  selectedMuscle,
  onSelectMuscle,
}: MaleBackMapProps) {
  return (
    <svg
      viewBox="0 0 620 980"
      className="h-auto w-full max-w-[520px]"
      role="img"
      aria-label="Male back anatomy heat map"
    >
      {/*region 🎨 DEFINITIONS */}
      <defs>
        <radialGradient id="maleBackGlow" cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor="rgba(56,189,248,0.28)" />
          <stop offset="55%" stopColor="rgba(56,189,248,0.08)" />
          <stop offset="100%" stopColor="rgba(2,6,23,0)" />
        </radialGradient>
      </defs>
      {/*endregion*/}

      {/*region 🌌 BODY BACK GLOW */}
      <circle cx="310" cy="450" r="370" fill="url(#maleBackGlow)" />
      {/*endregion*/}

      {/*region 🩶 NEUTRAL SILHOUETTE */}
      <g opacity="0.42">
        <circle cx="310" cy="88" r="46" fill="#cbd5e1" />

        <path
          d="M273 132 C284 150 336 150 347 132 L354 182 C337 198 283 198 266 182 Z"
          fill="#94a3b8"
        />

        <path
          d="M218 180 C250 156 370 156 402 180 C433 224 435 318 406 382 C391 434 385 492 386 548 C358 575 262 575 234 548 C235 492 229 434 214 382 C185 318 187 224 218 180 Z"
          fill="#e2e8f0"
        />

        <path
          d="M195 204 C144 224 116 283 122 350 C129 430 153 506 173 588 L205 578 C194 486 186 408 191 344 C196 281 219 242 244 218 Z"
          fill="#cbd5e1"
        />

        <path
          d="M425 204 C476 224 504 283 498 350 C491 430 467 506 447 588 L415 578 C426 486 434 408 429 344 C424 281 401 242 376 218 Z"
          fill="#cbd5e1"
        />

        <path
          d="M254 550 C280 572 340 572 366 550 C389 623 382 725 349 854 L311 849 C319 739 319 642 310 584 C301 642 301 739 309 849 L271 854 C238 725 231 623 254 550 Z"
          fill="#e2e8f0"
        />

        <path
          d="M266 850 C252 892 249 928 264 952 C285 959 303 944 306 914 L309 850 Z"
          fill="#cbd5e1"
        />

        <path
          d="M354 850 C368 892 371 928 356 952 C335 959 317 944 314 914 L311 850 Z"
          fill="#cbd5e1"
        />
      </g>
      {/*endregion*/}

      {/*region 🟧 TRAPS */}
      <MusclePath
        id="traps"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M270 166 C286 184 298 211 304 250 C276 239 246 221 218 191 C232 174 250 166 270 166 Z"
      />
      <MusclePath
        id="traps"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M350 166 C334 184 322 211 316 250 C344 239 374 221 402 191 C388 174 370 166 350 166 Z"
      />
      <MusclePath
        id="traps"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M304 194 C312 194 316 194 324 194 C333 245 331 304 310 354 C289 304 287 245 304 194 Z"
      />
      {/*endregion*/}

      {/*region 🟥 REAR SHOULDERS */}
      <MusclePath
        id="rearDelts"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M203 185 C158 191 130 228 128 279 C164 284 202 254 218 211 C220 199 215 189 203 185 Z"
      />
      <MusclePath
        id="rearDelts"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M417 185 C462 191 490 228 492 279 C456 284 418 254 402 211 C400 199 405 189 417 185 Z"
      />
      {/*endregion*/}

      {/*region 🟨 RHOMBOIDS */}
      <MusclePath
        id="rhomboids"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M252 248 C276 249 294 270 304 310 C279 321 250 303 232 268 C237 257 244 251 252 248 Z"
      />
      <MusclePath
        id="rhomboids"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M368 248 C344 249 326 270 316 310 C341 321 370 303 388 268 C383 257 376 251 368 248 Z"
      />
      {/*endregion*/}

      {/*region 🟩 LATS */}
      <MusclePath
        id="lats"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M218 278 C250 315 271 372 271 470 C245 463 219 432 204 385 C190 341 196 302 218 278 Z"
      />
      <MusclePath
        id="lats"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M402 278 C370 315 349 372 349 470 C375 463 401 432 416 385 C430 341 424 302 402 278 Z"
      />
      {/*endregion*/}

      {/*region 🟦 SPINAL ERECTORS */}
      <MusclePath
        id="spinalErectors"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M289 326 C303 350 306 437 300 544 C281 521 272 465 274 407 C275 364 280 338 289 326 Z"
      />
      <MusclePath
        id="spinalErectors"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M331 326 C317 350 314 437 320 544 C339 521 348 465 346 407 C345 364 340 338 331 326 Z"
      />
      {/*endregion*/}

      {/*region 🟨 ARMS */}
      <MusclePath
        id="triceps"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M151 342 C177 337 196 358 201 398 C205 444 190 492 166 523 C143 490 130 441 134 395 C136 365 141 349 151 342 Z"
      />
      <MusclePath
        id="triceps"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M469 342 C443 337 424 358 419 398 C415 444 430 492 454 523 C477 490 490 441 486 395 C484 365 479 349 469 342 Z"
      />

      <MusclePath
        id="forearmsBack"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M164 526 C191 542 205 579 196 635 C187 686 160 721 130 738 C111 705 108 654 119 609 C128 570 143 540 164 526 Z"
      />
      <MusclePath
        id="forearmsBack"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M456 526 C429 542 415 579 424 635 C433 686 460 721 490 738 C509 705 512 654 501 609 C492 570 477 540 456 526 Z"
      />
      {/*endregion*/}

      {/*region 🍑 GLUTES */}
      <MusclePath
        id="gluteMed"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M244 548 C267 557 291 575 300 612 C269 615 239 600 224 575 C225 560 233 552 244 548 Z"
      />
      <MusclePath
        id="gluteMed"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M376 548 C353 557 329 575 320 612 C351 615 381 600 396 575 C395 560 387 552 376 548 Z"
      />

      <MusclePath
        id="gluteMax"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M252 587 C281 590 302 615 306 656 C292 696 247 700 220 665 C212 626 224 599 252 587 Z"
      />
      <MusclePath
        id="gluteMax"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M368 587 C339 590 318 615 314 656 C328 696 373 700 400 665 C408 626 396 599 368 587 Z"
      />
      {/*endregion*/}

      {/*region 🦵 HAMSTRINGS */}
      <MusclePath
        id="hamstrings"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M237 670 C270 689 279 764 260 842 C235 865 204 851 193 807 C185 752 195 694 237 670 Z"
      />
      <MusclePath
        id="hamstrings"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M383 670 C350 689 341 764 360 842 C385 865 416 851 427 807 C435 752 425 694 383 670 Z"
      />
      {/*endregion*/}

      {/*region 🦶 CALVES */}
      <MusclePath
        id="calves"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M220 828 C249 836 260 881 246 930 C233 956 197 951 184 922 C178 879 190 842 220 828 Z"
      />
      <MusclePath
        id="calves"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M400 828 C371 836 360 881 374 930 C387 956 423 951 436 922 C442 879 430 842 400 828 Z"
      />
      {/*endregion*/}

      {/*region ✨ SPINE GUIDE */}
      <path
        d="M310 184 L310 660"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="1"
        strokeDasharray="6 8"
      />
      {/*endregion*/}
    </svg>
  );
}
//endregion
