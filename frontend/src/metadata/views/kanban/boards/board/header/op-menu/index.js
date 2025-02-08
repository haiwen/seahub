import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { gettext } from '../../../../../../../utils/constants';

const OpMenu = ({ onDelete, onFreezed, onUnFreezed }) => {
  let [isShow, setShow] = useState(false);

  const toggle = useCallback((event) => {
    event.stopPropagation();
    if (isShow) {
      onUnFreezed(event);
    } else {
      onFreezed();
    }
    setShow(!isShow);
  }, [isShow, onFreezed, onUnFreezed, setShow]);

  const handleDelete = useCallback(() => {
    onDelete();
    setShow(false);
  }, [onDelete, setShow]);

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
        className="sf-dropdown-toggle sf3-font-more sf3-font kanban-header-op-btn kanban-more-operations-toggle"
        title={gettext('More operations')}
        aria-label={gettext('More operations')}
        data-toggle="dropdown"
      />
      <DropdownMenu>
        <DropdownItem onClick={handleDelete}>{gettext('Delete')}</DropdownItem>
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

