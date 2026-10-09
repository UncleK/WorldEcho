# Close zoom and free globe rotation

The globe previously stopped zooming when its camera reached the surface safety distance. Fixed camera-up and polar limits also made dragging feel anchored.

Globe wheel, buttons and two-finger gestures now magnify the perspective view continuously from 0.25 to 96, while the camera stays outside the surface. Mouse-left and one-finger drags use a trackball: the position, viewing direction and up basis rotate together, permitting pole crossings and roll. Rotation slows with magnification for close inspection. Right/middle dragging and two-finger panning remain available.

Pinch magnification follows the ratio of finger separation directly. Input uses the same R3F container as CameraControls, including HTML labels and transparent marker hit areas. Pointer capture starts only after actual dragging, preserving normal marker clicks. New focus, reset, comparison transitions and globe shows restore normal magnification.

Miniature and porcelain continue rendering geometry and procedural materials. Satellite close-view detection accounts for magnification, loads the existing 4096 surface map, and applies filtered color/roughness/normal microdetail. This is still a global atlas with procedural surface texture, rather than city satellite tiles or measured DEM. Existing landmark geometry and factual data are unchanged.

Validation: 101 main-project tests, 45 public-source tests, type checking and production builds passed. The production build passed 27 local Chrome checks covering pole crossing, roll, slow dragging, marker clicks, focus, wheel after panning, the 96 magnification limit, comparison switching, all globe materials, and 393px native CDP touch gestures. A 60-to-210px pinch produces 3.5 magnification. Narrow Chrome/CDP testing does not establish physical Xiaomi or Safari acceptance.
