import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext } from '../../../../../../utils/constants';

const OpMenu = ({ onRename, onFreezed, onUnFreezed }) => {
  let [isShow, setShow] = useState(false);

  const toggle = useCallback((event) => {
    const dataset = event.target ? event.target.dataset : null;
    if (dataset && dataset.toggle && dataset.toggle === 'rename') {
      onRename();
      setShow(!isShow);
      return;
    }
    if (isShow) {
      onUnFreezed();
    } else {
      onFreezed();
    }
    setShow(!isShow);
  }, [isShow, onRename, onFreezed, onUnFreezed, setShow]);

  const onClick = useCallback((event) => {
    toggle(event);
  }, [toggle]);

  const onItemClick = useCallback((event) => {
    toggle(event);
  }, [toggle]);

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setShow = () => {};
    };
  }, []);

  return (
    <Dropdown isOpen={isShow} toggle={toggle}>
      <DropdownToggle
        tag="i"
        role="button"
        tabIndex="0"
        className="sf-dropdown-toggle sf3-font-more sf3-font"
        title={gettext('More operations')}
        aria-label={gettext('More operations')}
        onClick={onClick}
        data-toggle="dropdown"
      />
      <DropdownMenu>
        <DropdownItem data-toggle="rename" onClick={onItemClick}>{gettext('Rename')}</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
};

OpMenu.propTypes = {
  onRename: PropTypes.func,
  onFreezed: PropTypes.func,
  onUnFreezed: PropTypes.func,
};

export default OpMenu;

