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

Items 2–8 remain planned for later work.

## 2. Give each room a distinct shape — planned

Introduce a collapsed Dome, narrow Archive aisles, Pump Room catwalks, and a circular Lens Chamber. Match collision geometry to the artwork and preserve reachable objects.

## 3. Manipulate mechanisms inside the room — planned

Keep the introductory symbol lock, then vary later puzzles with rotating mirrors, movable prisms, and valves whose effects are visible in the room.

## 4. Smooth movement around objects — planned

Add obstacle avoidance and an optional click-to-approach-and-investigate interaction while retaining mouse-follow movement by default.

## 5. Reveal Elian's story gradually — planned

Spread the transmitter explanation and rescue plan across footprints, sounds, unfinished diagrams, and later discoveries.

## 6. Make solved puzzles transform the observatory — planned

Show water draining, the turbine spinning, light crossing floors, and shutters opening in order. Make each solved mechanism visibly change the environment.

## 7. Improve the journal during puzzles — planned

Add clue sketches, a pinned-clue view, and persistent unfinished puzzle inputs when consulting notes.

## 8. Give the ending a playable payoff — planned

Let the beacon beam rise through the unlocked floors, wake the machinery, and reveal the answering light before Elian's final line.
