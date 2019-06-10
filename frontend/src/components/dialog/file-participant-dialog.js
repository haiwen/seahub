import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Modal, ModalHeader, ModalBody, ModalFooter, Button} from 'reactstrap';
import {gettext} from '../../utils/constants';
import UserSelect from '../user-select';
import {seafileAPI} from '../../utils/seafile-api';
import toaster from '../toast';


class FileParticipantListItem extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOperationShow: false,
    };
  }

  onMouseOver = () => {
    this.setState({
      isOperationShow: true,
    });
  };

  onMouseLeave = () => {
    this.setState({
      isOperationShow: false,
    });
  };

  render() {
    return (
      <div className="reviewer-select-info" style={{display: 'flex'}} onMouseOver={this.onMouseOver} onMouseLeave={this.onMouseLeave}>
        <div className="d-flex">
          <img className="avatar reviewer-select-avatar" src={this.props.participant.avatar_url} alt=""/>
          <span className="reviewer-select-name ellipsis">{this.props.participant.name}</span>
        </div>
        {this.state.isOperationShow &&
        <i
          className="action-icon sf2-icon-x3"
          title={gettext('Delete')}
          onClick={this.props.deleteFileParticipant.bind(this, this.props.participant.email)}
        ></i>
        }
      </div>
    );
  }
}

const fileParticipantListItemPropTypes = {
  participant: PropTypes.object.isRequired,
  deleteFileParticipant: PropTypes.func.isRequired,
};

FileParticipantListItem.propTypes = fileParticipantListItemPropTypes;


class FileParticipantDialog extends Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedOption: null,
    };
  }

  handleSelectChange = (option) => {
    this.setState({selectedOption: option});
  };

  deleteFileParticipant = (email) => {
    seafileAPI.deleteFileParticipant(this.props.repoID, this.props.filePath, email).then((res) => {
      this.props.onRelatedFileChange(this.props.dirent, this.props.filePath);
    }).catch((error) => {
      this.handleError(error);
    });
    this.refs.userSelect.clearSelect();
  };

  addFileParticipant = () => {
    if (!this.state.selectedOption || this.state.selectedOption.length === 0) {
      return;
    }
    let email = this.state.selectedOption.email;
    seafileAPI.addFileParticipant(this.props.repoID, this.props.filePath, email).then((res) => {
      this.props.onRelatedFileChange(this.props.dirent, this.props.filePath);
    }).catch((error) => {
      this.handleError(error);
    });
    this.setState({
      selectedOption: null,
    });
    this.refs.userSelect.clearSelect();
  };

  handleError = (e) => {
    if (e.response) {
      toaster.danger(e.response.data.error_msg || e.response.data.detail || gettext('Error'), {duration: 3});
    } else {
      toaster.danger(gettext('Please check the network.'), {duration: 3});
    }
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
          <div className="add-reviewer"  style={{display: 'flex'}}>
            <div style={{width: '385px'}}>
              <UserSelect
                ref="userSelect"
                isMulti={false}
                className="reviewer-select"
                placeholder={gettext('Select users...')}
                onSelectChange={this.handleSelectChange}
              />
            </div>
            <Button className="btn btn-secondary" onClick={this.addFileParticipant}>{gettext('Submit')}</Button>
          </div>
          <div>
            {renderParticipantList}
          </div>
        </ModalBody>
      </Modal>
    );
  }
}

const fileParticipantDialogPropTypes = {
  repoID: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  toggleFileParticipantDialog: PropTypes.func.isRequired,
  fileParticipantList: PropTypes.array.isRequired,
  onRelatedFileChange: PropTypes.func.isRequired,
  dirent: PropTypes.object.isRequired,
};

FileParticipantDialog.propTypes = fileParticipantDialogPropTypes;

export default FileParticipantDialog;
