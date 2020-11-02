import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import EditFileTagDialog from '../dialog/edit-filetag-dialog';
import ModalPortal from '../modal-portal';
import RelatedFileDialogs from '../dialog/related-file-dialogs';
import ParticipantsList from '../file-view/participants-list';

const propTypes = {
  repoInfo: PropTypes.object.isRequired,
  repoID: PropTypes.string.isRequired,
  dirent: PropTypes.object.isRequired,
  direntType: PropTypes.string.isRequired,
  direntDetail: PropTypes.object.isRequired,
  path: PropTypes.string.isRequired,
  fileTagList: PropTypes.array.isRequired,
  relatedFiles: PropTypes.array.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
  onRelatedFileChange: PropTypes.func.isRequired,
  onParticipantsChange: PropTypes.func.isRequired,
  fileParticipantList: PropTypes.array.isRequired,
};

class DetailListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isEditFileTagShow: false,
      showRelatedFileDialog: false,
    };
  }

  getDirentPostion = () => {
    let { repoInfo } = this.props;
    let direntPath = this.getDirentPath();
    let position = repoInfo.repo_name;
    if (direntPath !== '/') {
      let index = direntPath.lastIndexOf('/');
      let path = direntPath.slice(0, index);
      position = position + path;
    }
    return position;
  }

  onEditFileTagToggle = () => {
    this.setState({
      isEditFileTagShow: !this.state.isEditFileTagShow
    });
  }

  onFileTagChanged = () => {
    let direntPath = this.getDirentPath();
    this.props.onFileTagChanged(this.props.dirent, direntPath);
  }

  getDirentPath = () => {
    if (Utils.isMarkdownFile(this.props.path)) {
      return this.props.path; // column mode: view file
    }
    let { dirent, path } = this.props;
    return Utils.joinPath(path, dirent.name);
  }

  onRelatedFileChange = () => {
    let direntPath = this.getDirentPath();
    this.props.onRelatedFileChange(this.props.dirent, direntPath);
  }

  onListRelatedFileToggle = () => {
    this.setState({
      showRelatedFileDialog: true,
    });
  }

  toggleCancel = () => {
    this.setState({
      showRelatedFileDialog: false,
    });
  }

  render() {
    let { direntType, direntDetail, fileTagList, relatedFiles, fileParticipantList } = this.props;
    let position = this.getDirentPostion();
    let direntPath = this.getDirentPath();
    if (direntType === 'dir') {
      return (
        <table className="table-thead-hidden">
          <thead>
            <tr><th width="35%"></th><th width="65%"></th></tr>
          </thead>
          <tbody>
            <tr><th>{gettext('Location')}</th><td>{position}</td></tr>
            <tr><th>{gettext('Last Update')}</th><td>{moment(direntDetail.mtime).format('YYYY-MM-DD')}</td></tr>
          </tbody>
        </table>
      );
    } else {
      return (
        <Fragment>
          <table className="table-thead-hidden">
            <thead>
              <tr><th width="35%"></th><th width="65%"></th></tr>
            </thead>
            <tbody>
              <tr><th>{gettext('Size')}</th><td>{Utils.bytesToSize(direntDetail.size)}</td></tr>
              <tr><th>{gettext('Location')}</th><td>{position}</td></tr>
              <tr><th>{gettext('Last Update')}</th><td>{moment(direntDetail.last_modified).fromNow()}</td></tr>
              <tr className="file-tag-container">
                <th>{gettext('Tags')}</th>
                <td>
                  <ul className="file-tag-list">
                    {fileTagList.map((fileTag) => {
                      return (
                        <li key={fileTag.id} className="file-tag-item">
                          <span className="file-tag" style={{backgroundColor:fileTag.color}}></span>
                          <span className="tag-name" title={fileTag.name}>{fileTag.name}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <i className='fa fa-pencil-alt attr-action-icon' onClick={this.onEditFileTagToggle}></i>
                </td>
              </tr>
              <tr className="file-related-files">
                <th>{gettext('Related Files')}</th>
                <td>
                  <ul>
                    {relatedFiles.map((relatedFile, index) => {
                      let href = siteRoot + 'lib/' + relatedFile.repo_id + '/file' + Utils.encodePath(relatedFile.path);
                      return (
                        <li key={index}>
                          <a href={href} target='_blank'>{relatedFile.name}</a>
                        </li>
                      );
                    })}
                  </ul>
                  <i className='fa fa-pencil-alt attr-action-icon' onClick={this.onListRelatedFileToggle}></i>
                </td>
              </tr>
              <tr className="file-participants">
                <th>{gettext('Participants')}</th>
                <td>
                  {fileParticipantList &&
                    <ParticipantsList
                      onParticipantsChange={this.props.onParticipantsChange}
                      participants={fileParticipantList}
                      repoID={this.props.repoID}
                      filePath={direntPath}
                      showIconTip={false}
                    />
                  }
                </td>
              </tr>
            </tbody>
          </table>
          {this.state.showRelatedFileDialog &&
            <ModalPortal>
              <RelatedFileDialogs
                repoID={this.props.repoID}
                filePath={direntPath}
                relatedFiles={relatedFiles}
                toggleCancel={this.toggleCancel}
                onRelatedFileChange={this.onRelatedFileChange}
                dirent={this.props.dirent}
                viewMode="list_related_file"
              />
            </ModalPortal>
          }
          {this.state.isEditFileTagShow &&
            <ModalPortal>
              <EditFileTagDialog
                repoID={this.props.repoID}
                fileTagList={fileTagList}
                filePath={direntPath}
                toggleCancel={this.onEditFileTagToggle}
                onFileTagChanged={this.onFileTagChanged}
              />
            </ModalPortal>
          }
        </Fragment>
      );
    }
  }
}

DetailListView.propTypes = propTypes;

export default DetailListView;