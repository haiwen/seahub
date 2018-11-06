import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { gettext, repoID } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import RepoTag from '../../models/repo-tag';

const propTypes = {
  repo: PropTypes.object.isRequired,
  direntType: PropTypes.string.isRequired,
  direntDetail: PropTypes.object.isRequired,
  direntPath: PropTypes.string.isRequired,
  filetagList: PropTypes.array.isRequired,
};

class DetailListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repotagList: [],
      showRepoTag: false,
    };
  }

  getDirentPostion = () => {
    let { repo, direntPath } = this.props;
    let position = repo.repo_name + '/';
    if (direntPath !== '/') {
      let index = direntPath.lastIndexOf('/');
      let path = direntPath.slice(0, index);
      position = position + path;
    }
    return position;
  }

  getRepoTag = () => {
    seafileAPI.listRepoTags(repoID).then(res => {
      let repotagList = [];
      res.data.repo_tags.forEach(item => {
        let repoTag = new RepoTag(item);
        repotagList.push(repoTag);
      });
      this.setState({
        repotagList: repotagList,
        showRepoTag: !this.state.showRepoTag,
      });
    });
  }

  addFileTag = (repoTag) => {
    let id = repoTag.id;
    let filePath = this.props.direntPath;
    seafileAPI.addFileTag(repoID, filePath, id);
  }

  deleteFileTag = (fileTag) => {
    let id = fileTag.id;
    seafileAPI.deleteFileTag(repoID, id)
  }

  render() {
    let { direntType, direntDetail, filetagList } = this.props;
    let position = this.getDirentPostion();
    if (direntType === 'dir') {
      return (
        <div className="dirent-table-container">
          <table>
            <tbody>
              <tr><th width="35%"></th><td width="65%"></td></tr>
              <tr><th>{gettext('Folder')}</th><td>{direntDetail.dir_count}</td></tr>
              <tr><th>{gettext('File')}</th><td>{direntDetail.file_count}</td></tr>
              <tr><th>{gettext('Size')}</th><td>{Utils.bytesToSize(direntDetail.size)}</td></tr>
              <tr><th>{gettext('Position')}</th><td>{position}</td></tr>
              <tr><th>{gettext('Last Update')}</th><td>{moment(direntDetail.mtime).format('YYYY-MM-DD')}</td></tr>
            </tbody>
          </table>
        </div>
      );
    } else {
      return (
        <div className="dirent-table-container">
          <table>
            <tbody>
              <tr><th width="35%"></th><td width="65%"></td></tr>
              <tr><th>{gettext('Size')}</th><td>{direntDetail.size}</td></tr>
              <tr><th>{gettext('Position')}</th><td>{position}</td></tr>
              <tr><th>{gettext('Last Update')}</th><td>{moment(direntDetail.mtime).format('YYYY-MM-DD')}</td></tr>
              <tr><th>{gettext('Tags')}</th>
                <td>
                  <div style={{listStyle:"none"}}>
                    {filetagList.map((fileTag, index) => {
                      return (
                        <label key={index}>
                          <i className="fa fa-circle" style={{color:fileTag.color}}></i>
                          {fileTag.name}
                          <i className="sf2-icon-trash" onClick={this.deleteFileTag.bind(this, fileTag)}></i>
                        </label>
                      );
                    })}
                  </div>
                  <i className='fa fa-pencil' onClick={this.getRepoTag}></i>
                  <div style={{listStyle:"none"}}>
                    { this.state.showRepoTag && this.state.repotagList.map((repoTag, index) => {
                      return (
                        <label key={index} onClick={this.addFileTag.bind(this, repoTag)}>
                          <i className="fa fa-circle" style={{color:repoTag.color}}></i>
                          {repoTag.name}
                        </label>
                      );
                    })}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }
  }
}

DetailListView.propTypes = propTypes;

export default DetailListView;
