import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import toaster from '../../../../components/toast';
import { gettext } from '../../../../utils/constants';
import { getWikPageLink } from '../../utils';
import { INSERT_POSITION } from '../constants';

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
  }

  calculateNameMap = () => {
    const { pages } = this.props;
    return pages.reduce((map, page) => {
      map[page.name] = true;
      return map;
    }, {});
  };

  onDropdownToggle = (evt) => {
    evt.stopPropagation();
    this.props.toggle();
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

  importPage = () => {
    const { page } = this.props;
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.sdoczip,.docx,.md';
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

  render() {
    const { canDeletePage = true } = this.props;
    return (
      <Dropdown
        isOpen={true}
        toggle={this.onDropdownToggle}
        className="page-operation-dropdown"
      >
        <DropdownToggle className="page-operation-dropdown-toggle" tag="span" data-toggle="dropdown"></DropdownToggle>
        <DropdownMenu
          className="page-operation-dropdown-menu dtable-dropdown-menu large position-fixed"
          flip={false}
          modifiers={[{ name: 'preventOverflow', options: { boundary: document.body } }]}
        >
          <DropdownItem onClick={this.handleCopyLink}>
            <i className="sf3-font sf3-font-link" aria-hidden="true" />
            <span className="item-text">{gettext('Copy link')}</span>
          </DropdownItem>
          <DropdownItem onClick={this.onRename}>
            <i className="sf3-font sf3-font-rename" aria-hidden="true" />
            <span className="item-text">{gettext('Modify name')}</span>
          </DropdownItem>
          <DropdownItem onClick={this.addPageAbove}>
            <i className="sf3-font sf3-font-enlarge" aria-hidden="true" />
            <span className="item-text">{gettext('Add page above')}</span>
          </DropdownItem>
          <DropdownItem onClick={this.addPageBelow}>
            <i className="sf3-font sf3-font-enlarge" aria-hidden="true" />
            <span className="item-text">{gettext('Add page below')}</span>
          </DropdownItem>
          <DropdownItem onClick={this.duplicatePage}>
            <i className="sf3-font sf3-font-copy1" aria-hidden="true" />
            <span className="item-text">{gettext('Duplicate page')}</span>
          </DropdownItem>
          {canDeletePage && (
            <DropdownItem onClick={this.onDeletePage}>
              <i className="sf3-font sf3-font-delete1" aria-hidden="true" />
              <span className="item-text">{gettext('Delete page')}</span>
            </DropdownItem>
          )}
          <DropdownItem onClick={this.importPage}>
            <i className="sf3-font sf3-font-import-sdoc" aria-hidden="true" />
            <span className="item-text">{gettext('Import page')}</span>
          </DropdownItem>
          <hr className='divider' />
          <DropdownItem onClick={this.handleOpenInNewTab}>
            <i className='sf3-font sf3-font-open-in-new-tab' aria-hidden="true" />
            <span className="item-text">{gettext('Open in new tab')}</span>
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    );
  }
}
