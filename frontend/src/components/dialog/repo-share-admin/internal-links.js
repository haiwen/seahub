import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';

import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext, siteRoot } from '../../../utils/constants';

import Loading from '../../../components/loading';
import toaster from '../../../components/toast';
import EmptyTip from '../../../components/empty-tip';

const itemPropTypes = {
  item: PropTypes.object.isRequired,
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired,
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

    const { item, repoID, repoName } = this.props;

    let objUrl;
    let path = item.parent_dir + item.dirent_name;

    if (item.is_dir) {
      objUrl = `${siteRoot}library/${repoID}/${encodeURIComponent(repoName)}${Utils.encodePath(path)}`;
    } else {
      objUrl = `${siteRoot}lib/${repoID}/file${Utils.encodePath(path)}`;
    }

    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} onFocus={this.onMouseEnter}>
        <td>
          <a href={objUrl} target="_blank">{item.dirent_name}</a>
        </td>
        <td>
          <a href={item.smart_link} target="_blank">{item.smart_link}</a>
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
          />
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
      items: [],
    };
  }

  componentDidMount() {
    seafileAPI.listRepoInternalLinks(this.props.repo.repo_id).then((res) => {
      this.setState({
        loading: false,
        items: res.data.smart_link_list,
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  deleteItem = (item) => {
    seafileAPI.deleteRepoInternalLink(this.props.repo.repo_id, item.token).then(() => {
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
  }

  render() {
    const { loading, errorMsg, items } = this.state;
    return (
      <Fragment>
        <div className="main-panel-center">
          <div className="cur-view-container">
            <div className="cur-view-content">
                {loading && <Loading />}
                {!loading && errorMsg && <p className="error text-center mt-8">{errorMsg}</p>}
                {!loading && !errorMsg && !items.length &&
                  <EmptyTip forDialog={true}>
                    <p className="text-secondary">{gettext('No internal links')}</p>
                  </EmptyTip>
                }
                {!loading && !errorMsg && items.length > 0 &&
                <table>
                  <thead>
                    <tr>
                      <th width="30%">{gettext('Name')}</th>
                      <th width="60%">{gettext('Link')}</th>
                      <th width="10%"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      return (
                        <Item
                          key={index}
                          item={item}
                          repoID={this.props.repo.repo_id}
                          repoName={this.props.repo.repo_name}
                          deleteItem={this.deleteItem}
                        />
                      );
                    })}
                  </tbody>
                </table>
                }
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

RepoShareAdminShareLinks.propTypes = propTypes;

export default RepoShareAdminShareLinks;
