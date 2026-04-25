import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { gettext } from '../../../../../../../utils/constants';
import Icon from '../../../../../../../components/icon';
import SfTooltip from '@/components/tooltip';

const OpMenu = ({ idx, onDelete, onFreezed, onUnFreezed }) => {
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
    <Dropdown id={`header-dropdown-btn-${idx}`} isOpen={isShow} toggle={toggle}>
      <DropdownToggle
        tag="span"
        role="button"
        tabIndex="0"
        className="sf-dropdown-toggle kanban-header-op-btn kanban-more-operations-toggle"
        aria-label={gettext('More operations')}
        data-toggle="dropdown"
      >
        <Icon symbol="more-level" />
        <SfTooltip target={`header-dropdown-btn-${idx}`}>{gettext('More operations')}</SfTooltip>
      </DropdownToggle>
      <DropdownMenu>
        <DropdownItem onClick={handleDelete}>{gettext('Delete')}</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
};

OpMenu.propTypes = {
  idx: PropTypes.number,
  onRename: PropTypes.func,
  onFreezed: PropTypes.func,
  onUnFreezed: PropTypes.func,
};

export default OpMenu;
