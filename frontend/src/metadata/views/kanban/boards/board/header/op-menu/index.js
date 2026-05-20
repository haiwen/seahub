import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../../../../../utils/constants';
import CustomDropdown from '../../../../../../../components/dropdown';

const OpMenu = ({ idx, onDelete, onFreezed, onUnFreezed }) => {
  const handleFreeze = useCallback(() => {
    onFreezed();
  }, [onFreezed]);

  const handleUnfreeze = useCallback(() => {
    onUnFreezed(false);
  }, [onUnFreezed]);

  const handleDelete = useCallback(() => {
    onDelete();
  }, [onDelete]);

  const items = [
    { key: 'delete', label: gettext('Delete'), onClick: handleDelete },
  ];

  const toggleId = `header-dropdown-btn-${idx}`;

  return (
    <CustomDropdown
      target={toggleId}
      items={items}
      triggerClassName="sf-dropdown-toggle kanban-header-op-btn kanban-more-operations-toggle"
      freezeItem={handleFreeze}
      unfreezeItem={handleUnfreeze}
    />
  );
};

OpMenu.propTypes = {
  idx: PropTypes.number,
  onDelete: PropTypes.func,
  onFreezed: PropTypes.func,
  onUnFreezed: PropTypes.func,
};

export default OpMenu;
