import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Utils } from '../../utils/utils';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import toaster from '../toast';
import '../../css/dirent-detail.css';

const propTypes = {
  currentRepo: PropTypes.object.isRequired,
  closeDetails: PropTypes.func.isRequired,
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
    this.getFileCounts(repo);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.currentRepo.repo_id !== this.props.currentRepo.repo_id) {
      this.getFileCounts(nextProps.currentRepo);
    }
  }

  getFileCounts = (repo) => {
    seafileAPI.getRepoInfo(repo.repo_id).then(res => {
      this.setState({fileCount: res.data.file_count});
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    let repo = this.props.currentRepo;
    let smallIconUrl = Utils.getLibIconUrl(repo);
    let bigIconUrl = Utils.getLibIconUrl(repo, true);

    return (
      <div className="detail-container">
        <div className="detail-header">
          <div className="detail-control sf2-icon-x1" onClick={this.props.closeDetails}></div>
          <div className="detail-title dirent-title">
            <img src={smallIconUrl} width="24" height="24" alt="" />{'  '}
            <span className="name ellipsis" title={repo.repo_name}>{repo.repo_name}</span>
          </div>
        </div>
        <div className="detail-body dirent-info">
          <div className="img">
            <img src={bigIconUrl} height="96"  alt="" />
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
