import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, canCreateWiki } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import ModalPortal from '../../components/modal-portal';
import EmptyTip from '../../components/empty-tip';
import AddWikiDialog from '../../components/dialog/add-wiki-dialog';
import wikiAPI from '../../utils/wiki-api';
import WikiCardView from '../../components/wiki-card-view/wiki-card-view';
import { seafileAPI } from '../../utils/seafile-api';
import { userAPI } from '../../utils/user-api';
import WikiConvertStatusDialog from '../../components/dialog/wiki-convert-status-dialog';
import SingleDropdownToolbar from '../../components/toolbar/single-dropdown-toolbar';


const propTypes = {
  sidePanelRate: PropTypes.number,
  isSidePanelFolded: PropTypes.bool,
};

class Wikis extends Component {
  //  Initializes the component's state with various properties, such as loading status, error messages, and wiki data.
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      // 可以新建某个部门的 wiki 所以这里设置了当前的部门 ID
      currentDeptID: '',
      wikis: [],
      groupWikis: [],
      isShowAddWikiMenu: false,
      isShowAddDialog: false,
      isShowConvertStatusDialog: false,
    };
  }

  // Calls the getWikis() method to fetch wiki data when the component mounts.
  componentDidMount() {
    this.getWikis();
  }

  // Fetches wiki data from the API, processes the data, and updates the component's state with the fetched data.
  getWikis = () => {
    let wikis = [];
    let groupWikis = [];
    wikiAPI.listWikis().then(res => {
      // 旧版本 wikis
      wikis = wikis.concat(res.data.data);
      wikis.map(wiki => {
        return wiki['version'] = 'v1';
      });
      wikiAPI.listWikis2().then(res => {
        // 新版本 wikis
        let wikis2 = res.data.wikis;
        groupWikis = res.data.group_wikis;
        groupWikis.forEach(group => {
          group.wiki_info.forEach(wiki => {
            wiki.version = 'v2';
            wiki.admins = group.group_admins;
          });
        });
        wikis2.map(wiki => {
          return wiki['version'] = 'v2';
        });
        // 拼起来作为 wikis
        this.setState({
          loading: false,
          wikis: wikis.concat(wikis2),
          groupWikis: groupWikis
        });
      }).catch((error) => {
        this.setState({
          loading: false,
          errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
        });
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  };

  // Toggles the visibility of the add wiki menu.
  clickMenuToggle = (e) => {
    e.preventDefault();
    this.onMenuToggle();
  };

  // Updates the component's state to toggle the visibility of the add wiki menu.
  onMenuToggle = () => {
    this.setState({ isShowAddWikiMenu: !this.state.isShowAddWikiMenu });
  };

  // Toggles the visibility of the add wiki dialog and updates the component's state with the current department ID.
  toggleAddWikiDialog = (currentDeptID) => {
    if (this.state.isShowAddDialog) {
      this.setState({
        isShowAddDialog: false,
        currentDeptID: '',
      });
    } else {
      this.setState({
        isShowAddDialog: true,
        currentDeptID
      });
    }
  };

  // Adds a new wiki to the component's state and updates the wiki data.
  addWiki = (wikiName, currentDeptID) => {
    wikiAPI.addWiki2(wikiName, currentDeptID).then((res) => {
      let wikis = this.state.wikis.slice(0);
      let groupWikis = this.state.groupWikis;
      let new_wiki = res.data;
      new_wiki['version'] = 'v2';
      new_wiki['admins'] = new_wiki.group_admins;
      if (currentDeptID) {
        groupWikis.filter(group => {
          if (group.group_id === currentDeptID) {
            group.wiki_info.push(new_wiki);
          }
          return group;
        });
      } else {
        wikis.push(new_wiki);
      }
      this.setState({
        wikis,
        currentDeptID: '',
        groupWikis,
      });
    }).catch((error) => {
      if (error.response) {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      }
    });
  };

  // Deletes a wiki from the component's state and updates the wiki data.
  deleteWiki = (wiki) => {
    if (wiki.version === 'v1') {
      wikiAPI.deleteWiki(wiki.id).then(() => {
        let wikis = this.state.wikis.filter(item => {
          return item.id !== wiki.id;
        });
        let groupWikis = this.state.groupWikis.filter(group => {
          group.wiki_info = group.wiki_info.filter(item => item.name !== wiki.name);
          return group;
        });
        this.setState({
          wikis: wikis,
          groupWikis: groupWikis,
        });
      }).catch((error) => {
        if (error.response) {
          let errorMsg = error.response.data.error_msg;
          toaster.danger(errorMsg);
        }
      });
    } else {
      wikiAPI.deleteWiki2(wiki.id).then(() => {
        let wikis = this.state.wikis.filter(item => {
          return item.id !== wiki.id;
        });
        let groupWikis = this.state.groupWikis.filter(group => {
          group.wiki_info = group.wiki_info.filter(item => item.name !== wiki.name);
          return group;
        });
        this.setState({
          wikis: wikis,
          groupWikis: groupWikis,
        });
      }).catch((error) => {
        if (error.response) {
          let errorMsg = error.response.data.error_msg;
          toaster.danger(errorMsg);
        }
      });
    }
  };

  // Leaves a shared wiki 
  leaveSharedWiki = (wiki) => {
    if (!wiki.owner.includes('@seafile_group')) {
      let options = {
        'share_type': 'personal',
        'from': wiki.owner
      };
      seafileAPI.leaveShareRepo(wiki.repo_id, options).then(res => {
        let wikis = this.state.wikis.filter(item => {
          return item.name !== wiki.name;
        });
        this.setState({
          wikis: wikis,
        });
      }).catch((error) => {
        let errorMsg = Utils.getErrorMsg(error, true);
        toaster.danger(errorMsg);
      });
    } else {
      seafileAPI.leaveShareGroupOwnedRepo(wiki.repo_id).then(res => {
        let wikis = this.state.wikis.filter(item => {
          return item.name !== wiki.name;
        });
        this.setState({
          wikis: wikis,
        });
      }).catch((error) => {
        let errorMsg = Utils.getErrorMsg(error, true);
        toaster.danger(errorMsg);
      });
    }

  };

  // Unshares a group wiki 
  unshareGroupWiki = (wiki, groupId) => {
    seafileAPI.unshareRepoToGroup(wiki.repo_id, groupId).then(() => {
      let groupWikis = this.state.groupWikis.map(group => {
        if (group.group_id === groupId) {
          return {
            ...group,
            wiki_info: group.wiki_info.filter(item => item.name !== wiki.name)
          };
        }
        return group;
      });
      this.setState({ groupWikis: groupWikis });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  // Renames a wiki 
  renameWiki = (wiki, newName) => {
    if (wiki.version === 'v1') {
      wikiAPI.renameWiki(wiki.id, newName).then(() => {
        let wikis = this.state.wikis.map(item => {
          if (item.id === wiki.id && item.version === 'v1') {
            item.name = newName;
          }
          return item;
        });
        this.setState({ wikis: wikis });
      }).catch((error) => {
        if (error.response) {
          let errorMsg = error.response.data.error_msg;
          toaster.danger(errorMsg);
        }
      });
    } else {
      wikiAPI.renameWiki2(wiki.id, newName).then(() => {
        this.getWikis();
      }).catch((error) => {
        if (error.response) {
          let errorMsg = error.response.data.error_msg;
          toaster.danger(errorMsg);
        }
      });
    }
  };

  // Converts a wiki 转换旧版 wiki 到新版 wiki
  convertWiki = (wiki, wikiName, departmentID) => {
    let task_id = '';
    this.setState({
      isShowConvertStatusDialog: true,
    });
    // 
    wikiAPI.convertWiki(wiki.id, wikiName, departmentID).then((res) => {
      task_id = res.data.task_id;
      return userAPI.queryIOStatus(task_id);
    }).then(res => {
      if (res.data.is_finished === true) {
        this.setState({
          isShowConvertStatusDialog: false,
        });
      } else {
        this.queryConvertStatus(task_id);
      }
    }).catch((error) => {
      this.setState({
        isShowConvertStatusDialog: false
      });
      if (error.response) {
        let errorMsg = error.response.data.error_msg;
        toaster.danger(errorMsg);
      }
    });
    this.getWikis();
  };

  onConvertStatusToggle = () => {
    this.setState({
      isShowConvertDialog: !this.state.isShowConvertStatusDialog,
    });
  };

  // Queries the convert status of a wiki 
  queryConvertStatus = (task_id) => {
    // 这里查询 IO 的状态，最好不要写在 userAPI 中
    userAPI.queryIOStatus(task_id).then(res => {
      if (res.data.is_finished === true) {
        this.setState({
          isShowConvertStatusDialog: false
        });
      } else {
        setTimeout(() => {
          this.queryConvertStatus(task_id);
        }, 1000);
      }
    }).catch(err => {
      this.setState({
        isShowConvertStatusDialog: false
      });
      if (err.response) {
        let errorMsg = err.response.data.error_msg;
        toaster.danger(errorMsg);
      }
    });
  };

  // Renders the component's UI, including the wiki list, add wiki dialog, and convert status dialog.
  render() {
    return (
      <Fragment>
        {/* 转换维基 */}
        {this.state.isShowConvertStatusDialog &&
          <WikiConvertStatusDialog
            toggle={this.onConvertStatusToggle}
          />
        }
        {/* 增加维基 */}
        {this.state.isShowAddDialog &&
          <ModalPortal>
            <AddWikiDialog
              toggleCancel={this.toggleAddWikiDialog}
              addWiki={this.addWiki}
              currentDeptID={this.state.currentDeptID}
            />
          </ModalPortal>
        }
        <div className="main-panel-center">
          <div className="cur-view-container" id="wikis">
            <div className="cur-view-path">
              <div className="path-container">
                <h3 className="sf-heading m-0">{gettext('Wikis')}</h3>
                {canCreateWiki &&
                  <SingleDropdownToolbar
                    withPlusIcon={true}
                    opList={[{ 'text': gettext('Add Wiki'), 'onClick': () => this.toggleAddWikiDialog() }]}
                  />
                }
              </div>
            </div>
            {/* 卡片视图 */}
            {(this.state.loading || this.state.wikis.length !== 0 || this.state.groupWikis.length !== 0) &&
              <div className="cur-view-content pb-4">
                <WikiCardView
                  data={this.state}
                  deleteWiki={this.deleteWiki}
                  leaveSharedWiki={this.leaveSharedWiki}
                  unshareGroupWiki={this.unshareGroupWiki}
                  renameWiki={this.renameWiki}
                  convertWiki={this.convertWiki}
                  toggleAddWikiDialog={this.toggleAddWikiDialog}
                  sidePanelRate={this.props.sidePanelRate}
                  isSidePanelFolded={this.props.isSidePanelFolded}
                />
              </div>
            }
            {(!this.state.loading && this.state.wikis.length === 0 && this.state.groupWikis.length === 0) &&
              <div className="cur-view-content">
                <EmptyTip
                  title={gettext('No Wikis')}
                  text={
                    <>
                      <p className="m-0">{gettext('You can click the "Add Wiki" button below to add a new Wiki.')}</p>
                      <button className="btn btn-primary mt-6" onClick={this.toggleAddWikiDialog}><i className="sf3-font-new sf3-font mr-2"></i>{gettext('Add Wiki')}</button>
                    </>
                  }
                />
              </div>
            }
          </div>
        </div>
      </Fragment>
    );
  }
}

Wikis.propTypes = propTypes;

export default Wikis;
