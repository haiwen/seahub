import React, { Component, Fragment } from 'react';
import { Link } from '@reach/router';
import moment from 'moment';
import { gettext, siteRoot, lang } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import EmptyTip from '../../components/empty-tip';
import CommonToolbar from '../../components/toolbar/common-toolbar';

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
    this.setState({deletedRepoList: deletedRepoList});
  }

  render() {
    return (
      <Fragment>
        <div className="main-panel-north">
          <CommonToolbar onSearchedClick={this.props.onSearchedClick} />
        </div>
        <div className="main-panel-center">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <div className="path-container">
                <Link to={ siteRoot + 'my-libs/' }>{gettext('My Libraries')}</Link>
                <span className="path-split">/</span>
                <span>{gettext('Deleted Libraries')}</span>
              </div>
            </div>
            <div className="cur-view-content">
              {this.state.isLoading && <Loading />}
              {(!this.state.isLoading && this.state.deletedRepoList.length === 0) &&
              <EmptyTip>
                <h2>{gettext('No deleted libraries.')}</h2>
              </EmptyTip>
              }
              {this.state.deletedRepoList.length !== 0 && 
                <div>
                  <p className="tip">{gettext('Tip: libraries deleted 30 days ago will be cleaned automatically.')}</p>
                  <DeletedRepoTable 
                    deletedRepoList={this.state.deletedRepoList}
                    refreshDeletedRepoList={this.refreshDeletedRepoList}
                  />
                </div>
              }
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

class DeletedRepoTable extends Component {

  render() {
    let deletedRepos = this.props.deletedRepoList;
    return (
      <table>
        <thead>
          <tr>
            <th style={{width: '4%'}}>{/*img*/}</th>
            <th style={{width: '52%'}}>{gettext('Name')}</th>
            <th style={{width: '30%'}}>{gettext('Deleted Time')}</th>
            <th style={{width: '14%'}}></th>
          </tr>
        </thead>
        <tbody>
          { deletedRepos && deletedRepos.map((item) => {
            return (
              <DeletedRepoItem
                key={item.repo_id}
                repo={item}
                refreshDeletedRepoList={this.props.refreshDeletedRepoList}
              />
            );
          })}
        </tbody>
      </table>
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
    if (!this.props.isItemFreezed) {
      this.setState({
        hideRestoreMenu: false,
        highlight: true,
      });
    }
  }

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        hideRestoreMenu: true,
        highlight: false,
      });
    }
  } 

  restoreDeletedRepo = () => {
    let repoID = this.props.repo.repo_id;
    let repoName = this.props.repo.repo_name;
    seafileAPI.restoreDeletedRepo(repoID).then(res => {
      let message = gettext('Successfully restored the library.') + '  ' + repoName;
      toaster.success(message);
      this.props.refreshDeletedRepoList(repoID);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      if (errMessage === gettext('Error')) {
        errMessage = gettext('Failed. Please check the network.');
      }
      toaster.danger(errMessage);
    });
  }

  render() {
    let localTime = moment.utc(this.props.repo.del_time).toDate();
    localTime = moment(localTime).fromNow();
    let iconUrl = Utils.getLibIconUrl(this.props.repo);

    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td className="text-center"><img src={iconUrl} alt='' width="24" /></td>
        <td className="name">{this.props.repo.repo_name}</td>
        <td className="update">{localTime}</td>
        <td>
          <span onClick={this.restoreDeletedRepo} title={gettext('Restore')}
            className={`sf2-icon-reply action-icon ${this.state.highlight ? '' : 'vh'}`}></span>
        </td>
      </tr>
    );
  }
}

export default MyLibsDeleted;
