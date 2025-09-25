import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DropdownItem, Dropdown, DropdownToggle, DropdownMenu } from 'reactstrap';
import PropTypes from 'prop-types';
import ModalPortal from '../../../components/modal-portal';
import ContextMenuItem from './context-menu-item';

import './index.css';

const ContextMenu = ({
  options,
  boundaryCoordinates = { top: 0, right: window.innerWidth, bottom: window.innerHeight, left: 0 },
  onOptionClick,
  allowedTriggerElements
}) => {
  const menuRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [subMenuState, setSubMenuState] = useState({ isOpen: false, currentItem: null });

  const handleHide = useCallback((event) => {
    // Don't hide if clicking inside the menu
    if (menuRef.current && menuRef.current.contains(event.target)) {
      return;
    }
    setVisible(false);
    setSubMenuState({ isOpen: false, currentItem: null });
  }, []);

  const toggleSubMenu = useCallback((e) => {
    setSubMenuState(prev => ({
      isOpen: !prev.isOpen,
      currentItem: prev.currentItem
    }));
  }, []);

  const handleSubMenuMouseEnter = useCallback((item) => {
    setSubMenuState({
      isOpen: true,
      currentItem: item.value
    });
  }, []);

  const handleMainMenuMouseMove = useCallback((e) => {
    if (subMenuState.isOpen && e.target && e.target.className.includes('dropdown-item')) {
      setSubMenuState({ isOpen: false, currentItem: null });
    }
  }, [subMenuState.isOpen]);

  const handleOptionClickInternal = useCallback((event, option) => {
    event.stopPropagation();
    event.preventDefault();
    onOptionClick && onOptionClick(option, event);
    // Use setTimeout to ensure the click handler executes before hiding
    setTimeout(() => {
      setVisible(false);
      setSubMenuState({ isOpen: false, currentItem: null });
    }, 0);
  }, [onOptionClick]);

  const getMenuPosition = useCallback((x = 0, y = 0) => {
    let menuStyles = {
      top: y,
      left: x
    };
    if (!menuRef.current) {
      const indent = 10;
      const menuMargin = 20;
      const menuDefaultWidth = 200;
      const dividerHeight = 16;
      const optionHeight = 32;
      const menuDefaultHeight = options.reduce((total, option) => {
        if (option === 'Divider') return total + dividerHeight;
        return total + optionHeight;
      }, menuMargin + indent);
      if (menuStyles.left + menuDefaultWidth + indent > window.innerWidth) {
        menuStyles.left = window.innerWidth - menuDefaultWidth - indent;
      }
      if (menuStyles.top + menuDefaultHeight > window.innerHeight) {
        menuStyles.top = window.innerHeight - menuDefaultHeight;
      }
      return menuStyles;
    }
    const rect = menuRef.current.getBoundingClientRect();
    const { top: boundaryTop, right: boundaryRight, bottom: boundaryBottom, left: boundaryLeft } = boundaryCoordinates || {};
    menuStyles.top = menuStyles.top - boundaryTop;
    menuStyles.left = menuStyles.left - boundaryLeft;

    if (y + rect.height > boundaryBottom - 10) {
      menuStyles.top -= rect.height;
    }
    if (x + rect.width > boundaryRight) {
      menuStyles.left -= rect.width;
    }
    if (menuStyles.top < 0) {
      menuStyles.top = rect.bottom > boundaryBottom ? (boundaryBottom - 10 - rect.height) / 2 : 0;
    }
    if (menuStyles.left < 0) {
      menuStyles.left = rect.width < boundaryRight ? (boundaryRight - rect.width) / 2 : 0;
    }
    return menuStyles;
  }, [boundaryCoordinates, options]);

  useEffect(() => {
    const handleShow = (event) => {
      event.preventDefault();
      if (menuRef.current && menuRef.current.contains(event.target)) return;

      if (allowedTriggerElements && allowedTriggerElements.length > 0) {
        const isAllowedElement = allowedTriggerElements.some(target => event.target.closest(target));
        if (!isAllowedElement) {
          return;
        }
      }

      setVisible(true);
      const position = getMenuPosition(event.clientX, event.clientY);
      setPosition(position);
    };

    const metadataWrapper = document.querySelector('#sf-metadata-wrapper');
    metadataWrapper && metadataWrapper.addEventListener('contextmenu', handleShow);

    return () => {
      const metadataWrapper = document.querySelector('#sf-metadata-wrapper');
      metadataWrapper && metadataWrapper.removeEventListener('contextmenu', handleShow);
    };
  }, [getMenuPosition, allowedTriggerElements]);

  useEffect(() => {
    if (visible) {
      document.addEventListener('mousedown', handleHide);
    } else {
      document.removeEventListener('mousedown', handleHide);
    }

    return () => {
      document.removeEventListener('mousedown', handleHide);
    };
  }, [visible, handleHide]);

  if (!visible) return null;
  if (options.length === 0) return null;

  return (
    <ModalPortal>
      <div className="dropdown-menu sf-metadata-contextmenu" style={position} ref={menuRef}>
        {options.map((option, index) => {
          if (option === 'Divider') {
            return <DropdownItem key={index} divider />;
          } else if (option.subOpList) {
            return (
              <Dropdown
                key={index}
                direction="right"
                className="w-100"
                isOpen={subMenuState.isOpen && subMenuState.currentItem === option.key}
                toggle={toggleSubMenu}
                onMouseMove={(e) => { e.stopPropagation(); }}
              >
                <DropdownToggle
                  tag="span"
                  className="dropdown-item font-weight-normal rounded-0 d-flex align-items-center"
                  onMouseEnter={() => handleSubMenuMouseEnter(option)}
                >
                  <span className="mr-auto">{option.value}</span>
                  <i className="sf3-font-down sf3-font rotate-270"></i>
                </DropdownToggle>
                <DropdownMenu>
                  {option.subOpList.map((subItem, subIndex) => {
                    if (subItem === 'Divider') {
                      return <DropdownItem key={subIndex} divider />;
                    } else {
                      return (
                        <ContextMenuItem
                          key={subIndex}
                          option={subItem}
                          onClick={handleOptionClickInternal}
                          isSubMenuItem={true}
                        />
                      );
                    }
                  })}
                </DropdownMenu>
              </Dropdown>
            );
          } else {
            return (
              <ContextMenuItem
                key={index}
                option={option}
                onClick={handleOptionClickInternal}
                onMouseMove={handleMainMenuMouseMove}
              />
            );
          }
        })}
      </div>
    </ModalPortal>
  );
};

ContextMenu.propTypes = {
  options: PropTypes.arrayOf(PropTypes.oneOfType([
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
      subOpList: PropTypes.arrayOf(PropTypes.oneOfType([
        PropTypes.shape({
          key: PropTypes.string.isRequired,
          value: PropTypes.string.isRequired,
        }),
        PropTypes.string,
      ])),
    }),
    PropTypes.string,
  ])).isRequired,
  boundaryCoordinates: PropTypes.object,
  allowedTriggerElements: PropTypes.array,
  onOptionClick: PropTypes.func.isRequired,
};

export default ContextMenu;
