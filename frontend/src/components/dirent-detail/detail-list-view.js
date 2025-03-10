import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { v4 as uuidv4 } from 'uuid';
import Icon from '../icon';
import { gettext, enableFileTags } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import EditFileTagPopover from '../popover/edit-filetag-popover';
import FileTagList from '../file-tag-list';
import ExtraMetadataAttributesDialog from '../dialog/extra-metadata-attributes-dialog';

const propTypes = {
  repoInfo: PropTypes.object.isRequired,
  repoID: PropTypes.string.isRequired,
  repoTags: PropTypes.array.isRequired,
  dirent: PropTypes.object.isRequired,
  direntType: PropTypes.string.isRequired,
  direntDetail: PropTypes.object.isRequired,
  path: PropTypes.string.isRequired,
  fileTagList: PropTypes.array.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
};

dayjs.extend(relativeTime);

class DetailListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isEditFileTagShow: false,
      isShowMetadataExtraProperties: false,
    };
    this.tagListTitleID = `detail-list-view-tags-${uuidv4()}`;
  }

  getFileParent = () => {
    let { repoInfo } = this.props;
    let direntPath = this.getDirentPath();
    let position = repoInfo.repo_name;
    if (direntPath !== '/') {
      let index = direntPath.lastIndexOf('/');
      let path = direntPath.slice(0, index);
      position = position + path;
    }
    return position;
  };

  getDirentPath = () => {
    if (Utils.isMarkdownFile(this.props.path)) {
      return this.props.path; // column mode: view file
    }
    let { dirent, path } = this.props;
    return Utils.joinPath(path, dirent.name);
  };

  onEditFileTagToggle = () => {
    this.setState({
      isEditFileTagShow: !this.state.isEditFileTagShow
    });
  };

  onFileTagChanged = () => {
    let direntPath = this.getDirentPath();
    this.props.onFileTagChanged(this.props.dirent, direntPath);
  };

  toggleExtraMetadataPropertiesDialog = () => {
    this.setState({ isShowMetadataExtraProperties: !this.state.isShowMetadataExtraProperties });
  };

  renderTags = () => {
    const { direntType, direntDetail, fileTagList = [] } = this.props;
    const position = this.getFileParent();
    if (direntType === 'dir') {
      return (
        <table className="table-thead-hidden">
          <thead>
            <tr><th width="35%"></th><th width="65%"></th></tr>
          </thead>
          <tbody>
            <tr><th>{gettext('Location')}</th><td>{position}</td></tr>
            <tr><th>{gettext('Last Update')}</th><td>{dayjs(direntDetail.mtime).format('YYYY-MM-DD')}</td></tr>
            {direntDetail.permission === 'rw' && window.app.pageOptions.enableMetadataManagement && (
              <Fragment>
                <tr className="file-extra-attributes">
                  <th colSpan={2}>
                    <div className="edit-file-extra-attributes-btn" onClick={this.toggleExtraMetadataPropertiesDialog}>
                      {gettext('Edit metadata properties')}
                    </div>
                  </th>
                </tr>
              </Fragment>
            )}
          </tbody>
        </table>
      );
    }
    return (
      <table className="table-thead-hidden">
        <thead>
          <tr><th width="35%"></th><th width="65%"></th></tr>
        </thead>
        <tbody>
          <tr><th>{gettext('Size')}</th><td>{Utils.bytesToSize(direntDetail.size)}</td></tr>
          <tr><th>{gettext('Location')}</th><td>{position}</td></tr>
          <tr><th>{gettext('Last Update')}</th><td>{dayjs(direntDetail.last_modified).fromNow()}</td></tr>
          <tr className="file-tag-container">
            <th>{gettext('Tags')}</th>
            <td>
              <FileTagList fileTagList={fileTagList} />
              {enableFileTags &&
                <span onClick={this.onEditFileTagToggle} id={this.tagListTitleID}><Icon symbol='tag' /></span>
              }
            </td>
          </tr>
          {direntDetail.permission === 'rw' && window.app.pageOptions.enableMetadataManagement && (
            <tr className="file-extra-attributes">
              <th colSpan={2}>
                <div className="edit-file-extra-attributes-btn" onClick={this.toggleExtraMetadataPropertiesDialog}>
                  {gettext('Edit metadata properties')}
                </div>
              </th>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  render() {
    const { direntType, direntDetail, fileTagList = [] } = this.props;
    const direntPath = this.getDirentPath();

    return (
      <Fragment>
        {this.renderTags()}
        {this.state.isEditFileTagShow &&
          <EditFileTagPopover
            repoID={this.props.repoID}
            repoTags={this.props.repoTags}
            filePath={direntPath}
            fileTagList={fileTagList}
            toggleCancel={this.onEditFileTagToggle}
            onFileTagChanged={this.onFileTagChanged}
            target={this.tagListTitleID}
            isEditFileTagShow={this.state.isEditFileTagShow}
          />
        }
        {this.state.isShowMetadataExtraProperties && (
          <ExtraMetadataAttributesDialog
            repoID={this.props.repoID}
            filePath={direntPath}
            direntType={direntType}
            direntDetail={direntDetail}
            onToggle={this.toggleExtraMetadataPropertiesDialog}
          />
        )}
      </Fragment>
    );
  }
}

DetailListView.propTypes = propTypes;

export default DetailListView;
