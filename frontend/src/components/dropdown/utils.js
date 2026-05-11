import React from 'react';

export const DEFAULT_MENU_WIDTH = 200;
export const DEFAULT_MENU_MAX_WIDTH = 240;
export const DEFAULT_MENU_MAX_HEIGHT = 600;
export const DEFAULT_MENU_OFFSET_SKIDDING = 0;
export const DEFAULT_MENU_OFFSET_DISTANCE = 4;
export const DEFAULT_SUBMENU_OFFSET_SKIDDING = -10;
export const DEFAULT_SUBMENU_OFFSET_DISTANCE = 12;

export const isDividerNode = (item) => item === 'Divider' || item?.type === 'divider';

export const isHeaderNode = (item) => item?.type === 'header';

export const isSubmenuNode = (item) => Array.isArray(item?.children) || Array.isArray(item?.subOpList);

export const normalizeDropdownItems = (items = [], options = {}) => {
  const {
    tickable = false,
    itemClassName,
    itemLabelKey,
  } = options;

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
    const label = item.label || item.value || item.text || item[itemLabelKey] || '';
    const normalizedItem = {
      ...item,
      type: item.type || 'item',
      key: item.key || item.value || item.text || `item-${index}`,
      label,
      checked: Boolean(item.checked ?? (tickable && item.tick)),
      icon: item.icon || item.icon_dom || null,
      className: item.className || itemClassName,
      children: Array.isArray(children)
        ? normalizeDropdownItems(children, options)
        : undefined,
    };

    normalized.push(normalizedItem);
    return normalized;
  }, []);
};

export const getDirectionByPlacement = (placement) => {
  if (placement?.startsWith('top')) return 'up';
  if (placement?.startsWith('left')) return 'left';
  if (placement?.startsWith('right')) return 'right';
  return 'down';
};

export const getSubmenuDirection = (menuElement, fallback = 'right') => {
  if (!menuElement || typeof window === 'undefined') {
    return fallback;
  }

  const targetElement = menuElement instanceof HTMLElement
    ? menuElement
    : menuElement?.current instanceof HTMLElement
      ? menuElement.current
      : null;

  if (!targetElement || typeof targetElement.getBoundingClientRect !== 'function') {
    return fallback;
  }

  const rect = targetElement.getBoundingClientRect();
  const spaceRight = window.innerWidth - rect.right;
  const spaceLeft = rect.left;
  return spaceRight >= DEFAULT_MENU_WIDTH || spaceRight >= spaceLeft ? 'right' : 'left';
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

export const getMenuItemSelectors = () => [
  '[data-dropdown-item="true"]:not([aria-disabled="true"])',
  '[data-dropdown-submenu-trigger="true"]:not([aria-disabled="true"])',
].join(', ');

export const renderNodeContent = (content) => {
  if (React.isValidElement(content)) {
    return content;
  }

  return content || null;
};

export const getMenuSlotConfig = (items = [], variant = 'action') => {
  const actionItems = items.filter((item) => !isDividerNode(item) && !isHeaderNode(item));
  const hasCheckedItems = actionItems.some((item) => Boolean(item?.checked));
  const hasShortcutItems = actionItems.some((item) => Boolean(item?.shortcut));

  return {
    showCheckPlaceholder: variant === 'control' || hasCheckedItems,
    showShortcutPlaceholder: hasShortcutItems,
  };
};
