import React, { Component, Fragment } from 'react';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, loginUrl } from '../../utils/constants';
import toaster from '../../components/toast';
import ModalPortal from '../../components/modal-portal';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import NewWikiDialog from '../../components/dialog/new-wiki-dialog';
import WikiSelectDialog from '../../components/dialog/wiki-select-dialog';
import WikiListView from '../../components/wiki-list-view/wiki-list-view';


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

  addWiki = (isExist, name, repoID) => {
    seafileAPI.addWiki(isExist, name, repoID).then((res) => {
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
              <Dropdown tag="div" isOpen={this.state.isShowAddWikiMenu} toggle={this.onMenuToggle}>
                <DropdownToggle className="btn btn-secondary operation-item">
                  <i className="fa fa-plus-square text-secondary mr-1"></i>{gettext('Add Wiki')}
                </DropdownToggle>
                <DropdownMenu>
                  <DropdownItem onClick={this.onCreateToggle}>{gettext('New Wiki')}</DropdownItem>
                  <DropdownItem onClick={this.onSelectToggle}>{gettext('Choose a library as Wiki')}</DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          </div>
          <CommonToolbar onSearchedClick={this.props.onSearchedClick} />
        </div>
        <div className="main-panel-center">
          <div className="cur-view-container" id="wikis">
            <div className="cur-view-path">
              <div className="path-container">
                <h3 className="sf-heading">{gettext('Wikis')}</h3>
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
                <div className="message empty-tip">
                  <h2>{gettext('You do not have any wiki')}</h2>
                  <p>{gettext('Seafile Wiki enables you to organize your knowledge in a simple way. The contents of wiki is stored in a normal library with pre-defined file/folder structure. This enables you to edit your wiki in your desktop and then sync back to the server.')}</p>
                </div>
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

export default Wikis;
