import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';

const propTypes = {
  relatedFiles: PropTypes.array.isRequired,
  repoID: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  toggleCancel: PropTypes.func.isRequired,
  addRelatedFileToggle: PropTypes.func.isRequired,
};

class ListRelatedFileDialog extends React.Component {

  onDeleteRelatedFile = (item) => {
    let filePath = this.props.filePath;
    let repoID = this.props.repoID;
    let relatedID = item.related_id;
    seafileAPI.deleteRelatedFile(repoID, filePath, relatedID)
  }

  toggle = () => {
    this.props.toggleCancel();
  }

  render() {
    let relatedFiles = this.props.relatedFiles;
    return (
      <Modal isOpen={true}>
        <ModalHeader toggle={this.toggle}>{gettext('Related Files')}</ModalHeader>
        <ModalBody>
          {
            <table>
              <tbody>
                {relatedFiles.map((relatedFile, index) => {
                  return (
                    <tr key={index}>
                      <td width='90%'><a href={relatedFile.link} target='_blank'>{relatedFile.name}</a></td>
                      <td><i className='fa fa-trash' onClick={this.onDeleteRelatedFile.bind(this, relatedFile)}></i></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          }
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.props.addRelatedFileToggle}>{gettext('Add File')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

ListRelatedFileDialog.propTypes = propTypes;

export default ListRelatedFileDialog;
