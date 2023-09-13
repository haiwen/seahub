import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import toaster from '../toast';
import { Utils } from '../../utils/utils';

const propTypes = {
  toggle: PropTypes.func,
  repoID: PropTypes.string,
  path: PropTypes.string
};

class ConfirmApplyFolderAttributiesDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      canSubmit: true
    };
  }

  submit = () => {
    toaster.success(gettext('Please wait a while'));
    const { repoID, path } = this.props;
    this.setState({canSubmit: false});
    seafileAPI.setFolderItemsExtendedProperties(repoID, path).then(() => {
      let timer = null;
      timer = setInterval(() => {
        seafileAPI.queryFolderItemsExtendedPropertiesStatus(repoID, path).then(res => {
          if (res.data.is_finished === true) {
            clearInterval(timer);
            toaster.success(gettext('Applied folder attributies'));
            this.props.toggle();
          }
        }).catch(error => {
          clearInterval(timer);
          let errorMsg = Utils.getErrorMsg(error);
          toaster.danger(errorMsg);
          this.setState({canSubmit: true});
        });
      }, 1000);
    }).catch(error => {
      let errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      this.setState({canSubmit: true});
    });
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.props.toggle}>
        <ModalHeader toggle={this.props.toggle}>
          {gettext('Apply')}
        </ModalHeader>

        <ModalBody>
          <p>
            {gettext('Are you sure to apply folder attributies to all sub dirents in the folder')}
          </p>
        </ModalBody>

        <ModalFooter>
          <Button color='secondary' disabled={!this.state.canSubmit} onClick={this.props.toggle}>{gettext('Cancel')}</Button>
          <Button color='primary' disabled={!this.state.canSubmit} onClick={this.submit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }

}

ConfirmApplyFolderAttributiesDialog.propTypes = propTypes;

export default ConfirmApplyFolderAttributiesDialog;
