import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import cookie from 'react-cookies';
import classnames from 'classnames';
import { Link, navigate } from '@gatsbyjs/reach-router';
import { Dropdown, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import EmptyTip from '../../components/empty-tip';
import ViewModes from '../../components/view-modes';
import ReposSortMenu from '../../components/sort-menu';
import SortOptionsDialog from '../../components/dialog/sort-options';
import LibsMobileThead from '../../components/libs-mobile-thead';
import { LIST_MODE } from '../../components/dir-view-mode/constants';

const propTypes = {
  currentViewMode: PropTypes.string,
  inAllLibs: PropTypes.bool
};

dayjs.extend(relativeTime);

class Content extends Component {

  sortByName = (e) => {
    e.preventDefault();
    const sortBy = 'name';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  };

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
    const { loading, errorMsg, items, sortOrder, currentViewMode, inAllLibs } = this.props;

    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      if (items.length == 0) {
        const emptyTipTitle = gettext('No libraries have been shared with you');
        const emptyTip = inAllLibs
          ? <p className={`libraries-empty-tip-in-${currentViewMode}-mode`}>{emptyTipTitle}</p>
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
        const sortIcon = sortOrder === 'asc'
          ? <span className="sf3-font sf3-font-down rotate-180 d-inline-block"></span>
          : <span className="sf3-font sf3-font-down"></span>;

        return currentViewMode == LIST_MODE
          ? (
            <table className={classnames({ 'table-thead-hidden': inAllLibs })}>
              <thead>
                <tr>
                  <th width="4%"></th>
                  <th width="3%"><span className="sr-only">{gettext('Library Type')}</span></th>
                  <th width="35%"><a className="d-block table-sort-op" href="#" onClick={this.sortByName}>{gettext('Name')} {this.props.sortBy === 'name' && sortIcon}</a></th>
                  <th width="10%"><span className="sr-only">{gettext('Actions')}</span></th>
                  {inAllLibs
                    ? (
                      <>
                        <th width="14%">{gettext('Size')}</th>
                        <th width="17%">{gettext('Last Update')}</th>
                      </>
                    )
                    : (
                      <>
                        <th width="31%">{gettext('At server')}</th>
                      </>
                    )}
                  <th width="17%">{gettext('Owner')}</th>
                </tr>
              </thead>
              <tbody>
                {this.renderItems()}
              </tbody>
            </table>
          )
          : (
            <div className="d-flex justify-content-between flex-wrap">
              {this.renderItems()}
            </div>
          );

      } else { // mobile
        return (
          <table className="table-thead-hidden">
            <LibsMobileThead inAllLibs={inAllLibs} />
            <tbody>
              {this.renderItems()}
            </tbody>
          </table>
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
          <tr
            className={isHighlighted ? 'tr-highlight' : ''}
            onMouseOver={this.handleMouseOver}
            onMouseOut={this.handleMouseOut}
            onFocus={this.handleMouseOver}
          >
            <td></td>
            <td><img src={item.icon_url} title={item.icon_title} alt={item.icon_title} width="24" /></td>
            <td><Link to={shareRepoUrl}>{item.repo_name}</Link></td>
            <td>
              <i role="button" className={`op-icon sf2-icon-x3 ${isOpIconShown ? '' : 'invisible'}`} title={gettext('Leave Share')} aria-label={gettext('Leave Share')} onClick={this.leaveShare}></i>
            </td>
            {inAllLibs
              ? (
                <>
                  <td></td>
                  <td></td>
                </>
              )
              : (
                <>
                  <td>{item.from_server_url}</td>
                </>
              )}
            <td>{item.from_user}</td>
          </tr>
        )
        : (
          <div
            className="library-grid-item px-3 d-flex justify-content-between align-items-center"
            onMouseOver={this.handleMouseOver}
            onMouseOut={this.handleMouseOut}
            onFocus={this.handleMouseOver}
          >
            <div className="d-flex align-items-center text-truncate">
              <img src={item.icon_url} title={item.icon_title} alt={item.icon_title} width="36" className="mr-2" />
              <Link to={shareRepoUrl} className="library-name text-truncate" title={item.repo_name}>{item.repo_name}</Link>
            </div>
            <div className="flex-shrink-0">
              <i role="button" className={`op-icon sf2-icon-x3 ${isOpIconShown ? '' : 'invisible'}`} title={gettext('Leave Share')} aria-label={gettext('Leave Share')} onClick={this.leaveShare}></i>
            </div>
          </div>
        );

    } else {
      // mobile
      return (
        <tr
          className={isHighlighted ? 'tr-highlight' : ''}
          onMouseOver={this.handleMouseOver}
          onMouseOut={this.handleMouseOut}
        >
          <td onClick={this.visitRepo}>
            <img src={item.icon_url} title={item.icon_title} alt={item.icon_title} width="24" />
          </td>
          <td onClick={this.visitRepo}>
            {item.repo_name && (
              <div>
                <Link to={shareRepoUrl}>{item.repo_name}</Link>
              </div>
            )}
            <span className="item-meta-info">{item.from_user}</span>
            <span className="item-meta-info">{item.from_server_url}</span>
          </td>
          <td>
            <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu}>
              <DropdownToggle
                tag="i"
                className="sf-dropdown-toggle sf3-font sf3-font-more-vertical ml-0"
                title={gettext('More operations')}
                aria-label={gettext('More operations')}
                data-toggle="dropdown"
                aria-expanded={this.state.isItemMenuShow}
              />
              <div className={`${this.state.isItemMenuShow ? '' : 'd-none'}`} onClick={this.toggleOperationMenu}>
                <div className="mobile-operation-menu-bg-layer"></div>
                <div className="mobile-operation-menu">
                  <DropdownItem className="mobile-menu-item" onClick={this.leaveShare}>{gettext('Leave Share')}</DropdownItem>
                </div>
              </div>
            </Dropdown>
          </td>
        </tr>
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
      sortOrder: this.props.sortOrder || cookie.load('seafile-repo-dir-sort-order') || 'asc', // 'asc' or 'desc'
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
      cookie.save('seafile-repo-dir-sort-order', props.sortOrder);
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
            className="sf3-font sf3-font-sort action-icon"
            onClick={this.toggleSortOptionsDialog}
          >
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
    cookie.save('seafile-repo-dir-sort-by', sortBy);
    cookie.save('seafile-repo-dir-sort-order', sortOrder);
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
    const { inAllLibs = false, currentViewMode: propCurrentViewMode } = this.props; // inAllLibs: in 'All Libs'('Files') page
    const { sortBy, sortOrder, currentViewMode: stateCurrentViewMode } = this.state;
    const currentViewMode = inAllLibs ? propCurrentViewMode : stateCurrentViewMode;

    if (inAllLibs) {
      return (
        <>
          <div className={`d-flex justify-content-between mt-3 py-1 ${currentViewMode == LIST_MODE ? 'sf-border-bottom' : ''}`}>
            <h4 className="sf-heading m-0">
              <span className="sf3-font-share-with-me sf3-font nav-icon" aria-hidden="true"></span>
              {gettext('Shared from other servers')}
            </h4>
            {this.renderSortIconInMobile()}
          </div>
          {this.renderContent(currentViewMode)}
        </>
      );
    }

    return (
      <Fragment>
        <div className="main-panel-center">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading m-0">{gettext('Shared from other servers')}</h3>
              {Utils.isDesktop() && (
                <div className="d-flex align-items-center">
                  <div className="mr-2">
                    <ViewModes
                      currentViewMode={currentViewMode}
                      switchViewMode={this.switchViewMode}
                    />
                  </div>
                  <ReposSortMenu
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
