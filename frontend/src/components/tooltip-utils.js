export const isFocusVisible = (target) => {
  if (!target || typeof target.matches !== 'function') return true;

  try {
    return target.matches(':focus-visible');
  } catch (error) {
    // Keep the existing focus behavior in browsers that do not support :focus-visible.
    return true;
  }
};

export const getTooltipOpenState = (isOpen, event) => {
  const eventType = event?.type;

  if (eventType === 'focusin') {
    return isFocusVisible(event.target);
  }

  if (eventType === 'mouseover') {
    return true;
  }

  if (eventType === 'click' || eventType === 'focusout' || eventType === 'mouseout' || eventType === 'keydown') {
    return false;
  }

  return !isOpen;
};
