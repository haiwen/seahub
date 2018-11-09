import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';

const propTypes = {
  currentResumableFile: PropTypes.object.isRequired,
  replacePrevFile: PropTypes.func.isRequired,
  doNotReplacePervFile: PropTypes.func.isRequired,
  doNotUploader: PropTypes.func.isRequired,
};

class UploaderReminderDialog extends React.Component {

  toggle = () => {
    this.props.doNotUploader();
  }

  render() {

    let title = gettext("Replace file {filename}?");
    title = title.replace('{filename}', '<span class="a-simaulte">' + this.props.currentResumableFile.fileName + '</span>');
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle} ><div dangerouslySetInnerHTML={{__html: title}}></div></ModalHeader>
        <ModalBody>
          <p>{gettext('A file with the same name already exists in this folder.')}</p>
          <p>{gettext('Replacing it will overwrite its content.')}</p>
        </ModalBody>
        <ModalFooter>
          <Button outline color="primary" onClick={this.props.replacePrevFile}>{gettext('Replace')}</Button>
          <Button outline color="info" onClick={this.props.doNotReplacePervFile}>{gettext("Don't replace")}</Button>
          <Button outline color="danger" onClick={this.toggle}>{gettext('Cancel')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

UploaderReminderDialog.propTypes = propTypes;

export default UploaderReminderDialog;
