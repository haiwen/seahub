import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { siteRoot, gettext, enableVideoThumbnail } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import FileTag from '../../models/file-tag';

import '../../css/dirent-detail.css';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired,
  dirent: PropTypes.object.isRequired,
  path: PropTypes.string.isRequired,
  togglePanel: PropTypes.func.isRequired
};

class FileDetails extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      direntType: '',
      direntDetail: '',
      fileTagList: []
    };
  }

  componentDidMount() {
    let { dirent, path, repoID } = this.props;
    let direntPath = Utils.joinPath(path, dirent.name);
    seafileAPI.getFileInfo(repoID, direntPath).then(res => {
      this.setState({
        direntType: 'file',
        direntDetail: res.data
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
    seafileAPI.listFileTags(repoID, direntPath).then(res => {
      let fileTagList = [];
      res.data.file_tags.forEach(item => {
        let file_tag = new FileTag(item);
        fileTagList.push(file_tag);
      });
      this.setState({fileTagList: fileTagList});
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  renderHeader = (smallIconUrl, direntName) => {
    return (
      <div className="detail-header">
        <div className="detail-control sf2-icon-x1" onClick={this.props.togglePanel}></div>
        <div className="detail-title dirent-title">
          <img src={smallIconUrl} width="24" height="24" alt="" />{' '}
          <span className="name ellipsis" title={direntName}>{direntName}</span>
        </div>
      </div>
    );
  }

  renderDetailBody = (bigIconUrl) => {
    const { direntDetail, fileTagList } = this.state;
    const { repoName, path } = this.props;
    return (
      <div className="detail-body dirent-info">
        <div className="img"><img src={bigIconUrl} className="thumbnail" alt="" /></div>
        {this.state.direntDetail &&
        <div className="dirent-table-container">
          <table className="table-thead-hidden">
            <thead>
              <tr><th width="35%"></th><th width="65%"></th></tr>
            </thead>
            <tbody>
              <tr><th>{gettext('Size')}</th><td>{Utils.bytesToSize(direntDetail.size)}</td></tr>
              <tr><th>{gettext('Location')}</th><td>{repoName + path}</td></tr>
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
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        }
      </div>
    );
  }

  render() {
    let { dirent, repoID, path } = this.props;

    const smallIconUrl = Utils.getFileIconUrl(dirent.name);
    let bigIconUrl = Utils.getFileIconUrl(dirent.name, 192);
    const isImg = Utils.imageCheck(dirent.name);
    const isVideo = Utils.videoCheck(dirent.name);
    if (isImg || (enableVideoThumbnail && isVideo)) {
      bigIconUrl = `${siteRoot}thumbnail/${repoID}/1024` + Utils.encodePath(`${path === '/' ? '' : path}/${dirent.name}`);
    }
    return (
      <div className="detail-container file-details-container">
        {this.renderHeader(smallIconUrl, dirent.name)}
        {this.renderDetailBody(bigIconUrl)}
      </div>
    );
  }
}

FileDetails.propTypes = propTypes;

export default FileDetails;
