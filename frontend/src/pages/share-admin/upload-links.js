import React, { Component } from 'react';
import { Link } from '@reach/router';
import moment from 'moment';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot, loginUrl, isPro, canGenerateShareLink } from '../../utils/constants';

class Content extends Component {
   constructor(props) {
    super(props);
    this.state = {
      modalOpen: false,
      modalContent: ''
    };

    this.toggleModal = this.toggleModal.bind(this);
    this.showModal = this.showModal.bind(this);
  }

  // required by `Modal`, and can only set the 'open' state
  toggleModal() {
    this.setState({
      modalOpen: !this.state.modalOpen
    });
  }

  showModal(options) {
    this.toggleModal();
    this.setState({
      modalContent: options.content
    });
  }

  render() {
    const {loading, errorMsg, items} = this.props.data;

    if (loading) {
      return <span className="loading-icon loading-tip"></span>;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <div className="empty-tip">
          <h2>{gettext("You don't have any upload links")}</h2>
          <p>{gettext("You can generate an upload link from any folder. Anyone who receives this link can upload files to this folder.")}</p>
        </div>
      );

      const table = (
        <React.Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="4%">{/*icon*/}</th>
                <th width="42%">{gettext("Name")}</th>
                <th width="30%">{gettext("Library")}</th>
                <th width="14%">{gettext("Visits")}</th>
                <th width="10%">{/*Operations*/}</th>
              </tr>
            </thead>
            <TableBody items={items} showModal={this.showModal} />
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

class TableBody extends Component {

  constructor(props) {
    super(props);
    this.state = {
      //items: this.props.items
    };
  }

  render() {

    let listItems = this.props.items.map(function(item, index) {
      return <Item key={index} data={item} showModal={this.props.showModal} />;
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
      deleted: false
    };

    this.handleMouseOver = this.handleMouseOver.bind(this);
    this.handleMouseOut = this.handleMouseOut.bind(this);

    this.viewLink = this.viewLink.bind(this);
    this.removeLink = this.removeLink.bind(this);
  }

  handleMouseOver() {
    this.setState({
      showOpIcon: true
    });
  }

  handleMouseOut() {
    this.setState({
      showOpIcon: false
    });
  }

  viewLink(e) {
    e.preventDefault();
    this.props.showModal({content: this.props.data.link});
  }

  removeLink(e) {
    e.preventDefault();

    const data = this.props.data;
    seafileAPI.deleteUploadLink(data.token)
      .then((res) => {
        this.setState({
          deleted: true
        });
        // TODO: show feedback msg
        // gettext("Successfully deleted 1 item")
      })
      .catch((error) => {
      // TODO: show feedback msg
      });
  }

  render() {

    if (this.state.deleted) {
      return null;
    }

    const data = this.props.data;

    const icon_size = Utils.isHiDPI() ? 48 : 24;
    data.icon_url = Utils.getFolderIconUrl({
      is_readonly: false, 
      size: icon_size
    }); 
    data.url = `${siteRoot}#my-libs/lib/${data.repo_id}${Utils.encodePath(data.path)}`;

    let iconVisibility = this.state.showOpIcon ? '' : ' invisible';
    let linkIconClassName = 'sf2-icon-link op-icon' + iconVisibility; 
    let deleteIconClassName = 'sf2-icon-delete op-icon' + iconVisibility;

    const item = (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td><img src={data.icon_url} width="24" /></td>
        <td><a href={data.url}>{data.obj_name}</a></td>
        <td><a href={`${siteRoot}#my-libs/lib/${data.repo_id}/`}>{data.repo_name}</a></td>
        <td>{data.view_cnt}</td>
        <td>
          <a href="#" className={linkIconClassName} title={gettext('View')} onClick={this.viewLink}></a>
          <a href="#" className={deleteIconClassName} title={gettext('Remove')} onClick={this.removeLink}></a>
        </td>
      </tr>
    );

    return item;
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
      this.setState({
        loading: false,
        items: res.data
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

  render() {
    return (
      <div className="main-panel-center">
        <div className="cur-view-container">
          <div className="cur-view-path">
            <ul className="nav">
              { canGenerateShareLink ?
              <li className="nav-item"><Link to={`${siteRoot}share-admin-share-links/`} className="nav-link">{gettext('Share Links')}</Link></li>
                : '' }
              <li className="nav-item"><Link to={`${siteRoot}share-admin-upload-links/`} className="nav-link active">{gettext('Upload Links')}</Link></li>
            </ul>
          </div>
          <div className="cur-view-content">
            <Content data={this.state} />
          </div>
        </div>
      </div>
    );
  }
}

export default ShareAdminUploadLinks;
