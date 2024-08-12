import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import moment from 'moment';
import { gettext, lang, trashReposExpireDays } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import EmptyTip from '../../components/empty-tip';

import '../../css/my-deleted-repos.css';

moment.locale(lang);

class MyLibsDeleted extends Component {

  constructor(props) {
    super(props);
    this.state = {
      deletedRepoList: [],
      isLoading: true,
    };
  }

  componentDidMount() {
    seafileAPI.listDeletedRepo().then(res => {
      this.setState({
        deletedRepoList: res.data,
        isLoading: false,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  refreshDeletedRepoList = (repoID) => {
    let deletedRepoList = this.state.deletedRepoList.filter(item => {
      return item.repo_id !== repoID;
    });
    this.setState({ deletedRepoList: deletedRepoList });
  };

  render() {
    const { deletedRepoList: repos } = this.state;
    return (
      <Modal isOpen={true} toggle={this.props.toggleDialog} className="my-deleted-repos-dialog">
        <ModalHeader toggle={this.props.toggleDialog}>
          {gettext('Deleted Libraries')}
        </ModalHeader>
        <ModalBody className="my-deleted-repos-container">
          {this.state.isLoading && <Loading />}
          {(!this.state.isLoading && repos.length === 0) &&
          <EmptyTip forDialog={true} className="my-deleted-repos-empty-tip">
            <h2 className="h6 font-weight-normal">{gettext('No deleted libraries')}</h2>
            <p className="empty-explanation">{gettext('You have not deleted any libraries in the last {placeholder} days. A deleted library will be cleaned automatically after this period.').replace('{placeholder}', trashReposExpireDays)}</p>
          </EmptyTip>
          }
          {repos.length !== 0 &&
          <div>
            <p className="tip my-deleted-repos-tip">{gettext('Tip: libraries deleted {placeholder} days ago will be cleaned automatically.').replace('{placeholder}', trashReposExpireDays)}</p>
            <table>
              <thead>
                <tr>
                  <th width="10%">{/* img*/}</th>
                  <th width="50%">{gettext('Name')}</th>
                  <th width="28%">{gettext('Deleted Time')}</th>
                  <th width="12%"></th>
                </tr>
              </thead>
              <tbody>
                {repos.map((item) => {
                  return (
                    <DeletedRepoItem
                      key={item.repo_id}
                      repo={item}
                      refreshDeletedRepoList={this.refreshDeletedRepoList}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
          }
        </ModalBody>
      </Modal>
    );
  }
}

class DeletedRepoItem extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hideRestoreMenu: true,
      highlight: false,
    };
  }

  onMouseEnter = () => {
    this.setState({
      hideRestoreMenu: false,
      highlight: true,
    });
  };

  onMouseLeave = () => {
    this.setState({
      hideRestoreMenu: true,
      highlight: false,
    });
  };

  restoreDeletedRepo = (e) => {
    e.preventDefault();
    let repoID = this.props.repo.repo_id;
    let repoName = this.props.repo.repo_name;
    seafileAPI.restoreDeletedRepo(repoID).then(res => {
      let message = gettext('Successfully restored the library {library_name}.').replace('{library_name}', repoName);
      toaster.success(message);
      this.props.refreshDeletedRepoList(repoID);
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    let localTime = moment.utc(this.props.repo.del_time).toDate();
    localTime = moment(localTime).fromNow();
    let iconUrl = Utils.getLibIconUrl(this.props.repo);

    return (
      <tr
        className={this.state.highlight ? 'tr-highlight' : ''}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        tabIndex="0"
        onFocus={this.onMouseEnter}
      >
        <td className="text-center"><img src={iconUrl} alt='' width="24" /></td>
        <td className="name">{this.props.repo.repo_name}</td>
        <td className="update">{localTime}</td>
        <td>
          <a href="#" onClick={this.restoreDeletedRepo} title={gettext('Restore')}
            role="button" aria-label={gettext('Restore')}
            className={`sf2-icon-reply action-icon ${this.state.highlight ? '' : 'vh'}`}>
          </a>
        </td>
      </tr>
    );
  }
}

DeletedRepoItem.propTypes = {
  repo: PropTypes.object.isRequired,
  refreshDeletedRepoList: PropTypes.func.isRequired,
};

MyLibsDeleted.propTypes = {
  toggleDialog: PropTypes.func.isRequired
};

export default MyLibsDeleted;
