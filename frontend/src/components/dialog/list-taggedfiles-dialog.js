import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import moment from 'moment';
import { Utils } from '../../utils/utils';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  currentTag: PropTypes.object.isRequired,
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
    let { repoID, currentTag } = this.props;
    seafileAPI.listTaggedFiles(repoID, currentTag.id).then(res => {
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
          <table>
            <thead className="table-thread-hidden">
              <tr>
                <th width='50%' className="ellipsis">{gettext('Name')}</th>
                <th width='25%'>{gettext('Size')}</th>
                <th width='25%'>{gettext('Last Update')}</th>
              </tr>
            </thead>
            <tbody>
              {taggedFileList.map((taggedFile, index) => {
                return (
                  <tr key={index}>
                    <td>{taggedFile.filename}</td>
                    <td>{Utils.bytesToSize(taggedFile.size)}</td>
                    <td>{moment.unix(taggedFile.mtime).fromNow()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
