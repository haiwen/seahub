import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../utils/constants';
import ListAndAddGroupMembers from '../list-and-add-group-members';
import SearchGroupMembers from '../search-group-members';

import '../../css/manage-members-dialog.css';

const propTypes = {
  groupID: PropTypes.string.isRequired,
  isOwner: PropTypes.bool.isRequired,
  toggleManageMembersDialog: PropTypes.func.isRequired
};

const MANAGEMENT_MODE= {
  LIST_AND_ADD: 'list_and_add',
  SEARCH: 'search'
};

class ManageMembersDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      currentMode: MANAGEMENT_MODE.LIST_AND_ADD
    };
  }

  changeMode = () => {
    this.setState({
      currentMode: this.state.currentMode == MANAGEMENT_MODE.LIST_AND_ADD ?
        MANAGEMENT_MODE.SEARCH : MANAGEMENT_MODE.LIST_AND_ADD
    });
  }

  render() {
    const { currentMode } = this.state;
    const { groupID, isOwner, toggleManageMembersDialog: toggle } = this.props;
    return (
      <Modal isOpen={true} toggle={toggle} className="group-manage-members-dialog">
        <ModalHeader toggle={toggle}>
          {currentMode == MANAGEMENT_MODE.LIST_AND_ADD ?
            gettext('Manage group members') : (
              <Fragment>
                <button className="fa fa-arrow-left back-icon border-0 bg-transparent mr-2 p-0" onClick={this.changeMode} title={gettext('Back')} aria-label={gettext('Back')}></button>
                <span>{gettext('Search group members')}</span>
              </Fragment>
            )
          }
        </ModalHeader>
        <ModalBody className="pb-0">
          {currentMode == MANAGEMENT_MODE.LIST_AND_ADD ?
            <ListAndAddGroupMembers
              groupID={groupID}
              isOwner={isOwner}
              changeMode={this.changeMode}
            /> :
            <SearchGroupMembers groupID={groupID} isOwner={isOwner} />
          }
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggle}>{gettext('Close')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

ManageMembersDialog.propTypes = propTypes;

export default ManageMembersDialog;
