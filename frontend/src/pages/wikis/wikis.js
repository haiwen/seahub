import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import ModalPortal from '../../components/modal-portal';
import EmptyTip from '../../components/empty-tip';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import AddWikiDialog from '../../components/dialog/add-wiki-dialog';
import wikiAPI from '../../utils/wiki-api';
import WikiCardView from '../../components/wiki-card-view/wiki-card-view';

const propTypes = {
  onShowSidePanel: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
};

class Wikis extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      wikis: [],
      isShowAddWikiMenu: false,
      isShowAddDialog: false,
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
    this.setState({isShowAddWikiMenu: !this.state.isShowAddWikiMenu});
  };

  toggelAddWikiDialog = (currentDeptID) => {
    this.currentDeptID = currentDeptID;
    this.setState({isShowAddDialog: !this.state.isShowAddDialog});
  };

  addWiki = (wikiName) => {
    wikiAPI.addWiki2(wikiName, this.currentDeptID).then((res) => {
      let wikis = this.state.wikis.slice(0);
      let new_wiki = res.data;
      new_wiki['version'] = 'v2';
      wikis.push(new_wiki);
      this.setState({ wikis });
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
          return item.name !== wiki.name;
        });
        this.setState({wikis: wikis});
      }).catch((error) => {
        if (error.response) {
          let errorMsg = error.response.data.error_msg;
          toaster.danger(errorMsg);
        }
      });
    } else {
      wikiAPI.deleteWiki2(wiki.id).then(() => {
        let wikis = this.state.wikis.filter(item => {
          return item.name !== wiki.name;
        });
        this.setState({wikis: wikis});
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
        this.setState({wikis: wikis});
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
        this.setState({wikis: wikis});
      }).catch((error) => {
        if (error.response) {
          let errorMsg = error.response.data.error_msg;
          toaster.danger(errorMsg);
        }
      });
    }
  };

  render() {
    return (
      <Fragment>
        <div className="main-panel-north border-left-show">
          <div className="cur-view-toolbar">
            <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu" onClick={this.props.onShowSidePanel}></span>
          </div>
          <CommonToolbar onSearchedClick={this.props.onSearchedClick} />
        </div>
        {this.state.isShowAddDialog &&
          <ModalPortal>
            <AddWikiDialog toggleCancel={this.toggelAddWikiDialog} addWiki={this.addWiki} />
          </ModalPortal>
        }
        <div className="main-panel-center">
          <div className="cur-view-container" id="wikis">
            <div className="cur-view-path">
              <div className="path-container">
                <h3 className="sf-heading m-0">{gettext('Wikis')}</h3>
              </div>
            </div>
            {(this.state.loading || this.state.wikis.length !== 0) &&
              <div className="cur-view-content pb-4">
                <WikiCardView
                  data={this.state}
                  deleteWiki={this.deleteWiki}
                  renameWiki={this.renameWiki}
                  toggelAddWikiDialog={this.toggelAddWikiDialog}
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
