# Urgency Blinkers

Urgency blinkers are small status cues, not decorative lighting. They should be calm enough to leave running on a dashboard without tiring the user.

## Statuses

- `idle`: no blink. Use for complete, low-risk, or informational states.
- `watch`: slow blue pulse. Use when the user may want awareness, but no immediate action is required.
- `attention`: standard blue urgency pulse. Use when the current selection needs action or review.
- `urgent`: faster pulse. Use only for time-sensitive work, failure states, or deadline pressure.
- `paused`: no animation. Use while dropdowns, menus, modal overlays, drag/orbit interactions, or reduced-motion settings are active.

## Standard Blink Rates

| Status | CSS variable | Duration | Motion |
| --- | --- | ---: | --- |
| `idle` | none | none | static |
| `watch` | `--sound-urgency-blink-watch` | `4.2s` | low pulse |
| `attention` | `--sound-urgency-blink-attention` | `3.2s` | medium-low pulse |
| `urgent` | `--sound-urgency-blink-urgent` | `2.2s` | medium pulse |
| `paused` | none | none | static |

## Implementation Rules

- Use shared CSS variables for blink timing instead of one-off animation durations.
- Blink only the smallest useful status marker or pill.
- Do not blink body copy, large headings, whole cards, or full containers.
- Standard app urgency is blue or cyan. Reserve amber or red for deadlines, errors, or destructive risk.
- Pause blinkers while menus, dropdowns, draggable controls, orbit interactions, or reduced-motion preferences are active.
- Keep sheen subtle: it should read as a status cue, not a sweep across the whole interface.
