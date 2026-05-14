import { gettext } from '../../../utils/constants';

export function getDepartmentMenuItems({ node, toggleDelete, toggleRename, toggleAddMembers, toggleAddDepartment, toggleAddLibrary, toggleSetQuotaDialog, toggleMoveDepartment }) {
  return [
    { key: `${node.id}-add-department`, label: gettext('Add sub-department'), onClick: () => toggleAddDepartment(node) },
    { key: `${node.id}-add-repo`, label: gettext('Add Library'), onClick: () => toggleAddLibrary(node) },
    { key: `${node.id}-add-members`, label: gettext('Add members'), onClick: () => toggleAddMembers(node) },
    { key: `${node.id}-rename`, label: gettext('Rename'), onClick: () => toggleRename(node) },
    { key: `${node.id}-delete`, label: gettext('Delete'), onClick: () => toggleDelete(node) },
    { key: `${node.id}-move`, label: gettext('Move department'), onClick: () => toggleMoveDepartment(node) },
    { key: `${node.id}-set-quota`, label: gettext('Set quota'), onClick: () => toggleSetQuotaDialog(node) },
    { key: `${node.id}-id`, label: `${gettext('Department ID')} : ${node.id}`, disabled: true },
  ];
}
