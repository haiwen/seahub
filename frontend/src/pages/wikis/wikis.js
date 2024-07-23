import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { gettext, canPublishRepo } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import ModalPortal from '../../components/modal-portal';
import EmptyTip from '../../components/empty-tip';
import AddWikiDialog from '../../components/dialog/add-wiki-dialog';
import wikiAPI from '../../utils/wiki-api';
import WikiCardView from '../../components/wiki-card-view/wiki-card-view';

const propTypes = {
  sidePanelRate: PropTypes.number,
  isSidePanelFolded: PropTypes.bool,
};

class Wikis extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      currentDeptEmail: '',
      wikis: [],
      isShowAddWikiMenu: false,
      isShowAddDialog: false,
      isDropdownMenuShown: false,
    };
  }

  componentDidMount() {
    this.getWikis();
  }

  getWikis = () => {
    let wikis = [];
    wikiAPI.listWikis().then(res => {
      wikis = wikis.concat(res.data.data);
      wikis.map(wiki => {
        return wiki['version'] = 'v1';
      });
      wikiAPI.listWikis2().then(res => {
        let wikis2 = res.data.wikis;
        wikis2.map(wiki => {
          return wiki['version'] = 'v2';
        });
        this.setState({
          loading: false,
          wikis: wikis.concat(wikis2)
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

  clickMenuToggle = (e) => {
    e.preventDefault();
    this.onMenuToggle();
  };

  onMenuToggle = () => {
    this.setState({ isShowAddWikiMenu: !this.state.isShowAddWikiMenu });
  };

  toggelAddWikiDialog = (currentDeptEmail) => {
    if (this.state.isShowAddDialog) {
      this.setState({
        isShowAddDialog: false,
        currentDeptEmail: '',
      });
    } else {
      this.setState({
        isShowAddDialog: true,
        currentDeptEmail
      });
    }
  };

  addWiki = (wikiName, currentDeptID) => {
    wikiAPI.addWiki2(wikiName, currentDeptID).then((res) => {
      let wikis = this.state.wikis.slice(0);
      let new_wiki = res.data;
      new_wiki['version'] = 'v2';
      wikis.push(new_wiki);
      this.setState({
        wikis,
        currentDeptEmail: '',
      });
    }).catch((error) => {
      if (error.response) {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      }
    });
  };

  deleteWiki = (wiki) => {
    if (wiki.version === 'v1') {
      wikiAPI.deleteWiki(wiki.id).then(() => {
        let wikis = this.state.wikis.filter(item => {
          return item.id !== wiki.id;
        });
        this.setState({ wikis: wikis });
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
        this.setState({ wikis: wikis });
      }).catch((error) => {
        if (error.response) {
          let errorMsg = error.response.data.error_msg;
          toaster.danger(errorMsg);
        }
      });
    }
  };

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
        let wikis = this.state.wikis.map(item => {
          if (item.id === wiki.id && item.version === 'v2') {
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
    }
  };

  toggleDropdownMenu = (e) => {
    e.stopPropagation();
    this.setState({
      isDropdownMenuShown: !this.state.isDropdownMenuShown
    });
  };

  render() {
    return (
      <Fragment>
        {this.state.isShowAddDialog &&
          <ModalPortal>
            <AddWikiDialog
              toggleCancel={this.toggelAddWikiDialog}
              addWiki={this.addWiki}
              currentDeptEmail={this.state.currentDeptEmail}
            />
          </ModalPortal>
        }
        <div className="main-panel-center">
          <div className="cur-view-container" id="wikis">
            <div className="cur-view-path">
              <div className="path-container">
                <h3 className="sf-heading m-0">{gettext('Wikis')}</h3>
                {canPublishRepo &&
                  <Dropdown
                    direction="down"
                    className="add-wiki-dropdown"
                    isOpen={this.state.isDropdownMenuShown}
                    toggle={this.toggleDropdownMenu}
                    onMouseMove={(e) => {e.stopPropagation();}}
                  >
                    <DropdownToggle tag="i" className="px-1">
                      <span className="sf3-font sf3-font-down" aria-hidden="true"></span>
                    </DropdownToggle>
                    <DropdownMenu>
                      <DropdownItem onClick={() => {this.toggelAddWikiDialog();}}>{gettext('Add Wiki')}</DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                }
              </div>
            </div>
            {(this.state.loading || this.state.wikis.length !== 0) &&
              <div className="cur-view-content pb-4">
                <WikiCardView
                  data={this.state}
                  deleteWiki={this.deleteWiki}
                  renameWiki={this.renameWiki}
                  toggelAddWikiDialog={this.toggelAddWikiDialog}
                  sidePanelRate={this.props.sidePanelRate}
                  isSidePanelFolded={this.props.isSidePanelFolded}
                />
              </div>
            }
            {(!this.state.loading && this.state.wikis.length === 0) &&
              <div className="cur-view-content">
                <EmptyTip>
                  <h2>{gettext('No Wikis')}</h2>
                  <p>{gettext('You have not any wikis yet.')}</p>
                  <p>{gettext('A wiki can be accessed by anyone, not only users, via its URL.')}</p>
                  <p>{gettext('You can add a wiki by clicking the "Add Wiki" button in the menu bar.')}</p>
                </EmptyTip>
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
