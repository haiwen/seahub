import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import { siteRoot, gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import DetailListView from './detail-list-view';
import Repo from '../../models/repo';
import FileTag from '../../models/file-tag';
import '../../css/dirent-detail.css';

class LibDetail extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      fileCount: '',
      libName: '',
      isLoading: true, 
    };
  }

  componentDidMount() {
    seafileAPI.getRepoInfo(this.props.libID).then(res => {
      this.setState({
        fileCount: res.data.file_count,
        libName: res.data.repo_name
      }); 
    });
  }

  render() {
    return (
      <div className="detail-container">
        <div className="detail-header">
          <div className="detail-control sf2-icon-x1" onClick={this.props.closeDetails}></div>
          <div className="detail-title dirent-title">
            <img src={siteRoot + 'media/img/lib/256/lib.png'} alt="icon"></img>{'  '}
            <span className="name">{this.state.libName}</span>
          </div>
        </div>
        <div className="detail-body dirent-info">
          <div className="img">
            <img src={siteRoot + 'media/img/lib/256/lib.png'} alt="icon"></img>
          </div>
          <div className="dirent-table-container">
            <table>
              <tbody>
                <tr><th width="35%"></th><td width="65%"></td></tr>
                <tr><th>{gettext('Files')}</th><td>{this.state.fileCount}</td></tr>
                <tr><th>{gettext('Size')}</th><td>{this.props.libSize}</td></tr>
                <tr><th>{gettext('Last Update')}</th><td>{this.props.libUpdateTime}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
}


export default LibDetail;
