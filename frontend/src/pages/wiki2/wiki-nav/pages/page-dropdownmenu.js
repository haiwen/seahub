import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import toaster from '../../../../components/toast';
import { gettext } from '../../../../utils/constants';
import { getWikPageLink } from '../../utils';
import { INSERT_POSITION } from '../constants';
import Icon from '../../../../components/icon';

export default class PageDropdownMenu extends Component {

  static propTypes = {
    page: PropTypes.object.isRequired,
    pages: PropTypes.array,
    toggle: PropTypes.func,
    toggleNameEditor: PropTypes.func,
    toggleInsertSiblingPage: PropTypes.func,
    duplicatePage: PropTypes.func,
    importPage: PropTypes.func,
    onDeletePage: PropTypes.func,
    canDeletePage: PropTypes.bool,
  };

  constructor(props) {
    super(props);
    this.pageNameMap = this.calculateNameMap();
    this.state = {
      isMenuOpen: false,
      isImportPageMenuShown: false,
    };
  }

  calculateNameMap = () => {
    const { pages } = this.props;
    return pages.reduce((map, page) => {
      map[page.name] = true;
      return map;
    }, {});
  };

  showImportPageMenu = (e) => {
    if (e) e.stopPropagation();
    if (!this.state.isImportPageMenuShown) {
      this.setState({ isImportPageMenuShown: true });
    }
  };

  hideImportPageMenu = (e) => {
    if (e) e.stopPropagation();
    if (this.state.isImportPageMenuShown) {
      this.setState({ isImportPageMenuShown: false });
    }
  };

  onDropdownToggle = () => {
    this.setState({
      isMenuOpen: !this.state.isMenuOpen
    });
  };

  onRename = (event) => {
    event.nativeEvent.stopImmediatePropagation();
    this.props.toggleNameEditor();
  };

  onDeletePage = (event) => {
    event.nativeEvent.stopImmediatePropagation();
    this.props.onDeletePage();
  };

  addPageAbove = () => {
    this.props.toggleInsertSiblingPage(INSERT_POSITION.ABOVE);
  };

  addPageBelow = () => {
    this.props.toggleInsertSiblingPage(INSERT_POSITION.BELOW);
  };

  duplicatePage = () => {
    const { page } = this.props;
    this.props.duplicatePage({ from_page_id: page.id }, () => {}, this.duplicatePageFailure);
  };

  importPage = (suffix) => {
    const { page } = this.props;
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = suffix;
    fileInput.style.display = 'none';

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const selectedFile = e.target.files[0];
        this.props.importPage(
          { from_page_id: page.id, file: selectedFile },
          () => {},
          this.importPageFailure
        );
      }
    });

    document.body.appendChild(fileInput);
    fileInput.click();

    setTimeout(() => {
      document.body.removeChild(fileInput);
    }, 1000);
  };

  importPageFailure = () => {
    toaster.danger(gettext('Failed to import page'));
  };

  duplicatePageFailure = () => {
    toaster.danger(gettext('Failed to duplicate page'));
  };

  handleCopyLink = () => {
    const { page } = this.props;
    const wikiLink = getWikPageLink(page.id);
    const successText = gettext('Copied link to clipboard');
    const failedText = gettext('Copy failed');

    navigator.clipboard.writeText(wikiLink).then(() => {
      toaster.success(successText);
    }, () => {
      toaster.error(failedText);
    }).catch(void 0);
  };

  handleOpenInNewTab = () => {
    const { page } = this.props;
    const wikiLink = getWikPageLink(page.id);
    window.open(wikiLink);
  };

  renderItem = (onClick, icon, text) => {
    return (
      <DropdownItem className="d-flex align-items-center" onClick={onClick}>
        <Icon symbol={icon} className="mr-2" aria-hidden="true" />
        <span className="item-text">{text}</span>
      </DropdownItem>
    );
  };

  render() {
    const { canDeletePage = true } = this.props;
    const { isMenuOpen } = this.state;
    return (
      <Dropdown
        isOpen={isMenuOpen}
        toggle={this.onDropdownToggle}
        className="page-operation-dropdown"
      >
        <DropdownToggle
          className="op-icon"
          tag="span"
          data-toggle="dropdown"
          role="button"
          tabIndex={0}
          title={gettext('More operations')}
          aria-label={gettext('More operations')}
        >
          <Icon symbol="more-level" />
        </DropdownToggle>
        <DropdownMenu
          className="page-operation-dropdown-menu dtable-dropdown-menu large position-fixed"
          flip={true}
          direction="down"
          style={{ maxHeight: '80vh', overflowY: 'auto' }}
          modifiers={[
            { name: 'preventOverflow', options: { boundary: 'window', padding: 8 } },
            { name: 'flip', enabled: true, options: { fallbackPlacements: ['top'] } }
          ]}
        >
          {this.renderItem(this.handleCopyLink, 'link1', gettext('Copy link'))}
          {this.renderItem(this.onRename, 'rename', gettext('Modify name'))}
          {this.renderItem(this.addPageAbove, 'new', gettext('Add page above'))}
          {this.renderItem(this.addPageBelow, 'new', gettext('Add page below'))}
          {this.renderItem(this.duplicatePage, 'copy1', gettext('Duplicate page'))}
          {canDeletePage && this.renderItem(this.onDeletePage, 'delete1', gettext('Delete page'))}
          <Dropdown
            direction="right"
            className="w-100"
            inNavbar={true}
            isOpen={this.state.isImportPageMenuShown}
            toggle={() => {}}
            onMouseEnter={this.showImportPageMenu}
            onMouseLeave={this.hideImportPageMenu}
          >
            <DropdownToggle
              tag="span"
              className="dropdown-item font-weight-normal rounded-0 d-flex align-items-center pr-2 justify-content-between"
              onMouseEnter={this.showImportPageMenu}
            >
              <span className="d-flex align-items-center">
                <Icon symbol="import-sdoc" className="mr-2" aria-hidden="true" />
                <span>{gettext('Import page')}</span>
              </span>
              <Icon symbol="down" className="rotate-270 mr-2" aria-hidden="true" />
            </DropdownToggle>
            <DropdownMenu className="ml-0">
              <DropdownItem key="import-docx" onClick={this.importPage.bind(this, '.docx')}>{gettext('Import page from docx')}</DropdownItem>
              <DropdownItem key="import-md" onClick={this.importPage.bind(this, '.md')}>{gettext('Import page from Markdown')}</DropdownItem>
            </DropdownMenu>
          </Dropdown>
          <hr className='divider' />
          {this.renderItem(this.handleOpenInNewTab, 'open-in-new-tab', gettext('Open in new tab'))}
        </DropdownMenu>
      </Dropdown>
    );
  }
}
