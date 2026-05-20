import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import PageItem from './pages/page-item';
import PageDragLayer from './pages/page-drag-layer';
import { gettext, wikiPermission, enableMetadataManagement } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import toaster from '../../../components/toast';
import Icon from '../../../components/icon';
import OpIcon from '../../../components/op-icon';
import CustomDropdown from '../../../components/dropdown';

import '../css/wiki-nav.css';

class WikiNav extends Component {

  static propTypes = {
    navigation: PropTypes.array,
    pages: PropTypes.array,
    setCurrentPage: PropTypes.func,
    onUpdatePageName: PropTypes.func,
    onDeletePage: PropTypes.func,
    onMovePage: PropTypes.func,
    duplicatePage: PropTypes.func,
    importPage: PropTypes.func,
    addSiblingPage: PropTypes.func,
    getCurrentPageId: PropTypes.func,
    addPageInside: PropTypes.func,
    updateWikiConfig: PropTypes.func.isRequired,
    toggleTrashDialog: PropTypes.func.isRequired,
    handleAddNewPage: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      idFoldedStatusMap: {}, // Move idFoldedStatusMap to state
      isHeaderHovered: false,
      isDropdownOpen: false,
    };
    this.folderClassNameCache = '';
    this.lastScrollTop = 0;
    this.wikiNavBodyRef = React.createRef();
    // Initialize pages as folded
    const idFoldedStatusMap = {};
    props.pages.forEach((page) => {
      idFoldedStatusMap[page.id] = true;
    });
    this.state.idFoldedStatusMap = idFoldedStatusMap;
  }

  getFoldState = (pageId) => {
    return this.state.idFoldedStatusMap[pageId];
  };

  toggleExpand = (pageId) => {
    this.setState((prevState) => {
      const idFoldedStatusMap = { ...prevState.idFoldedStatusMap };
      if (idFoldedStatusMap[pageId]) {
        delete idFoldedStatusMap[pageId];
      } else {
        idFoldedStatusMap[pageId] = true;
      }
      return { idFoldedStatusMap };
    });
  };

  handleHeaderMouseEnter = () => {
    this.setState({ isHeaderHovered: true });
  };

  handleHeaderMouseLeave = () => {
    if (!this.state.isDropdownOpen) {
      this.setState({ isHeaderHovered: false });
    }
  };

  handleDropdownOpen = () => {
    this.setState({ isHeaderHovered: true, isDropdownOpen: true });
  };

  handleDropdownClose = () => {
    this.setState({ isDropdownOpen: false, isHeaderHovered: false });
  };

  handleImportPage = (suffix) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = suffix;
    fileInput.style.display = 'none';

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const selectedFile = e.target.files[0];
        this.props.importPage(
          { file: selectedFile },
          () => { },
          () => {
            toaster.danger(gettext('Failed to import page'));
          }
        );
      }
    });
    document.body.appendChild(fileInput);
    fileInput.click();
  };

  componentDidUpdate(prevProps) {
    if (prevProps.navigation !== this.props.navigation) {
      this.wikiNavBodyRef.current.scrollTop = this.lastScrollTop;
    }
  }

  onWikiNavBodyScroll = (e) => {
    this.lastScrollTop = e.target.scrollTop;
  };

  setClassName = (name) => {
    this.folderClassNameCache = name;
  };

  getClassName = () => {
    return this.folderClassNameCache;
  };

  renderPage = (page, index, canDeletePage, id_page_map) => {
    const { pages } = this.props;
    const id = page.id;
    if (!pages.find(item => item.id === id)) return;
    return (
      <PageItem
        key={id}
        canDeletePage={canDeletePage}
        page={Object.assign({}, pages.find(item => item.id === id), page)}
        pages={pages}
        pageIndex={index}
        duplicatePage={this.props.duplicatePage}
        importPage={this.props.importPage}
        setCurrentPage={this.props.setCurrentPage}
        onUpdatePageName={this.props.onUpdatePageName}
        onDeletePage={this.props.onDeletePage}
        onMovePage={this.props.onMovePage}
        updateWikiConfig={this.props.updateWikiConfig}
        pathStr={page.id}
        getCurrentPageId={this.props.getCurrentPageId}
        addPageInside={this.props.addPageInside}
        addSiblingPage={this.props.addSiblingPage}
        idFoldedStatusMap={this.idFoldedStatusMap}
        getFoldState={this.getFoldState}
        toggleExpand={this.toggleExpand}
        id_page_map={id_page_map}
        setClassName={this.setClassName}
        getClassName={this.getClassName}
      />
    );
  };

  // eslint-disable-next-line
  renderStructureBody = () => {
    const { isHeaderHovered, isDropdownOpen } = this.state;
    const { navigation, pages } = this.props;
    const pagesLen = pages.length;
    const canDeletePage = navigation.length > 1;
    let id_page_map = {};
    pages.forEach(page => id_page_map[page.id] = page);
    const isDesktop = Utils.isDesktop();
    const pageOperationItems = [{
      key: 'import-page',
      label: gettext('Import page'),
      icon_dom: <Icon symbol="import-sdoc" className="mr-2" aria-hidden="true" />,
      children: [
        { key: 'import-docx', label: gettext('Import page from docx'), onClick: () => this.handleImportPage('.docx') },
        { key: 'import-md', label: gettext('Import page from Markdown'), onClick: () => this.handleImportPage('.md') },
      ],
    }];
    return (
      <div className="wiki-nav-body" onScroll={this.onWikiNavBodyScroll} ref={this.wikiNavBodyRef}>
        <div
          className="wiki-nav-group-header wiki-nav-pages px-2"
          role="region"
          aria-label={gettext('Pages')}
          tabIndex={0}
          onMouseEnter={this.handleHeaderMouseEnter}
          onMouseLeave={this.handleHeaderMouseLeave}
          onFocus={this.handleHeaderMouseEnter}
        >
          <h2 className="h6 font-weight-normal m-0">{gettext('Pages')}</h2>
          {isDesktop && wikiPermission === 'rw' &&
            <div className='d-none d-md-flex'>
              <CustomDropdown
                target="wiki-nav-more-operations"
                items={pageOperationItems}
                className="page-operation-dropdown"
                triggerClassName={classNames('op-icon', { 'invisible': !isHeaderHovered && !isDropdownOpen })}
                menuClassName="page-operation-dropdown-menu dtable-dropdown-menu large position-fixed"
                freezeItem={this.handleDropdownOpen}
                unfreezeItem={this.handleDropdownClose}
              />
              <OpIcon
                id="new-wiki-page-btn"
                className="op-icon mr-0"
                tooltip={gettext('New page')}
                op={this.props.handleAddNewPage}
                symbol="new"
              />
            </div>
          }
        </div>
        {navigation.map((item, index) => {
          return this.renderPage(item, index, canDeletePage, id_page_map);
        })}
        {wikiPermission === 'rw' &&
          <>
            <div className="wiki-nav-group-header px-2">
              <h2 className="h6 font-weight-normal m-0">{gettext('Other')}</h2>
            </div>
            {enableMetadataManagement && (
              <div role='button' tabIndex={0} className={classNames('other-op wiki2-set-up', { 'mt-0': !pagesLen })} onClick={this.props.toggleSettingDialog}>
                <span className="d-flex align-items-center mr-2"><Icon symbol="set-up" /></span>
                <span className="other-op-label">{gettext('Settings')}</span>
              </div>
            )}
            <div role='button' tabIndex={1} className={classNames('other-op wiki2-trash', { 'mt-0': !pagesLen })} onClick={this.props.toggleTrashDialog}>
              <span className="d-flex align-items-center mr-2"><Icon symbol="trash" /></span>
              <span className="other-op-label">{gettext('Trash')}</span>
            </div>
          </>
        }
      </div>
    );
  };

  render() {
    return (
      <DndProvider backend={HTML5Backend}>
        <div className='wiki-nav'>
          {this.renderStructureBody()}
        </div>
        <PageDragLayer
          pages={this.props.pages}
          getFoldState={this.getFoldState}
        />
      </DndProvider>
    );
  }
}

export default WikiNav;
