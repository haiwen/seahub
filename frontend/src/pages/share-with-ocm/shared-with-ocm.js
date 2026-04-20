import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Cookies from 'js-cookie';
import classnames from 'classnames';
import { Link, navigate } from '@gatsbyjs/reach-router';
import { gettext, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import EmptyTip from '../../components/empty-tip';
import ViewModes from '../../components/view-modes';
import ReposSortMenu from '../../components/sort-menu';
import SortOptionsDialog from '../../components/dialog/sort-options';
import { LIST_MODE } from '../../components/dir-view-mode/constants';
import OpIcon from '../../components/op-icon';
import Icon from '../../components/icon';
import RepoListCard from '../../components/repo-list-card/repo-list-card';

const propTypes = {
  currentViewMode: PropTypes.string,
  inAllLibs: PropTypes.bool
};

dayjs.extend(relativeTime);

class Content extends Component {

  renderItems = () => {
    const { items, currentViewMode, inAllLibs } = this.props;
    const isDesktop = Utils.isDesktop();
    return (
      <>
        {items.map((item, index) => {
          return (
            <Item
              key={index}
              item={item}
              currentViewMode={currentViewMode}
              inAllLibs={inAllLibs}
              isDesktop={isDesktop}
              leaveShare={this.props.leaveShare}
            />
          );
        })}
      </>
    );
  };

  render() {
    const { loading, errorMsg, items, currentViewMode, inAllLibs } = this.props;

    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      if (items.length == 0) {
        const emptyTipTitle = gettext('No libraries have been shared with you');
        const emptyTip = inAllLibs
          ? <span className={`libraries-empty-tip-in-${currentViewMode}-mode`}>{emptyTipTitle}</span>
          : (
            <EmptyTip
              title={emptyTipTitle}
              text={gettext('No libraries have been shared with you from other servers.')}
            >
            </EmptyTip>
          );
        return emptyTip;
      }

      const isDesktop = Utils.isDesktop();
      if (isDesktop) {
        return currentViewMode == LIST_MODE
          ? (
            <>
              <RepoListCard>
                {this.renderItems()}
              </RepoListCard>
            </>
          )
          : (
            <div className="repo-grid-container">
              {this.renderItems()}
            </div>
          );

      } else { // mobile
        return (
          <>
            <RepoListCard>
              {this.renderItems()}
            </RepoListCard>
          </>
        );
      }

    }
  }
}

Content.propTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  leaveShare: PropTypes.func.isRequired,
};

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isHighlighted: false,
      isOpIconShown: false,
      isItemMenuShow: false // for mobile
    };
  }

  handleMouseOver = () => {
    this.setState({
      isHighlighted: true,
      isOpIconShown: true
    });
  };

  handleMouseOut = () => {
    this.setState({
      isHighlighted: false,
      isOpIconShown: false
    });
  };

  leaveShare = (e) => {
    e.preventDefault();
    this.props.leaveShare(this.props.item);
  };

  toggleOperationMenu = () => {
    this.setState({ isItemMenuShow: !this.state.isItemMenuShow });
  };

  visitRepo = () => {
    navigate(this.repoURL);
  };

  render() {
    const { item, isDesktop, currentViewMode, inAllLibs } = this.props;
    const { isHighlighted, isOpIconShown } = this.state;

    item.icon_url = Utils.getLibIconUrl(item);
    item.icon_title = Utils.getLibIconTitle(item);

    let shareRepoUrl = `${siteRoot}remote-library/${this.props.item.provider_id}/${this.props.item.repo_id}/${Utils.encodePath(this.props.item.repo_name)}/`;
    this.repoURL = shareRepoUrl;

    if (isDesktop) {
      return currentViewMode == LIST_MODE
        ? (
          <div
            className={`repo-list-item ${isHighlighted ? 'highlight' : ''}`}
            onMouseOver={this.handleMouseOver}
            onMouseOut={this.handleMouseOut}
            onFocus={this.handleMouseOver}
          >
            <div className="repo-item-icon"></div>
            <div className="repo-item-name">
              <img src={item.icon_url} title={item.icon_title} alt={item.icon_title} width="24" className="mr-2" />
              <Link to={shareRepoUrl}>{item.repo_name}</Link>
            </div>
            <div className="repo-item-actions">
              <OpIcon
                symbol="close"
                className={`op-icon ${isOpIconShown ? '' : 'invisible'}`}
                title={gettext('Leave Share')}
                op={this.leaveShare}
              />
            </div>
            {inAllLibs
              ? (
                <>
                  <div className="repo-item-size"></div>
                  <div className="repo-item-time"></div>
                </>
              )
              : (
                <>
                  <div className="repo-item-server">{item.from_server_url}</div>
                </>
              )}
            <div className="repo-item-owner">{item.from_user}</div>
          </div>
        )
        : (
          <div
            className="library-grid-item"
            onMouseOver={this.handleMouseOver}
            onMouseOut={this.handleMouseOut}
            onFocus={this.handleMouseOver}
          >
            <div className="d-flex align-items-center">
              <img src={item.icon_url} title={item.icon_title} alt={item.icon_title} width="40" className="mr-3" />
              <div className="d-flex flex-column justify-content-center">
                <Link to={shareRepoUrl} className="library-name text-truncate" title={item.repo_name}>{item.repo_name}</Link>
                <span className="library-size">{item.size}</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <OpIcon
                symbol="close"
                className={`op-icon ${isOpIconShown ? '' : 'invisible'}`}
                title={gettext('Leave Share')}
                op={this.leaveShare}
              />
            </div>
          </div>
        );

    } else {
      // mobile
      return (
        <div
          className={`repo-list-item ${isHighlighted ? 'highlight' : ''}`}
          onMouseOver={this.handleMouseOver}
          onMouseOut={this.handleMouseOut}
          onClick={this.visitRepo}
        >
          <div className="d-flex align-items-center text-truncate">
            <img src={item.icon_url} title={item.icon_title} alt={item.icon_title} width="24" className="mr-2" />
            {item.repo_name && (
              <div>
                <Link to={shareRepoUrl}>{item.repo_name}</Link>
              </div>
            )}
          </div>
          <div className="d-flex align-items-center text-truncate mt-1">
            <span className="item-meta-info">{item.from_user}</span>
            <span className="item-meta-info">{item.from_server_url}</span>
          </div>
        </div>
      );

    }
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
  leaveShare: PropTypes.func.isRequired,
};

class SharedWithOCM extends Component {
  constructor(props) {
    super(props);
    this.sortOptions = [
      { value: 'name-asc', text: gettext('Ascending by name') },
      { value: 'name-desc', text: gettext('Descending by name') }
    ];
    this.state = {
      loading: true,
      errorMsg: '',
      items: [],
      currentViewMode: localStorage.getItem('sf_repo_list_view_mode') || LIST_MODE,
      sortBy: 'name',
      sortOrder: this.props.sortOrder || Cookies.get('seafile-repo-dir-sort-order') || 'asc', // 'asc' or 'desc'
      isSortOptionsDialogOpen: false
    };
  }

  componentDidMount() {
    seafileAPI.listOCMSharesReceived().then((res) => {
      const { ocm_share_received_list } = res.data;
      this.setState({
        loading: false,
        items: ocm_share_received_list
      }, () => {
        const { sortBy, sortOrder } = this.state;
        this.sortItems(sortBy, sortOrder);
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  static getDerivedStateFromProps(props, state) {
    if (props.sortBy == 'name' && props.sortOrder != state.sortOrder) {
      Cookies.set('seafile-repo-dir-sort-order', props.sortOrder);
      return {
        ...state,
        sortOrder: props.sortOrder,
        items: Utils.sortRepos(state.items, props.sortBy, props.sortOrder)
      };
    }
    return null;
  }

  leaveShare = (item) => {
    const { id, repo_name } = item;
    seafileAPI.deleteOCMShareReceived(id).then((res) => {
      let items = this.state.items.filter(item => {
        return item.id != id;
      });
      this.setState({ items: items });
      toaster.success(gettext('Successfully unshared {name}').replace('{name}', repo_name));
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  renderSortIconInMobile = () => {
    return (
      <>
        {(!Utils.isDesktop() && this.state.items.length > 0) &&
          <span
            className="action-icon"
            onClick={this.toggleSortOptionsDialog}
          >
            <Icon symbol="sort-mobile" />
          </span>
        }
      </>
    );
  };

  switchViewMode = (newMode) => {
    this.setState({
      currentViewMode: newMode
    }, () => {
      localStorage.setItem('sf_repo_list_view_mode', newMode);
    });
  };

  onSelectSortOption = (sortOption) => {
    const [sortBy, sortOrder] = sortOption.value.split('-');
    this.setState({ sortBy, sortOrder }, () => {
      this.sortItems(sortBy, sortOrder);
    });
  };

  sortItems = (sortBy, sortOrder) => {
    Cookies.set('seafile-repo-dir-sort-by', sortBy);
    Cookies.set('seafile-repo-dir-sort-order', sortOrder);

    this.setState({
      sortBy: sortBy,
      sortOrder: sortOrder,
      items: Utils.sortRepos(this.state.items, sortBy, sortOrder)
    });
  };

  toggleSortOptionsDialog = () => {
    this.setState({
      isSortOptionsDialogOpen: !this.state.isSortOptionsDialogOpen
    });
  };

  renderContent = (currentViewMode) => {
    return (
      <Content
        inAllLibs={this.props.inAllLibs}
        currentViewMode={currentViewMode}
        loading={this.state.loading}
        errorMsg={this.state.errorMsg}
        items={this.state.items}
        sortBy={this.state.sortBy}
        sortOrder={this.state.sortOrder}
        sortItems={this.sortItems}
        leaveShare={this.leaveShare}
      />
    );
  };

  render() {
    const { inAllLibs = false, currentViewMode: propCurrentViewMode } = this.props;
    const { sortBy, sortOrder, currentViewMode: stateCurrentViewMode } = this.state;
    const currentViewMode = inAllLibs ? propCurrentViewMode : stateCurrentViewMode;

    return (
      <Fragment>
        {inAllLibs
          ? (
            <>
              <div className="library-list-header">
                <Icon symbol="share-with-me" className="w-4 h-4 mr-2" />
                <span className="library-list-title">{gettext('Shared from other servers')}</span>
              </div>
              {this.renderContent(currentViewMode)}
            </>
          )
          : (
            <div className="main-panel-center">
              <div className="cur-view-container">
                <div className="cur-view-path">
                  <h3 className="library-list-header">{gettext('Shared from other servers')}</h3>
                  {Utils.isDesktop() && (
                    <div className="d-flex align-items-center">
                      <ViewModes
                        currentViewMode={currentViewMode}
                        switchViewMode={this.switchViewMode}
                      />
                      <ReposSortMenu
                        className="ml-2"
                        sortOptions={this.sortOptions}
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        onSelectSortOption={this.onSelectSortOption}
                      />
                    </div>
                  )}
                  {this.renderSortIconInMobile()}
                </div>
                <div className={classnames('cur-view-content', 'repos-container', { 'pt-3': currentViewMode != LIST_MODE })}>
                  {this.renderContent(currentViewMode)}
                </div>
              </div>
            </div>
          )}
        {this.state.isSortOptionsDialogOpen &&
        <SortOptionsDialog
          toggleDialog={this.toggleSortOptionsDialog}
          sortOptions={this.sortOptions}
          sortBy={this.state.sortBy}
          sortOrder={this.state.sortOrder}
          sortItems={this.sortItems}
        />
        }
      </Fragment>
    );
  }
}

SharedWithOCM.propTypes = propTypes;

export default SharedWithOCM;
