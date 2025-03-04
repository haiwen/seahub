import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';

import '../../../css/dirent-detail.css';
import '../css/detail-list-view.css';

dayjs.extend(relativeTime);

const { filePath } = window.app.pageOptions;

const propTypes = {
  fileInfo: PropTypes.object.isRequired,
};

// 右侧栏：文档详情信息列表
class DetailListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repoTags: [],
      isEditFileTagShow: false
    };
  }

  // 获取资料库标签
  componentDidMount() {
    seafileAPI.listRepoTags(repoID).then(res => {
      let repoTags = [];
      res.data.repo_tags.forEach(item => {
        const repoTag = new RepoTag(item);
        repoTags.push(repoTag);
      });
      this.setState({
        repoTags: repoTags
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  // 增加新标签
  onNewRepoTagAdded = (newTag) => {
    const repoTag = new RepoTag(newTag);
    const { repoTags: newTags } = this.state;
    newTags.push(repoTag);
    this.setState({
      repoTags: newTags
    });
  };

  onEditFileTagToggle = () => {
    this.setState({ isEditFileTagShow: !this.state.isEditFileTagShow });
  };

  render() {
    const { fileInfo } = this.props;
    return (
      <Fragment>
        <div className="dirent-table-container p-2">
          <table className="table-thead-hidden">
            <thead>
              <tr><th width="35%"></th><th width="65%"></th></tr>
            </thead>
            <tbody>
              {/* 展示文件元信息 */}
              <tr><th>{gettext('Size')}</th><td>{Utils.bytesToSize(fileInfo.size)}</td></tr>
              <tr><th>{gettext('Location')}</th><td>{filePath}</td></tr>
              <tr><th>{gettext('Last Update')}</th><td>{dayjs(fileInfo.mtime * 1000).fromNow()}</td></tr>
              <tr className="file-tag-container">
                <th>{gettext('Tags')}</th>
                <td>
                  <FileTagList fileTagList={fileTagList} />
                  <span onClick={this.onEditFileTagToggle} id='file-tag-container-icon'><Icon symbol='tag' /></span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* 支持编辑文件标签 */}
        {this.state.isEditFileTagShow &&
          <EditFileTagPopover
            repoID={repoID}
            repoTags={repoTags}
            filePath={filePath}
            fileTagList={fileTagList}
            toggleCancel={this.onEditFileTagToggle}
            onFileTagChanged={this.props.onFileTagChanged}
            onNewRepoTagAdded={this.onNewRepoTagAdded}
            target={'file-tag-container-icon'}
            isEditFileTagShow={this.state.isEditFileTagShow}
          />
        }
      </Fragment>
    );
  }
}

DetailListView.propTypes = propTypes;

export default DetailListView;
