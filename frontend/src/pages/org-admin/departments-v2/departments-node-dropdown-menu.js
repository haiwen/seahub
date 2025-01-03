import React from 'react';
import PropTypes from 'prop-types';
import { DropdownItem, DropdownMenu } from 'reactstrap';
import { gettext } from '../../../utils/constants';

function DepartmentNodeMenu({ node, toggleDelete, toggleRename, toggleAddMembers, toggleAddDepartment, toggleAddLibrary }) {
  return (
    <DropdownMenu
      right={true}
      modifiers={{ preventOverflow: { boundariesElement: document.body } }}
      positionFixed={true}
    >
      <DropdownItem key={`${node.id}-add-department`} onClick={() => toggleAddDepartment(node)}>
        {gettext('Add sub-department')}
      </DropdownItem>
      <DropdownItem key={`${node.id}-add-repo`} onClick={() => toggleAddLibrary(node)}>
        {gettext('Add Library')}
      </DropdownItem>
      <DropdownItem key={`${node.id}-add-members`} onClick={() => toggleAddMembers(node)}>
        {gettext('Add members')}
      </DropdownItem>
      <DropdownItem key={`${node.id}-rename`} onClick={() => toggleRename(node)}>
        {gettext('Rename')}
      </DropdownItem>
      <DropdownItem key={`${node.id}-delete`} onClick={() => toggleDelete(node)}>
        {gettext('Delete')}
      </DropdownItem>
      <DropdownItem key={`${node.id}-id`} disabled={true}>
        {`${gettext('Department ID')} : ${node.id}`}
      </DropdownItem>
    </DropdownMenu>
  );
}

DepartmentNodeMenu.propTypes = {
  node: PropTypes.object.isRequired,
  toggleDelete: PropTypes.func.isRequired,
  toggleRename: PropTypes.func.isRequired,
  toggleAddMembers: PropTypes.func.isRequired,
  toggleAddDepartment: PropTypes.func.isRequired,
  toggleAddLibrary: PropTypes.func.isRequired,
};

export default DepartmentNodeMenu;
