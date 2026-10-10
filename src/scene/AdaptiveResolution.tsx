import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

/** Sample only continuous rendered frames; demand-render idle time is not a slow frame. */
export default function AdaptiveResolution({ mobile }: { mobile: boolean }) {
  const { gl, setDpr, invalidate } = useThree();
  const samples = useRef<number[]>([]), lastChange = useRef(0);
  useFrame((_, delta) => {
    if (document.hidden || delta > .25) { samples.current = []; return; }
    const now = performance.now();
    if (now - lastChange.current < 3000) return;
    samples.current.push(delta);
    if (samples.current.length < 90) return;
    const values = samples.current.sort((a,b) => a-b); samples.current = [];
    const current = gl.getPixelRatio(), maximum = Math.min(devicePixelRatio, mobile ? 1.75 : 1.65);
    const next = values[67] > .028 ? Math.max(.8, current * .85)
      : values[80] < .018 && now - lastChange.current > 10000 ? Math.min(maximum, current + .1) : current;
    if (Math.abs(next-current) > .01) {
      lastChange.current = now; setDpr(next); invalidate();
    }
    gl.domElement.dataset.renderDpr = gl.getPixelRatio().toFixed(2);
  });
  return null;
}
