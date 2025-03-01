import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext, siteRoot, isPro, username } from '../../../utils/constants';
import Loading from '../../loading';
import toaster from '../../../components/toast';
import EmptyTip from '../../../components/empty-tip';
import SharePermissionEditor from '../../../components/select-editor/share-permission-editor';
import EventBus from '../../common/event-bus';
import { EVENT_BUS_TYPE } from '../../common/event-bus-type';

const itemPropTypes = {
  item: PropTypes.object.isRequired,
  deleteItem: PropTypes.func.isRequired,
  isRepoOwner: PropTypes.bool.isRequired
};

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      permission: this.props.item.permission,
      isOperationShow: false,
      isShowPermEditor: false,
    };
    this.permissions = ['rw', 'r'];
    if (isPro) {
      if (this.props.item.path === '/' && this.props.isRepoOwner) {
        this.permissions.push('admin');
      }
      this.permissions.push('cloud-edit', 'preview');
    }
  }

  onMouseEnter = () => {
    this.setState({ isOperationShow: true });
  };

  onMouseLeave = () => {
    this.setState({ isOperationShow: false });
  };

  onDeleteLink = (e) => {
    e.preventDefault();
    this.props.deleteItem(this.props.item);
  };

  changePerm = (permission) => {
    const item = this.props.item;
    seafileAPI.updateShareToGroupItemPermission(item.repo_id, item.path, 'group', item.share_to, permission).then(() => {
      this.setState({
        permission: permission,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onEditPermission = (event) => {
    event.nativeEvent.stopImmediatePropagation();
    this.setState({ isShowPermEditor: true });
  };

  render() {

    let objUrl;
    let item = this.props.item;
    let path = item.path === '/' ? '/' : item.path.slice(0, item.path.length - 1);

    objUrl = `${siteRoot}library/${item.repo_id}/${encodeURIComponent(item.repo_name)}${Utils.encodePath(path)}`;

    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} onFocus={this.onMouseEnter}>
        <td>
          <Link to={objUrl}>{Utils.getFolderName(item.path)}</Link>
        </td>
        <td className="name">{item.share_to_name}</td>
        <td>
          {!this.state.isShowPermEditor && (
            <div>
              <span>{item.permission_name || Utils.sharePerms(this.state.permission)}</span>
              {this.state.isOperationShow && (
                <a href="#"
                  role="button"
                  aria-label={gettext('Edit')}
                  title={gettext('Edit')}
                  className="sf3-font sf3-font-rename attr-action-icon"
                  onClick={this.onEditPermission}>
                </a>
              )}
            </div>
          )}
          {this.state.isShowPermEditor && (
            <SharePermissionEditor
              repoID={item.repo_id}
              isTextMode={true}
              isEditIconShow={this.state.isOperationShow}
              isEditing={true}
              currentPermission={this.state.permission}
              permissions={this.permissions}
              onPermissionChanged={this.changePerm}
            />
          )}
        </td>
        <td>
          <span
            tabIndex="0"
            role="button"
            className={`sf2-icon-x3 action-icon ${this.state.isOperationShow ? '' : 'invisible'}`}
            onClick={this.onDeleteLink}
            onKeyDown={Utils.onKeyDown}
            title={gettext('Delete')}
            aria-label={gettext('Delete')}
          >
          </span>
        </td>
      </tr>
    );
  }
}

Item.propTypes = itemPropTypes;

const propTypes = {
  repo: PropTypes.object.isRequired,
};

class RepoShareAdminGroupShares extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: [],
    };
  }

  componentDidMount() {
    seafileAPI.getAllRepoFolderShareInfo(this.props.repo.repo_id, 'group').then((res) => {
      this.setState({
        loading: false,
        items: res.data.share_info_list,
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  deleteItem = (item) => {
    const eventBus = EventBus.getInstance();
    seafileAPI.deleteShareToGroupItem(item.repo_id, item.path, 'group', item.share_to).then(res => {
      eventBus.dispatch(EVENT_BUS_TYPE.UNSHARE_REPO_TO_GROUP, { repo_id: item.repo_id, group_id: item.share_to });
      let items = this.state.items.filter(shareItem => {
        return shareItem.path + shareItem.share_to !== item.path + item.share_to;
      });
      this.setState({ items: items });
      let message = gettext('Successfully deleted 1 item');
      toaster.success(message);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    const { loading, errorMsg, items } = this.state;
    const { repo } = this.props;
    const isRepoOwner = repo.owner_email === username;
    return (
      <Fragment>
        {loading && <Loading />}
        {!loading && errorMsg && <p className="error text-center mt-8">{errorMsg}</p>}
        {!loading && !errorMsg && !items.length &&
        <EmptyTip text={gettext('No group shares')}/>
        }
        {!loading && !errorMsg && items.length > 0 &&
        <table className="table-hover">
          <thead>
            <tr>
              <th width="30%">{gettext('Name')}</th>
              <th width="30%">{gettext('Group')}</th>
              <th width="30%">{gettext('Permission')}</th>
              <th width="10%"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              return (
                <Item
                  key={index}
                  item={item}
                  deleteItem={this.deleteItem}
                  isRepoOwner={isRepoOwner}
                />
              );
            })}
          </tbody>
        </table>
        }
      </Fragment>
    );
  }
}

RepoShareAdminGroupShares.propTypes = propTypes;

export default RepoShareAdminGroupShares;
