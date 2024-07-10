import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import { gettext } from '../../utils/constants';

const propTypes = {
  members: PropTypes.array.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class GroupMembers extends React.Component {

  render() {
    const { members } = this.props;
    return (
      <Modal isOpen={true} toggle={this.props.toggleDialog}>
        <ModalHeader toggle={this.props.toggleDialog}>{`${gettext('Group members')} (${members.length})`}</ModalHeader>
        <ModalBody className="px-0 group-members-container">
          <ul className="list-unstyled">
            {members.map((item, index) => {
              return <li key={index} className="group-member px-4 py-2 d-flex align-items-center">
                <img src={item.avatar_url} alt={item.name} className="avatar" />
                <span className="ml-2 text-truncate" title={item.name}>{item.name}</span>
              </li>;
            })}
          </ul>
        </ModalBody>
      </Modal>
    );
  }
}

GroupMembers.propTypes = propTypes;

export default GroupMembers;
