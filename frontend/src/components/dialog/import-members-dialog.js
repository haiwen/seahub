import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api.js';

const propTypes = {
  groupID: PropTypes.string.isRequired,
  toggleImportMembersDialog: PropTypes.func.isRequired,
  onGroupChanged: PropTypes.func.isRequired,
};

class ImportMembersDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      errMessage: [],
    };
  }

  importMembers = () => {
    let file = this.refs.groupMembers.files[0];
    if (file) {
      seafileAPI.importGroupMembers(this.props.groupID, file).then((res) => {
        if (res.data.failed.length === 0) {
          this.props.toggleImportMembersDialog();
          return;
        } else {
          this.setState({
            errMessage: res.data.failed
          });
        }
      });
    }
  }

  render() {
    return (
      <Modal isOpen={true}>
        <ModalHeader toggle={this.props.toggleImportMembersDialog}>{gettext('Import group members')}</ModalHeader>
        <ModalBody>
          <p>{gettext('Import group members from a CSV file')}</p>
          <input type="file" name="file" ref="groupMembers" accept=".csv"/>
          <p className='tip'>{gettext('File format: user@mail.com')}</p>
          {
            this.state.errMessage.length > 0 &&
            this.state.errMessage.map((item, index = 0) => {
              return (
                <div className="error" key={index}>{item.error_msg}</div>
              );
            })
          }
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleImportMembersDialog}>{gettext('Close')}</Button>
          <Button color="primary" onClick={this.importMembers}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

ImportMembersDialog.propTypes = propTypes;

export default ImportMembersDialog;
