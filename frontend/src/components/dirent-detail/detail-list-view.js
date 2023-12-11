import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import Icon from '../icon';
import { gettext, canSetExProps } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import EditFileTagPopover from '../popover/edit-filetag-popover';
import ExtraAttributesDialog from '../dialog/extra-attributes-dialog';
import FileTagList from '../file-tag-list';
import ConfirmApplyFolderPropertiesDialog from '../dialog/confirm-apply-folder-properties-dialog';

const propTypes = {
  repoInfo: PropTypes.object.isRequired,
  repoID: PropTypes.string.isRequired,
  dirent: PropTypes.object.isRequired,
  direntType: PropTypes.string.isRequired,
  direntDetail: PropTypes.object.isRequired,
  path: PropTypes.string.isRequired,
  fileTagList: PropTypes.array.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
};

class DetailListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isEditFileTagShow: false,
      isShowExtraProperties: false,
      isShowApplyProperties: false
    };
    this.tagListTitleID = `detail-list-view-tags-${uuidv4()}`;
  }

  getDirentPosition = () => {
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

  onEditFileTagToggle = () => {
    this.setState({
      isEditFileTagShow: !this.state.isEditFileTagShow
    });
  };

  onFileTagChanged = () => {
    let direntPath = this.getDirentPath();
    this.props.onFileTagChanged(this.props.dirent, direntPath);
  };

  getDirentPath = () => {
    if (Utils.isMarkdownFile(this.props.path)) {
      return this.props.path; // column mode: view file
    }
    let { dirent, path } = this.props;
    return Utils.joinPath(path, dirent.name);
  };

  toggleExtraPropertiesDialog = () => {
    this.setState({ isShowExtraProperties: !this.state.isShowExtraProperties });
  };

  toggleApplyPropertiesDialog = () => {
    this.setState({ isShowApplyProperties: !this.state.isShowApplyProperties });
  };

  renderTags = () => {
    const { direntType, direntDetail } = this.props;
    const position = this.getDirentPosition();
    if (direntType === 'dir') {
      return (
        <table className="table-thead-hidden">
          <thead>
            <tr><th width="35%"></th><th width="65%"></th></tr>
          </thead>
          <tbody>
            <tr><th>{gettext('Location')}</th><td>{position}</td></tr>
            <tr><th>{gettext('Last Update')}</th><td>{moment(direntDetail.mtime).format('YYYY-MM-DD')}</td></tr>
            {direntDetail.permission === 'rw' && canSetExProps && (
              <Fragment>
                <tr className="file-extra-attributes">
                  <th colSpan={2}>
                    <div className="edit-file-extra-attributes-btn" onClick={this.toggleExtraPropertiesDialog}>
                      {gettext('Edit extra properties')}
                    </div>
                  </th>
                </tr>
                <tr className="file-extra-attributes">
                  <th colSpan={2}>
                    <div
                      className="edit-file-extra-attributes-btn text-truncate"
                      onClick={this.toggleApplyPropertiesDialog}
                      title={gettext('Apply properties to files inside the folder')}
                    >
                      {gettext('Apply properties to files inside the folder')}
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
          <tr><th>{gettext('Last Update')}</th><td>{moment(direntDetail.last_modified).fromNow()}</td></tr>
          <tr className="file-tag-container">
            <th>{gettext('Tags')}</th>
            <td>
              <FileTagList fileTagList={this.props.fileTagList} />
              <span onClick={this.onEditFileTagToggle} id={this.tagListTitleID}><Icon symbol='tag' /></span>
            </td>
          </tr>
          {direntDetail.permission === 'rw' && canSetExProps && (
            <tr className="file-extra-attributes">
              <th colSpan={2}>
                <div className="edit-file-extra-attributes-btn" onClick={this.toggleExtraPropertiesDialog}>
                  {gettext('Edit extra properties')}
                </div>
              </th>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  render() {
    const { direntType, direntDetail, fileTagList } = this.props;
    const direntPath = this.getDirentPath();

    return (
      <Fragment>
        {this.renderTags()}
        {this.state.isEditFileTagShow &&
          <EditFileTagPopover
            repoID={this.props.repoID}
            filePath={direntPath}
            fileTagList={fileTagList}
            toggleCancel={this.onEditFileTagToggle}
            onFileTagChanged={this.onFileTagChanged}
            target={this.tagListTitleID}
            isEditFileTagShow={this.state.isEditFileTagShow}
          />
        }
        {this.state.isShowExtraProperties && (
          <ExtraAttributesDialog
            repoID={this.props.repoID}
            filePath={direntPath}
            direntType={direntType}
            direntDetail={direntDetail}
            onToggle={this.toggleExtraPropertiesDialog}
          />
        )}
        {this.state.isShowApplyProperties && (
          <ConfirmApplyFolderPropertiesDialog
            toggle={this.toggleApplyPropertiesDialog}
            repoID={this.props.repoID}
            path={direntPath}
          />
        )}
      </Fragment>
    );
  }
}

DetailListView.defaultProps = {
  fileTagList: [],
};

DetailListView.propTypes = propTypes;

export default DetailListView;
