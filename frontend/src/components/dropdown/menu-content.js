import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import Icon from '../icon';
import CustomDropdownItem from './custom-dropdown-item';
import {
  focusMenuItem,
  getMenuItemSelectors,
  getMenuSlotConfig,
  getSubmenuDirection,
  isDividerNode,
  normalizeDropdownItems,
  DEFAULT_SUBMENU_OFFSET_SKIDDING,
  DEFAULT_SUBMENU_OFFSET_DISTANCE,
} from './utils';

const MenuSubmenu = ({
  item,
  depth,
  activePath,
  setActivePath,
  onItemSelect,
  variant,
  menuClassName,
  parentMenuRef,
  menuSlotConfig,
}) => {
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const closeTimerRef = useRef(null);
  const isOpen = activePath[depth] === item.key;
  const direction = getSubmenuDirection(parentMenuRef?.current, 'right');
  const submenuPath = activePath.slice(0, depth).concat(item.key);
  const submenuItems = item.children || [];

  const openSubmenu = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setActivePath((prev) => {
      if (prev[depth] === item.key) {
        return prev.length === depth + 1 ? prev : submenuPath;
      }
      return submenuPath;
    });
  };

  const closeSubmenu = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }

    closeTimerRef.current = window.setTimeout(() => {
      setActivePath((prev) => prev.slice(0, depth));
      closeTimerRef.current = null;
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const onTriggerKeyDown = (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      openSubmenu();
      window.requestAnimationFrame(() => {
        focusMenuItem(menuRef.current, getMenuItemSelectors());
      });
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      closeSubmenu();
      triggerRef.current?.focus();
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openSubmenu();
      window.requestAnimationFrame(() => {
        focusMenuItem(menuRef.current, getMenuItemSelectors());
      });
    }
  };

  const onSubmenuKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      closeSubmenu();
      triggerRef.current?.focus();
    }
  };

  return (
    <Dropdown
      direction={direction}
      className="w-100 dropdown-submenu"
      data-direction={direction}
      isOpen={isOpen}
      toggle={openSubmenu}
      onMouseEnter={openSubmenu}
      onMouseMove={(event) => event.stopPropagation()}
      onMouseLeave={closeSubmenu}
    >
      <DropdownToggle
        innerRef={triggerRef}
        tag="span"
        className="w-100 d-flex"
        onMouseEnter={openSubmenu}
      >
        <CustomDropdownItem
          item={item}
          isSubmenuTrigger={true}
          rightSlot={<Icon symbol="down" className="rotate-270 dropdown-submenu-arrow mr-2" />}
          onKeyDown={onTriggerKeyDown}
          tabIndex={-1}
          tag="div"
        />
      </DropdownToggle>
      <DropdownMenu
        ref={menuRef}
        className={menuClassName}
        modifiers={[
          {
            name: 'offset',
            options: {
              offset: [DEFAULT_SUBMENU_OFFSET_SKIDDING, DEFAULT_SUBMENU_OFFSET_DISTANCE],
            },
          },
          {
            name: 'preventOverflow',
            options: {
              boundary: document.body,
            },
          },
        ]}
        flip={false}
        data-depth={depth + 1}
        onMouseEnter={openSubmenu}
        onMouseLeave={closeSubmenu}
        onKeyDown={onSubmenuKeyDown}
      >
        {submenuItems.map((subItem, index) => {
          if (isDividerNode(subItem)) {
            return <DropdownItem key={subItem.key || index} divider />;
          }

          if (subItem.type === 'header') {
            return <DropdownItem key={subItem.key || index} header>{subItem.label}</DropdownItem>;
          }

          if (subItem.children?.length) {
            return (
              <MenuSubmenu
                key={subItem.key || index}
                item={subItem}
                depth={depth + 1}
                activePath={activePath}
                setActivePath={setActivePath}
                onItemSelect={onItemSelect}
                variant={variant}
                menuClassName={menuClassName}
                parentMenuRef={menuRef}
                menuSlotConfig={menuSlotConfig}
              />
            );
          }

          return (
            <CustomDropdownItem
              key={subItem.key || index}
              item={subItem}
              rightSlot={subItem.right_slot}
              onClick={(event) => onItemSelect(subItem, event)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onItemSelect(subItem, event);
                }
              }}
              showCheckPlaceholder={menuSlotConfig.showCheckPlaceholder}
              showShortcutPlaceholder={menuSlotConfig.showShortcutPlaceholder}
              tabIndex={-1}
              tag="div"
            />
          );
        })}
      </DropdownMenu>
    </Dropdown>
  );
};

MenuSubmenu.propTypes = {
  item: PropTypes.object.isRequired,
  depth: PropTypes.number.isRequired,
  activePath: PropTypes.array.isRequired,
  setActivePath: PropTypes.func.isRequired,
  onItemSelect: PropTypes.func.isRequired,
  variant: PropTypes.oneOf(['action', 'control']),
  menuClassName: PropTypes.string,
  parentMenuRef: PropTypes.object,
  menuSlotConfig: PropTypes.shape({
    showCheckPlaceholder: PropTypes.bool,
    showShortcutPlaceholder: PropTypes.bool,
  }),
};

export const CustomDropdownMenuContent = ({
  items,
  variant = 'action',
  menuClassName,
  onItemClick,
  menuRef,
  normalizeOptions,
}) => {
  const [activePath, setActivePath] = useState([]);
  const normalizedItems = useMemo(() => normalizeDropdownItems(items, normalizeOptions), [items, normalizeOptions]);
  const menuSlotConfig = useMemo(() => getMenuSlotConfig(normalizedItems, variant), [normalizedItems, variant]);

  return (
    <div ref={menuRef}>
      {normalizedItems.map((menuItem, index) => {
        if (isDividerNode(menuItem)) {
          return <DropdownItem key={menuItem.key || index} divider className={menuItem.className} />;
        }

        if (menuItem.type === 'header') {
          return <DropdownItem key={menuItem.key || index} header>{menuItem.label}</DropdownItem>;
        }

        if (menuItem.children?.length) {
          return (
            <MenuSubmenu
              key={menuItem.key || index}
              item={menuItem}
              depth={0}
              activePath={activePath}
              setActivePath={setActivePath}
              onItemSelect={onItemClick}
              variant={variant}
              menuClassName={menuClassName}
              parentMenuRef={menuRef}
              menuSlotConfig={menuSlotConfig}
            />
          );
        }

        return (
          <CustomDropdownItem
            key={menuItem.key || index}
            item={menuItem}
            rightSlot={menuItem.right_slot}
            onClick={(event) => onItemClick(menuItem, event)}
            onMouseMove={() => activePath.length > 0 && setActivePath([])}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onItemClick(menuItem, event);
              }
            }}
            showCheckPlaceholder={menuSlotConfig.showCheckPlaceholder}
            showShortcutPlaceholder={menuSlotConfig.showShortcutPlaceholder}
            tabIndex={-1}
            tag="div"
          />
        );
      })}
    </div>
  );
};

CustomDropdownMenuContent.propTypes = {
  items: PropTypes.array.isRequired,
  variant: PropTypes.oneOf(['action', 'control']),
  menuClassName: PropTypes.string,
  onItemClick: PropTypes.func.isRequired,
  menuRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })]),
  normalizeOptions: PropTypes.object,
};
