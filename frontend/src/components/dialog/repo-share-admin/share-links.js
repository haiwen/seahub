import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext, siteRoot } from '../../../utils/constants';
import Loading from '../../../components/loading';
import toaster from '../../../components/toast';
import EmptyTip from '../../../components/empty-tip';

const itemPropTypes = {
  item: PropTypes.object.isRequired,
  deleteItem: PropTypes.func.isRequired
};

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOperationShow: false
    };
  }

  onMouseEnter = () => {
    this.setState({isOperationShow: true});
  };

  onMouseLeave = () => {
    this.setState({isOperationShow: false});
  };

  onDeleteLink = (e) => {
    e.preventDefault();
    this.props.deleteItem(this.props.item);
  };

  render() {
    let objUrl;
    let item = this.props.item;
    let path = item.path === '/' ? '/' : item.path.slice(0, item.path.length - 1);

    if (item.is_dir) {
      objUrl = `${siteRoot}library/${item.repo_id}/${encodeURIComponent(item.repo_name)}${Utils.encodePath(path)}`;
    } else {
      objUrl = `${siteRoot}lib/${item.repo_id}/file${Utils.encodePath(item.path)}`;
    }

    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} onFocus={this.onMouseEnter}>
        <td className="name">{item.creator_name}</td>
        <td>
          {item.is_dir ? <Link to={objUrl}>{item.obj_name}</Link> :
          <a href={objUrl} target="_blank" rel="noreferrer">{item.obj_name}</a>}
        </td>
        <td>
          <a href={item.link} target="_blank" rel="noreferrer">{item.link}</a>
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

class RepoShareAdminShareLinks extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: []
    };
  }

  componentDidMount() {
    seafileAPI.listRepoShareLinks(this.props.repo.repo_id).then((res) => {
      this.setState({
        loading: false,
        items: res.data,
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  deleteItem = (item) => {
    seafileAPI.deleteRepoShareLink(this.props.repo.repo_id, item.token).then(() => {
      let items = this.state.items.filter(linkItem => {
        return linkItem.token !== item.token;
      });
      this.setState({items: items});
      let message = gettext('Successfully deleted 1 item');
      toaster.success(message);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    const { loading, errorMsg, items } = this.state;
    return (
      <Fragment>
        {loading && <Loading />}
        {!loading && errorMsg && <p className="error text-center mt-8">{errorMsg}</p>}
        {!loading && !errorMsg && !items.length &&
        <EmptyTip forDialog={true}>
          <p className="text-secondary">{gettext('No share links')}</p>
        </EmptyTip>
        }
        {!loading && !errorMsg && items.length > 0 &&
        <table className="table-hover">
          <thead>
            <tr>
              <th width="22%">{gettext('Creator')}</th>
              <th width="20%">{gettext('Name')}</th>
              <th width="50%">{gettext('Link')}</th>
              <th width="8%"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              return (
                <Item
                  key={index}
                  item={item}
                  deleteItem={this.deleteItem}
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

RepoShareAdminShareLinks.propTypes = propTypes;

export default RepoShareAdminShareLinks;
