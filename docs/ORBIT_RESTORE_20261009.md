# Restore the original globe rotation

The user preferred the original orbit interaction after trying trackball rotation and custom inertia. Globe mouse-left and one-finger rotation now use the original CameraControls ROTATE / TOUCH_ROTATE behavior, fixed up direction, polar limits and existing 0.09 dragging / 0.28 settling settings. The custom arcball, inertia and zoom-dependent angular attenuation were removed. Their previous implementation remains in Git history.

Continuous 0.25–96 magnification, globe surface safety, direct two-finger pinch magnification, and existing miniature/porcelain/satellite close materials remain available. Landmark sizes, data, factual heights and model geometry are unchanged.

Validation: 99 project tests, 43 public-source tests, type checking and production builds passed. Twenty-three local Chrome checks cover original smooth settling, equivalent angular response at zoom1 and about10.82, fixed up direction, close viewing of a small tower at13.195, native393px single-finger rotation and3.5 pinch magnification, marker selection, panning, comparison and magnification bounds. The inactive arcball module and its five tests were removed; zoom tests remain. Chrome/CDP testing does not establish physical Xiaomi or Safari acceptance.
