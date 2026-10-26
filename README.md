# The Buried Observatory

A complete, five-room pixel-art browser mystery that fills the browser window. Move the mouse to lead the explorer, click nearby objects, and scroll continuously through unlocked rooms. Earlier clues become useful deeper in the observatory.

Open `play.html` directly in a modern browser for the self-contained edition. It includes all game code and artwork. No server or installation is required. Browser-local saves depend on your browser allowing storage for local files. Online fonts are optional and have local fallbacks.

## Run locally

Requires Node.js 20 or newer. No runtime dependencies or build step.

```sh
npm start
```

Open http://127.0.0.1:4173. Run the progression checks with `npm test`.

The `dist/` directory is a standalone static site. Deploy it unchanged to any static host. Fonts have local fallbacks; gameplay needs no external APIs.

To regenerate the self-contained edition after editing, run `node tools/build-portable.mjs`.

## Controls

- Mouse: guide explorer; click nearby objects.
- Scroll down anywhere to descend; scroll up to revisit earlier chambers. Scrolling follows the wheel or trackpad continuously and stops at locked boundaries.
- Arrow keys or WASD: supplementary movement. Enter/E: nearby interaction.
- Page Down/Up: move the view one chamber. J: journal. H: hints. F: toggle fullscreen. Escape: close dialog/menu.
- Expedition button: review current objective, unlocked rooms, and inventory.
- Shaft mirror: after installing the prism, investigate the mirror beside the Dome's southern stairs. Scroll partway down to frame the mirror and Archive receiver together. Drag the handle or use Left/Right to aim, then Enter to lock. Up/Down and the view buttons adjust the scroll; Escape leaves adjustment. Touch players can swipe the canvas while adjusting.

Progress autosaves to versioned browser-local storage. Starting a new journey requires confirmation. Audio starts muted; enable it with the sound button.

## Structure

- `dist/state.mjs`: pure puzzle transitions, save restoration, objectives, and contextual hints.
- `dist/rooms.mjs`: geometry, collision, stairways, and interactive object definitions.
- `dist/camera.mjs`: continuous scrolling, viewport fitting, and coordinate conversion.
- `dist/light.mjs`: cross-floor light geometry, framing, and alignment checks.
- `dist/art.mjs`: crisp pixel rendering, room decoration, effects, and asset composition.
- `dist/game.mjs`: input, UI, animation, audio, and persistence.
- `tests/state.test.mjs`: full solution, reversible water state, invalid inputs, and save recovery.
- `tests/camera.test.mjs`: scroll boundaries, trackpad/wheel units, and screen-to-world mapping.
- `tests/light.test.mjs`: cross-floor framing, incorrect aim, progression gating, and old-save migration.

With local Chrome installed, `node tools/browser-qa.mjs --full` checks the complete journey. Use `--light-only` for the mirror interaction, or `--light-only --portable` to check it in the self-contained edition. The browser checks use an isolated QA profile.

## Art

Room illustrations and explorer art generated with the imagegen skill. Gameplay collision and interaction geometry are maintained in code. Interface feedback follows the animate skill. Playwright installation was unavailable in the build environment, so browser verification used local Chrome through the Chrome DevTools Protocol.

## Solution (spoilers)

1. Read the Dome mural; set the first seal to crescent, star, sun.
2. Read the Archive memorandum and Elian’s note, collect the maintenance key, open the southern lock.
3. Set the Pump Room regulator to sun, star, crescent; read the sluice plaque.
4. Collect the Lens Chamber prism; return to the Dome and install it in the projector. Use the shaft mirror beside the southern stairs; scroll halfway toward the Archive, aim at the silver receiver below, and lock the beam.
5. Read the now-lit Archive wall. Route water to the generator in the Pump Room.
6. In the Lens Chamber open shutters 2, 4, 1, 3 and align them.
7. Descend, speak with Elian, and light the beacon.
