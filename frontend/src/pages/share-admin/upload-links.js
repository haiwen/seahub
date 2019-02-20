import React, { Component } from 'react';
import { Link } from '@reach/router';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import { gettext, siteRoot, loginUrl, canGenerateShareLink } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import SharedUploadInfo from '../../models/shared-upload-info';

class Content extends Component {

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
    this.setState({
      modalContent: options.content
    });
  }

  render() {
    const { loading, errorMsg, items } = this.props;

    if (loading) {
      return <span className="loading-icon loading-tip"></span>;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <div className="empty-tip">
          <h2>{gettext('You don\'t have any upload links')}</h2>
          <p>{gettext('You can generate an upload link from any folder. Anyone who receives this link can upload files to this folder.')}</p>
        </div>
      );

      const table = (
        <React.Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="4%">{/*icon*/}</th>
                <th width="42%">{gettext('Name')}</th>
                <th width="30%">{gettext('Library')}</th>
                <th width="14%">{gettext('Visits')}</th>
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
              {this.state.modalContent}
            </ModalBody>
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

  getUploadParams = () => {
    let item = this.props.item;
    let iconUrl = Utils.getFolderIconUrl(false);
    let uploadUrl = `${siteRoot}library/${item.repo_id}/${item.repo_name}${Utils.encodePath(item.path)}`;

    return { iconUrl, uploadUrl };
  }

  render() {
    let item = this.props.item;
    let { iconUrl, uploadUrl } = this.getUploadParams();

    let iconVisibility = this.state.showOpIcon ? '' : ' invisible';
    let linkIconClassName = 'sf2-icon-link action-icon' + iconVisibility; 
    let deleteIconClassName = 'sf2-icon-delete action-icon' + iconVisibility;

    return (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td><img src={iconUrl} width="24" /></td>
        <td><Link to={uploadUrl}>{item.obj_name}</Link></td>
        <td><Link to={`${siteRoot}library/${item.repo_id}/${item.repo_name}`}>{item.repo_name}</Link></td>
        <td>{item.view_cnt}</td>
        <td>
          <a href="#" className={linkIconClassName} title={gettext('View')} onClick={this.viewLink}></a>
          <a href="#" className={deleteIconClassName} title={gettext('Remove')} onClick={this.removeLink}></a>
        </td>
      </tr>
    );
  }
}

class ShareAdminUploadLinks extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: []
    };
  }

  componentDidMount() {
    seafileAPI.listUploadLinks().then((res) => {
      // res: {data: Array(2), status: 200, statusText: "OK", headers: {…}, config: {…}, …}
      let items = res.data.map(item => {
        return new SharedUploadInfo(item);
      });
      this.setState({
        loading: false,
        items: items
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
    seafileAPI.deleteUploadLink(item.token).then(() => {
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
              { canGenerateShareLink && (
                <li className="nav-item"><Link to={`${siteRoot}share-admin-share-links/`} className="nav-link">{gettext('Share Links')}</Link></li>
              )}
              <li className="nav-item"><Link to={`${siteRoot}share-admin-upload-links/`} className="nav-link active">{gettext('Upload Links')}</Link></li>
            </ul>
          </div>
          <div className="cur-view-content">
            <Content
              errorMsg={this.state.errorMsg}
              items={this.state.items}
              loading={this.state.loading}
              onRemoveLink={this.onRemoveLink}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default ShareAdminUploadLinks;
