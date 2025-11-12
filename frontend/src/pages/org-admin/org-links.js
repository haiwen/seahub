import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { orgAdminAPI } from '../../utils/org-admin-api';
import { siteRoot, gettext, serviceURL } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import MainPanelTopbar from './main-panel-topbar';
import ViewLinkDialog from '../../components/dialog/view-link-dialog';
import Icon from '../../components/icon';

dayjs.extend(relativeTime);

class OrgLinks extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      linkList: null,
      page: 1,
      pageNext: false,
      isItemFreezed: false,
      isShowLinkDialog: false,
      currentLinkHref: '',
    };
  }

  listOrgLinks = (page) => {
    orgAdminAPI.orgAdminListOrgLinks(page).then(res => {
      const data = res.data;
      this.setState({
        linkList: data.link_list,
        page: data.page,
        pageNext: data.page_next,
      });
    });
  };

  onFreezedItem = () => {
    this.setState({ isItemFreezed: true });
  };

  onUnfreezedItem = () => {
    this.setState({ isItemFreezed: false });
  };

  onChangePageNum = (event, num) => {
    event.preventDefault();
    let page = this.state.page;
    if (num === 1) {
      page = page + 1;
    } else {
      page = page - 1;
    }
    this.listOrgLinks(page);
  };

  deleteOrgLink = (token) => {
    orgAdminAPI.orgAdminDeleteOrgLink(token).then(res => {
      if (res.data.success === true) {
        this.listOrgLinks(this.state.page);
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  openLinkDialog = (link) => {
    let href;
    if (link.name.indexOf('/') > -1) {
      href = serviceURL + '/d/' + link.token + '/';
    } else {
      href = serviceURL + '/f/' + link.token + '/';
    }
    this.setState({ currentLinkHref: href });
    this.toggleLinkDialog();
  };

  toggleLinkDialog = () => {
    this.setState({ isShowLinkDialog: !this.state.isShowLinkDialog });
  };

  componentDidMount() {
    this.listOrgLinks(this.state.page);
  }

  render() {
    const linkList = this.state.linkList;
    return (
      <Fragment>
        <MainPanelTopbar/>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('All Public Links')}</h3>
            </div>
            <div className="cur-view-content">
              <table>
                <thead>
                  <tr>
                    <th width="50%">{gettext('Name')}</th>
                    <th width="15%">{gettext('Owner')}</th>
                    <th width="15%">{gettext('Created At')}</th>
                    <th width="10%">{gettext('Visit count')}</th>
                    <th width="10%"></th>
                  </tr>
                </thead>
                <tbody>
                  {linkList && linkList.map((item, index) => {
                    return (
                      <React.Fragment key={index}>
                        <RepoItem
                          link={item}
                          isItemFreezed={this.state.isItemFreezed}
                          onFreezedItem={this.onFreezedItem}
                          onUnfreezedItem={this.onUnfreezedItem}
                          deleteOrgLink={this.deleteOrgLink}
                          openLinkDialog={this.openLinkDialog}
                        />
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              <div className="paginator">
                {this.state.page !== 1 && <a href="#" onClick={(e) => this.onChangePageNum(e, -1)}>{gettext('Previous')}</a>}
                {(this.state.page !== 1 && this.state.pageNext) && <span> | </span>}
                {this.state.pageNext && <a href="#" onClick={(e) => this.onChangePageNum(e, 1)}>{gettext('Next')}</a>}
              </div>
            </div>
          </div>
        </div>
        {this.state.isShowLinkDialog &&
          <ViewLinkDialog currentLinkHref={this.state.currentLinkHref} toggle={this.toggleLinkDialog}/>
        }
      </Fragment>
    );
  }
}

const propTypes = {
  link: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  deleteOrgLink: PropTypes.func.isRequired,
  openLinkDialog: PropTypes.func.isRequired,
};

class RepoItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      showMenu: false,
      isItemMenuShow: false,
    };
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({ showMenu: true, highlight: true });
    }
  };

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({ showMenu: false, highlight: false });
    }
  };

  onDropdownToggleClick = (e) => {
    this.toggleOperationMenu(e);
  };

  toggleOperationMenu = (e) => {
    e.stopPropagation();
    this.setState(
      { isItemMenuShow: !this.state.isItemMenuShow }, () => {
        if (this.state.isItemMenuShow) {
          this.props.onFreezedItem();
        } else {
          this.setState({
            highlight: false,
            showMenu: false,
          });
          this.props.onUnfreezedItem();
        }
      }
    );
  };

  render() {
    const { link, deleteOrgLink } = this.props;
    const href = siteRoot + 'org/useradmin/info/' + encodeURIComponent(link.owner_email) + '/';
    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} >
        <td>{link.name}</td>
        <td><a href={href}>{link.owner_name}</a></td>
        <td>{dayjs(link.created_time).fromNow()}</td>
        <td>{link.view_count}</td>
        <td className="cursor-pointer text-center">
          {this.state.showMenu &&
            <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu}>
              <DropdownToggle
                tag="span"
                className="op-icon"
                title={gettext('More operations')}
                aria-label={gettext('More operations')}
                data-toggle="dropdown"
                aria-expanded={this.state.isItemMenuShow}
                onClick={this.onDropdownToggleClick}
              >
                <Icon symbol="more-level" />
              </DropdownToggle>
              <DropdownMenu>
                <DropdownItem onClick={deleteOrgLink.bind(this, link.token)}>{gettext('Delete')}</DropdownItem>
                <DropdownItem onClick={this.props.openLinkDialog.bind(this, link)}>{gettext('View Link')}</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          }
        </td>
      </tr>
    );
  }
}

RepoItem.propTypes = propTypes;

export default OrgLinks;
