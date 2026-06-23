import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Link, navigate } from '@gatsbyjs/reach-router';
import { gettext, siteRoot, canGenerateShareLink, canGenerateUploadLink } from '../../utils/constants';
import OpElement from '../../components/op-element';
import OpIcon from '../../components/op-icon';
import Icon from '../../components/icon';
import CustomDropdown from '../../components/dropdown';
import ShareAdminShareLinks from './share-links';
import ShareAdminUploadLinks from './upload-links';

const SHARE_LINKS = 'share-admin-share-links';
const UPLOAD_LINKS = 'share-admin-upload-links';

const defaultHeaderConfig = {
  activeItem: '',
  selectedItemsCount: 0,
  onUnselect: null,
  onDelete: null,
  deleteId: '',
  dropdownItems: []
};

const navPropTypes = {
  activeItem: PropTypes.string.isRequired,
  dropdownItems: PropTypes.array
};

const navDefaultProps = {
  dropdownItems: []
};

class ShareAdminLinksNav extends Component {

  constructor(props) {
    super(props);
    this.itemRefs = [];
    this.navRef = null;
    this.state = { ready: false };
  }

  componentDidMount() {
    this.setState({ ready: true });
  }

  render() {
    const { activeItem, dropdownItems } = this.props;
    const navItems = [
      {
        name: SHARE_LINKS,
        path: 'share-admin-share-links/',
        text: gettext('Share Links'),
        visible: activeItem === SHARE_LINKS || canGenerateShareLink
      },
      {
        name: UPLOAD_LINKS,
        path: 'share-admin-upload-links/',
        text: gettext('Upload Links'),
        visible: activeItem === UPLOAD_LINKS || canGenerateUploadLink
      }
    ].filter(item => item.visible);

    if (navItems.length <= 1) {
      return null;
    }

    const activeIndex = Math.max(navItems.findIndex(item => item.name === activeItem), 0);
    const activeLink = this.itemRefs[activeIndex];
    const navRect = this.navRef?.getBoundingClientRect();
    const activeLinkRect = activeLink?.getBoundingClientRect();
    const indicatorWidth = activeLink?.offsetWidth || 0;
    const indicatorOffset = navRect && activeLinkRect ? activeLinkRect.left - navRect.left : 0;

    return (
      <ul
        className="nav nav-indicator-container position-relative"
        ref={el => this.navRef = el}
        style={{
          '--indicator-width': `${indicatorWidth}px`,
          '--indicator-offset': `${indicatorOffset}px`
        }}
      >
        {navItems.map((item, index) => {
          const isActive = item.name === activeItem;
          return (
            <li
              className={classnames('nav-item mx-3 d-flex align-items-center', { active: isActive })}
              key={item.name}
            >
              <Link
                to={`${siteRoot}${item.path}`}
                className={`nav-link${isActive ? ' active' : ''}`}
                ref={el => this.itemRefs[index] = el}
              >
                {item.text}
              </Link>
              <span className="share-admin-links-nav-dropdown" aria-hidden={!isActive}>
                {isActive && (
                  <CustomDropdown
                    items={dropdownItems}
                    trigger={<Icon symbol="down" className="down-icon" />}
                    menuPortal={false}
                  />
                )}
              </span>
            </li>
          );
        })}
      </ul>
    );
  }
}

ShareAdminLinksNav.propTypes = navPropTypes;
ShareAdminLinksNav.defaultProps = navDefaultProps;

const propTypes = {
  shareAdminPage: PropTypes.string
};

class ShareAdminLinks extends Component {

  constructor(props) {
    super(props);
    this.state = {
      headerConfig: defaultHeaderConfig
    };
  }

  updateHeaderConfig = (headerConfig) => {
    this.setState({
      headerConfig: {
        ...defaultHeaderConfig,
        ...headerConfig
      }
    });
  };

  getActiveItem = () => {
    const { shareAdminPage } = this.props;
    if (shareAdminPage === SHARE_LINKS || shareAdminPage === UPLOAD_LINKS) {
      return shareAdminPage;
    }
    return null;
  };

  componentDidMount() {
    if (!this.getActiveItem()) {
      navigate(`${siteRoot}share-admin-share-links/`, { replace: true });
    }
  }

  renderHeader = (activeItem) => {
    const { headerConfig } = this.state;
    const currentHeaderConfig = headerConfig.activeItem === activeItem ? headerConfig : defaultHeaderConfig;
    const {
      selectedItemsCount,
      onUnselect,
      onDelete,
      deleteId,
      dropdownItems
    } = currentHeaderConfig;

    return (
      <div className={classnames('cur-view-path share-upload-nav', { 'o-hidden': selectedItemsCount > 0 })}>
        {selectedItemsCount > 0
          ? (
            <div className="selected-items-toolbar">
              <OpElement
                className="cur-view-path-btn px-1"
                op={onUnselect}
                title={gettext('Unselect')}
              >
                <span className="d-flex align-items-center justify-content-center mr-2"><Icon symbol="close" /></span>
                <span>{`${selectedItemsCount} ${gettext('selected')}`}</span>
              </OpElement>
              <OpIcon
                className="cur-view-path-btn ml-4"
                symbol="delete1"
                title={gettext('Delete')}
                tooltip={gettext('Delete')}
                op={onDelete}
                id={deleteId}
              />
            </div>
          )
          : (
            <ShareAdminLinksNav
              activeItem={activeItem}
              dropdownItems={dropdownItems}
            />
          )
        }
      </div>
    );
  };

  renderContent = (activeItem) => {
    if (activeItem === SHARE_LINKS) {
      return (
        <ShareAdminShareLinks
          updateHeaderConfig={this.updateHeaderConfig}
        />
      );
    }

    if (activeItem === UPLOAD_LINKS) {
      return (
        <ShareAdminUploadLinks
          updateHeaderConfig={this.updateHeaderConfig}
        />
      );
    }

    return null;
  };

  render() {
    const activeItem = this.getActiveItem();

    if (!activeItem) {
      return null;
    }

    return (
      <Fragment>
        <div className="main-panel-center">
          <div className="cur-view-container">
            {this.renderHeader(activeItem)}
            {this.renderContent(activeItem)}
          </div>
        </div>
      </Fragment>
    );
  }
}

ShareAdminLinks.propTypes = propTypes;

export default ShareAdminLinks;
