export const DEFAULT_MENU_WIDTH = 200;
export const DEFAULT_MENU_OFFSET_SKIDDING = 0;
export const DEFAULT_MENU_OFFSET_DISTANCE = 4;
export const DEFAULT_SUBMENU_OFFSET_SKIDDING = -10;
export const DEFAULT_SUBMENU_OFFSET_DISTANCE = 12;

export const isDividerNode = (item) => item === 'Divider' || item?.type === 'divider';

export const isHeaderNode = (item) => item?.type === 'header';

export const normalizeDropdownItems = (items = []) => {
  return items.reduce((normalized, item, index) => {
    if (isDividerNode(item)) {
      normalized.push({ type: 'divider', key: `divider-${index}`, className: item.className || '' });
      return normalized;
    }

    if (!item) {
      return normalized;
    }

    if (isHeaderNode(item)) {
      normalized.push({
        type: 'header',
        key: item.key || `header-${index}`,
        label: item.label || item.value || '',
      });
      return normalized;
    }

    const children = item.children || item.subOpList;
    const label = item.label || item.value || item.text || '';
    const normalizedItem = {
      ...item,
      type: item.type || 'item',
      key: item.key || item.value || item.text || `item-${index}`,
      label,
      checked: Boolean(item.checked),
      icon: item.icon || item.icon_dom || null,
      className: item.className,
      children: Array.isArray(children)
        ? normalizeDropdownItems(children)
        : undefined,
    };

    normalized.push(normalizedItem);
    return normalized;
  }, []);
};

export const getDirectionByPlacement = (placement) => {
  if (placement?.startsWith('top')) return 'up';
  if (placement?.startsWith('end')) return 'end';
  if (placement?.startsWith('start')) return 'start';
  return 'down';
};

export const getSubmenuDirection = (menuElement) => {
  if (!menuElement || typeof window === 'undefined') {
    return 'end';
  }

  const targetElement = menuElement instanceof HTMLElement
    ? menuElement
    : menuElement?.current instanceof HTMLElement
      ? menuElement.current
      : null;

  if (!targetElement || typeof targetElement.getBoundingClientRect !== 'function') {
    return 'end';
  }

  const rect = targetElement.getBoundingClientRect();
  const spaceRight = window.innerWidth - rect.right;
  const spaceLeft = rect.left;
  return spaceRight >= DEFAULT_MENU_WIDTH || spaceRight >= spaceLeft ? 'end' : 'start';
};

export const focusMenuItem = (container, selector) => {
  const targetContainer = container instanceof HTMLElement
    ? container
    : container?.current instanceof HTMLElement
      ? container.current
      : null;

  if (!targetContainer || typeof targetContainer.querySelector !== 'function') return;

  const target = targetContainer.querySelector(selector);
  if (target && typeof target.focus === 'function') {
    target.focus();
  }
};

export const MENU_ITEM_SELECTORS = '[role="menuitem"]:not([aria-disabled="true"])';

export const getMenuSlotConfig = (items = [], variant = 'action') => {
  const actionItems = items.filter((item) => !isDividerNode(item) && !isHeaderNode(item));
  const hasCheckedItems = actionItems.some((item) => Boolean(item?.checked));
  const hasShortcutItems = actionItems.some((item) => Boolean(item?.shortcut));

  return {
    showCheckPlaceholder: variant === 'control' || hasCheckedItems,
    showShortcutPlaceholder: hasShortcutItems,
  };
};
