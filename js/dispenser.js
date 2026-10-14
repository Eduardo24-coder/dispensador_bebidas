/* Adapter contract: start({sessionId, drinkId, portionOz, mode, durationMs}), stop({sessionId}), getState().
   Session IDs must be unique. stop invalidates a session even before start resolves.
   A future asynchronous adapter must enforce this at the transport/firmware level. */
// PROVISIONAL EXAMPLE ONLY: replace each rate after measuring that pump.
// US fluid ounces: 1 fl oz = approximately 29.57353 mL (NIST SP 811).
window.DispenserTiming = {
  mlPerOz: 29.57353,
  flowMlPerMinute: [1200, 1200, 1200], // Coca-Cola, Seven Up, Gatorade.
  estimateMs(drinkId, ounces) {
    const flow = this.flowMlPerMinute[drinkId];
    if (![4, 6, 8].includes(ounces) || !Number.isFinite(flow) || flow <= 0) {
      throw new Error('Configura un caudal positivo para esta bomba');
    }
    return ounces * this.mlPerOz / flow * 60000;
  }
};
window.createDemoDispenser = function () {
  let active = null;
  let lastStopped = 0;
  return {
    start({ sessionId, drinkId, portionOz = 6, mode = 'manual', durationMs = null }) {
      if (![4, 6, 8].includes(portionOz)) return Promise.reject(new Error('Porción no válida'));
      if (!['manual', 'automatic'].includes(mode) || (mode === 'automatic' && (!Number.isFinite(durationMs) || durationMs <= 0))) {
        return Promise.reject(new Error('Duración o modo no válido'));
      }
      if (sessionId <= lastStopped) return Promise.resolve(this.getState());
      if (!active) active = { sessionId, drinkId, portionOz, mode, durationMs };
      return Promise.resolve(this.getState());
    },
    stop({ sessionId }) {
      lastStopped = Math.max(lastStopped, sessionId);
      if (active && active.sessionId === sessionId) active = null;
      // Monotonically increasing IDs bound bookkeeping without expiring cancellation.
      return Promise.resolve(this.getState());
    },
    getState() { return { serving: Boolean(active), ...(active || {}) }; }
  };
};
