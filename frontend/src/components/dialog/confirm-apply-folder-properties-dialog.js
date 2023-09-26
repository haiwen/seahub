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
      submitting: false
    };
  }

  submit = () => {
    const { repoID, path } = this.props;
    this.setState({ submitting: true });
    seafileAPI.applyFolderExtendedProperties(repoID, path).then(() => {
      toaster.success('Applied folder properties');
      this.props.toggle();
    }).catch(error => {
      let errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      this.setState({ submitting: false });
    });
  };

  render() {
    const { submitting } = this.state;

    return (
      <Modal isOpen={true} toggle={this.props.toggle} className="apply-properties-dialog">
        <ModalHeader toggle={this.props.toggle}>
          {gettext('Apply properties')}
        </ModalHeader>
        <ModalBody>
          <p>
            {gettext('Are you sure to apply properties to all files inside the folder?')}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button color='secondary' onClick={this.props.toggle} disabled={submitting}>{gettext('Cancel')}</Button>
          <Button color='primary' className='flex-shrink-0 apply-properties' disabled={submitting} onClick={this.submit}>
            {submitting ? (<Loading />) : (<>{gettext('Submit')}</>)}
          </Button>
        </ModalFooter>
      </Modal>
    );
  }

}

ConfirmApplyFolderPropertiesDialog.propTypes = propTypes;

export default ConfirmApplyFolderPropertiesDialog;
