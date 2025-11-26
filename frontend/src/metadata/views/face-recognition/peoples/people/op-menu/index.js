import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext } from '../../../../../../utils/constants';
import Icon from '../../../../../../components/icon';

const OpMenu = ({ onRename, onFreezed, onUnFreezed }) => {
  let [isShow, setShow] = useState(false);

  const toggle = useCallback((event) => {
    event.stopPropagation();
    if (isShow) {
      const isClickToggleBtn = event.target.className?.includes('face-recognition-more-operations-toggle');
      onUnFreezed(isClickToggleBtn);
    } else {
      onFreezed();
    }
    setShow(!isShow);
  }, [isShow, onFreezed, onUnFreezed, setShow]);

  const handleRename = useCallback(() => {
    onRename();
    setShow(false);
  }, [onRename, setShow]);

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
        className="sf-dropdown-toggle op-icon face-recognition-more-operations-toggle"
        title={gettext('More operations')}
        aria-label={gettext('More operations')}
        data-toggle="dropdown"
      >
        <Icon symbol="more-level" />
      </DropdownToggle>
      <DropdownMenu>
        <DropdownItem onClick={handleRename}>{gettext('Rename')}</DropdownItem>
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
