import React, { Component, Fragment } from 'react';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import CommonOperationDialog from '../../../components/dialog/common-operation-dialog';

class Content extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    const { loading, errorMsg, shareLinkItems, uploadLinkItems } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('This user has not created any shared links')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="5%">{/*icon*/}</th>
                <th width="20%">{gettext('Name')}</th>
                <th width="25%">{gettext('Size')}</th>
                <th width="10%">{gettext('Type')}</th>
                <th width="10%">{gettext('Visits')}</th>
                <th width="10%">{/*Operations*/}</th>
              </tr>
            </thead>
            <tbody>
              {shareLinkItems.length > 0 && shareLinkItems.map((item, index) => {
                return (<Item 
                  key={index}
                  item={item}
                  type={'Download'}
                  deleteLink={this.props.deleteLink}
                />);
              })}
              {uploadLinkItems.length > 0 && uploadLinkItems.map((item, index) => {
                return (<Item 
                  key={index}
                  item={item}
                  type={'Upload'}
                  deleteLink={this.props.deleteLink}
                />);
              })}
            </tbody>
          </table>
        </Fragment>
      );

      return shareLinkItems.length || uploadLinkItems.length  ? table : emptyTip; 
    }
  }
}

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      showOpIcon: false,
      isDeleteDialogOpen: false
    };
  }

  handleMouseOver = () => {
    this.setState({showOpIcon: true});
  }

  handleMouseOut = () => {
    this.setState({showOpIcon: false});
  }

  toggleDeleteDialog = () => {
    this.setState({isDeleteDialogOpen: !this.state.isDeleteDialogOpen});
  }

  deleteLink = () => {
    this.props.deleteLink(this.props.item.token, this.props.type);
    this.toggleDeleteDialog();
  }

  render() {
    let { showOpIcon, isDeleteDialogOpen } = this.state;
    let { item, type } = this.props;

    let iconUrl;
    if (type == 'Upload' || (type== 'Download' && item.is_dir)) {
      iconUrl = Utils.getFolderIconUrl();
    } else {
      iconUrl = Utils.getFileIconUrl(item.obj_name); 
    }

    let itemName = '<span class="op-target">' + Utils.HTMLescape(item.obj_name == '/' ? item.repo_name : item.obj_name) + '</span>';
    let deleteDialogMsg = gettext('Are you sure you want to delete link {placeholder} ?'.replace('{placeholder}', itemName))

    let iconVisibility = showOpIcon ? '' : ' invisible'; 
    let deleteIconClassName = 'op-icon sf2-icon-delete' + iconVisibility;
    return (
      <Fragment>
        <tr onMouseEnter={this.handleMouseOver} onMouseLeave={this.handleMouseOut}>
          <td><img src={iconUrl} alt="" width="24" /></td>
          <td>{item.obj_name == '/' ? item.repo_name : item.obj_name}</td>
          <td>{Utils.bytesToSize(item.size)}</td>
          <td>{type}</td>
          <td>{item.view_cnt}</td>
          <td>
            <a href="#" className={deleteIconClassName} title={gettext('Delete')} onClick={this.toggleDeleteDialog}></a>
          </td>
        </tr>
        {isDeleteDialogOpen &&
          <CommonOperationDialog
            title={gettext('Delete Link')}
            message={deleteDialogMsg}
            toggle={this.toggleDeleteDialog}
            executeOperation={this.deleteLink}
            confirmBtnText={gettext('Delete')}
          />
        }
      </Fragment>
    );
  }
}

class UserShareLinks extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      repoList: {},
      shareLinkList: {},
      uploadLinkList: {},
      isShowImportWaitingDialog: false
    };
  }

  componentDidMount () {
    this.getShareLinkList();
    this.getUploadLinkList();
  }

  getShareLinkList = () => {
    seafileAPI.sysAdminListShareLinksByUser(this.props.email).then(res => {
      this.setState({
        shareLinkList: res.data.share_link_list,
        loading: false
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext('Permission denied')
          });
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

  getUploadLinkList = () => {
    seafileAPI.sysAdminListUploadLinksByUser(this.props.email).then(res => {
      this.setState({
        uploadLinkList: res.data.upload_link_list,
        loading: false
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext('Permission denied')
          });
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

  deleteLink = (token, type) => {
    if (type == 'Download') {
      seafileAPI.sysAdminRemoveShareLink(token).then(res => {
        let newShareLinkList = this.state.shareLinkList.filter(item=> {
          return item.token != token;
        });
        this.setState({
          shareLinkList: newShareLinkList
        });
      }).catch((error) => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    } else if (type == 'Upload') {
      seafileAPI.sysAdminRemoveShareLink(token).then(res => {
        let newUploadLinkList = this.state.uploadLinkList.filter(item=> {
          return item.token != token;
        });
        this.setState({
          uploadLinkList: newUploadLinkList
        });
      }).catch((error) => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  }

  render() {
    return (
      <div className="cur-view-content">
        <Content
          loading={this.state.loading}
          errorMsg={this.state.errorMsg}
          shareLinkItems={this.state.shareLinkList}
          uploadLinkItems={this.state.uploadLinkList}
          deleteLink={this.deleteLink}
        />
      </div>
    );
  }
}

export default UserShareLinks;