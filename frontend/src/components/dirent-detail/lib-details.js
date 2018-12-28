import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Utils } from '../../utils/utils';
import { siteRoot, gettext } from '../../utils/constants';
import '../../css/dirent-detail.css';
import { seafileAPI } from '../../utils/seafile-api';

const propTypes = {
  currentRepo: PropTypes.object.isRequired
};

class LibDetail extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      fileCount: 0,
    };
  }

  componentDidMount() {
    let repo = this.props.currentRepo;
    seafileAPI.getRepoInfo(repo.repo_id).then(res => {
      this.setState({
        fileCount: res.data.file_count,
      }); 
    });
  }

  render() {
    let repo = this.props.currentRepo;
    return (
      <div className="detail-container">
        <div className="detail-header">
          <div className="detail-control sf2-icon-x1" onClick={this.props.closeDetails}></div>
          <div className="detail-title dirent-title">
            <img src={siteRoot + 'media/img/lib/256/lib.png'} alt="icon"></img>{'  '}
            <span className="name">{repo.repo_name}</span>
          </div>
        </div>
        <div className="detail-body dirent-info">
          <div className="img">
            <img src={siteRoot + 'media/img/lib/256/lib.png'} alt="icon"></img>
          </div>
          <div className="dirent-table-container">
            <table className="table-thead-hidden">
              <thead>
                <tr><th width="35%"></th><th width="65%"></th></tr>
              </thead>
              <tbody>
                <tr><th>{gettext('Files')}</th><td>{this.state.fileCount}</td></tr>
                <tr><th>{gettext('Size')}</th><td>{repo.size}</td></tr>
                <tr><th>{gettext('Last Update')}</th><td>{ moment(repo.last_modified).fromNow()}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
}

LibDetail.propTypes = propTypes;

export default LibDetail;
