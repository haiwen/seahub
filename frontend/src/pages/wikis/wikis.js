import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, loginUrl } from '../../utils/constants';
import WikiAdd from './wiki-add';
import toaster from '../../components/toast';
import ModalPortal from '../../components/modal-portal';
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
      isShowWikiAdd: false,
      position: {top:'', left: ''},
      isShowSelectDialog: false,
      isShowCreateDialog: false,
    };
  }

  componentDidMount() {
    document.addEventListener('click', this.onHideWikiAdd);
    this.getWikis();
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.onHideWikiAdd);
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

  onAddMenuToggle = (e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    if (this.state.isShowWikiAdd) {
      this.onHideWikiAdd();
    } else {
      this.onShowWikiAdd(e);
    }
  }

  onShowWikiAdd = (e) => {
    let left = e.clientX - 10*20;
    let top  = e.clientY + 12;
    let position = {top: top, left: left};
    this.setState({
      isShowWikiAdd: true,
      position: position,
    });
  }

  onHideWikiAdd = () => {
    this.setState({
      isShowWikiAdd: false,
    });
  }

  onSelectToggle = () => {
    this.setState({
      isShowSelectDialog: !this.state.isShowSelectDialog,
    });
  }

  onCreateToggle = () => {
    this.setState({
      isShowCreateDialog: !this.state.isShowCreateDialog,
    });
  }

  addWiki = (isExist, name, repoID) => {
    seafileAPI.addWiki(isExist, name, repoID).then((res) => {
      this.state.wikis.push(res.data);
      this.setState({
        wikis: this.state.wikis
      });
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
        <div className="main-panel-center">
          <div className="cur-view-container" id="wikis">
            <div className="cur-view-path">
              <div className="path-container">
                <h3 className="sf-heading">{gettext('Wikis')}</h3>
              </div>
              <div className="path-toolbar">
                <button className="btn btn-secondary operation-item" style={{marginTop: '-0.25rem'}} onClick={this.onAddMenuToggle}>
                  <i className="fa fa-plus-square op-icon"></i>
                  {gettext('Add Wiki')}
                </button>
              </div>
              {this.state.isShowWikiAdd &&
                <WikiAdd 
                  isShowWikiAdd={this.state.isShowWikiAdd}
                  position={this.state.position}
                  onSelectToggle={this.onSelectToggle}
                  onCreateToggle={this.onCreateToggle}
                />
              }
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
                  <h2>{gettext('You do not have any Wiki.')}</h2>
                  <p>{gettext('Seafile Wiki enables you to organize your knowledge in a simple way. The contents of wiki is stored in a normal library with pre-defined file/folder structure. This enables you to edit your wiki in your desktop and then sync back to the server.')}</p>
                </div>
              }
            </div>
          </div>
        </div>
        {this.state.isShowCreateDialog &&
          <ModalPortal>
            <NewWikiDialog
              toggleCancel={this.onCreateToggle}
              addWiki={this.addWiki}
            />
          </ModalPortal>
        }
        {this.state.isShowSelectDialog &&
          <ModalPortal>
            <WikiSelectDialog
              toggleCancel={this.onSelectToggle}
              addWiki={this.addWiki}
            />
          </ModalPortal>
        }
      </Fragment>
    );
  }
}

export default Wikis;
