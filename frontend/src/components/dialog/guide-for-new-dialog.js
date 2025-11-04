import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import { gettext, mediaUrl, siteName, canAddRepo } from '../../utils/constants';
import Icon from '../icon';
import '../../css/seahub-modal-header.css';

const propTypes = {
  toggleDialog: PropTypes.func.isRequired
};

class GuideForNewDialog extends React.Component {

  toggle = () => {
    this.props.toggleDialog();
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalBody>
          <button type="button" className="close seahub-modal-btn p-0" aria-label={gettext('Close')} title={gettext('Close')} onClick={this.toggle}>
            <span className="seahub-modal-btn-inner">
              <Icon symbol="x-01" className="w-4 h-4" />
            </span>
          </button>
          <div className="p-2 text-center">
            <img src={`${mediaUrl}img/welcome.png`} width="408" alt="" />
            <h3 id="dialogTitle" className="mt-6 mb-4">{gettext('Welcome to {site_name_placeholder}').replace('{site_name_placeholder}', siteName)}</h3>
            {canAddRepo ?
              <p>{gettext('{site_name_placeholder} organizes files into libraries. Each library can be synced and shared separately. We have created a personal library for you. You can create more libraries later.').replace('{site_name_placeholder}', siteName)}</p> :
              <p>{gettext('{site_name_placeholder} organizes files into libraries. Each library can be synced and shared separately. However, since you are a guest user now, you can not create libraries.').replace('{site_name_placeholder}', siteName)}</p>
            }
          </div>
        </ModalBody>
      </Modal>
    );
  }
}

GuideForNewDialog.propTypes = propTypes;

export default GuideForNewDialog;
