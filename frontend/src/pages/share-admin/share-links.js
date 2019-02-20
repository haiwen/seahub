import React, { Component, Fragment } from 'react';
import { Link } from '@reach/router';
import moment from 'moment';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot, loginUrl, canGenerateUploadLink } from '../../utils/constants';
import SharedLinkInfo from '../../models/shared-link-info';
import copy from '@seafile/seafile-editor/dist//utils/copy-to-clipboard';
import toaster from '../../components/toast';

class Content extends Component {

  sortByName = (e) => {
    e.preventDefault();
    const sortBy = 'name';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  }

  sortByTime = (e) => {
    e.preventDefault();
    const sortBy = 'time';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  }

 constructor(props) {
    super(props);
    this.state = {
      modalOpen: false,
      modalContent: ''
    };
  }

  // required by `Modal`, and can only set the 'open' state
  toggleModal = () => {
    this.setState({
      modalOpen: !this.state.modalOpen
    });
  }

  showModal = (options) => {
    this.toggleModal();
    this.setState({modalContent: options.content});
  }

  copyToClipboard = () => {
    copy(this.state.modalContent);
    this.setState({
      modalOpen: false
    });
    let message = gettext('Share link is copied to the clipboard.');
    toaster.success(message), {
      duration: 2
    };
  }

  render() {
    const { loading, errorMsg, items, sortBy, sortOrder } = this.props;

    if (loading) {
      return <span className="loading-icon loading-tip"></span>;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <div className="empty-tip">
          <h2>{gettext('You don\'t have any share links')}</h2>
          <p>{gettext('You can generate a share link for a folder or a file. Anyone who receives this link can view the folder or the file online.')}</p>
        </div>
      );

      // sort
      const sortByName = sortBy == 'name';
      const sortByTime = sortBy == 'time';
      const sortIcon = sortOrder == 'asc' ? <span className="fas fa-caret-up"></span> : <span className="fas fa-caret-down"></span>;

      const table = (
        <React.Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="4%">{/*icon*/}</th>
                <th width="36%"><a className="d-block table-sort-op" href="#" onClick={this.sortByName}>{gettext('Name')} {sortByName && sortIcon}</a></th>
                <th width="24%">{gettext('Library')}</th>
                <th width="12%">{gettext('Visits')}</th>
                <th width="14%"><a className="d-block table-sort-op" href="#" onClick={this.sortByTime}>{gettext('Expiration')} {sortByTime && sortIcon}</a></th>
                <th width="10%">{/*Operations*/}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (<Item key={index} item={item} showModal={this.showModal} onRemoveLink={this.props.onRemoveLink}/>);
              })}
            </tbody>
          </table>
          <Modal isOpen={this.state.modalOpen} toggle={this.toggleModal} centered={true}>
            <ModalHeader toggle={this.toggleModal}>{gettext('Link')}</ModalHeader>
            <ModalBody>
              <a href={this.state.modalContent}>{this.state.modalContent}</a>
            </ModalBody>
            <ModalFooter>
              <Button color="primary" onClick={this.copyToClipboard}>{gettext('Copy')}</Button>{' '}
              <Button color="secondary" onClick={this.toggleModal}>{gettext('Close')}</Button>
            </ModalFooter>
          </Modal>
        </React.Fragment>
      );

      return items.length ? table : emptyTip; 
    }
  }
}

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      showOpIcon: false,
    };
  }

  handleMouseOver = () => {
    this.setState({showOpIcon: true});
  }

  handleMouseOut = () => {
    this.setState({showOpIcon: false});
  }

  viewLink = (e) => {
    e.preventDefault();
    this.props.showModal({content: this.props.item.link});
  }
  
  removeLink = (e) => {
    e.preventDefault();
    this.props.onRemoveLink(this.props.item);
  }

  getLinkParams = () => {
    let item = this.props.item;
    let iconUrl = '';
    let linkUrl = '';
    if (item.is_dir) {
      iconUrl = Utils.getFolderIconUrl(false);
      linkUrl = `${siteRoot}library/${item.repo_id}/${item.repo_name}${Utils.encodePath(item.path)}`;
    } else {
      iconUrl = Utils.getFileIconUrl(item.obj_name); 
      linkUrl = `${siteRoot}lib/${item.repo_id}/file${Utils.encodePath(item.path)}`;
    }

    return { iconUrl, linkUrl };
  }

  renderExpriedData = () => {
    let item = this.props.item;
    if (!item.expire_date) {
      return (
        <Fragment>--</Fragment>
      );
    }
    let expire_date = moment(item.expire_date).format('YYYY-MM-DD');
    return (
      <Fragment>
        {item.is_expired ? 
          <span className="error">{expire_date}</span> :
          expire_date
        }
      </Fragment>
    );
  }

  render() {
    const item = this.props.item;
    let { iconUrl, linkUrl } = this.getLinkParams();

    let iconVisibility = this.state.showOpIcon ? '' : ' invisible';
    let linkIconClassName = 'sf2-icon-link action-icon' + iconVisibility; 
    let deleteIconClassName = 'sf2-icon-delete action-icon' + iconVisibility;

    return (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td><img src={iconUrl} width="24" /></td>
        <td>
          {item.is_dir ?
            <Link to={linkUrl}>{item.obj_name}</Link> :
            <a href={linkUrl} target="_blank">{item.obj_name}</a>
          }
        </td>
        <td><Link to={`${siteRoot}library/${item.repo_id}/${item.repo_name}/`}>{item.repo_name}</Link></td>
        <td>{item.view_cnt}</td>
        <td>{this.renderExpriedData()}</td> 
        <td>
          <a href="#" className={linkIconClassName} title={gettext('View')} onClick={this.viewLink}></a>
          <a href="#" className={deleteIconClassName} title={gettext('Remove')} onClick={this.removeLink}></a>
        </td>
      </tr>
    );
  }
}

class ShareAdminShareLinks extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: [],
      sortBy: 'name', // 'name' or 'time'
      sortOrder: 'asc' // 'asc' or 'desc'
    };
  }

  _sortItems = (items, sortBy, sortOrder) => {
    let comparator;

    switch (`${sortBy}-${sortOrder}`) {
      case 'name-asc':
        comparator = function(a, b) {
          var result = Utils.compareTwoWord(a.obj_name, b.obj_name);
          return result;
        };
        break;
      case 'name-desc':
        comparator = function(a, b) {
          var result = Utils.compareTwoWord(a.obj_name, b.obj_name);
          return -result;
        };
        break;
      case 'time-asc':
        comparator = function(a, b) {
          return a.expire_date < b.expire_date ? -1 : 1;
        };
        break;
      case 'time-desc':
        comparator = function(a, b) {
          return a.expire_date < b.expire_date ? 1 : -1;
        };
        break;
    }

    items.sort((a, b) => {
      if (a.is_dir && !b.is_dir) {
        return -1;
      } else if (!a.is_dir && b.is_dir) {
        return 1;
      } else {
        return comparator(a, b);
      }
    });
    return items;
  }

  sortItems = (sortBy, sortOrder) => {
    this.setState({
      sortBy: sortBy,
      sortOrder: sortOrder,
      items: this._sortItems(this.state.items, sortBy, sortOrder)
    });
  }

  componentDidMount() {
    seafileAPI.listShareLinks().then((res) => {
      // res: {data: Array(2), status: 200, statusText: "OK", headers: {…}, config: {…}, …}
      let items = res.data.map(item => {
        return new SharedLinkInfo(item);
      });
      this.setState({
        loading: false,
        items: this._sortItems(items, this.state.sortBy, this.state.sortOrder)
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

  onRemoveLink = (item) => {
    seafileAPI.deleteShareLink(item.token).then(() => {
      let items = this.state.items.filter(uploadItem => {
        return uploadItem.token !== item.token;
      });
      this.setState({items: items});
      // TODO: show feedback msg
      // gettext("Successfully deleted 1 item")
    }).catch((error) => {
    // TODO: show feedback msg
    });
  }

  render() {
    return (
      <div className="main-panel-center">
        <div className="cur-view-container">
          <div className="cur-view-path share-upload-nav">
            <ul className="nav">
              <li className="nav-item">
                <Link to={`${siteRoot}share-admin-share-links/`} className="nav-link active">{gettext('Share Links')}</Link>
              </li>
              {canGenerateUploadLink && (
                <li className="nav-item"><Link to={`${siteRoot}share-admin-upload-links/`} className="nav-link">{gettext('Upload Links')}</Link></li>
              )}
            </ul>
          </div>
          <div className="cur-view-content">
            <Content
              loading={this.state.loading}
              errorMsg={this.state.errorMsg}
              items={this.state.items}
              sortBy={this.state.sortBy}
              sortOrder={this.state.sortOrder}
              sortItems={this.sortItems}
              onRemoveLink={this.onRemoveLink}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default ShareAdminShareLinks;
