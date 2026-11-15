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
⚬ Topographic Slope Hazards (USGS HiRISE DTM): Shows cells above the 15° slope threshold as red No-Go areas; the source crop's maximum slope is 58.6°.
⚬ Mineral & Biosignatures (MRO CRISM): Marks high-value hydrated silica and carbonate science targets.
⚬ Radiation & Thermal Inertia (MSL RAD + Odyssey THEMIS): Shows simulated surface dose rates.
⚬ Data Overlay Opacity Slider: Adjust transparency (15%–100%) to inspect the raw orbital surface beneath the overlays.

B. Dynamic A* Pathfinder (Center Map)

⚬ The green traverse is a reference; the amber A* route is calculated from EVA-1's current position to the selected waypoint or a custom map target.
⚬ Click safe terrain to set a custom target (A* TGT). The 50×50 pathfinder avoids grid cells classified as No-Go by the USGS HiRISE slope mask; the route distance (m) and simulated outbound O₂ use appear below the map.
⚬ Click a blocked red cell to see the NO-GO warning. Hiding the slope overlay changes only its visibility; blocked cells still prevent routing.
⚬ Routes recalculate when the target or EVA-1's position changes. Emergency scenarios calculate an escape route to an eligible reachable destination.
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

F. Live EVA Walk (Left Panel)

⚬ Select a target, then use Start EVA to walk along its A* route. Pause or resume the simulation at any time; Reset returns to the start of the current walk and restores the oxygen present when that walk began.
⚬ Choose 1x, 10x, 20x, or 50x simulation speed (20x by default). EVA-1's map marker, route planning, emergency routing, and displayed O₂ follow the simulated walk.
⚬ The return-safety check compares current O₂ with the A*-routed oxygen cost back to HAB-01 plus the configured reserve. OK means the reserve is preserved; WARNING means the remaining margin is small; TURN BACK means the reserve would be spent; CRITICAL means there is not enough O₂ for the return; NO ROUTE HOME means A* cannot find a safe return path.
⚬ Trigger Solar Flare or Suit O₂ Drop during a walk to reroute EVA-1 from its current position to the appropriate emergency destination, preserving current O₂. These are simulations, not validated life-support predictions.

G. Latest Perseverance Images (Below the Dashboard)

⚬ The horizontal strip requests recent public raw images from NASA's Mars 2020 feed, sorted by rover sol.
⚬ Up to six unique frames are shown with their instrument and sol. EBY and ECM image products from the same frame are deduplicated.
⚬ Select a thumbnail to open the existing full-screen image lightbox at the larger image resolution. Close the lightbox to return to the dashboard.
⚬ The feed is cached in memory for 10 minutes and the request times out after 6 seconds. If the feed is unavailable, the strip displays an unavailable/archive status; the rest of the dashboard remains usable.

3. 60-Second Live Pitch Demo Order

1. Start on Tactical Map and toggle the four map layers + opacity slider.
2. Click safe terrain near a red slope cell to show A* obstacle avoidance, then click a red cell to trigger the safety warning.
3. Switch to Helmet Visor HUD in the header and cycle through SCI-A and RVR-04.
4. Click Simulate Solar Flare (SEP) to demonstrate real-time emergency rerouting.
5. Start the Live EVA Walk toward a selected target; show the moving marker, O₂ burn, and return-safety status. Trigger an emergency to show a mid-walk reroute.
6. Scroll below the dashboard, open a recent Perseverance thumbnail, and show it in the full-screen lightbox.

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
3. Click a red slope cell: expect a persistent blocked-target warning and a NO-GO mission preview. Hide the slope layer and repeat; the real-terrain hazard must still block routing.
4. Trigger Solar Flare: expect HAB-01, a red dashed route, and a warning that RVR-04 is not radiation-safe. Use Move EVA-1 to Rover: the route should now start at RVR-04 and the escape distance should decrease.
5. Trigger Suit O₂ Drop while at RVR-04: expect RVR-04, zero distance/time/escape oxygen, and an already-at-destination message. Move back toward SCI-A to see a recalculated route to RVR-04.
6. Away from the destination, set available O₂ to 0%: expect an oxygen-feasibility NO-GO warning while the terrain escape route remains visible. Increase oxygen and reserve to inspect GO/CAUTION transitions.
7. Switch between Tactical Map and Helmet Visor HUD; the escape banner must use the calculated destination/distance. Inspect other waypoints and the photo lightbox during the emergency: inspection must not redirect the escape route.
8. Restore Nominal EVA Plan: the emergency panel/route disappear, and normal planning resumes.
9. With internet access, confirm that the latest-image strip loads, shows up to six thumbnails, and opens an image in the full-screen lightbox. If NASA's feed is unavailable, confirm the strip displays its unavailable/archive status and the rest of the dashboard still works.
10. Start a Live EVA Walk to SCI-A and verify that the map marker moves and O₂ falls. Pause/resume it and change simulation speed. Confirm the return-safety banner progresses through its warning states as the remaining oxygen margin shrinks, then reset the walk.
11. Start another walk, trigger Solar Flare or Suit O₂ Drop mid-walk, and verify that the escape route begins at the current EVA-1 position and uses the walk's remaining O₂ rather than resetting it to the scenario's starting value.

### Checks and code layout

Run `npm test`, `npm run lint`, and `npm run build`. Tests use Node's built-in test runner (no added dependencies).

- `src/App.jsx`: existing dashboard, state, derived plans, map and visor integration.
- `src/missionData.js`: existing waypoint metadata, explicit shelter/oxygen capabilities, reference traverse.
- `src/navigation.js`: extracted and hardened 50×50 A*; shared hazard geometry used by both routing and map drawing.
- `src/realTerrain.js`, `src/data/jezeroTerrain.json`, `src/terrainView.js`: load the HiRISE-derived 50×50 hazard grid for routing and render the same blocked cells on the map.
- `src/terrainGrid.test.js`, `src/terrainView.test.js`: real-grid routing and map-rectangle coverage.
- `src/missionSafety.js`: simulation coefficients, oxygen budget, round-trip and emergency planning.
- `src/SafetyPanels.jsx`: oxygen controls and emergency information using the existing dashboard colors and typography.
- `src/evaWalk.js`, `src/useEvaWalk.js`, `src/EvaWalkPanel.jsx`: route walking and O₂ consumption, animation/speed controls, return-safety checks, and walk controls.
- `src/evaWalk.test.js`: route interpolation, simulated O₂ use, speed, and return-safety status tests.
- `src/LiveRoverStrip.jsx`, `src/liveFeed.js`: NASA raw-image feed request, image normalization/deduplication, short-lived cache, thumbnail strip, and image lightbox integration.
- `src/navigation.test.js`, `src/missionSafety.test.js`: hazard avoidance, exact endpoints, blocked/disconnected terrain, diagonal corner blocking, shelter eligibility/ranking, movement/arrival, resource formulas, invalid inputs, and decision thresholds.

### Assumptions and limitations

**Simulation only; not validated real-world astronaut life-support predictions.** The slope overlay and routing grid are derived from the bundled USGS HiRISE DTM crop. Map positions and waypoint placements are schematic, the >15° cutoff is a chosen rule, and other overlays and numeric telemetry remain simulated. Existing imagery/instrument captions do not establish georeferenced measurements for the fictional waypoints.

The latest-image strip uses NASA's public raw-image feed when available. It is not a live rover camera or telemetry stream; feed availability and image recency depend on NASA's service. A successful response is cached in the current page session for up to 10 minutes.

The Live EVA Walk is also a time-accelerated simulation. Walking speed and oxygen use reuse the dashboard's fixed illustrative coefficients; terrain-driven exertion, real tank pressure, and physiological response are not modeled. The return-safety warning estimates a route to HAB-01 and cannot guarantee a real-world safe return.

The map assumes 10 meters per percentage unit (a schematic 1 km square), so each 50×50 terrain cell covers 20 m. The >15° mask comes from the bundled DTM-derived crop; its resolution limits how precisely the route can follow slope boundaries. A* retains the original lower traversal cost near the science outcrop and optimizes grid traversal cost rather than a continuous shortest-distance path. Emergency candidates are compared by the distances of their calculated routes. To add destinations, explicitly set `radiationShelter` and/or `oxygenSupport`; names/types never imply protection.

HAB-01 is assumed to provide oxygen and radiation shelter based on its existing scenario description. RVR-04 only provides oxygen support, with accessible spare tanks assumed. Surface transit during a flare is still exposed: there is no radiation-dose integration or shielding validation. The whole surface radiation overlay cannot be avoided by terrestrial routing; the planner heads to shelter while warning about exposure.

Walking speed and oxygen rates are constant; terrain-driven exertion, tank pressure, equipment failure, continuing leaks, battery limits, and actual physiology are not modeled. The movement button teleports between two demo positions without time progression or automatic oxygen depletion. Remaining O₂ is the editable scenario supply, not a live sensor stream. The normal return destination is HAB-01; the green multi-stop reference traverse is not treated as the calculator's mission itinerary.
