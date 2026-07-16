const MUSIC_MUTE_KEY = "soundFitnessMusicMuted";
const SFX_MUTE_KEY = "soundFitnessSfxMuted";
const MASTER_VOL_KEY = "soundFitnessMasterVolume";
const DEFAULT_MASTER_VOLUME = 0.85;
// Fixed per-bus levels so music sits under the effects; the single master
// volume scales both, and each bus can be muted independently.
const MUSIC_LEVEL = 0.5;
const SFX_LEVEL = 0.7;


function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function readVolume(raw: string | null, fallback: number) {
  // A missing key (null/"") must fall back, not read as Number(null) === 0.
  if (raw === null || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
    ? parsed
    : fallback;
}

function persist(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // storage unavailable — session-only
  }
}

// --- Composed songs (the playlist) --------------------------------------
// Each is a real short loop with a written melody. Users pick their mood; a
// dropped audio file (the "Custom file" track) plays instead when chosen.
const BAR_STEPS = 8;
const LOOP_STEPS = BAR_STEPS * 4;
const TRACK_KEY = "soundFitnessTrack";

type SongDef = {
  bpm: number;
  swing: number; // fraction of a step to delay off-beats
  drums: boolean;
  lead?: boolean; // play the melody with the bright lead synth instead of bells
  chords: number[][]; // one voicing per bar
  pad: number[][];
  bass: number[];
  melody: { t: number; f: number; d: number }[];
};

type Track =
  | { id: string; name: string; kind: "song"; song: SongDef }
  | { id: string; name: string; kind: "file"; src: string };

// Dreamy family — deeper & warmer with a laid-back chill beat. Melancholic
// minor lean, Am7 – Fmaj7 – Cmaj7 – Em7, low register over swung drums.
const DRIFT: SongDef = {
  bpm: 62,
  swing: 0.16,
  drums: true,
  chords: [
    [110.0, 130.81, 164.81, 196.0],
    [174.61, 220.0, 261.63, 329.63],
    [130.81, 164.81, 196.0, 246.94],
    [164.81, 196.0, 246.94, 293.66],
  ],
  pad: [
    [110.0, 164.81],
    [87.31, 130.81],
    [130.81, 196.0],
    [82.41, 123.47],
  ],
  bass: [55.0, 43.65, 65.41, 82.41],
  melody: [
    { t: 0, f: 440.0, d: 4 },
    { t: 4, f: 659.25, d: 3 },
    { t: 8, f: 523.25, d: 4 },
    { t: 12, f: 440.0, d: 3 },
    { t: 16, f: 392.0, d: 4 },
    { t: 20, f: 659.25, d: 3 },
    { t: 24, f: 587.33, d: 4 },
    { t: 28, f: 493.88, d: 4 },
  ],
};

// Dreamy family — the original. Slow, spacious, no drums — for focus.
// Cmaj7 – Em7 – Am7 – Fmaj7.
const DREAMY: SongDef = {
  bpm: 68,
  swing: 0,
  drums: false,
  chords: [
    [130.81, 164.81, 196.0, 246.94],
    [164.81, 196.0, 246.94, 293.66],
    [110.0, 130.81, 164.81, 196.0],
    [174.61, 220.0, 261.63, 329.63],
  ],
  pad: [
    [130.81, 196.0],
    [164.81, 246.94],
    [110.0, 164.81],
    [174.61, 261.63],
  ],
  bass: [65.41, 82.41, 55.0, 87.31],
  melody: [
    { t: 0, f: 659.25, d: 3 },
    { t: 4, f: 587.33, d: 4 },
    { t: 8, f: 493.88, d: 3 },
    { t: 12, f: 587.33, d: 4 },
    { t: 16, f: 523.25, d: 3 },
    { t: 20, f: 440.0, d: 4 },
    { t: 24, f: 392.0, d: 3 },
    { t: 28, f: 493.88, d: 4 },
  ],
};

// Dreamy family — brighter & airier with a bold, catchy synth lead soaring
// over it. Cmaj7 – Em7 – Fmaj7 – G6, lifting major feel.
const AURORA: SongDef = {
  bpm: 72,
  swing: 0,
  drums: false,
  lead: true,
  chords: [
    [130.81, 164.81, 196.0, 246.94],
    [164.81, 196.0, 246.94, 293.66],
    [174.61, 220.0, 261.63, 329.63],
    [196.0, 246.94, 293.66, 329.63],
  ],
  pad: [
    [130.81, 196.0],
    [164.81, 246.94],
    [174.61, 261.63],
    [196.0, 293.66],
  ],
  bass: [65.41, 82.41, 87.31, 98.0],
  melody: [
    { t: 0, f: 783.99, d: 2 },
    { t: 2, f: 659.25, d: 1 },
    { t: 3, f: 1046.5, d: 2 },
    { t: 6, f: 987.77, d: 1 },
    { t: 7, f: 783.99, d: 1 },
    { t: 8, f: 659.25, d: 2 },
    { t: 10, f: 783.99, d: 1 },
    { t: 11, f: 987.77, d: 2 },
    { t: 14, f: 880.0, d: 1 },
    { t: 15, f: 783.99, d: 1 },
    { t: 16, f: 880.0, d: 2 },
    { t: 18, f: 1046.5, d: 2 },
    { t: 20, f: 880.0, d: 1 },
    { t: 21, f: 698.46, d: 1 },
    { t: 22, f: 783.99, d: 2 },
    { t: 24, f: 987.77, d: 1 },
    { t: 25, f: 1174.66, d: 2 },
    { t: 27, f: 783.99, d: 1 },
    { t: 28, f: 880.0, d: 1 },
    { t: 29, f: 987.77, d: 1 },
    { t: 30, f: 783.99, d: 2 },
  ],
};

const TRACKS: Track[] = [
  { id: "drift", name: "Drift", kind: "song", song: DRIFT },
  { id: "dreamy", name: "Dreamy", kind: "song", song: DREAMY },
  { id: "aurora", name: "Aurora", kind: "song", song: AURORA },
];
const DEFAULT_TRACK_ID = "drift";

/**
 * Audio for the onboarding flow.
 *
 * Background MUSIC is a small playlist of three composed "dreamy" loops with
 * written melodies (Drift / Dreamy / Aurora), cycled with the prev/next
 * arrows. Music and interaction SOUND EFFECTS have independent mute + volume.
 * Audio can only start after a user gesture (call unlock() from a handler).
 */
class SoundFx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private reverbIn: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  private music: HTMLAudioElement | null = null;
  private musicStarted = false;
  private songTimer: number | null = null;
  private songStep = 0;
  private songNextTime = 0;
  private trackId = DEFAULT_TRACK_ID;
  private hissSource: AudioBufferSourceNode | null = null;

  // Music is muted until someone turns it on; sound effects stay on.
  private musicMuted = true;
  private sfxMuted = false;
  private masterVolume = DEFAULT_MASTER_VOLUME;
  private noiseBuffer: AudioBuffer | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const store = window.localStorage;
        // No stored preference => music stays muted (the default). An explicit
        // "false" from someone who unmuted it still wins.
        const storedMusicMute = store.getItem(MUSIC_MUTE_KEY);
        this.musicMuted =
          storedMusicMute === null || storedMusicMute === ""
            ? true
            : storedMusicMute === "true";
        this.sfxMuted = store.getItem(SFX_MUTE_KEY) === "true";
        this.masterVolume = readVolume(
          store.getItem(MASTER_VOL_KEY),
          DEFAULT_MASTER_VOLUME,
        );
        const savedTrack = store.getItem(TRACK_KEY);
        if (savedTrack && TRACKS.some((t) => t.id === savedTrack)) {
          this.trackId = savedTrack;
        }
      } catch {
        // defaults stand
      }
    }
  }

  /** The playlist for the picker — id + display name. */
  getTracks() {
    return TRACKS.map((t) => ({ id: t.id, name: t.name }));
  }

  getTrackId() {
    return this.trackId;
  }

  setTrack(id: string) {
    if (!TRACKS.some((t) => t.id === id) || id === this.trackId) return;
    this.trackId = id;
    persist(TRACK_KEY, id);
    this.stopMusic();
    if (!this.musicMuted) {
      this.ensure();
      if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
      this.startMusic();
    }
  }

  getMasterVolume() {
    return this.masterVolume;
  }

  isMusicMuted() {
    return this.musicMuted;
  }

  isSfxMuted() {
    return this.sfxMuted;
  }

  /** Frequency bins for the visualizer. Fill a 32-byte array; returns false
   *  if the audio graph isn't up yet (caller can render an idle animation). */
  readMusicSpectrum(target: Uint8Array<ArrayBuffer>): boolean {
    if (!this.analyser) return false;
    this.analyser.getByteFrequencyData(target);
    return true;
  }

  private applyMasterGain() {
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(
        this.masterVolume,
        this.ctx.currentTime,
        0.05,
      );
    }
  }

  private applyMusicGain() {
    const level = this.musicMuted ? 0 : MUSIC_LEVEL;
    if (this.ctx && this.musicBus) {
      this.musicBus.gain.setTargetAtTime(level, this.ctx.currentTime, 0.05);
    }
    if (this.music) this.music.volume = this.musicMuted ? 0 : 1;
  }

  private applySfxGain() {
    const level = this.sfxMuted ? 0 : SFX_LEVEL;
    if (this.ctx && this.sfxBus) {
      this.sfxBus.gain.setTargetAtTime(level, this.ctx.currentTime, 0.05);
    }
  }

  setMasterVolume(volume: number) {
    this.masterVolume = clamp01(volume);
    persist(MASTER_VOL_KEY, String(this.masterVolume));
    this.applyMasterGain();
    if (this.masterVolume > 0) this.unlock();
  }

  setMusicMuted(muted: boolean) {
    this.musicMuted = muted;
    persist(MUSIC_MUTE_KEY, String(muted));
    this.applyMusicGain();
    if (!muted) this.unlock();
  }

  setSfxMuted(muted: boolean) {
    this.sfxMuted = muted;
    persist(SFX_MUTE_KEY, String(muted));
    this.applySfxGain();
  }

  unlock() {
    this.ensure();
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
    this.startMusic();
  }

  /** Stop the background song (e.g. when the user leaves for checkout). */
  pauseMusic() {
    this.stopMusic();
  }

  /**
   * Try to get the audio context actually running, resolving to whether it is.
   * Used on page load: if the browser still carries user activation from the
   * click that navigated here, audio can start immediately (the crest fly-in
   * plays in sync with the animation). Otherwise it resolves false and callers
   * fall back to the first user gesture.
   */
  async ensureRunning(): Promise<boolean> {
    this.ensure();
    if (!this.ctx) return false;
    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        // still locked — caller falls back to a gesture
      }
    }
    return this.ctx.state === "running";
  }

  /**
   * Stop the song and release the audio context. Called on hot-reload teardown
   * so an outgoing copy of this module never keeps looping under its
   * replacement (which would sound like two overlapping songs).
   */
  teardown() {
    this.stopMusic();
    if (this.ctx) {
      try {
        void this.ctx.close();
      } catch {
        // already closed
      }
      this.ctx = null;
    }
  }

  // --- interaction sounds -------------------------------------------------

  select() {
    this.bell(783.99, 0.55, 0.32, 0.3);
    this.bell(1174.66, 0.5, 0.18, 0.35);
  }

  deselect() {
    this.bell(523.25, 0.4, 0.28, 0.2);
  }

  tick() {
    this.blip(1244.51, 0.14, 0.06);
  }

  /** Rounded, watery "bloop" pair — the checkbox / consent toggle voice. */
  bubble() {
    this.bloop(360, 760, 0.16, 0);
    this.bloop(560, 1040, 0.13, 0.05);
  }

  back() {
    this.blip(392.0, 0.18, 0.18);
  }

  next() {
    this.bell(523.25, 0.5, 0.22, 0.25);
    this.bell(783.99, 0.55, 0.26, 0.3);
    this.riser(0.28);
  }

  success() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      this.bell(f, 0.55, 0.4, 0.28, i * 0.1),
    );
  }

  /** Big celebratory flourish for the result reveal. */
  cheer() {
    this.riser(0.5);
    [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) =>
      this.bell(f, 0.6, 0.55, 0.4, 0.1 + i * 0.08),
    );
    [1567.98, 2093, 1760].forEach((f, i) =>
      this.bell(f, 0.5, 0.6, 0.5, 0.5 + i * 0.12),
    );
    this.applause(2.6);
  }

  /** Synthesized crowd: a soft swell plus dozens of randomized claps. */
  applause(duration = 2.4) {
    if (this.sfxMuted) return;
    this.ensure();
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    if (ctx.state === "suspended") void ctx.resume();
    this.ensureNoise();
    if (!this.noiseBuffer) return;

    const t0 = ctx.currentTime;
    const swell = ctx.createBufferSource();
    swell.buffer = this.noiseBuffer;
    swell.loop = true;
    const swellFilter = ctx.createBiquadFilter();
    swellFilter.type = "bandpass";
    swellFilter.Q.value = 1.1;
    swellFilter.frequency.setValueAtTime(340, t0);
    swellFilter.frequency.exponentialRampToValueAtTime(880, t0 + 1.2);
    const swellGain = ctx.createGain();
    swellGain.gain.setValueAtTime(0.0001, t0);
    swellGain.gain.exponentialRampToValueAtTime(0.04, t0 + 0.6);
    swellGain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    swell.connect(swellFilter);
    swellFilter.connect(swellGain);
    swellGain.connect(this.sfxBus);
    this.reverbSend(swellGain, 0.4);
    swell.start(t0);
    swell.stop(t0 + duration + 0.2);

    for (let i = 0; i < 64; i++) {
      const when = t0 + duration * Math.pow(Math.random(), 1.35);
      const late = (when - t0) / duration;
      const peak = (0.03 + Math.random() * 0.06) * (1 - 0.45 * late);
      const clap = ctx.createBufferSource();
      clap.buffer = this.noiseBuffer;
      clap.playbackRate.value = 0.85 + Math.random() * 0.5;
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 900 + Math.random() * 1500;
      band.Q.value = 0.9 + Math.random();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(peak, when + 0.004);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        when + 0.05 + Math.random() * 0.07,
      );
      clap.connect(band);
      band.connect(gain);
      if (typeof ctx.createStereoPanner === "function") {
        const pan = ctx.createStereoPanner();
        pan.pan.value = (Math.random() * 2 - 1) * 0.7;
        gain.connect(pan);
        pan.connect(this.sfxBus);
      } else {
        gain.connect(this.sfxBus);
      }
      clap.start(when, Math.random() * 0.4);
      clap.stop(when + 0.25);
    }
  }

  /**
   * The crest fly-in: a dense shimmer of tiny metallic ring particles (all the
   * little sparkles of the trail) that starts the instant the crest launches,
   * riding a pretty rising bell arpeggio and a soft flight whoosh.
   */
  flyIn() {
    if (this.sfxMuted) return;
    this.ensure();
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    if (ctx.state === "suspended") void ctx.resume();
    this.ensureNoise();

    // Soft flight whoosh under the sparkle.
    if (this.noiseBuffer) {
      const t0 = ctx.currentTime;
      const whoosh = ctx.createBufferSource();
      whoosh.buffer = this.noiseBuffer;
      whoosh.loop = true;
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.Q.value = 1.2;
      band.frequency.setValueAtTime(320, t0);
      band.frequency.exponentialRampToValueAtTime(2400, t0 + 1.1);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.02, t0 + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.3);
      whoosh.connect(band);
      band.connect(gain);
      gain.connect(this.sfxBus);
      this.reverbSend(gain, 0.4);
      whoosh.start(t0);
      whoosh.stop(t0 + 1.5);
    }

    // Dense shimmer of tiny metallic ring particles — starts immediately and
    // keeps twinkling through the flight (all the small sparkles).
    this.glimmer(1.55, 0);

    // A pretty rising bell arpeggio from the launch, giving the flight shape.
    [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) =>
      this.bell(f, 0.5, 0.5, 0.55, 0.02 + i * 0.07),
    );

    // Soft landing shimmer as it settles.
    this.bell(1046.5, 0.5, 0.7, 0.6, 1.2);
    this.bell(1567.98, 0.44, 0.7, 0.6, 1.26);
  }

  /** A dense shimmer of tiny metallic ring particles — the sparkle trail. */
  private glimmer(duration = 1.6, startDelay = 0) {
    if (this.sfxMuted || !this.ctx) return;
    // High C-major-pentatonic bells → always consonant, never clangy.
    const notes = [
      1046.5, 1174.66, 1318.51, 1567.98, 1760.0, 2093.0, 2349.32, 2637.02,
      3135.96,
    ];
    const count = 54;
    for (let i = 0; i < count; i++) {
      // Front-loaded: a burst of particles up front, tapering along the trail.
      const delay = startDelay + Math.pow(Math.random(), 1.5) * duration;
      const freq = notes[Math.floor(Math.random() * notes.length)];
      this.twinkle(freq, delay);
    }
  }

  /** One tiny ringy metallic bell — a single sparkle particle. */
  private twinkle(freq: number, delay: number) {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime + delay;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.014, t + 0.005);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    if (typeof ctx.createStereoPanner === "function") {
      const pan = ctx.createStereoPanner();
      pan.pan.value = (Math.random() * 2 - 1) * 0.85;
      out.connect(pan);
      pan.connect(this.sfxBus);
    } else {
      out.connect(this.sfxBus);
    }
    this.reverbSend(out, 0.6);
    // Fundamental + octave + faint 3rd → a small ringy metallic bell.
    const partials = [
      { mult: 1, gain: 1 },
      { mult: 2, gain: 0.4 },
      { mult: 3, gain: 0.12 },
    ];
    for (const p of partials) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq * p.mult;
      const g = ctx.createGain();
      g.gain.value = p.gain;
      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + 0.36);
    }
  }

  // --- background music (real audio file) ---------------------------------

  private activeSong(): SongDef | null {
    const track = TRACKS.find((t) => t.id === this.trackId);
    return track && track.kind === "song" ? track.song : null;
  }

  private startMusic() {
    if (this.musicStarted || this.musicMuted) return;
    this.musicStarted = true;

    const track = TRACKS.find((t) => t.id === this.trackId) ?? TRACKS[0];
    if (track.kind === "file") {
      this.playFile(track.src);
    } else {
      this.startSong();
    }
  }

  private stopMusic() {
    this.musicStarted = false;
    if (this.songTimer !== null) {
      clearInterval(this.songTimer);
      const g = globalThis as { __soundFxSongTimer?: number | null };
      if (g.__soundFxSongTimer === this.songTimer) g.__soundFxSongTimer = null;
      this.songTimer = null;
    }
    if (this.hissSource) {
      try {
        this.hissSource.stop();
      } catch {
        // already stopped
      }
      this.hissSource = null;
    }
    if (this.music) {
      try {
        this.music.pause();
      } catch {
        // ignore
      }
      this.music = null;
    }
  }

  private playFile(src: string) {
    if (typeof Audio === "undefined") return;
    const el = new Audio();
    el.src = src;
    el.loop = true;
    el.preload = "auto";
    el.volume = this.musicMuted ? 0 : 1;
    // No file present? Stay silent — the user explicitly chose this track.
    el.addEventListener("error", () => {
      this.music = null;
    });
    this.music = el;
    const played = el.play();
    if (played && typeof played.catch === "function") played.catch(() => {});
  }

  // --- composed song scheduler --------------------------------------------

  private startSong() {
    if (this.songTimer !== null || !this.ctx) return;
    this.ensureNoise();
    this.songStep = 0;
    this.songNextTime = this.ctx.currentTime + 0.12;
    // A hot-reloaded copy of this module can leave a previous scheduler
    // ticking. Clear any globally-registered song timer before starting ours
    // so exactly one song ever plays at a time.
    const g = globalThis as { __soundFxSongTimer?: number | null };
    if (g.__soundFxSongTimer != null) clearInterval(g.__soundFxSongTimer);
    this.songTimer = window.setInterval(() => this.scheduleSong(), 140);
    g.__soundFxSongTimer = this.songTimer;
    this.scheduleSong();
  }

  private scheduleSong() {
    const ctx = this.ctx;
    const song = this.activeSong();
    if (!ctx || !song) return;
    const stepDur = 60 / song.bpm / 2;
    while (this.songNextTime < ctx.currentTime + 1.7) {
      this.playSongStep(this.songStep, this.songNextTime, song, stepDur);
      this.songStep = (this.songStep + 1) % LOOP_STEPS;
      this.songNextTime += stepDur;
    }
  }

  private playSongStep(step: number, t: number, song: SongDef, sd: number) {
    if (this.musicMuted) return;
    const bar = Math.floor(step / BAR_STEPS) % 4;
    const inBar = step % BAR_STEPS;
    const swing = inBar % 2 === 1 ? sd * song.swing : 0;

    if (inBar === 0) {
      this.rhodes(song.chords[bar], t, BAR_STEPS * sd * 0.95, 0.05);
      this.pad(song.pad[bar], t, BAR_STEPS * sd);
    } else if (inBar === 4) {
      this.rhodes(song.chords[bar], t, BAR_STEPS * sd * 0.45, 0.03);
    }

    if (inBar === 0 || inBar === 4) this.subBass(song.bass[bar], t, sd * 3.2);

    if (song.drums) {
      // Laid-back half-time groove: kick on the 1 plus a syncopated pickup,
      // a fat backbeat snare, and steady swung hats.
      if (inBar === 0) this.softKick(t);
      if (inBar === 6) this.softKick(t + swing);
      if (inBar === 4) this.softSnare(t);
      this.softHat(t + swing, inBar % 2 === 0 ? 0.03 : 0.02);
    }

    for (const note of song.melody) {
      if (note.t === step) {
        if (song.lead) this.leadSynth(note.f, t + swing, note.d * sd);
        else this.musicBox(note.f, t + swing, note.d * sd);
      }
    }
  }

  /** Warm FM electric-piano chord (Rhodes-ish). */
  private rhodes(freqs: number[], t: number, dur: number, peak: number) {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    for (const freq of freqs) {
      const car = ctx.createOscillator();
      car.type = "sine";
      car.frequency.value = freq;
      const mod = ctx.createOscillator();
      mod.type = "sine";
      mod.frequency.value = freq; // 1:1 ratio → mellow
      const modGain = ctx.createGain();
      modGain.gain.setValueAtTime(freq * 1.4, t);
      modGain.gain.exponentialRampToValueAtTime(freq * 0.25 + 1, t + dur * 0.5);
      mod.connect(modGain);
      modGain.connect(car.frequency);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
      g.gain.exponentialRampToValueAtTime(peak * 0.5, t + dur * 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      car.connect(g);
      g.connect(this.musicBus);
      this.reverbSend(g, 0.28);

      mod.start(t);
      car.start(t);
      mod.stop(t + dur + 0.05);
      car.stop(t + dur + 0.05);
    }
  }

  /** Bright, sweet music-box melody note. */
  private musicBox(freq: number, t: number, dur: number) {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    const car = ctx.createOscillator();
    car.type = "sine";
    car.frequency.value = freq;
    const mod = ctx.createOscillator();
    mod.type = "sine";
    mod.frequency.value = freq * 3.5; // inharmonic → bell shimmer
    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(freq * 1.2, t);
    modGain.gain.exponentialRampToValueAtTime(freq * 0.1 + 1, t + dur * 0.6);
    mod.connect(modGain);
    modGain.connect(car.frequency);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.1 + 0.1);
    car.connect(g);
    g.connect(this.musicBus);
    this.reverbSend(g, 0.42);

    mod.start(t);
    car.start(t);
    mod.stop(t + dur + 0.15);
    car.stop(t + dur + 0.15);
  }

  /**
   * Bright, expressive synth lead — detuned saws through a resonant lowpass
   * with a little vibrato and filter movement. The "super cool" melody voice.
   */
  private leadSynth(freq: number, t: number, dur: number) {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 6;
    filter.frequency.setValueAtTime(1300, t);
    filter.frequency.exponentialRampToValueAtTime(
      2800,
      t + Math.min(dur, 0.35),
    );

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.058, t + 0.02);
    g.gain.setValueAtTime(0.058, t + dur * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1);
    filter.connect(g);
    g.connect(this.musicBus);
    this.reverbSend(g, 0.3);

    // Vibrato LFO shared across the detuned voices for a singing lead.
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 5.5;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = freq * 0.008;
    lfo.connect(lfoGain);

    const oscs: OscillatorNode[] = [];
    for (const det of [-8, 8]) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = freq;
      o.detune.value = det;
      lfoGain.connect(o.frequency);
      o.connect(filter);
      oscs.push(o);
    }
    const body = ctx.createOscillator();
    body.type = "triangle";
    body.frequency.value = freq;
    lfoGain.connect(body.frequency);
    body.connect(filter);
    oscs.push(body);

    lfo.start(t);
    lfo.stop(t + dur + 0.12);
    for (const o of oscs) {
      o.start(t);
      o.stop(t + dur + 0.12);
    }
  }

  private subBass(freq: number, t: number, dur: number) {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 380;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    filter.connect(g);
    g.connect(this.musicBus);

    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = freq;
    const oct = ctx.createOscillator();
    oct.type = "sine";
    oct.frequency.value = freq * 2; // audible on small speakers
    const octGain = ctx.createGain();
    octGain.gain.value = 0.35;
    sub.connect(filter);
    oct.connect(octGain);
    octGain.connect(filter);
    sub.start(t);
    oct.start(t);
    sub.stop(t + dur + 0.05);
    oct.stop(t + dur + 0.05);
  }

  private pad(freqs: number[], t: number, dur: number) {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.028, t + dur * 0.3);
    g.gain.setValueAtTime(0.028, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.1);
    filter.connect(g);
    g.connect(this.musicBus);
    this.reverbSend(g, 0.35);
    const oscs: OscillatorNode[] = [];
    for (const freq of freqs) {
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = "triangle";
        o.frequency.value = freq;
        o.detune.value = det;
        o.connect(filter);
        oscs.push(o);
      }
    }
    for (const o of oscs) {
      o.start(t);
      o.stop(t + dur + 0.15);
    }
  }

  private softKick(t: number) {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    // Punchy body with a fast pitch drop.
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(155, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.56, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    o.connect(g);
    g.connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.28);
    // A short noise click gives the attack more definition.
    if (this.noiseBuffer) {
      const click = ctx.createBufferSource();
      click.buffer = this.noiseBuffer;
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(0.12, t);
      cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
      click.connect(cg);
      cg.connect(this.musicBus);
      click.start(t, 0.3);
      click.stop(t + 0.03);
    }
  }

  private softSnare(t: number) {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus || !this.noiseBuffer) return;
    // Tonal body for weight.
    const tone = ctx.createOscillator();
    tone.type = "triangle";
    tone.frequency.setValueAtTime(215, t);
    tone.frequency.exponentialRampToValueAtTime(150, t + 0.08);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.0001, t);
    tg.gain.exponentialRampToValueAtTime(0.13, t + 0.004);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    tone.connect(tg);
    tg.connect(this.musicBus);
    tone.start(t);
    tone.stop(t + 0.14);
    // Snappy noise on top.
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.17, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.musicBus);
    this.reverbSend(g, 0.26);
    src.start(t, 0.1);
    src.stop(t + 0.24);
  }

  private softHat(t: number, peak: number) {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus || !this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 1.6;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    // Kept under the music-bus warmth lowpass (6.8k) so the hats are audible.
    hp.frequency.value = 6000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.musicBus);
    src.start(t, 0.25);
    src.stop(t + 0.08);
  }

  // --- SFX audio graph ----------------------------------------------------

  private ensure() {
    if (this.ctx || typeof window === "undefined") return;
    const Ctor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;

    const ctx = new Ctor();
    this.ctx = ctx;

    this.master = ctx.createGain();
    // The single master volume; each bus below is a fixed level that can be
    // muted independently for music vs. effects.
    this.master.gain.value = this.masterVolume;

    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 12000;
    tone.Q.value = 0.4;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.2;

    this.master.connect(tone);
    tone.connect(limiter);
    limiter.connect(ctx.destination);

    this.reverbIn = ctx.createGain();
    this.reverbIn.gain.value = 1;
    const convolver = ctx.createConvolver();
    convolver.buffer = this.makeImpulse(2.4, 2.6);
    // Tame the bright fizz of the noise-based reverb tail so it reads as
    // "space" rather than static sitting on top of the mix.
    const reverbTone = ctx.createBiquadFilter();
    reverbTone.type = "lowpass";
    reverbTone.frequency.value = 5200;
    reverbTone.Q.value = 0.4;
    const reverbReturn = ctx.createGain();
    reverbReturn.gain.value = 0.3;
    this.reverbIn.connect(convolver);
    convolver.connect(reverbTone);
    reverbTone.connect(reverbReturn);
    reverbReturn.connect(this.master);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.sfxMuted ? 0 : SFX_LEVEL;
    this.sfxBus.connect(this.master);

    // Music runs through a warmth lowpass (lo-fi vibe) so the song stays
    // mellow while the SFX bus above keeps its sparkle.
    const warmth = ctx.createBiquadFilter();
    warmth.type = "lowpass";
    warmth.frequency.value = 6800;
    warmth.Q.value = 0.5;
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicMuted ? 0 : MUSIC_LEVEL;
    this.musicBus.connect(warmth);
    warmth.connect(this.master);

    // Spectrum tap for the track-picker visualizer (analysis only, no output).
    // Higher fftSize → fine bins so each bar can track its own frequency band.
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512; // → 256 frequency bins (~86 Hz each)
    this.analyser.smoothingTimeConstant = 0.7;
    this.musicBus.connect(this.analyser);
  }

  private makeImpulse(seconds: number, decay: number) {
    const ctx = this.ctx;
    if (!ctx) throw new Error("no context");
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  private reverbSend(source: AudioNode, amount: number) {
    const ctx = this.ctx;
    if (!ctx || !this.reverbIn) return;
    const send = ctx.createGain();
    send.gain.value = amount;
    source.connect(send);
    send.connect(this.reverbIn);
  }

  private ensureNoise() {
    if (this.noiseBuffer || !this.ctx) return;
    const length = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
  }

  // --- reusable voices ----------------------------------------------------

  /** Soft FM-ish bell/mallet — the interaction voice. */
  private bell(
    freq: number,
    peak: number,
    dur: number,
    reverb: number,
    delay = 0,
  ) {
    if (this.sfxMuted) return;
    this.ensure();
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    if (ctx.state === "suspended") void ctx.resume();
    this.startMusic();

    const t = ctx.currentTime + delay;
    const carrier = ctx.createOscillator();
    carrier.type = "sine";
    carrier.frequency.value = freq;
    const harm = ctx.createOscillator();
    harm.type = "sine";
    harm.frequency.value = freq * 2;
    const harmGain = ctx.createGain();
    harmGain.gain.value = 0.18;
    harm.connect(harmGain);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak * 0.16, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    carrier.connect(gain);
    harmGain.connect(gain);
    gain.connect(this.sfxBus);
    if (reverb > 0) this.reverbSend(gain, reverb * 0.16);

    carrier.start(t);
    harm.start(t);
    carrier.stop(t + dur + 0.05);
    harm.stop(t + dur + 0.05);
  }

  private blip(freq: number, peak: number, dur: number) {
    if (this.sfxMuted) return;
    this.ensure();
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    if (ctx.state === "suspended") void ctx.resume();
    this.startMusic();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak * 0.12, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  /** Rounded, rising-then-settling sine — a soft water-bubble pop. */
  private bloop(from: number, to: number, dur: number, delay: number) {
    if (this.sfxMuted) return;
    this.ensure();
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    if (ctx.state === "suspended") void ctx.resume();
    this.startMusic();
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + dur * 0.55);
    osc.frequency.exponentialRampToValueAtTime(to * 0.82, t + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.13, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    this.reverbSend(gain, 0.2);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private riser(dur: number) {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    this.ensureNoise();
    if (!this.noiseBuffer) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 2;
    bp.frequency.setValueAtTime(500, t);
    bp.frequency.exponentialRampToValueAtTime(4000, t + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.05, t + dur * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    src.connect(bp);
    bp.connect(gain);
    gain.connect(this.sfxBus);
    this.reverbSend(gain, 0.3);
    src.start(t);
    src.stop(t + dur + 0.1);
  }
}

export const soundFx = new SoundFx();

// Dev only: when Fast Refresh replaces this module, stop the outgoing copy's
// song so it doesn't keep looping underneath the fresh one.
const hotModule = (
  import.meta as unknown as {
    webpackHot?: { dispose(cb: () => void): void };
  }
).webpackHot;
if (hotModule) {
  hotModule.dispose(() => {
    try {
      soundFx.teardown();
    } catch {
      // best effort
    }
  });
}
