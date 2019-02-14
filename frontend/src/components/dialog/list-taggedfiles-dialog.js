import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import moment from 'moment';
import { Utils } from '../../utils/utils';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  currentTag: PropTypes.object.isRequired,
  toggleCancel: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  updateUsedRepoTags: PropTypes.func.isRequired,
};

class ListTaggedFilesDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      taggedFileList: [],
    };
  }

  onDeleteTaggedFile = (taggedFile) => {
    let repoID = this.props.repoID;
    let fileTagID = taggedFile.file_tag_id;
    seafileAPI.deleteFileTag(repoID, fileTagID).then(res => {
      this.getTaggedFiles();
      this.props.updateUsedRepoTags();
    });
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
        taggedFileList.push(taggedFile);
      });
      this.setState({
        taggedFileList: taggedFileList,
      });
    });
  }

  render() {
    let taggedFileList = this.state.taggedFileList;
    return (
      <Modal isOpen={true}>
        <ModalHeader toggle={this.props.onClose}>{gettext('Tagged Files')}</ModalHeader>
        <ModalBody className="dialog-list-container">
          <table>
            <thead>
              <tr>
                <th width='45%' className="ellipsis">{gettext('Name')}</th>
                <th width='27%'>{gettext('Size')}</th>
                <th width='18%'>{gettext('Last Update')}</th>
                <th width='10%'></th>
              </tr>
            </thead>
            <tbody>
              {taggedFileList.map((taggedFile, index) => {
                return (
                  <TaggedFile
                    key={index}
                    repoID={this.props.repoID}
                    taggedFile={taggedFile}
                    onDeleteTaggedFile={this.onDeleteTaggedFile}
                  />
                );
              })}
            </tbody>
          </table>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleCancel}>{gettext('Close')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

ListTaggedFilesDialog.propTypes = propTypes;

export default ListTaggedFilesDialog;

const TaggedFilePropTypes = {
  repoID: PropTypes.string.isRequired,
  taggedFile: PropTypes.object,
  onDeleteTaggedFile: PropTypes.func.isRequired,
};

class TaggedFile extends React.Component {

  constructor(props) {
    super(props);
    this.state = ({
      active: false,
    });
  }

  onMouseEnter = () => {
    this.setState({
      active: true
    });
  }

  onMouseLeave = () => {
    this.setState({
      active: false
    });
  }

  render() {
    const taggedFile = this.props.taggedFile;
    let className = this.state.active ? 'action-icon sf2-icon-x3' : 'action-icon vh sf2-icon-x3';
    let path = taggedFile.parent_path ? Utils.joinPath(taggedFile.parent_path, taggedFile.filename) : '';
    let href = siteRoot + 'lib/' + this.props.repoID + '/file' + Utils.encodePath(path);
    return ( taggedFile.file_deleted ?
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td colSpan='3' className="name">{taggedFile.filename}{' '}
          <span style={{color:"red"}}>{gettext('deleted')}</span>
        </td>
        <td><i className={className} onClick={this.props.onDeleteTaggedFile.bind(this, taggedFile)}></i></td>
      </tr>
      :
      <tr>
        <td className="name"><a href={href} target='_blank'>{taggedFile.filename}</a></td>
        <td>{Utils.bytesToSize(taggedFile.size)}</td>
        <td colSpan='2'>{moment.unix(taggedFile.mtime).fromNow()}</td>
      </tr>
    );
  }
}

TaggedFile.propTypes = TaggedFilePropTypes;
