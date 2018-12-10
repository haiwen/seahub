import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, siteRoot, loginUrl } from '../../utils/constants';
import moment from 'moment';
import { Button } from 'reactstrap';
import Toast from '../../components/toast';
import MenuControl from '../../components/menu-control';
import WikiAdd from './wiki-add';
import WikiMenu from './wiki-menu';
import WikiRename from './wiki-rename';
import NewWikiDialog from '../../components/dialog/new-wiki-dialog';
import WikiDeleteDialog from '../../components/dialog/wiki-delete-dialog';
import WikiSelectDialog from '../../components/dialog/wiki-select-dialog';
import ModalPortal from '../../components/modal-portal';


const itempropTypes = {
  wiki: PropTypes.object.isRequired,
  renameWiki: PropTypes.func.isRequired,
  deleteWiki: PropTypes.func.isRequired,
};

class Item extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isShowWikiMenu: false,
      position: {top:'', left: ''},
      isItemFreezed: false,
      isShowDeleteDialog: false,
      isShowMenuControl: false,
      isRenameing: false,
      highlight: '',
    };
  }

  componentDidMount() {
    document.addEventListener('click', this.onHideWikiMenu);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.onHideWikiMenu);
  }

  onMenuToggle = (e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    if (this.state.isShowWikiMenu) {
      this.onHideWikiMenu();
    } else {
      this.onShowWikiMenu(e);
    }
  }

  onShowWikiMenu = (e) => {
    let left = e.clientX - 8*16;
    let top  = e.clientY + 12;
    let position = {top: top, left: left};
    this.setState({
      isShowWikiMenu: true,
      position: position,
      isItemFreezed: true,
    });
  }

  onHideWikiMenu = () => {
    this.setState({
      isShowWikiMenu: false,
      isItemFreezed: false,
    });
  }

  onMouseEnter = () => {
    if (!this.state.isItemFreezed) {
      this.setState({
        isShowMenuControl: true,
        highlight: 'tr-highlight',
      });
    }
  }

  onMouseLeave = () => {
    if (!this.state.isItemFreezed) {
      this.setState({
        isShowMenuControl: false,
        highlight: '',
      });
    }
  }

  onRenameToggle = () => {
    this.setState({
      isShowWikiMenu: false,
      isItemFreezed: true,
      isRenameing: true,
    });
  }

  onRenameConfirm = (newName) => {
    let wiki = this.props.wiki;

    if (newName === wiki.name) {
      this.onRenameCancel();
      return false;
    }
    if (!newName) {
      let errMessage = 'Name is required.';
      Toast.error(gettext(errMessage));
      return false;
    }
    if (newName.indexOf('/') > -1) {
      let errMessage = 'Name should not include ' + '\'/\'' + '.';
      Toast.error(gettext(errMessage));
      return false;
    }
    this.renameWiki(newName);
    this.onRenameCancel();
  }

  onRenameCancel = () => {
    this.setState({
      isRenameing: false,
      isItemFreezed: false,
    });
  }

  onDeleteToggle = () => {
    this.setState({
      isShowDeleteDialog: !this.state.isShowDeleteDialog,
    });
  }

  renameWiki = (newName) => {
    let wiki = this.props.wiki;
    this.props.renameWiki(wiki, newName);
  }

  deleteWiki = () => {
    let wiki = this.props.wiki;
    this.props.deleteWiki(wiki);
    this.setState({
      isShowDeleteDialog: !this.state.isShowDeleteDialog,
    });
  }

  render() {
    let wiki = this.props.wiki;
    let userProfileURL = `${siteRoot}profile/${encodeURIComponent(wiki.owner)}/`;

    return (
      <Fragment>
        <tr className={this.state.highlight} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
          <td>
            {this.state.isRenameing ?
              <WikiRename wiki={wiki} onRenameConfirm={this.onRenameConfirm} onRenameCancel={this.onRenameCancel}/> :
              <a href={wiki.link}>{gettext(wiki.name)}</a>
            }
          </td>
          <td><a href={userProfileURL} target='_blank'>{gettext(wiki.owner_nickname)}</a></td>
          <td>{moment(wiki.updated_at).fromNow()}</td>
          <td className="menu-toggle" onClick={this.onMenuToggle}>
            <MenuControl
              isShow={this.state.isShowMenuControl}
              onClick={this.onMenuToggle}
            />
            {this.state.isShowWikiMenu &&
              <WikiMenu
                position={this.state.position}
                onRenameToggle={this.onRenameToggle}
                onDeleteToggle={this.onDeleteToggle}
              />
            }
          </td>
        </tr>
        {this.state.isShowDeleteDialog &&
          <ModalPortal>
            <WikiDeleteDialog
              toggleCancel={this.onDeleteToggle}
              handleSubmit={this.deleteWiki}
            />
          </ModalPortal>
        }
      </Fragment>
    );
  }
}

Item.propTypes = itempropTypes;


const contentpropTypes = {
  data: PropTypes.object.isRequired,
  renameWiki: PropTypes.func.isRequired,
  deleteWiki: PropTypes.func.isRequired,
};

class WikisContent extends Component {

  render() {
    let {loading, errorMsg, wikis} = this.props.data;

    if (loading) {
      return <span className="loading-icon loading-tip"></span>;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      return (
        <table>
          <thead>
            <tr>
              <th width="50%">{gettext('Name')}</th>
              <th width="20%">{gettext('Owner')}</th>
              <th width="20%">{gettext('Last Update')}</th>
              <th width="10%">{/* operation */}</th>
            </tr>
          </thead>
          <tbody>
            {wikis.map((wiki, index) => {
              return(
                <Item key={index} wiki={wiki}
                  renameWiki={this.props.renameWiki}
                  deleteWiki={this.props.deleteWiki}
                />);
            })}
          </tbody>
        </table>
      );
    }
  }
}

WikisContent.propTypes = contentpropTypes;


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
        Toast.error(errorMsg);
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
      this.setState({
        wikis: wikis
      });
    }).catch((error) => {
      if(error.response) {
        let errorMsg = error.response.data.error_msg;
        Toast.error(errorMsg);
      }
    });
  }

  deleteWiki = (wiki) => {
    seafileAPI.deleteWiki(wiki.slug).then(() => {
      this.setState({
        wikis: this.state.wikis.filter(item => {
          return item.name !== wiki.name
        })
      });
    }).catch((error) => {
      if(error.response) {
        let errorMsg = error.response.data.error_msg;
        Toast.error(errorMsg);
      }
    });
  }

  render() {
    return (
      <Fragment>
        <div className="main-panel-center">
          <div className="cur-view-container" id="wikis">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Wikis')}</h3>
              <div style={{float:'right'}}>
                <Button className="fa fa-plus-square" onClick={this.onAddMenuToggle}>
                  {gettext('Add Wiki')}
                </Button>
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
                <WikisContent
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
