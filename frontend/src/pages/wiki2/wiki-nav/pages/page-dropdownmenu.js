import React, { Component } from 'react';
import PropTypes from 'prop-types';
import toaster from '../../../../components/toast';
import { gettext } from '../../../../utils/constants';
import { getWikPageLink } from '../../utils';
import { INSERT_POSITION } from '../constants';
import Icon from '../../../../components/icon';
import CustomDropdown from '../../../../components/dropdown';

const { serviceURL: serviceUrl } = window.app.config;

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
    freezeItem: PropTypes.func,
    unfreezeItem: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.pageNameMap = this.calculateNameMap();
    this.state = {};
  }

  calculateNameMap = () => {
    const { pages } = this.props;
    return pages.reduce((map, page) => {
      map[page.name] = true;
      return map;
    }, {});
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
    this.props.duplicatePage({ from_page_id: page.id }, () => { }, this.duplicatePageFailure);
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
          () => { },
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
    const { href: url } = window.location;
    const wikiLink = getWikPageLink(serviceUrl, url, page.id);
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
    const { href: url } = window.location;
    const wikiLink = getWikPageLink(serviceUrl, url, page.id);
    window.open(wikiLink);
  };

  render() {
    const { canDeletePage = true } = this.props;
    const menuItems = [
      {
        key: 'copy-link',
        label: gettext('Copy link'),
        icon_dom: <Icon symbol="copy" className="mr-2" aria-hidden="true" />,
        onClick: this.handleCopyLink,
      },
      {
        key: 'rename',
        label: gettext('Modify name'),
        icon_dom: <Icon symbol="rename" className="mr-2" aria-hidden="true" />,
        onClick: this.onRename,
      },
      {
        key: 'add-page-above',
        label: gettext('Add page above'),
        icon_dom: <Icon symbol="new" className="mr-2" aria-hidden="true" />,
        onClick: this.addPageAbove,
      },
      {
        key: 'add-page-below',
        label: gettext('Add page below'),
        icon_dom: <Icon symbol="new" className="mr-2" aria-hidden="true" />,
        onClick: this.addPageBelow,
      },
      {
        key: 'duplicate-page',
        label: gettext('Duplicate page'),
        icon_dom: <Icon symbol="copy" className="mr-2" aria-hidden="true" />,
        onClick: this.duplicatePage,
      },
      ...(canDeletePage ? [{
        key: 'delete-page',
        label: gettext('Delete page'),
        icon_dom: <Icon symbol="delete1" className="mr-2" aria-hidden="true" />,
        onClick: this.onDeletePage,
      }] : []),
      {
        key: 'import-page',
        label: gettext('Import page'),
        icon_dom: <Icon symbol="import-sdoc" className="mr-2" aria-hidden="true" />,
        children: [
          { key: 'import-docx', label: gettext('Import page from docx'), onClick: () => this.importPage('.docx') },
          { key: 'import-md', label: gettext('Import page from Markdown'), onClick: () => this.importPage('.md') },
        ],
      },
      'Divider',
      {
        key: 'open-in-new-tab',
        label: gettext('Open in new tab'),
        icon_dom: <Icon symbol="open-in-new-tab" className="mr-2" aria-hidden="true" />,
        onClick: this.handleOpenInNewTab,
      },
    ];

    return (
      <CustomDropdown
        target="wiki-nav-item-more-operations"
        items={menuItems}
        className="page-operation-dropdown"
        triggerClassName="op-icon"
        menuClassName="page-operation-dropdown-menu dtable-dropdown-menu large position-fixed"
        modifier={[
          { name: 'preventOverflow', options: { boundary: 'window', padding: 8 } },
          { name: 'flip', enabled: true, options: { fallbackPlacements: ['top'] } },
        ]}
        freezeItem={this.props.freezeItem}
        unfreezeItem={this.props.unfreezeItem}
      />
    );
  }
}
