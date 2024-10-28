import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { gettext } from '../../../../utils/constants';

const ListMoreOperations = ({ listId, field, moreOperationsList }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = () => setDropdownOpen(prevState => !prevState);

  return (
    <Dropdown isOpen={dropdownOpen} toggle={toggleDropdown}>
      <DropdownToggle
        tag={'i'}
        role="button"
        className='sf3-font sf3-font-more'
        data-toggle="dropdown"
        title={gettext('More operations')}
        aria-label={gettext('More operations')}
        aria-expanded={dropdownOpen}
      />
      <DropdownMenu>
        {moreOperationsList.map((operation, index) => (
          <DropdownItem
            key={index}
            disabled={!field.editable}
            onClick={() => operation.onClick(listId)}
          >
            {operation.label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};

ListMoreOperations.propTypes = {
  listId: PropTypes.string.isRequired,
  field: PropTypes.object.isRequired,
  moreOperationsList: PropTypes.array.isRequired,
};

export default ListMoreOperations;
