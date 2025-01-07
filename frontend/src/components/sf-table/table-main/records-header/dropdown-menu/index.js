import React, { useState, useCallback, cloneElement } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownToggle } from 'reactstrap';
import { ModalPortal, Icon } from '@seafile/sf-metadata-ui-component';
import { gettext } from '../../../../../utils/constants';
import { isMobile } from '../../../../../utils/utils';

import './index.css';

const HeaderDropdownMenu = ({ column, ColumnDropdownMenu, customProps }) => {
  const [isMenuShow, setMenuShow] = useState(false);

  const onToggle = useCallback((event) => {
    event && event.preventDefault();
    event && event.stopPropagation();
    const targetDom = event.target;
    if (targetDom.className === 'string' && targetDom.className.includes('disabled')) return;
    setMenuShow(!isMenuShow);
  }, [isMenuShow]);

  const renderDropdownMenu = useCallback(() => {
    return (
      <DropdownMenu
        positionFixed
        flip={false}
        modifiers={{ preventOverflow: { boundariesElement: document.body } }}
        className="sf-table-dropdown-menu"
      >
        {cloneElement(ColumnDropdownMenu, { column, ...customProps })}
      </DropdownMenu>
    );
  }, [ColumnDropdownMenu, column, customProps]);

  return (
    <Dropdown direction="down" className="sf-table-dropdown" isOpen={isMenuShow} toggle={onToggle}>
      <DropdownToggle
        tag="span"
        role="button"
        data-toggle="dropdown"
        aria-expanded={isMenuShow}
        title={gettext('More operations')}
        aria-label={gettext('More operations')}
        tabIndex={0}
      >
        <Icon iconName="drop-down" />
      </DropdownToggle>
      {isMenuShow && !isMobile &&
        <ModalPortal>
          <div className="sf-table-dropdown-menu-wrapper large">{renderDropdownMenu()}</div>
        </ModalPortal>
      }
    </Dropdown>
  );
};

HeaderDropdownMenu.propTypes = {
  column: PropTypes.object.isRequired,
  ColumnDropdownMenu: PropTypes.object.isRequired,
};

export default HeaderDropdownMenu;
