import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import moment from 'moment';
import { gettext, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  currentTag: PropTypes.object.isRequired,
  toggleCancel: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  updateUsedRepoTags: PropTypes.func,
  onFileTagChanged: PropTypes.func,
  shareLinkToken: PropTypes.string,
  enableFileDownload: PropTypes.bool
};

class ListTaggedFilesDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      taggedFileList: [],
    };
  }

  onFileTagChanged = (TaggedFile) => {
    const path = TaggedFile.parent_path;
    const dirent = {name: TaggedFile.filename};
    let direntPath = path === '/' ? path + TaggedFile.filename : path + '/' + TaggedFile.filename;
    this.props.onFileTagChanged(dirent, direntPath);
  }

  onDeleteTaggedFile = (taggedFile) => {
    let repoID = this.props.repoID;
    let fileTagID = taggedFile.file_tag_id;
    seafileAPI.deleteFileTag(repoID, fileTagID).then(res => {
      this.getTaggedFiles();
      this.props.updateUsedRepoTags();
      if ((this.props.onFileTagChanged) && !taggedFile.file_deleted) this.onFileTagChanged(taggedFile);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  componentDidMount() {
    this.getTaggedFiles();
  }

  getTaggedFiles = () => {
    let { repoID, currentTag, shareLinkToken } = this.props;
    let request = shareLinkToken ?
      seafileAPI.getShareLinkTaggedFiles(shareLinkToken, currentTag.id) :
      seafileAPI.listTaggedFiles(repoID, currentTag.id);
    request.then(res => {
      let taggedFileList = [];
      res.data.tagged_files !== undefined &&
      res.data.tagged_files.forEach(file => {
        let taggedFile = file;
        taggedFileList.push(taggedFile);
      });
      this.setState({
        taggedFileList: taggedFileList,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    let taggedFileList = this.state.taggedFileList;
    return (
      <Modal isOpen={true} style={{maxWidth: '678px'}}>
        <ModalHeader toggle={this.props.onClose}>{gettext('Tagged Files')}</ModalHeader>
        <ModalBody className="dialog-list-container">
          <table>
            <thead>
              <tr>
                <th width='50%' className="ellipsis">{gettext('Name')}</th>
                <th width='20%'>{gettext('Size')}</th>
                <th width='22%'>{gettext('Last Update')}</th>
                <th width='8%'></th>
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
                    shareLinkToken={this.props.shareLinkToken}
                    enableFileDownload={this.props.enableFileDownload}
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
  shareLinkToken: PropTypes.string,
  enableFileDownload: PropTypes.bool
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

  deleteFile = (e) => {
    e.preventDefault();
    this.props.onDeleteTaggedFile(this.props.taggedFile);
  }

  render() {
    const { taggedFile, shareLinkToken, enableFileDownload } = this.props;

    let path = taggedFile.parent_path ? Utils.joinPath(taggedFile.parent_path, taggedFile.filename) : '';
    let href = shareLinkToken ?
      siteRoot + 'd/' + shareLinkToken + '/files/?p=' + Utils.encodePath(path) :
      siteRoot + 'lib/' + this.props.repoID + '/file' + Utils.encodePath(path);

    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} onFocus={this.onMouseEnter}>
        {taggedFile.file_deleted ?
          <Fragment>
            <td colSpan='3' className="name">{taggedFile.filename}{' '}
              <span style={{color:'red'}}>{gettext('deleted')}</span>
            </td>
          </Fragment>
          :
          <Fragment>
            <td><a href={href} target='_blank' className="d-inline-block w-100 ellipsis" title={taggedFile.filename} rel="noreferrer">{taggedFile.filename}</a></td>
            <td>{Utils.bytesToSize(taggedFile.size)}</td>
            <td>{moment.unix(taggedFile.mtime).fromNow()}</td>
          </Fragment>
        }
        <td>
          {!shareLinkToken &&
            <a href="#" role="button" aria-label={gettext('Delete')} title={gettext('Delete')} className={`action-icon sf2-icon-x3${this.state.active ? '' : ' invisible'}`} onClick={this.deleteFile}></a>
          }
          {(shareLinkToken && enableFileDownload) &&
            <a className={`action-icon sf2-icon-download${this.state.active ? '' : ' invisible'}`} href={`${href}&dl=1`} title={gettext('Download')} aria-label={gettext('Download')}></a>
          }
        </td>
      </tr>
    );
  }
}

TaggedFile.propTypes = TaggedFilePropTypes;
