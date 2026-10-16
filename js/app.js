(() => {
  'use strict';
  const HOLD_MS = 300, DRAG_PX = 12, SWIPE_PX = 38;
  const names = ['Coca-Cola', 'Seven Up', 'Gatorade lima-limón'];
  const adapter = window.createDemoDispenser();
  const cards = [...document.querySelectorAll('.drink')];
  const carousel = document.querySelector('#carousel');
  const status = document.querySelector('#status');
  const hint = document.querySelector('#hint');
  const portionButtons = [...document.querySelectorAll('.portion-button')];
  const portionOptions = document.querySelector('.portion-options');
  const portionSummary = document.querySelector('#portion-summary');
  const manualButton = document.querySelector('#manual-serve');
  const automaticPanel = document.querySelector('#automatic-portions');
  let portionOz = 6;
  let center = 0, selected = null, gesture = null, timer = null;
  let session = null, sequence = 0, keyboard = null;
  let servingMode = null, finishTimer = null, countdownTimer = null;
  let selectionResetTimer = null;
  const SELECTION_RESET_MS = 1500;
  const timing = window.DispenserTiming;
  const secondsText = milliseconds => (milliseconds / 1000).toLocaleString('es-GT', { maximumFractionDigits: 1 });

  // Rendering and carousel layout are independent of the communication adapter.
  function render() {
    cards.forEach((card, index) => {
      const offset = (index - center + 3) % 3;
      const side = offset === 2 ? -1 : offset;
      const spacing = window.innerWidth <= 600 ? Math.min(182, window.innerWidth * .4) : 210;
      const isSelected = selected === index;
      const scale = isSelected ? 1.11 : side ? .78 : .94;
      const lift = isSelected ? (window.innerWidth <= 600 ? -7 : -10) : side ? 8 : 0;
      card.style.transform = `translateX(calc(-50% + ${side * spacing}px)) translateY(${lift}px) scale(${scale}) rotate(${side * 3}deg)`;
      card.style.opacity = side ? '.78' : '1';
      card.style.zIndex = isSelected ? '4' : side ? '1' : '3';
      card.classList.toggle('is-selected', isSelected);
      card.setAttribute('aria-pressed', String(selected === index));
      card.querySelector('.card-footer span').textContent = selected === index ? 'LISTA PARA SERVIR' : 'TOCA PARA SELECCIONAR';
    });
    document.querySelectorAll('.pagination i').forEach((dot, i) => dot.classList.toggle('active', i === center));
    document.body.classList.toggle('serving', session !== null);
    document.querySelectorAll('.arrow').forEach(button => { button.disabled = session !== null; });
    portionButtons.forEach((button, index) => {
      const chosen = Number(button.dataset.ounces) === portionOz;
      button.setAttribute('aria-pressed', String(chosen));
      let duration = null;
      try { duration = timing.estimateMs(selected ?? center, Number(button.dataset.ounces)); } catch (_) { /* Invalid configuration disables serving. */ }
      button.disabled = session !== null || selected === null || duration === null;
      button.querySelector('.portion-time').textContent = duration === null ? 'Configurar caudal' : `≈ ${secondsText(duration)} s`;
      if (chosen) portionOptions.style.setProperty('--portion-index', index);
    });
    portionSummary.textContent = session !== null ? `${portionOz} oz · en curso` : selected === null ? 'Primero elige tu bebida' : 'Toca un tamaño para servir';
    const automatic = session !== null && servingMode === 'automatic';
    manualButton.disabled = selected === null || automatic;
    document.querySelector('#manual-label').textContent = automatic ? `Sirviendo ${portionOz} oz…` : session !== null ? 'Sirviendo…' : 'Mantén para servir';
    document.querySelector('#manual-help').textContent = automatic ? 'El servido termina automáticamente' : selected === null ? 'Primero selecciona una bebida' : 'Suelta para detener';
    document.querySelector('#automatic-label').textContent = automatic ? `Sirviendo ${portionOz} oz` : 'Porciones automáticas';
    document.querySelector('#guidance').textContent = session !== null ? names[selected] : selected === null ? 'Desliza y toca para seleccionar' : `${names[selected]} seleccionada`;
  }
  function clearHold() { clearTimeout(timer); timer = null; }
  function clearSelectionReset() { clearTimeout(selectionResetTimer); selectionResetTimer = null; }
  function stopServing(completed = false) {
    clearHold();
    clearTimeout(finishTimer); clearInterval(countdownTimer);
    finishTimer = countdownTimer = null;
    const previous = session;
    session = null;
    servingMode = null;
    if (gesture) gesture.canceled = true;
    keyboard = null;
    if (previous !== null) {
      // Invalidate locally before invoking an asynchronous transport.
      Promise.resolve().then(() => adapter.stop({ sessionId: previous })).catch(() => {
        status.textContent = 'No se pudo confirmar la detención';
      });
      status.textContent = completed ? 'Proceso finalizado' : 'Servido detenido';
      hint.textContent = 'Tu bebida sigue seleccionada';
      clearSelectionReset();
      const finishedDrink = selected;
      selectionResetTimer = setTimeout(() => {
        selectionResetTimer = null;
        if (session !== null || selected !== finishedDrink || sequence !== previous) return;
        selected = null;
        automaticPanel.open = false;
        status.textContent = 'Elige tu próxima bebida';
        hint.textContent = 'Toca una bebida para seleccionarla';
        render();
      }, SELECTION_RESET_MS);
    }
    render();
  }
  function startServing(index, mode = 'manual') {
    if (session !== null || selected !== index) return;
    clearSelectionReset();
    const token = ++sequence;
    const requestedPortion = portionOz;
    let duration = null;
    if (mode === 'automatic') {
      try { duration = timing.estimateMs(index, requestedPortion); }
      catch (error) { status.textContent = error.message; return; }
    }
    if (gesture) gesture.served = true;
    session = token;
    servingMode = mode;
    status.textContent = `Sirviendo ${names[index]}…`;
    hint.textContent = mode === 'automatic' ? `${requestedPortion} oz · Preparando…` : 'Modo manual · Suelta para detener';
    render();
    Promise.resolve().then(() => {
      if (session !== token) return;
      return adapter.start({ sessionId: token, drinkId: index, portionOz: requestedPortion, mode, durationMs: duration });
    }).then(() => {
      // A late start must never restore UI state; reissue the idempotent stop.
      if (session !== token) return adapter.stop({ sessionId: token });
      if (mode === 'automatic') {
        const deadline = performance.now() + duration;
        const updateCountdown = () => {
          if (session !== token) return;
          hint.textContent = `${requestedPortion} oz · ${secondsText(Math.max(0, deadline - performance.now()))} s restantes`;
        };
        updateCountdown();
        countdownTimer = setInterval(updateCountdown, 100);
        finishTimer = setTimeout(() => { if (session === token) stopServing(true); }, duration);
      }
    }).catch(() => {
      if (session === token) { stopServing(); status.textContent = 'No se pudo iniciar el servido'; }
    });
  }
  function select(index) {
    if (session !== null) return;
    clearSelectionReset();
    center = selected = index;
    status.textContent = `${names[index]} seleccionada`;
    hint.textContent = 'Coloca tu vaso en la bandeja';
    render();
  }
  function navigate(direction) {
    if (session !== null) return;
    clearSelectionReset();
    clearHold();
    if (gesture) gesture.canceled = true;
    keyboard = null;
    selected = null;
    center = (center + direction + 3) % 3;
    status.textContent = 'Toca una bebida para seleccionarla';
    hint.textContent = 'Coloca tu vaso antes de servir';
    render();
  }
  carousel.addEventListener('pointerdown', event => {
    if (gesture || keyboard !== null || session !== null || !event.isPrimary || event.button !== 0) return;
    const card = event.target.closest('.drink');
    if (!card) return;
    clearSelectionReset();
    const index = Number(card.dataset.index);
    gesture = { id: event.pointerId, card, index, x: event.clientX, y: event.clientY, began: performance.now(), moved: false, canceled: false, eligible: selected === index };
    card.setPointerCapture(event.pointerId);
    if (gesture.eligible) timer = setTimeout(() => {
      if (gesture && !gesture.moved && !gesture.canceled) startServing(index);
    }, HOLD_MS);
  });
  function movePointer(event) {
    if (!gesture || gesture.id !== event.pointerId) return;
    const rect = gesture.card.getBoundingClientRect();
    const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    if (session !== null) { if (outside && servingMode === 'manual') stopServing(); return; }
    if (outside && gesture.eligible) { clearHold(); gesture.canceled = true; }
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > DRAG_PX) {
      clearHold(); gesture.moved = true;
    }
  }
  carousel.addEventListener('pointermove', movePointer);
  function finishPointer(event, canceled) {
    if (!gesture || gesture.id !== event.pointerId) return;
    const current = gesture;
    clearHold();
    if (session !== null && servingMode === 'manual') stopServing();
    gesture = null;
    if (current.card.hasPointerCapture(event.pointerId)) current.card.releasePointerCapture(event.pointerId);
    if (canceled) return;
    const dx = event.clientX - current.x, dy = event.clientY - current.y;
    if (current.moved) {
      if (!current.served) {
        if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy)) navigate(dx < 0 ? 1 : -1);
      }
      return;
    }
    if (!current.manualControl && !current.canceled && performance.now() - current.began < HOLD_MS) select(current.index);
  }
  carousel.addEventListener('pointerup', event => finishPointer(event, false));
  carousel.addEventListener('pointercancel', event => finishPointer(event, true));
  carousel.addEventListener('lostpointercapture', event => finishPointer(event, true));
  carousel.addEventListener('contextmenu', event => event.preventDefault());
  carousel.addEventListener('dragstart', event => event.preventDefault());
  carousel.addEventListener('keydown', event => {
    const card = event.target.closest('.drink');
    if (!card) return;
    const index = Number(card.dataset.index);
    if (['ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(event.key)) event.preventDefault();
    if (event.repeat || gesture) return;
    clearSelectionReset();
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      if (session !== null) return;
      navigate(event.key === 'ArrowRight' ? 1 : -1); cards[center].focus();
    } else if (event.key === 'Enter') select(index);
    else if (event.key === ' ' && selected === index && keyboard === null && session === null) {
      keyboard = index;
      timer = setTimeout(() => { if (keyboard === index) startServing(index); }, HOLD_MS);
    }
  });
  window.addEventListener('keyup', event => { if (event.key === ' ' && servingMode !== 'automatic') stopServing(); });
  carousel.addEventListener('focusout', () => { if (keyboard !== null) stopServing(); });
  function cancelAll() {
    stopServing();
    const old = gesture; gesture = null;
    if (old && old.card.hasPointerCapture(old.id)) old.card.releasePointerCapture(old.id);
  }
  window.addEventListener('blur', cancelAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAll(); });
  window.addEventListener('pagehide', cancelAll);
  window.addEventListener('beforeunload', cancelAll);
  manualButton.addEventListener('pointerdown', event => {
    if (selected === null || session !== null || gesture || keyboard !== null || !event.isPrimary || event.button !== 0) return;
    clearSelectionReset();
    automaticPanel.open = false;
    gesture = { id: event.pointerId, card: manualButton, index: selected, x: event.clientX, y: event.clientY, began: performance.now(), moved: false, canceled: false, eligible: true, manualControl: true };
    manualButton.setPointerCapture(event.pointerId);
    const index = selected;
    timer = setTimeout(() => { if (gesture && !gesture.moved && !gesture.canceled) startServing(index); }, HOLD_MS);
  });
  manualButton.addEventListener('pointermove', movePointer);
  manualButton.addEventListener('pointerup', event => finishPointer(event, false));
  manualButton.addEventListener('pointercancel', event => finishPointer(event, true));
  manualButton.addEventListener('lostpointercapture', event => finishPointer(event, true));
  manualButton.addEventListener('contextmenu', event => event.preventDefault());
  manualButton.addEventListener('dragstart', event => event.preventDefault());
  manualButton.addEventListener('keydown', event => {
    if (![' ', 'Enter'].includes(event.key)) return;
    event.preventDefault();
    if (event.repeat || selected === null || session !== null || gesture || keyboard !== null) return;
    clearSelectionReset();
    automaticPanel.open = false;
    keyboard = selected;
    const index = selected;
    timer = setTimeout(() => { if (keyboard === index) startServing(index); }, HOLD_MS);
  });
  manualButton.addEventListener('keyup', event => {
    if (![' ', 'Enter'].includes(event.key)) return;
    event.preventDefault();
    if (servingMode !== 'automatic') stopServing();
  });
  manualButton.addEventListener('blur', () => { if (keyboard !== null) stopServing(); });
  automaticPanel.querySelector('summary').addEventListener('click', event => {
    if (session !== null) event.preventDefault();
  });
  portionButtons.forEach(button => button.addEventListener('click', () => {
    if (session !== null || selected === null) return;
    // A second input must not change the size of a pending hold.
    cancelAll();
    portionOz = Number(button.dataset.ounces);
    automaticPanel.open = false;
    startServing(selected, 'automatic');
  }));
  document.querySelector('#previous').addEventListener('click', () => navigate(-1));
  document.querySelector('#next').addEventListener('click', () => navigate(1));
  window.addEventListener('resize', render);
  render();
})();
