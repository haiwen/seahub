import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import copy from '../copy-to-clipboard';
import { gettext } from '../../utils/constants';
import toaster from '../../components/toast';

const propTypes = {
  link: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class ShareAdminLink extends React.Component {

  constructor(props) {
    super(props);
  }

 copyToClipboard = () => {
   copy(this.props.link);
   this.props.toggleDialog();
   toaster.success(gettext('The link is copied to the clipboard.')), {duration: 2};
 }

 render() {
   const { link, toggleDialog } = this.props;
   return (
     <Modal isOpen={true} toggle={toggleDialog}>
       <ModalHeader toggle={toggleDialog}>{gettext('Link')}</ModalHeader>
       <ModalBody>
         <a href={link}>{link}</a>
       </ModalBody>
       <ModalFooter>
         <Button color="primary" onClick={this.copyToClipboard}>{gettext('Copy')}</Button>
         <Button color="secondary" onClick={toggleDialog}>{gettext('Close')}</Button>
       </ModalFooter>
     </Modal>
   );
 }
}

ShareAdminLink.propTypes = propTypes;

export default ShareAdminLink;
