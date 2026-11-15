A.R.E.S. Tactical EVA Navigator — Team User Manual

Live App Link: https://mars-bar.vercel.app (or your exact Vercel URL)
GitHub Code Repo: https://github.com/Ac-Ey/mars_bar

1. How to Run Locally (If Editing Code)

⚬ Clone repo: git clone [https://github.com/Ac-Ey/mars_bar.git](https://github.com/Ac-Ey/mars_bar.git)
⚬ Open folder: cd mars_bar
⚬ Install packages: npm install
⚬ Start server: npm run dev (opens at http://localhost:5173/)

2. Main Controls & Features

A. Toggle NASA Multi-Mission Layers (Left Panel)

⚬ Optical Surface Imagery (MRO HiRISE): High-res orbital surface basemap of Jezero Crater.
⚬ Topographic Slope Hazards (HiRISE DTM): Highlights steep cliffs (>15°) as red No-Go zones to prevent spacesuit tip-overs.
⚬ Mineral & Biosignatures (MRO CRISM): Marks high-value hydrated silica and carbonate science targets.
⚬ Radiation & Thermal Inertia (MSL RAD + Odyssey THEMIS): Shows radiation dose rates and soft dust traps.
⚬ Data Overlay Opacity Slider: Adjust transparency (15%–100%) to inspect the raw orbital surface beneath the polygons.

B. Click-to-Route A Pathfinder (Center Map)*

⚬ Click anywhere on the map to set a custom target (A* TGT).
⚬ The built-in 50×50 A* pathfinder calculates an outbound route around simulated >15° slope hazards and blocked dust traps, displaying distance (m) and simulated outbound O₂ consumption (%) at the bottom. Hazard avoidance stays active even when a layer is hidden.
⚬ Click inside a red NO-GO slope zone to test the safety block alert.
⚬ Use the Move EVA-1 button (bottom right of map) to simulate astronaut movement between the rover and science outcrop.

C. Waypoint Inspection & Rover POV Photos (Right Panel)

⚬ Click any map pin (HAB-01, RVR-04, SCI-A, SCI-B) to view elevation, slope angle, mineral signatures, and radiation levels.
⚬ Click the ground-level NASA Perseverance photo card to expand it full-screen.

D. Helmet Visor AR HUD Mode (Top Bar Toggle)

⚬ Click Helmet Visor HUD in the top header to switch into a first-person astronaut visor overlay.
⚬ Shows live compass heading tape, suit incline pitch, distance-to-target AR lock box, and ground-level terrain imagery.
⚬ Use the bottom Visor Waypoint Lock buttons (HAB-01 to SCI-B) to switch views.

E. Contingency & Emergency Simulator (Bottom Left)

⚬ Simulate Solar Flare (SEP): Triggers a simulated radiation spike, turns the HUD/visor red, and calculates an A* escape route from EVA-1 to HAB-01, the only explicitly radiation-shielded shelter. RVR-04 is not a radiation shelter.
⚬ Simulate Suit O₂ Drop: Sets simulated oxygen to 41% and routes to the closest reachable oxygen support by routed distance (RVR-04 or HAB-01).
⚬ Restore Nominal EVA Plan: Resets all suit vitals and restores the primary science route.

3. 60-Second Live Pitch Demo Order

1. Start on Tactical Map and toggle the 4 NASA layers + opacity slider.
2. Click above the red SLOPE 22° zone to show live A* obstacle avoidance, then click inside the red zone to trigger the safety warning.
3. Switch to Helmet Visor HUD in the header and cycle through SCI-A and RVR-04.
4. Click Simulate Solar Flare (SEP) to demonstrate real-time emergency rerouting.

## Dynamic escape routing and oxygen planning

The dashboard keeps the original map, NASA image assets, layer controls, waypoint cards, photo lightbox, and helmet visor. The green traverse remains a reference plan. The amber A* line shows the current outbound plan; a red dashed A* line takes priority during emergencies. The recommended emergency pin has a red outline.

The emergency panel shows type, destination, escape distance, travel time, remaining O₂, escape O₂ requirement, and feasibility warnings. Moving EVA-1 immediately recalculates the route. If no eligible destination is reachable, the app shows a no-safe-route warning and draws no escape line. If the terrain route exists but oxygen is insufficient, the route stays visible with NO-GO and an explicit oxygen warning. Clicking map terrain during an emergency cannot override the escape route; waypoint/photo inspection remains available.

The EVA O₂ / RETURN SAFETY panel plans EVA-1 → selected waypoint (or custom map target) → HAB-01. Outbound and return legs are calculated separately using the same A* implementation. Selecting a waypoint clears a custom target. During emergencies this calculator remains a mission preview; the emergency panel describes the immediate escape without exploration or a further return leg.

### Simulation formulas

All oxygen percentages are percentage points of a full illustrative suit tank:

- Walking O₂ = routed distance in meters ÷ 100 × 1.4% (the existing app's simulation coefficient).
- Exploration O₂ = exploration minutes × 0.2%.
- Total requirement = outbound O₂ + return O₂ + exploration O₂ + configured reserve.
- O₂ left after mission = available O₂ − outbound O₂ − return O₂ − exploration O₂. The reserve must remain in this balance; it is not an extra activity that consumes oxygen.
- Travel minutes = routed meters ÷ 1.2 m/s ÷ 60. The suit's remaining walking-time estimate uses these same simulation coefficients.
- GO means the mission fits while preserving the full reserve. CAUTION means travel and exploration fit but the reserve would be short. NO-GO means oxygen is insufficient even before reserve, a route is unavailable, or inputs are invalid.

Available O₂, exploration time, and reserve can be edited in the panel. Starting or restoring a scenario resets available O₂ to its sample value (84% nominal, 79% solar flare, 41% oxygen drop); exploration and reserve settings persist. Calculations keep full precision internally and round only for display. A zero-distance route consumes zero walking O₂.

### Browser verification

Run `npm run dev` and open the local URL printed by Vite (normally http://localhost:5173).

1. With default settings, select SCI-A: the total requirement should be about **31.7%**, including the 15% reserve and 30 minutes of exploration. Set available O₂ to 25% for CAUTION and 10% for NO-GO; 84% restores GO.
2. Change exploration time and reserve; verify the component estimates and total update. Click a different waypoint or a map target to change the routed outbound and return distances.
3. Click a red slope polygon or the dust-trap center (50% across, 82% down): expect a persistent blocked-target warning and a NO-GO mission preview. Hide the relevant layer and repeat; hazards must still block routing.
4. Trigger Solar Flare: expect HAB-01, a red dashed route, and a warning that RVR-04 is not radiation-safe. Use Move EVA-1 to Rover: the route should now start at RVR-04 and the escape distance should decrease.
5. Trigger Suit O₂ Drop while at RVR-04: expect RVR-04, zero distance/time/escape oxygen, and an already-at-destination message. Move back toward SCI-A to see a recalculated route to RVR-04.
6. Away from the destination, set available O₂ to 0%: expect an oxygen-feasibility NO-GO warning while the terrain escape route remains visible. Increase oxygen and reserve to inspect GO/CAUTION transitions.
7. Switch between Tactical Map and Helmet Visor HUD; the escape banner must use the calculated destination/distance. Inspect other waypoints and the photo lightbox during the emergency: inspection must not redirect the escape route.
8. Restore Nominal EVA Plan: the emergency panel/route disappear, and normal planning resumes.

### Checks and code layout

Run `npm test`, `npm run lint`, and `npm run build`. Tests use Node's built-in test runner (no added dependencies).

- `src/App.jsx`: existing dashboard, state, derived plans, map and visor integration.
- `src/missionData.js`: existing waypoint metadata, explicit shelter/oxygen capabilities, reference traverse.
- `src/navigation.js`: extracted and hardened 50×50 A*; shared hazard geometry used by both routing and map drawing.
- `src/missionSafety.js`: simulation coefficients, oxygen budget, round-trip and emergency planning.
- `src/SafetyPanels.jsx`: oxygen controls and emergency information using the existing dashboard colors and typography.
- `src/navigation.test.js`, `src/missionSafety.test.js`: hazard avoidance, exact endpoints, blocked/disconnected terrain, diagonal corner blocking, shelter eligibility/ranking, movement/arrival, resource formulas, invalid inputs, and decision thresholds.

### Assumptions and limitations

**Simulation only; not validated real-world astronaut life-support predictions.** NASA image references are distinct from fictional waypoint placement, terrain geometry, threshold rules, and numeric telemetry. Existing imagery/instrument captions are retained; they do not establish georeferenced measurements for these simulated positions.

The map assumes 10 meters per percentage unit (a schematic 1 km square). The 50×50 grid conservatively blocks any cell touching a hazard, so it can reject narrow passages or safe points close to a hazard. A* retains the original lower traversal cost near the science outcrop; it optimizes grid traversal cost rather than a continuous shortest-distance path. Emergency candidates are compared by the distances of their calculated routes. To add destinations, explicitly set `radiationShelter` and/or `oxygenSupport`; names/types never imply protection.

HAB-01 is assumed to provide oxygen and radiation shelter based on its existing scenario description. RVR-04 only provides oxygen support, with accessible spare tanks assumed. Surface transit during a flare is still exposed: there is no radiation-dose integration or shielding validation. The whole surface radiation overlay cannot be avoided by terrestrial routing; the planner heads to shelter while warning about exposure.

Walking speed and oxygen rates are constant; terrain-driven exertion, tank pressure, equipment failure, continuing leaks, battery limits, and actual physiology are not modeled. The movement button teleports between two demo positions without time progression or automatic oxygen depletion. Remaining O₂ is the editable scenario supply, not a live sensor stream. The normal return destination is HAB-01; the green multi-stop reference traverse is not treated as the calculator's mission itinerary.

## Science Operations Deck
The navigator now supports hands-on field science as well as safe traversal. A **Science Operations** deck below the map has three linked tools. All values are illustrative simulation data based on published Jezero Crater mineralogy; they are not calibrated NASA measurements.
### 1. Interactive Field Science & Sample Logger
Collect and log science at each waypoint (HAB-01, RVR-04, SCI-A, SCI-B):
- **Sample collection**
  - **Drill Core**: only at science targets (SCI-A, SCI-B). 0.12 kg per tube.
  - **Regolith Scoop**: at any waypoint. 0.09 kg per tube.
- **Suit sample tube capacity**: a 10-tube bar fills as you collect (e.g. `4 / 10 tubes`). Total **payload mass** is tracked live.
- **Virtual proximity instruments**
  - **SHERLOC** (deep-UV Raman): looks for organic signatures (e.g. a Raman G-band candidate at SCI-A).
  - **PIXL** (X-ray fluorescence): bar chart of the main rock chemistry (SiO₂, FeO, MgO, SO₃, CaO).
  - **SuperCam** (LIBS + VISIR): elemental and hydration confirmation.
- **Science time budget**: each action adds simulated EVA minutes (core 12, scoop 5, SHERLOC 6, PIXL 8, SuperCam 3).
- **Field notes**: timestamped notes for each waypoint.
- **Sample manifest**: a list of every tube (waypoint, type, mass, time), with an option to discard.
- **Persistent**: samples, scans and notes are saved in `localStorage` and survive a page reload.
- **Contingency lock**: all science actions are disabled during a Solar Flare or O₂ Leak emergency.
- 
### 2. CRISM / PIXL Spectral Signature Analyzer
Explains *why* a target has its biosignature priority:
- **Reflectance spectrum (1.0–2.6 µm)**: a mixed spectrum for the selected waypoint, with an optional overlay of each mineral's individual curve.
- **Interactive absorption bands**: hover a marked band to see its cause, e.g.
  - `1.41 µm`: Si-OH / H₂O overtone
  - `1.91 µm`: molecular H₂O
  - `2.21 µm`: Si-OH (diagnostic for hydrated silica)
  - `2.30 / 2.50 µm`: carbonate doublet (diagnostic for Mg-carbonates)
- **Mineral composition breakdown**: percentage of each mineral (e.g. SCI-A: 46% hydrated silica, 31% Fe/Mg smectite, 23% sulfate).
- **Biosignature priority breakdown**: the score (e.g. **98%** for SCI-A) is split into Aqueous Alteration, Organic Preservation, Context Value and Access/Safety, with a short scientific explanation.
- 
### 3. Science Priority Scoring Along Routes (Science Yield Score)
Compare routes by **Safety vs. Science Return** for any waypoint or custom map target:
- **Two A\* routes** are computed from the astronaut's position:
  - **Safety-Optimal**: the standard shortest safe path.
  - **Science-Weighted**: the path is pulled toward the CRISM deposits (Hydrated Silica, Mg-Carbonates) by lowering the travel cost of cells near them.
- **Hazards are never relaxed**: both routes stay out of slope no-go zones and dust traps.
- **Science Score (0–100)** = 75% weighted closest approach to each deposit + 25% distance walked inside deposit zones (full credit at 300 m).
- **Safety Score (0–100)** = 70% minimum clearance from hazards (full credit at 80 m) + 30% distance efficiency compared with the safest route.
- **Per-deposit comparison**: e.g. `Hydrated Silica 40% → 100% proximity`.
- **Map overlay**: select the Science-Weighted card to draw its route in pink. The mineral layer also shows each deposit's influence zone (2.5× its outline).
