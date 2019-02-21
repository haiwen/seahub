import React, { Component } from 'react';
import { Link } from '@reach/router';
import moment from 'moment';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot, loginUrl } from '../../utils/constants';

class Content extends Component {

  render() {
    const {loading, errorMsg, items} = this.props.data;

    if (loading) {
      return <span className="loading-icon loading-tip"></span>;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const desktopThead = (
        <thead>
          <tr>
            <th width="4%"></th>
            <th width="40%">{gettext('File Name')}</th>
            <th width="32%">{gettext('Library')}</th>
            <th width="18%">{gettext('Last Update')}</th>
            <th width="6%"></th>
          </tr>
        </thead>
      );
      const mobileThead = (
        <thead>
          <tr>
            <th width="4%"></th>
            <th width="90%">{gettext('File Name')}</th>
            <th width="6%"></th>
          </tr>
        </thead>
      );

      return ( 
        <table className="table-hover">
          {window.innerWidth >= 768 ? desktopThead : mobileThead}
          <TableBody items={items} />
        </table>
      ); 
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
        return Utils.imageCheck(item.obj_name) && !item.repo_encrypted;
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

    let listFilesActivities = this.state.items.map(function(item, index) {

      item.file_icon_url = item.is_dir ? Utils.getFolderIconUrl(false) : Utils.getFileIconUrl(item.obj_name);
      item.encoded_path = Utils.encodePath(item.path);

      item.thumbnail_url = item.encoded_thumbnail_src ? `${siteRoot}${item.encoded_thumbnail_src}` : '';
      item.dirent_view_url = item.is_dir ? `${siteRoot}library/${item.repo_id}/${item.repo_name}${item.encoded_path}` : `${siteRoot}lib/${item.repo_id}/file${item.encoded_path}`;

      item.mtime_relative = moment(item.mtime).fromNow();


      return <Item key={index} data={item} />;
    }, this);

    return (
      <tbody>{listFilesActivities}</tbody>
    );
  }
}

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      showOpIcon: false,
      unstarred: false
    };
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

  handleClick = (e) => {
    e.preventDefault();

    const data = this.props.data;
    seafileAPI.unStarItem(data.repo_id, data.path).then((res) => {
      this.setState({
        unstarred: true
      });
      // TODO: show feedback msg
    }).catch((error) => {
      // TODO: show feedback msg
    });
  }

  render() {

    if (this.state.unstarred) {
      return null;
    }

    const data = this.props.data;

    let opClasses = 'sf2-icon-x3 unstar action-icon';
    opClasses += this.state.showOpIcon ? '' : ' invisible';

    const desktopItem = (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td className="alc">
          {
            data.thumbnail_url ?
              <img className="thumbnail" src={data.thumbnail_url} alt="" /> :
              <img src={data.file_icon_url} alt={gettext('icon')} width="24" />
          }
        </td>
        <td>
          { data.is_dir ?
              <Link to={data.dirent_view_url}>{data.obj_name}</Link> :
              <a className="normal" href={data.dirent_view_url} target="_blank">{data.obj_name}</a>
          }
        </td>
        <td>{data.repo_name}</td>
        <td dangerouslySetInnerHTML={{__html:data.mtime_relative}}></td>
        <td>
          <a href="#" className={opClasses} title={gettext('Unstar')} aria-label={gettext('Unstar')} onClick={this.handleClick}></a>
        </td>
      </tr>
    );

    const mobileItem = (
      <tr>
        <td className="alc">
          {
            data.thumbnail_url ?
              <img className="thumbnail" src={data.thumbnail_url} alt="" /> :
              <img src={data.file_icon_url} alt={gettext('icon')} width="24" />
          }
        </td>
        <td>
          { data.is_dir ?
              <Link to={data.dirent_view_url}>{data.obj_name}</Link> :
              <a className="normal" href={data.dirent_view_url} target="_blank">{data.obj_name}</a>
          }
          <br />
          <span className="dirent-meta-info">{data.repo_name}</span>
          <span className="dirent-meta-info" dangerouslySetInnerHTML={{__html:data.mtime_relative}}></span>
        </td>
        <td>
          <a href="#" className="sf2-icon-delete unstar action-icon" title={gettext('Unstar')} aria-label={gettext('Unstar')} onClick={this.handleClick}></a>
        </td>
      </tr>
    );

    if (window.innerWidth >= 768) {
      return desktopItem;
    } else {
      return mobileItem;
    }
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
      //res: {data: Array(2), status: 200, statusText: "OK", headers: {…}, config: {…}, …}
      this.setState({
        loading: false,
        items: res.data.starred_item_list
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
