import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import MediaQuery from 'react-responsive';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, loginUrl, canPublishRepo } from '../../utils/constants';
import toaster from '../../components/toast';
import ModalPortal from '../../components/modal-portal';
import EmptyTip from '../../components/empty-tip';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import NewWikiDialog from '../../components/dialog/new-wiki-dialog';
import WikiSelectDialog from '../../components/dialog/wiki-select-dialog';
import WikiListView from '../../components/wiki-list-view/wiki-list-view';

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
      isShowSelectDialog: false,
      isShowCreateDialog: false,
    };
  }

  componentDidMount() {
    this.getWikis();
  }

  getWikis = () => {
    seafileAPI.listWikis().then(res => {
      this.setState({
        loading: false,
        wikis: res.data.data,
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext('Permission denied')
          });
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
        } else {
          this.setState({
            loading: false,
            errorMsg: gettext('Error')
          });
        }
      } else {
        this.setState({
          loading: false,
          errorMsg: gettext('Please check the network.')
        });
      }
    });
  }

  clickMenuToggle = (e) => {
    e.preventDefault();
    this.onMenuToggle();
  }

  onMenuToggle = () => {
    this.setState({isShowAddWikiMenu: !this.state.isShowAddWikiMenu});
  }

  onSelectToggle = () => {
    this.setState({isShowSelectDialog: !this.state.isShowSelectDialog});
  }

  onCreateToggle = () => {
    this.setState({isShowCreateDialog: !this.state.isShowCreateDialog});
  }

  addWiki = (repoID) => {
    seafileAPI.addWiki(repoID).then((res) => {
      this.state.wikis.push(res.data);
      this.setState({wikis: this.state.wikis});
    }).catch((error) => {
      if(error.response) {
        let errorMsg = error.response.data.error_msg;
        toaster.danger(errorMsg);
      }
    });
  }

  renameWiki = (wiki, newName) => {
    seafileAPI.renameWiki(wiki.slug, newName).then((res) => {
      let wikis = this.state.wikis.map((item) => {
        if (item.name === wiki.name) {
          item = res.data;
        }
        return item;
      });
      this.setState({wikis: wikis});
    }).catch((error) => {
      if(error.response) {
        let errorMsg = error.response.data.error_msg;
        toaster.danger(errorMsg);
      }
    });
  }

  deleteWiki = (wiki) => {
    seafileAPI.deleteWiki(wiki.slug).then(() => {
      let wikis = this.state.wikis.filter(item => {
        return item.name !== wiki.name;
      });
      this.setState({wikis: wikis});
    }).catch((error) => {
      if(error.response) {
        let errorMsg = error.response.data.error_msg;
        toaster.danger(errorMsg);
      }
    });
  }

  render() {
    return (
      <Fragment>
        <div className="main-panel-north border-left-show">
          <div className="cur-view-toolbar">
            <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu" onClick={this.props.onShowSidePanel}></span>
            <div className="operation">
              {canPublishRepo && <Fragment>
                <MediaQuery query="(min-width: 768px)">
                  <Button className="btn btn-secondary operation-item" onClick={this.onSelectToggle}>{gettext('Publish a Library')}</Button>
                </MediaQuery>
                <MediaQuery query="(max-width: 767.8px)">
                <span className="sf2-icon-plus mobile-toolbar-icon" title={gettext('Publish a Library')} onClick={this.onSelectToggle}></span>
                </MediaQuery>
              </Fragment>}
            </div>
          </div>
          <CommonToolbar onSearchedClick={this.props.onSearchedClick} />
        </div>
        <div className="main-panel-center">
          <div className="cur-view-container" id="wikis">
            <div className="cur-view-path">
              <div className="path-container">
                <h3 className="sf-heading m-0">{gettext('Published Libraries')}</h3>
              </div>
            </div>
            <div className="cur-view-content">
              {(this.state.loading || this.state.wikis.length !== 0) &&
                <WikiListView
                  data={this.state}
                  renameWiki={this.renameWiki}
                  deleteWiki={this.deleteWiki}
                />
              }
              {(!this.state.loading && this.state.wikis.length === 0) &&
                <EmptyTip>
                  <h2>{gettext('You do not have any public library')}</h2>
                  <p>{gettext('Public libraries are for publishing your contents in an organized way.')}</p>
                </EmptyTip>
              }
            </div>
          </div>
        </div>
        {this.state.isShowCreateDialog && (
          <ModalPortal>
            <NewWikiDialog
              toggleCancel={this.onCreateToggle}
              addWiki={this.addWiki}
            />
          </ModalPortal>
        )}
        {this.state.isShowSelectDialog && (
          <ModalPortal>
            <WikiSelectDialog
              toggleCancel={this.onSelectToggle}
              addWiki={this.addWiki}
            />
          </ModalPortal>
        )}
      </Fragment>
    );
  }
}

Wikis.propTypes = propTypes;

export default Wikis;
