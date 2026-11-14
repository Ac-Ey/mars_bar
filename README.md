Here is a clean, plain-text version you can copy and paste directly into WhatsApp, Discord, Telegram, or a Google Doc for your team:

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
⚬ The built-in 50×50 A* pathfinder automatically calculates a safe route curving around >15° slope hazards and dust traps, displaying total distance (m) and estimated O₂ consumption (%) at the bottom.
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

⚬ Simulate Solar Flare (SEP): Triggers a radiation spike, turns the HUD/visor red, and auto-routes an emergency abort path back to the companion rover shelter.
⚬ Simulate Suit O₂ Drop: Simulates an oxygen drop to 41%, aborts distant waypoints, and directs the astronaut back to RVR-04 for spare O₂ tanks.
⚬ Restore Nominal EVA Plan: Resets all suit vitals and restores the primary science route.

3. 60-Second Live Pitch Demo Order

1. Start on Tactical Map and toggle the 4 NASA layers + opacity slider.
2. Click above the red SLOPE 22° zone to show live A* obstacle avoidance, then click inside the red zone to trigger the safety warning.
3. Switch to Helmet Visor HUD in the header and cycle through SCI-A and RVR-04.
4. Click Simulate Solar Flare (SEP) to demonstrate real-time emergency rerouting.