import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import toaster from '../toast';
import { Utils } from '../../utils/utils';
import Loading from '../loading';

import '../../css/apply-folder-properties.css';

const propTypes = {
  toggle: PropTypes.func,
  repoID: PropTypes.string,
  path: PropTypes.string
};

class ConfirmApplyFolderPropertiesDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      canSubmit: true
    };
  }

  submit = () => {
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
          {gettext('Apply properties')}
        </ModalHeader>

        <ModalBody>
          <p>
            {gettext('Are you sure to apply properties to all files inside the folder?')}
          </p>
        </ModalBody>

        <ModalFooter>
          <Button color='secondary' disabled={!this.state.canSubmit} onClick={this.props.toggle}>{gettext('Cancel')}</Button>
          <Button color='primary' className='flex-shrink-0 apply-properties' disabled={!this.state.canSubmit} onClick={this.submit}>
            {this.state.canSubmit &&
              <span>{gettext('Submit')}</span>
            }
            {!this.state.canSubmit &&
              <Loading />
            }
          </Button>
        </ModalFooter>
      </Modal>
    );
  }

}

ConfirmApplyFolderPropertiesDialog.propTypes = propTypes;

export default ConfirmApplyFolderPropertiesDialog;
