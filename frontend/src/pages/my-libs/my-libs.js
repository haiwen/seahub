import React, { Component, Fragment } from 'react';
import moment from 'moment';
import { Link } from '@reach/router';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot, loginUrl, isPro, storages, canGenerateShareLink, canGenerateUploadLink, folderPermEnabled, enableRepoSnapshotLabel } from '../../utils/constants';
import Loading from '../../components/loading';
import DeleteItemPopup from './popups/delete-item';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import RepoViewToolbar from '../../components/toolbar/repo-view-toobar';

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      deleteItemPopupOpen: false
    };

    this.toggleDeleteItemPopup = this.toggleDeleteItemPopup.bind(this);
    this.showDeleteItemPopup = this.showDeleteItemPopup.bind(this);

    this.operations = {
      showDeleteItemPopup: this.showDeleteItemPopup
    };
  }

  toggleDeleteItemPopup() {
    this.setState({
      deleteItemPopupOpen: !this.state.deleteItemPopupOpen
    });
  }

  showDeleteItemPopup(data) {
    this.toggleDeleteItemPopup();
    this.setState({
      deleteItemPopupData: data
    });
  }

  render() {
    const {loading, errorMsg, items} = this.props.data;

    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <div className="empty-tip">
          <h2>{gettext('You have not created any libraries')}</h2>
          <p>{gettext('You can create a library to organize your files. For example, you can create one for each of your projects. Each library can be synchronized and shared separately.')}</p>
        </div>
      );

      // TODO: test 'storage backend'
      const showStorageBackend = storages.length > 0; // only for desktop
      const desktopThead = (
        <thead>
          <tr>
            <th width="4%"><span className="sr-only">{gettext("Library Type")}</span></th>
            <th width="42%">{gettext("Name")}<a className="table-sort-op by-name" href="#">{/*TODO: sort*/}<span className="sort-icon icon-caret-down hide"></span></a></th>
            <th width="14%"><span className="sr-only">{gettext("Actions")}</span></th>

            <th width={showStorageBackend ? '15%' : '20%'}>{gettext("Size")}</th>
            {showStorageBackend ? <th width="10%">{gettext('Storage backend')}</th> : null}
            <th width={showStorageBackend ? '15%' : '20%'}>{gettext("Last Update")}<a className="table-sort-op by-time" href="#">{/*TODO: sort*/}<span className="sort-icon icon-caret-up"></span></a></th>
          </tr>
        </thead>
      );

      const mobileThead = (
        <thead>
          <tr>
            <th width="18%"><span className="sr-only">{gettext("Library Type")}</span></th>
            <th width="76%">
              {gettext("Sort:")} {/* TODO: sort */}
              {gettext("name")}<a className="table-sort-op mobile-table-sort-op by-name" href="#"> <span className="sort-icon icon-caret-down hide"></span></a>
              {gettext("last update")}<a className="table-sort-op mobile-table-sort-op by-time" href="#"> <span className="sort-icon icon-caret-up"></span></a>
            </th>
            <th width="6%"><span className="sr-only">{gettext("Actions")}</span></th>
          </tr>
        </thead>
      );

      const table = (
        <table>
          {window.innerWidth >= 768 ? desktopThead : mobileThead}
          <TableBody items={items} operations={this.operations} />
        </table>
      );

      const nonEmpty = (
        <React.Fragment>
          {table}
          <DeleteItemPopup isOpen={this.state.deleteItemPopupOpen} 
            toggle={this.toggleDeleteItemPopup} data={this.state.deleteItemPopupData} />
        </React.Fragment>
      );

      return items.length ? nonEmpty : emptyTip; 
    }
  }
}

class TableBody extends Component {

  constructor(props) {
    super(props);
    this.state = {
      items: this.props.items
    };
  }

  render() {
    
    let listItems = this.state.items.map(function(item, index) {
      return <Item key={index} data={item} operations={this.props.operations} />;
    }, this);

    return (
      <tbody>{listItems}</tbody>
    );
  }
}

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      showOpIcon: false,
      operationMenuOpen: false,
      deleted: false
    };

    this.handleMouseOver = this.handleMouseOver.bind(this);
    this.handleMouseOut = this.handleMouseOut.bind(this);
    this.toggleOperationMenu = this.toggleOperationMenu.bind(this);
    this.clickOperationMenuToggle = this.clickOperationMenuToggle.bind(this);

    this.share = this.share.bind(this);

    this.showDeleteItemPopup = this.showDeleteItemPopup.bind(this);
    this.deleteItem = this.deleteItem.bind(this);

    this.rename = this.rename.bind(this);
    this.transfer = this.transfer.bind(this);
    this.historySetting = this.historySetting.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.showLinks = this.showLinks.bind(this);
    this.folderPerm = this.folderPerm.bind(this);
    this.showDetails = this.showDetails.bind(this);
    this.label = this.label.bind(this);
  }

  handleMouseOver() {
    if (this.state.operationMenuOpen) {
      return;
    }
    this.setState({
      showOpIcon: true
    });
  }

  handleMouseOut() {
    if (this.state.operationMenuOpen) {
      return;
    }
    this.setState({
      showOpIcon: false
    });
  }

  toggleOperationMenu() {
    this.setState({
      operationMenuOpen: !this.state.operationMenuOpen
    });
  }

  clickOperationMenuToggle(e) {
    e.preventDefault();
    this.toggleOperationMenu();
  }

  share(e) {
    e.preventDefault();
    // TODO
  }

  showDeleteItemPopup(e) {
    e.preventDefault(); // for `<a>`

    const data = this.props.data;
    this.props.operations.showDeleteItemPopup({
      repoName: data.repo_name,
      yesCallback: this.deleteItem,
      _this: this
    });
  }

  deleteItem() {
    const data = this.props.data;
    seafileAPI.deleteRepo(data.repo_id).then((res) => {
      this.setState({
        deleted: true
      });
      // TODO: show feedback msg
    }).catch((error) => {
        // TODO: show feedback msg
    });
  }

  rename() {
  }

  transfer() {
  }

  historySetting() {
  }

  changePassword() {
  }

  showLinks() {
  }

  folderPerm() {
  }

  showDetails() {
  }
  
  label() {
  }

  render() {

    if (this.state.deleted) {
      return null;
    }

    const data = this.props.data;
    const permission = data.permission;

    let is_readonly = false;
    if (permission == 'r' || permission == 'preview') {
      is_readonly = true;
    }
    data.icon_url = Utils.getLibIconUrl({
      is_encrypted: data.encrypted,
      is_readonly: is_readonly, 
      size: Utils.isHiDPI() ? 48 : 24
    }); 
    data.icon_title = Utils.getLibIconTitle({
      'encrypted': data.encrypted,
      'is_admin': data.is_admin,
      'permission': permission
    });
    data.url = `${siteRoot}#my-libs/lib/${data.repo_id}/`;

    let iconVisibility = this.state.showOpIcon ? '' : ' invisible';
    let shareIconClassName = 'sf2-icon-share sf2-x op-icon' + iconVisibility; 
    let deleteIconClassName = 'sf2-icon-delete sf2-x op-icon' + iconVisibility;
    let operationMenuToggleIconClassName = 'sf2-icon-caret-down item-operation-menu-toggle-icon op-icon'; 
    if (window.innerWidth >= 768) {
      operationMenuToggleIconClassName += iconVisibility; 
    }

    const showShareLinks = !data.encrypted && (canGenerateShareLink || canGenerateUploadLink);

    const commonToggle = (
      <DropdownToggle
        tag="a" href="#" className={operationMenuToggleIconClassName} title={gettext('More Operations')}
        onClick={this.clickOperationMenuToggle}
        data-toggle="dropdown" aria-expanded={this.state.operationMenuOpen}>
      </DropdownToggle>
    );
    const commonOperationsInMenu = (
      <React.Fragment>
        <DropdownItem onClick={this.rename}>{gettext('Rename')}</DropdownItem>
        <DropdownItem onClick={this.transfer}>{gettext('Transfer')}</DropdownItem>
        <DropdownItem onClick={this.historySetting}>{gettext('History Setting')}</DropdownItem>
        {data.encrypted ? <DropdownItem onClick={this.changePassword}>{gettext('Change Password')}</DropdownItem> : ''}
        {showShareLinks ? <DropdownItem onClick={this.showLinks}>{gettext('Share Links')}</DropdownItem> : ''}
        {folderPermEnabled ? <DropdownItem onClick={this.folderPerm}>{gettext('Folder Permission')}</DropdownItem> : ''}
        <DropdownItem onClick={this.showDetails}>{gettext('Details')}</DropdownItem>
      </React.Fragment>
    );

    const desktopOperations = (
      <div>
        <a href="#" className={shareIconClassName} title={gettext("Share")} onClick={this.share}></a>
        <a href="#" className={deleteIconClassName} title={gettext("Delete")} onClick={this.showDeleteItemPopup}></a>
        <Dropdown isOpen={this.state.operationMenuOpen} toggle={this.toggleOperationMenu}>
          {commonToggle}
          <DropdownMenu>
            {commonOperationsInMenu}
            {enableRepoSnapshotLabel ? <DropdownItem onClick={this.label}>{gettext('Label current state')}</DropdownItem> : ''}
          </DropdownMenu>
        </Dropdown>
      </div>
    );

    const mobileOperations = (
      <Dropdown isOpen={this.state.operationMenuOpen} toggle={this.toggleOperationMenu}>
        {commonToggle}
        <div className={`${this.state.operationMenuOpen?'':'d-none'}`} onClick={this.toggleOperationMenu}>
          <div className="mobile-operation-menu-bg-layer"></div>
          <div className="mobile-operation-menu">
            <DropdownItem onClick={this.share}>{gettext('Share')}</DropdownItem>
            <DropdownItem onClick={this.showDeleteItemPopup}>{gettext('Delete')}</DropdownItem>
            {commonOperationsInMenu}
          </div>
        </div>
      </Dropdown>
    );

    const desktopItem = (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td><img src={data.icon_url} title={data.icon_title} alt={data.icon_title} width="24" /></td>
        <td>
          {data.repo_name ?
            <Link to={`${siteRoot}library/${data.repo_id}/${data.repo_name}/`}>{data.repo_name}</Link> :
            gettext('Broken (please contact your administrator to fix this library)')}
        </td>
        <td>{data.repo_name ? desktopOperations : ''}</td>
        <td>{Utils.formatSize({bytes: data.size})}</td>
        {storages.length ? <td>{data.storage_name}</td> : null}
        <td title={moment(data.last_modified).format('llll')}>{moment(data.last_modified).fromNow()}</td>
      </tr>
    );

    const mobileItem = (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td><img src={data.icon_url} title={data.icon_title} alt={data.icon_title} width="24" /></td>
        <td>
          {data.repo_name ?
            <Link to={`${siteRoot}library/${data.repo_id}/${data.repo_name}/`}>{data.repo_name}</Link> :
            gettext('Broken (please contact your administrator to fix this library)')}
          <br />
          <span className="item-meta-info">{Utils.formatSize({bytes: data.size})}</span>
          <span className="item-meta-info" title={moment(data.last_modified).format('llll')}>{moment(data.last_modified).fromNow()}</span>
        </td>
        <td>{data.repo_name ? mobileOperations : ''}</td>
      </tr>
    );

    return window.innerWidth >= 768 ? desktopItem : mobileItem;
  }
}

class MyLibraries extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: []
    };
  }

  componentDidMount() {
    seafileAPI.listRepos({type:'mine'}).then((res) => {
      // res: {data: {...}, status: 200, statusText: "OK", headers: {…}, config: {…}, …}
      this.setState({
        loading: false,
        items: res.data.repos
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext("Permission denied")
          });
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
        } else {
          this.setState({
            loading: false,
            errorMsg: gettext("Error")
          });
        }

      } else {
        this.setState({
          loading: false,
          errorMsg: gettext("Please check the network.")
        });
      }
    });
  }

  onCreateRepo = (repo) => {
    seafileAPI.createMineRepo(repo).then((res) => {
      //todo update repoList 
    });
  }

  render() {
    return (
      <Fragment>
        <div className="main-panel-north">
          <RepoViewToolbar onShowSidePanel={this.props.onShowSidePanel} onCreateRepo={this.onCreateRepo} libraryType={'mine'}/>
          <CommonToolbar onSearchedClick={this.props.onSearchedClick} />
        </div>
        <div className="main-panel-center">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext("My Libraries")}</h3>
            </div>
            <div className="cur-view-content">
              <Content data={this.state} />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default MyLibraries;
