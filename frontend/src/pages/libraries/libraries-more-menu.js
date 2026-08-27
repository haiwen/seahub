import React from 'react';
import PropTypes from 'prop-types';
import CustomDropdown from '../../components/dropdown';
import Icon from '../../components/icon';
import Tooltip from '../../components/tooltip';
import { gettext } from '../../utils/constants';

const LibrariesMoreMenu = ({ className, onlyShowGroupsWithLibraries, onToggleOnlyShowGroupsWithLibraries }) => {
  const target = 'libraries-more-menu';
  const items = [{
    key: 'only-show-groups-with-libraries',
    label: gettext('Only show groups with libraries'),
    checked: onlyShowGroupsWithLibraries,
    onClick: onToggleOnlyShowGroupsWithLibraries,
  }];

  const renderTrigger = (isOpen) => (
    <>
      <Icon symbol="more" />
      {!isOpen && <Tooltip target={target}>{gettext('More operations')}</Tooltip>}
    </>
  );

  return (
    <CustomDropdown
      target={target}
      items={items}
      variant="control"
      className={className}
      menuClassName="libraries-more-menu"
      trigger={renderTrigger}
      triggerClassName="cur-view-path-btn px-1"
      toggleProps={{ 'aria-label': gettext('More operations') }}
      menuPortal={false}
    />
  );
};

LibrariesMoreMenu.propTypes = {
  className: PropTypes.string,
  onlyShowGroupsWithLibraries: PropTypes.bool.isRequired,
  onToggleOnlyShowGroupsWithLibraries: PropTypes.func.isRequired,
};

export default LibrariesMoreMenu;
