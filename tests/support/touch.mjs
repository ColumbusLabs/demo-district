// Real touch input through the Chrome DevTools Protocol: exercises browser touch-action,
// pointer-event generation, and capture, unlike synthetic dispatchEvent calls.
export async function touchscreen(page) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
  return {
    start: (points) => send('touchStart', points),
    move: (points) => send('touchMove', points),
    end: (points = []) => send('touchEnd', points),
    /** One finger from (x, y) by (dx, dy) in several steps; optionally keeps holding. */
    async drag(x, y, dx, dy, { steps = 6, hold = false, id = 1 } = {}) {
      await send('touchStart', [{ x, y, id }]);
      for (let i = 1; i <= steps; i++) await send('touchMove', [{ x: x + (dx * i) / steps, y: y + (dy * i) / steps, id }]);
      if (!hold) await send('touchEnd', []);
    },
  };
}

export async function padCenter(page) {
  const box = await page.locator('#move-pad').boundingBox();
  if (!box) throw new Error('Movement stick is not visible.');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, travel: box.width * 0.3 };
}
