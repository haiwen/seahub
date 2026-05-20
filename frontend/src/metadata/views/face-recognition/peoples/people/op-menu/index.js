import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../../../../utils/constants';
import CustomDropdown from '../../../../../../components/dropdown';

const OpMenu = ({ onRename, onFreezed, onUnFreezed }) => {
  const handleFreeze = useCallback(() => {
    onFreezed();
  }, [onFreezed]);

  const handleUnfreeze = useCallback(() => {
    onUnFreezed(false);
  }, [onUnFreezed]);

  const handleRename = useCallback(() => {
    onRename();
  }, [onRename]);

  const items = [
    { key: 'rename', label: gettext('Rename'), onClick: handleRename },
  ];

  return (
    <CustomDropdown
      target="people-more-operations-toggle"
      items={items}
      triggerClassName="sf-dropdown-toggle op-icon face-recognition-more-operations-toggle"
      freezeItem={handleFreeze}
      unfreezeItem={handleUnfreeze}
    />
  );
};

OpMenu.propTypes = {
  onRename: PropTypes.func,
  onFreezed: PropTypes.func,
  onUnFreezed: PropTypes.func,
};

export default OpMenu;
