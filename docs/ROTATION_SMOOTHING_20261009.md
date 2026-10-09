# Smooth free rotation

Free globe rotation previously wrote camera poses directly from pointer events. Display frames between events repeated the same pose, and release stopped immediately. A controlled Chrome drag had normal 16.7ms frame intervals, yet only 20 of 82 sampled frames changed direction.

Pointer events now accumulate a target quaternion. Rendering applies one interpolated pose per frame, after CameraControls and before focus occlusion. Following uses a 45ms time constant, settling uses 65ms, and a short 85ms exponential coast is capped at 35% of the drag, with an additional ceiling of 0.12 radians divided by magnification. This keeps short drags from coasting too far. A pause before release avoids throwing with stale velocity. Pole crossings, roll and camera radius remain intact.

New touch, navigation, reset, wheel/buttons, comparison, suspended overlays and page blur/visibility stop old motion. Reduced-motion mode follows directly without inertia. Pinch magnification remains tied directly to finger separation.

Validation: 104 project tests, 48 public-source tests, type checking and builds passed. With the same 20 sparse native mouse moves, 79 of 80 adjacent display sample pairs changed direction after smoothing (81 sampled frames), and release produced 17 changing frames in the measured window. Median/P95 frame intervals stayed near 16.7/16.8ms, with no recorded long tasks. Nine focused browser checks cover bounded settling, interruption, reset, reduced motion and native 393px CDP touch/pinch. These controlled results establish interpolation behavior, rather than a universal FPS improvement or physical Xiaomi/Safari acceptance.
