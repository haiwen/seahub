import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext, repoID } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import moment from 'moment';
import { Utils } from '../../utils/utils';

const propTypes = {
  repoTagId: PropTypes.number.isRequired,
  toggleCancel: PropTypes.func.isRequired,
};

class ListTaggedFilesDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      taggedFileList: [],
    };
  }

  componentDidMount() {
    this.getTaggedFiles();
  }

  getTaggedFiles = () => {
    let repoTagId = this.props.repoTagId;
    seafileAPI.listTaggedFiles(repoID, repoTagId).then(res => {
      let taggedFileList = [];
      res.data.tagged_files !== undefined &&
      res.data.tagged_files.forEach(file => {
        let taggedFile = file;
        taggedFileList.push(taggedFile)
      });
      this.setState({
        taggedFileList: taggedFileList,
      })
    });
  }

  toggle = () => {
    this.props.toggleCancel();
  }

  render() {
    let taggedFileList = this.state.taggedFileList;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Tagged Files')}</ModalHeader>
        <ModalBody>
          {
            <table>
              <thead>
                <tr>
                  <th width='25%'>{gettext('Name')}</th>
                  <th width='25%'>{gettext('Size')}</th>
                  <th width='25%'>{gettext('Last Update')}</th>
                  <th width='25%'>{gettext('Parent Path')}</th>
                </tr>
              </thead>
              <tbody>
                {taggedFileList.map((taggedFile, index) => {
                  return (
                    <tr key={index}>
                      <td>{taggedFile.filename}</td>
                      <td>{Utils.bytesToSize(taggedFile.size)}</td>
                      <td>{moment.unix(taggedFile.mtime).fromNow()}</td>
                      <td>{taggedFile.parent_path}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          }
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.toggle}>{gettext('Close')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

ListTaggedFilesDialog.propTypes = propTypes;

export default ListTaggedFilesDialog;
