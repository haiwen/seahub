import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import EditFileTagDialog from '../dialog/edit-filetag-dialog';
import ListRelatedFileDialog from '../dialog/list-related-file-dialog';
import AddRelatedFileDialog from '../dialog/add-related-file-dialog';

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
};

class DetailListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isEditFileTagShow: false,
      isListRelatedFileShow: false,
      isAddRelatedFileShow: false,
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
    let { dirent, path } = this.props;
    return Utils.joinPath(path, dirent.name);
  }

  onListRelatedFileToggle = () => {
    this.setState({
      isListRelatedFileShow: !this.state.isListRelatedFileShow
    });
  }

  onAddRelatedFileToggle = () => {
    this.setState({
      isListRelatedFileShow: !this.state.isListRelatedFileShow,
      isAddRelatedFileShow: !this.state.isAddRelatedFileShow
    });
  }
  
  render() {
    let { direntType, direntDetail, fileTagList, relatedFiles } = this.props;
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
                          <span className={`file-tag bg-${fileTag.color}`}></span>
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
            </tbody>
          </table>
          {
            this.state.isAddRelatedFileShow &&
            <AddRelatedFileDialog
              filePath={direntPath}
              repoID={this.props.repoID}
              toggleCancel={this.onAddRelatedFileToggle}
              onRelatedFileChange={this.props.onRelatedFileChange}
              dirent={this.props.dirent}
            />
          }
          {
            this.state.isListRelatedFileShow &&
            <ListRelatedFileDialog
              relatedFiles={relatedFiles}
              repoID={this.props.repoID}
              filePath={direntPath}
              toggleCancel={this.onListRelatedFileToggle}
              addRelatedFileToggle={this.onAddRelatedFileToggle}
              onRelatedFileChange={this.props.onRelatedFileChange}
            />
          }
          {
            this.state.isEditFileTagShow &&
            <EditFileTagDialog
              repoID={this.props.repoID}
              fileTagList={fileTagList}
              filePath={direntPath}
              toggleCancel={this.onEditFileTagToggle}
              onFileTagChanged={this.onFileTagChanged}
            />
          }
        </Fragment>
      );
    }
  }
}

DetailListView.propTypes = propTypes;

export default DetailListView;
