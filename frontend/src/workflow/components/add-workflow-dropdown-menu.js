import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownItem, DropdownToggle } from 'reactstrap';
import Icon from '../../components/icon';
import { gettext } from '../../utils/constants';

const AddWorkflowDropdownMenu = ({ onToggleAddWorkflowDropdown, onToggleAddWorkflow, onToggleAddFolder }) => {

  return (
    <Dropdown
      isOpen
      toggle={onToggleAddWorkflowDropdown}
      className="add-workflow-dropdown"
    >
      <DropdownToggle
        role="button"
        data-toggle="dropdown"
        title={gettext('More operations')}
        aria-label={gettext('More operations')}
      >
      </DropdownToggle>
      <DropdownMenu container="body" className='add-workflow-dropdown-menu' tag="div">
        <DropdownItem onClick={onToggleAddWorkflow}>
          <Icon symbol="workflow" className="item-icon" />
          <span className='item-text'>{gettext('Workflow')}</span>
        </DropdownItem>
        <DropdownItem onClick={onToggleAddFolder}>
          <i className="sf3-font sf3-font-folder item-icon" aria-hidden="true"></i>
          <span className='item-text'>{gettext('Folder')}</span>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
};

AddWorkflowDropdownMenu.propTypes = {
  onToggleAddWorkflowDropdown: PropTypes.func,
  onToggleAddWorkflow: PropTypes.func,
  onToggleAddFolder: PropTypes.func,
};

export default AddWorkflowDropdownMenu;
