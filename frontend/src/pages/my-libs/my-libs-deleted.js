import React, { Component, Fragment } from 'react';
import { Link } from '@reach/router';
import { gettext, siteRoot, lang } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import toaster from '../../components/toast';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import classnames from 'classnames';
import moment from 'moment';
moment.locale(lang);

class MyLibsDeleted extends Component {

  constructor(props) {
    super(props);
    this.state = {
      deletedRepoList: [],
      isLoading: false,
    };
  }

  componentDidMount() {
    seafileAPI.listDeletedRepo().then(res => {
      this.setState({
        deletedRepoList: res.data 
      });
    });  
  }

  refreshDeletedRepoList = (repoID) => {
    this.setState({
      deletedRepoList: this.state.deletedRepoList.filter(item => item.repo_id !== repoID) 
    }); 
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
               <Link to={ siteRoot + 'my-libs/' }>{gettext("My Libraries")}</Link>
               <span className="path-split">/</span>
               <span>{gettext('Deleted Libraries')}</span>
             </div>
           </div>
           <div className="cur-view-content">
             {(!this.state.isLoading && this.state.deletedRepoList.length === 0) &&
               <div className="message empty-tip">
                 <h2>{gettext('No deleted libraries.')}</h2>
               </div>
             }
             { this.state.deletedRepoList.length !== 0 && 
              <div>
                <p className="tip">{gettext('Tip: libraries deleted 30 days ago will be cleaned automatically.')}</p>
                <DeletedRepoTable deletedRepoList={this.state.deletedRepoList}
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
      highlight: '',
    };
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        hideRestoreMenu: false,
        highlight: 'tr-highlight'
      });
    }
  }

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        hideRestoreMenu: true,
        highlight: ''
      });
    }
  } 

  restoreDeletedRepo = () => {
    let repoID = this.props.repo.repo_id;
    let repoName = this.props.repo.repo_name;
    seafileAPI.restoreDeletedRepo(repoID).then(res => {
      let message = gettext('Successfully restored library') + '  ' + repoName;
      toaster.success(message);
      this.props.refreshDeletedRepoList(repoID);
    }).catch(res => {
        let message = gettext('Failed. Please check the network.')
        toaster.danger(message);
    })
  }

  render() {
    let localTime = moment.utc(this.props.repo.del_time).toDate();
    localTime = moment(localTime).fromNow();

    return (
      <tr className={this.state.highlight} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td className="icon"><img src={siteRoot + 'media/img/lib/48/lib.png'} alt='icon' /></td>
        <td className="name">{this.props.repo.repo_name}</td>
        <td className="update">{localTime}</td>
        <td className={classnames({hide: this.state.hideRestoreMenu})}><i onClick={this.restoreDeletedRepo} className="fas fa-reply"></i></td>
      </tr>
    );
  }
}

export default MyLibsDeleted;
