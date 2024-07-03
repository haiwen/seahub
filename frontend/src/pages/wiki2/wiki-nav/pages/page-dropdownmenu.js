import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import toaster from '../../../../components/toast';
import { gettext } from '../../../../utils/constants';
import { getWikPageLink } from '../../utils';

export default class PageDropdownMenu extends Component {

  static propTypes = {
    page: PropTypes.object.isRequired,
    pages: PropTypes.array,
    pagesLength: PropTypes.number,
    toggle: PropTypes.func,
    toggleNameEditor: PropTypes.func,
    duplicatePage: PropTypes.func,
    onDeletePage: PropTypes.func,
    isOnlyOnePage: PropTypes.bool,
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

  duplicatePage = () => {
    const { page } = this.props;
    this.props.duplicatePage({ from_page_id: page.id }, () => {}, this.duplicatePageFailure);
  };

  duplicatePageFailure = () => {
    toaster.danger(gettext('Failed_to_duplicate_page'));
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
    const { pagesLength, isOnlyOnePage } = this.props;

    return (
      <Dropdown
        isOpen={true}
        toggle={this.onDropdownToggle}
        className="page-operation-dropdown"
      >
        <DropdownToggle className="page-operation-dropdown-toggle" tag="span" data-toggle="dropdown"></DropdownToggle>
        <DropdownMenu
          className="page-operation-dropdown-menu dtable-dropdown-menu large"
          flip={false}
          modifiers={{ preventOverflow: { boundariesElement: document.body } }}
          positionFixed={true}
        >
          <DropdownItem onClick={this.handleCopyLink}>
            <i className="sf3-font sf3-font-link" />
            <span className="item-text">{gettext('Copy link')}</span>
          </DropdownItem>
          <DropdownItem onClick={this.onRename}>
            <i className="sf3-font sf3-font-rename" />
            <span className="item-text">{gettext('Modify name')}</span>
          </DropdownItem>
          <DropdownItem onClick={this.duplicatePage}>
            <i className="sf3-font sf3-font-copy1" />
            <span className="item-text">{gettext('Duplicate page')}</span>
          </DropdownItem>
          {(isOnlyOnePage || pagesLength === 1) ? '' : (
            <DropdownItem onClick={this.onDeletePage}>
              <i className="sf3-font sf3-font-delete1" />
              <span className="item-text">{gettext('Delete page')}</span>
            </DropdownItem>
          )}
          < hr className='divider' />
          <DropdownItem onClick={this.handleOpenInNewTab}>
            <i className='sf3-font sf3-font-open-in-new-tab' />
            <span className="item-text">{gettext('Open in new tab')}</span>
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    );
  }
}
