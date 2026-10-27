# The Buried Observatory improvement plan

Keep the five-room mystery, mouse-follow exploration, and continuous vertical descent. Improve the existing journey in this order.

## 1. Make scrolling part of a puzzle — complete

After returning the prism to the Broken Dome, aim its light through a mirror into the Archive receiver. Players must scroll between floors so both parts are visible together. The hidden writing appears only after the beam is aligned.

- Add an adjustable mirror in the Dome and a visible receiver on the Archive wall.
- Draw one continuous beam across the room boundary.
- Support dragging the mirror, plus buttons and keyboard controls for precise adjustment.
- Require both floors in view when locking the beam; no timing or scroll-speed challenge.
- Add objectives, progressive hints, journal context, and saved completion.
- Preserve existing saves: journeys that already revealed the projection keep their progress.
- Verify incorrect aim, off-screen attempts, the full solution, save recovery, and the standalone `play.html` edition.

Implemented in the modular game and regenerated `play.html`. The mirror is beside the Dome's southern stairs; its beam crosses the floor boundary to the Archive wall. Mouse dragging, keyboard aiming, touch scrolling, and view/aim buttons are supported. The framing check also prevents locking a receiver hidden behind the control panel on a short screen.

Validation completed:

- `npm test`: all 13 tests pass, including the complete connected solution and legacy-save migration.
- `node tools/browser-qa.mjs --full`: complete playthrough, wrong aim, cross-floor scrolling, keyboard/touch/drag controls, beacon ending, completed-save reload, and responsive layouts pass without browser exceptions.
- `node tools/browser-qa.mjs --light-only --portable`: standalone mirror interaction and saved-alignment reload pass.
- Desktop, narrow phone, and 390×568 short-phone layouts checked.
- Standards and specification review complete; shared handle geometry consolidated so drawing and dragging use the same position.

Gameplay pass implemented: movement → hands-on mechanisms → visible consequences → room layouts. Story pacing, the remaining journal work, and the ending follow afterward.

Gameplay pass validation:

- `npm test`: all 18 tests pass, including routes to every object, collision-safe paths, instrument drafts, physical hit areas, progression, and save migration.
- `node tools/browser-qa.mjs --full`: final complete journey through the beacon ending and completed-save reload passes without browser exceptions.
- `--movement-only`: mouse-follow detours, click-to-approach/investigate, and continuous held-key movement pass.
- `--instruments-only`: physical dial dragging, initial crank picking, crank operation, journal/reload drafts, visible draining water, turbine power, shutter tabs, and prism pickup pass.
- `--instruments-only --portable --reduced-motion`: standalone controls and gentler visual states pass on desktop, phone, and short-phone layouts.
- `--hidpi-only`: startup at 480×320 with DPR 2 and transitions back to desktop pass. Every QA screenshot checks the camera, canvas backing dimensions, and rendering transform against the actual displayed size.
- Standards/specification review completed. Crank collision/picking, shutter lower-edge hit areas, resize synchronization, and initial high-DPI transform issues were fixed and verified.

Payoff pass: complete story pacing, the illustrated journal, and a playable ascent with Elian. Keep the five rooms, current puzzle solutions, pixel art, and mouse-follow controls. Existing saves retain solved mechanisms.

All eight roadmap items are complete. Final payoff validation:

- `npm test`: all 27 tests pass.
- `node tools/browser-qa.mjs --full`: the complete descent, mirror return journey, beacon activation, companion ascent, Dome exit, completed-save reload, journal, audio, fullscreen, and responsive layouts pass without browser exceptions.
- `--journal-only` and `--journal-only --portable`: illustrated pages, pin replacement/removal, compact phone references, native Enter activation outside instrument mode, unfinished puzzle drafts, and saved pins pass.
- `--rescue-only`: reunion gate, rising signal, collision-safe following, interrupted-ascent reload, latched turbine power, phone exit, completion, and old-save migration pass.
- `--rescue-only --portable --reduced-motion`: the standalone rescue passes with steady restored light and both postgame choices visible on a short phone.
- Standards review found an Enter-key conflict on focused pinned-note buttons; it was fixed and browser-verified. Specification review found no gaps. Phone completion keeps the title and actions visible while the story scrolls separately.
- `play.html` regenerated; changes recorded with Conventional Commits.

### Payoff implementation and acceptance

- Early notes describe an uncharted passage, rising water, and a dry ledge. Footprints at the satchel, a one-time captioned/audible pipe discovery, and an unfinished Lens diagram build the trail. Elian explains the rescue purpose at reunion.
- The journal shows a discovered-page list beside a selected illustrated note on desktop, stacked on phones. One discovered note can be pinned/replaced/unpinned and survives reloads. Desktop shows the pinned sketch and text; widths ≤800px or heights ≤600px use a compact reference button. Consulting any note preserves puzzle drafts.
- `flags.beaconLit` starts the ascent; `flags.finished` now means escaping through the Dome. Talk with Elian before lighting the beacon. Light blooms locally and rises through the rooms, then the player returns upward with Elian following collision-safe routes. Floor changes place both near a valid stair arrival; navigation/animation timing are transient.
- The ascent keeps all rooms accessible and latches turbine power. The Dome's upper gate opens and becomes the final interaction. Completion explicitly says “You and Elian made it home,” with options to revisit or begin a new descent through the existing restart confirmation.
- Reloading during ascent restores Elian near the player and steady lighting without replaying activation. Older completed saves migrate to both completion flags true. Invalid pin references are discarded; discovered notes, inventory, drafts, and solved mechanisms remain valid.
- Reduced motion shows steady restored light without signal travel. There are no timers, escort failures, or additional puzzles.
- Verify local discoveries, pin eligibility/persistence, draft preservation, signal/reunion/exit gates, companion navigation, interrupted ascent, legacy saves, desktop/phone layouts, high-DPI resize, reduced motion, the complete journey, and `play.html`.
- Apply redesign-existing-projects to journal readability and placement; animate to the one-time signal and restored-world feedback; implement/code-review workflows to delivery and review. Use Conventional Commits.

## 2. Give each room a distinct shape — complete

Introduce a collapsed Dome, narrow Archive aisles, Pump Room catwalks, and a circular Lens Chamber. Match collision geometry to the artwork and preserve reachable objects.

The Dome now has fallen masonry, the Archive has shelf aisles, the Pump Room has walkways around a deep water basin, and the Lens Chamber sits on a curved platform over a dark drop. Shared feature geometry drives both rendering and collision. Every interactable has a tested approach route from its room entrance; old positions inside newly blocked areas recover to a safe arrival.

## 3. Manipulate mechanisms inside the room — complete

Keep the introductory symbol lock, then vary later puzzles with rotating mirrors, movable prisms, and valves whose effects are visible in the room.

The first lock stays an introductory dialog. Later actions happen in the room: drag/tap the Pump Room's brass dials, turn its physical crank, pull the water-routing lever, collect the prism, aim the shaft mirror, and lift four shutter tabs in sequence. Nonmodal button/keyboard equivalents remain available. Pickups and lever operation no longer open explanatory dialogs. Instrument drafts persist through journal visits and reloads.

## 4. Smooth movement around objects — complete

Add obstacle avoidance and an optional click-to-approach-and-investigate interaction while retaining mouse-follow movement by default.

Mouse-follow movement routes around walls, fixtures, shelves, and basin edges. Clicking a distant object walks the explorer over and investigates on arrival. Continuous held-key movement uses direct collision-safe control; pointer movement can cancel an approach. Speed increased from 67 to 94 world units per second, and routes are smoothed to avoid grid-shaped movement. Navigation grids warm during idle time.

## 5. Reveal Elian's story gradually — complete

Spread the transmitter explanation and rescue plan across footprints, sounds, unfinished diagrams, and later discoveries.

The opening letter and Archive page no longer explain the transmitter or rescue plan. The satchel records a fresh trail, the Pump Room records captioned pipe taps only once, and the Lens schematic becomes a discoverable journal entry. The beacon reunion reveals what the observatory was for. Discovery and progression tests pass.

## 6. Make solved puzzles transform the observatory — complete

Show water draining, the turbine spinning, light crossing floors, and shutters opening in order. Make each solved mechanism visibly change the environment.

Water visibly recedes from the basin, the routing lever moves as turbine power rises/falls, the waterwheel spins with power, and shutter leaves lift as their tabs are operated. Pickups disappear from their housings/desks, solved doors expose stairs, and successful operations produce a brief local glow and a distinct sound cue when audio is enabled. Reduced-motion mode uses immediate water/lever/shutter states and keeps the wheel still.

## 7. Improve the journal during puzzles — complete

Add clue sketches, a pinned-clue view, and persistent unfinished puzzle inputs when consulting notes.

Illustrated pages, a selected-note reading view, and one saved pinned clue are implemented. Desktop keeps a compact sketch/text reference visible; small screens use a reference button that opens the note and returns to the current puzzle. Introductory dials, pump dials, and unfinished shutter sequences persist throughout. Browser checks cover changing/removing pins, phone references, journal visits, and reloads.

## 8. Give the ending a playable payoff — complete

Let the beacon beam rise through the unlocked floors, wake the machinery, and reveal the answering light before Elian's final line.

The complete playable ascent is implemented and verified: reunion before beacon activation, a rising signal, Elian's collision-safe following, restored rooms, latched power, a visible Dome exit, and an explicit completion screen. Interrupted-ascent and legacy-completion saves are checked. Full-journey, standalone, reduced-motion, phone-layout, and review checks are complete.
