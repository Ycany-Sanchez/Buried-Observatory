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

Next work: item 5 (story pacing), the remaining item 7 journal work, and item 8 (a playable ending). Start a new descent to replay the revised puzzles; existing saves retain their solved mechanisms.

## 2. Give each room a distinct shape — complete

Introduce a collapsed Dome, narrow Archive aisles, Pump Room catwalks, and a circular Lens Chamber. Match collision geometry to the artwork and preserve reachable objects.

The Dome now has fallen masonry, the Archive has shelf aisles, the Pump Room has walkways around a deep water basin, and the Lens Chamber sits on a curved platform over a dark drop. Shared feature geometry drives both rendering and collision. Every interactable has a tested approach route from its room entrance; old positions inside newly blocked areas recover to a safe arrival.

## 3. Manipulate mechanisms inside the room — complete

Keep the introductory symbol lock, then vary later puzzles with rotating mirrors, movable prisms, and valves whose effects are visible in the room.

The first lock stays an introductory dialog. Later actions happen in the room: drag/tap the Pump Room's brass dials, turn its physical crank, pull the water-routing lever, collect the prism, aim the shaft mirror, and lift four shutter tabs in sequence. Nonmodal button/keyboard equivalents remain available. Pickups and lever operation no longer open explanatory dialogs. Instrument drafts persist through journal visits and reloads.

## 4. Smooth movement around objects — complete

Add obstacle avoidance and an optional click-to-approach-and-investigate interaction while retaining mouse-follow movement by default.

Mouse-follow movement routes around walls, fixtures, shelves, and basin edges. Clicking a distant object walks the explorer over and investigates on arrival. Continuous held-key movement uses direct collision-safe control; pointer movement can cancel an approach. Speed increased from 67 to 94 world units per second, and routes are smoothed to avoid grid-shaped movement. Navigation grids warm during idle time.

## 5. Reveal Elian's story gradually — planned

Spread the transmitter explanation and rescue plan across footprints, sounds, unfinished diagrams, and later discoveries.

## 6. Make solved puzzles transform the observatory — complete

Show water draining, the turbine spinning, light crossing floors, and shutters opening in order. Make each solved mechanism visibly change the environment.

Water visibly recedes from the basin, the routing lever moves as turbine power rises/falls, the waterwheel spins with power, and shutter leaves lift as their tabs are operated. Pickups disappear from their housings/desks, solved doors expose stairs, and successful operations produce a brief local glow and a distinct sound cue when audio is enabled. Reduced-motion mode uses immediate water/lever/shutter states and keeps the wheel still.

## 7. Improve the journal during puzzles — planned

Add clue sketches, a pinned-clue view, and persistent unfinished puzzle inputs when consulting notes.

Partial progress: introductory dials, pump dials, and unfinished shutter sequences now persist. Clue sketches and a pinned-clue view remain planned.

## 8. Give the ending a playable payoff — planned

Let the beacon beam rise through the unlocked floors, wake the machinery, and reveal the answering light before Elian's final line.
