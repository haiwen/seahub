import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import UserSelect from '../user-select';
import toaster from '../toast';
import { Utils } from '../../utils/utils';
import '../../css/participants-list.css';

const fileParticipantListItemPropTypes = {
  participant: PropTypes.object.isRequired,
  deleteFileParticipant: PropTypes.func.isRequired,
};

class FileParticipantListItem extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOperationShow: false,
    };
  }

  onMouseOver = () => {
    this.setState({ isOperationShow: true });
  };

  onMouseLeave = () => {
    this.setState({ isOperationShow: false });
  };

  render() {
    const { participant } = this.props;
    return (
      <div className="participant-select-info" onMouseOver={this.onMouseOver} onMouseLeave={this.onMouseLeave}>
        <div className="d-flex" style={{maxWidth: '90%'}}>
          <img className="avatar participant-select-avatar" src={participant.avatar_url} alt=""/>
          <span className="participant-select-name ellipsis">{participant.name}</span>
        </div>
        <i
          className={`action-icon sf2-icon-x3 ${!this.state.isOperationShow &&'o-hidden'}`}
          title={gettext('Delete')}
          onClick={this.props.deleteFileParticipant.bind(this, participant.email)}
        ></i>
      </div>
    );
  }
}

FileParticipantListItem.propTypes = fileParticipantListItemPropTypes;


const fileParticipantDialogPropTypes = {
  repoID: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  toggleFileParticipantDialog: PropTypes.func.isRequired,
  fileParticipantList: PropTypes.array.isRequired,
  onParticipantsChange: PropTypes.func,
};

class FileParticipantDialog extends Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedOption: null,
    };
  }

  handleSelectChange = (option) => {
    this.setState({ selectedOption: option });
  };

  deleteFileParticipant = (email) => {
    const { repoID, filePath } = this.props;
    seafileAPI.deleteFileParticipant(repoID, filePath, email).then((res) => {
      this.props.onParticipantsChange(repoID, filePath);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
    this.refs.userSelect.clearSelect();
  };

  addFileParticipant = () => {
    const { selectedOption } = this.state;
    const { repoID, filePath } = this.props;
    if (!selectedOption || selectedOption.length === 0) {
      return;
    }
    let emails = selectedOption.map((option) => {return option.email;});
    seafileAPI.addFileParticipants(repoID, filePath, emails).then((res) => {
      this.props.onParticipantsChange(repoID, filePath);
      res.data.failed.map(item => {
        const msg = gettext('Failed to add {email_placeholder}: {error_msg_placeholder}')
          .replace('{email_placeholder}', item.email)
          .replace('{error_msg_placeholder}', item.error_msg);
        toaster.danger(msg, {duration: 3});
      });
    }).catch(error => {
      toaster.danger(Utils.getErrorMsg(error));
    });
    this.setState({ selectedOption: null });
    this.refs.userSelect.clearSelect();
  };

  render() {
    const renderParticipantList = this.props.fileParticipantList.map((participant, index) => {
      return (
        <FileParticipantListItem
          key={index}
          participant={participant}
          deleteFileParticipant={this.deleteFileParticipant}
        />
      );
    });

    return (
      <Modal isOpen={true} toggle={this.props.toggleFileParticipantDialog}>
        <ModalHeader toggle={this.props.toggleFileParticipantDialog}>{gettext('Participants')}</ModalHeader>
        <ModalBody>
          <div className="participant-add">
            <UserSelect
              ref="userSelect"
              isMulti={true}
              className="participant-select"
              placeholder={gettext('Search users...')}
              onSelectChange={this.handleSelectChange}
            />
            <Button className="btn btn-secondary ml-2" onClick={this.addFileParticipant}>{gettext('Add')}</Button>
          </div>
          {renderParticipantList}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleFileParticipantDialog}>{gettext('Close')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

FileParticipantDialog.propTypes = fileParticipantDialogPropTypes;

export default FileParticipantDialog;
