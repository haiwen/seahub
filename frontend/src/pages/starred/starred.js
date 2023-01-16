import React, { Component } from 'react';
import { Dropdown, DropdownToggle, DropdownItem } from 'reactstrap';
import { Link, navigate } from '@gatsbyjs/reach-router';
import moment from 'moment';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot, enableVideoThumbnail } from '../../utils/constants';
import EmptyTip from '../../components/empty-tip';
import Loading from '../../components/loading';
import toaster from '../../components/toast';

class Content extends Component {

  render() {
    const {loading, errorMsg, items} = this.props.data;

    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No favorites')}</h2>
          <p>{gettext('You have not added any libraries, folders or files to your favorites yet. A favorite gives you quick access to your most frequently used objects. You can add a library, folder or file to your favorites by clicking the star to the left of its name.')}</p>
        </EmptyTip>
      );

      const desktopThead = (
        <thead>
          <tr>
            <th width="4%"></th>
            <th width="40%">{gettext('Name')}</th>
            <th width="32%">{gettext('Library')}</th>
            <th width="18%">{gettext('Last Update')}</th>
            <th width="6%"></th>
          </tr>
        </thead>
      );
      const mobileThead = (
        <thead>
          <tr>
            <th width="12%"></th>
            <th width="80%"></th>
            <th width="8%"></th>
          </tr>
        </thead>
      );

      const isDesktop = Utils.isDesktop();
      return items.length ? (
        <table className={`table-hover ${isDesktop ? '': 'table-thead-hidden'}`}>
          {isDesktop ? desktopThead : mobileThead}
          <TableBody items={items} />
        </table>
      ) : emptyTip;
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

  componentDidMount() {
    this.getThumbnails();
  }

  getThumbnails() {
    let items = this.state.items.filter((item) => {
      return (Utils.imageCheck(item.obj_name) || (enableVideoThumbnail && Utils.videoCheck(item.obj_name))) && !item.repo_encrypted;
    });
    if (items.length == 0) {
      return ;
    }

    const len = items.length;
    const thumbnailSize = 48;
    const _this = this;
    let getThumbnail = function(i) {
      const curItem = items[i];
      seafileAPI.createThumbnail(curItem.repo_id, curItem.path, thumbnailSize).then((res) => {
        curItem.encoded_thumbnail_src = res.data.encoded_thumbnail_src;
      }).catch((error) => {
        // do nothing
      }).then(() => {
        if (i < len - 1) {
          getThumbnail(++i);
        } else {
          // when done, `setState()`
          _this.setState({
            items: _this.state.items
          });
        }
      });
    };
    getThumbnail(0);
  }

  render() {

    let listItems = this.state.items.map(function(item, index) {

      if (item.path === '/') {
        item.item_icon_url = Utils.getDefaultLibIconUrl(false);
      } else {
        item.item_icon_url = item.is_dir ? Utils.getFolderIconUrl(false) : Utils.getFileIconUrl(item.obj_name);
      }

      item.encoded_path = Utils.encodePath(item.path);

      item.thumbnail_url = item.encoded_thumbnail_src ? `${siteRoot}${item.encoded_thumbnail_src}` : '';
      item.dirent_view_url = item.is_dir ? `${siteRoot}library/${item.repo_id}/${item.repo_name}${item.encoded_path}` : `${siteRoot}lib/${item.repo_id}/file${item.encoded_path}`;
      // item is folder or file
      if (item.encoded_path !== '/') {
        item.dirent_view_url = item.dirent_view_url.replace(/\/+$/, '');
      }

      item.mtime_relative = moment(item.mtime).fromNow();


      return <Item key={index} data={item} />;
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
      unstarred: false,
      isOpMenuOpen: false // for mobile
    };
  }

  toggleOpMenu = () => {
    this.setState({
      isOpMenuOpen: !this.state.isOpMenuOpen
    });
  }

  handleMouseOver = () => {
    this.setState({
      showOpIcon: true
    });
  }

  handleMouseOut = () => {
    this.setState({
      showOpIcon: false
    });
  }

  unstar = (e) => {
    e.preventDefault();

    const data = this.props.data;
    seafileAPI.unstarItem(data.repo_id, data.path).then((res) => {
      this.setState({unstarred: true});
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  visitItem = () => {
    const data = this.props.data;
    if (data.is_dir) {
      navigate(data.dirent_view_url);
    } else {
      window.open(data.dirent_view_url);
    }
  }

  render() {

    if (this.state.unstarred) {
      return null;
    }

    const data = this.props.data;

    let opClasses = 'sf2-icon-x3 unstar action-icon';
    opClasses += this.state.showOpIcon ? '' : ' invisible';
    const linkUrl = data.dirent_view_url;

    const desktopItem = (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut} onFocus={this.handleMouseOver}>
        <td className="text-center">
          {
            data.thumbnail_url ?
              <img className="thumbnail" src={data.thumbnail_url} alt="" /> :
              <img src={data.item_icon_url} alt={gettext('icon')} width="24" />
          }
        </td>
        <td>
          { data.is_dir ?
            <Link to={linkUrl}>{data.obj_name}</Link> :
            <a className="normal" href={data.dirent_view_url} target="_blank">{data.obj_name}</a>
          }
        </td>
        <td>{data.repo_name}</td>
        <td dangerouslySetInnerHTML={{__html:data.mtime_relative}}></td>
        <td>
          <a href="#" role="button" className={opClasses} title={gettext('Unstar')} aria-label={gettext('Unstar')} onClick={this.unstar}></a>
        </td>
      </tr>
    );

    const mobileItem = (
      <tr>
        <td className="text-center" onClick={this.visitItem}>
          {
            data.thumbnail_url ?
              <img className="thumbnail" src={data.thumbnail_url} alt="" /> :
              <img src={data.item_icon_url} alt={gettext('icon')} width="24" />
          }
        </td>
        <td onClick={this.visitItem}>
          { data.is_dir ?
            <Link to={linkUrl}>{data.obj_name}</Link> :
            <a className="normal" href={data.dirent_view_url} target="_blank">{data.obj_name}</a>
          }
          <br />
          <span className="item-meta-info">{data.repo_name}</span>
          <span className="item-meta-info" dangerouslySetInnerHTML={{__html:data.mtime_relative}}></span>
        </td>
        <td>
          <Dropdown isOpen={this.state.isOpMenuOpen} toggle={this.toggleOpMenu}>
            <DropdownToggle
              tag="i"
              className="sf-dropdown-toggle fa fa-ellipsis-v ml-0"
              title={gettext('More Operations')}
              data-toggle="dropdown"
              aria-expanded={this.state.isOpMenuOpen}
            />
            <div className={this.state.isOpMenuOpen ? '' : 'd-none'} onClick={this.toggleOpMenu}>
              <div className="mobile-operation-menu-bg-layer"></div>
              <div className="mobile-operation-menu">
                <DropdownItem className="mobile-menu-item" onClick={this.unstar}>{gettext('Unstar')}</DropdownItem>
              </div>
            </div>
          </Dropdown>
        </td>
      </tr>
    );

    return Utils.isDesktop() ? desktopItem : mobileItem;
  }
}

class Starred extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: []
    };
  }

  componentDidMount() {
    seafileAPI.listStarredItems().then((res) => {
      this.setState({
        loading: false,
        items: res.data.starred_item_list
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  render() {
    return (
      <div className="main-panel-center">
        <div className="cur-view-container" id="starred">
          <div className="cur-view-path">
            <h3 className="sf-heading">{gettext('Favorites')}</h3>
          </div>
          <div className="cur-view-content">
            <Content data={this.state} />
          </div>
        </div>
      </div>
    );
  }
}

export default Starred;
