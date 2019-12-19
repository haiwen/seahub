import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import { gettext, siteName, canAddRepo } from '../../utils/constants';

import '../../css/guide-for-new.css';

const propTypes = {
  toggleDialog: PropTypes.func.isRequired
};

class GuideForNewDialog extends React.Component {

  toggle = () => {
    this.props.toggleDialog();
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalBody>
          <button type="button" className="close" onClick={this.toggle}><span aria-hidden="true">×</span></button>
          <div className="p-2 d-flex">
            <span className="far fa-lightbulb new-guide-icon" aria-hidden="true"></span>
            <div className="txt">
              <h3 id="dialogTitle">{gettext('Welcome to {site_name_placeholder}').replace('{site_name_placeholder}', siteName)}</h3>
              {canAddRepo ?
                <p>{gettext('{site_name_placeholder} organizes files into libraries. Each library can be synced and shared separately. We have created a personal library for you. You can create more libraries later.').replace('{site_name_placeholder}', siteName)}</p> :
                <p>{gettext('{site_name_placeholder} organizes files into libraries. Each library can be synced and shared separately. Howerver, since you are a guest user now, you can not create libraries.').replace('{site_name_placeholder}', siteName)}</p>
              }
            </div>
          </div>
        </ModalBody>
      </Modal>
    );
  }
}

GuideForNewDialog.propTypes = propTypes;

export default GuideForNewDialog;
