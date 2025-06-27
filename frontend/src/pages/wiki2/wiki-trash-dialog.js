import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalHeader } from 'reactstrap';
import dayjs from 'dayjs';
import { Utils, isMobile } from '../../utils/utils';
import { gettext, wikiId } from '../../utils/constants';
import wikiAPI from '../../utils/wiki-api';
import ModalPortal from '../../components/modal-portal';
import toaster from '../../components/toast';
import Paginator from '../../components/paginator';
import WikiCleanTrash from '../../components/dialog/wiki-clean-trash';
import NavItemIcon from './common/nav-item-icon';

import '../../css/toolbar.css';
import '../../css/search.css';
import '../../css/wiki-trash-dialog.css';

const propTypes = {
  showTrashDialog: PropTypes.bool.isRequired,
  toggleTrashDialog: PropTypes.func.isRequired,
  getWikiConfig: PropTypes.func.isRequired
};

class WikiTrashDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errorMsg: '',
      items: [],
      isCleanTrashDialogOpen: false,
      currentPage: 1,
      perPage: 100,
      hasNextPage: false
    };
  }

  componentDidMount() {
    this.getItems();
  }

  getItems = (page) => {
    wikiAPI.getWikiTrash(wikiId, page, this.state.perPage).then((res) => {
      const { items, total_count } = res.data;
      if (!page) {
        page = 1;
      }
      this.setState({
        currentPage: page,
        hasNextPage: total_count - page * this.state.perPage > 0,
        isLoading: false,
        items: items,
      });
    });
  };

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
    }, () => {
      this.getItems(1);
    });
  };

  cleanTrash = () => {
    this.toggleCleanTrashDialog();
  };

  toggleCleanTrashDialog = () => {
    this.setState({
      isCleanTrashDialogOpen: !this.state.isCleanTrashDialogOpen
    });
  };

  refreshTrash = () => {
    this.setState({
      isLoading: true,
      errorMsg: '',
      items: []
    });
    this.getItems();
  };

  render() {
    const { showTrashDialog, toggleTrashDialog } = this.props;
    const { isCleanTrashDialogOpen } = this.state;
    const { isAdmin, enableUserCleanTrash, repoName } = window.wiki.config;
    let title = gettext('{placeholder} Wiki Trash');
    title = title.replace('{placeholder}', '<span class="op-target text-truncate mx-1">' + Utils.HTMLescape(repoName) + '</span>');
    return (
      <Modal className="trash-dialog" isOpen={showTrashDialog} toggle={toggleTrashDialog}>
        <ModalHeader
          close={
            <>
              <div className="button-control d-flex">
                {(isAdmin && enableUserCleanTrash) &&
                  <button className="btn btn-secondary clean" onClick={this.cleanTrash}>{gettext('Clean')}</button>
                }
                <button type="button" className="close seahub-modal-btn" aria-label={gettext('Close')} title={gettext('Close')} onClick={toggleTrashDialog}>
                  <span className="seahub-modal-btn-inner">
                    <i className="sf3-font sf3-font-x-01" aria-hidden="true"></i>
                  </span>
                </button>
              </div>
            </>
          }
        >
          <div dangerouslySetInnerHTML={{ __html: title }}></div>
        </ModalHeader>
        <ModalBody>
          <Content
            data={this.state}
            currentPage={this.state.currentPage}
            curPerPage={this.state.perPage}
            hasNextPage={this.state.hasNextPage}
            getListByPage={this.getItems}
            resetPerPage={this.resetPerPage}
            getWikiConfig={this.props.getWikiConfig}
          />
          {isCleanTrashDialogOpen &&
          <ModalPortal>
            <WikiCleanTrash
              wikiId={wikiId}
              refreshTrash={this.refreshTrash}
              toggleDialog={this.toggleCleanTrashDialog}
            />
          </ModalPortal>
          }
        </ModalBody>
      </Modal>
    );
  }
}

class Content extends React.Component {

  constructor(props) {
    super(props);
    if (isMobile) {
      this.theadData = [
        { width: '30%', text: gettext('Name') },
        { width: '20%', text: gettext('Size') },
        { width: '30%', text: gettext('Delete Time') },
        { width: '20%', text: '' }
      ];
    } else {
      this.theadData = [
        { width: '5%', text: gettext('Name') },
        { width: '20%', text: '' },
        { width: '30%', text: gettext('Size') },
        { width: '35%', text: gettext('Delete Time') },
        { width: '10%', text: '' }
      ];
    }
  }

  getPreviousPage = () => {
    this.props.getListByPage(this.props.currentPage - 1);
  };

  getNextPage = () => {
    this.props.getListByPage(this.props.currentPage + 1);
  };

  render() {
    const { items } = this.props.data;
    const { curPerPage, currentPage, hasNextPage } = this.props;
    return (
      <React.Fragment>
        <table className="table-hover">
          <thead>
            <tr>
              {this.theadData.map((item, index) => {
                return <th key={index} className={index === 0 ? 'pl-3' : ''} width={item.width}>{item.text}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              return (
                <Item
                  key={index}
                  item={item}
                  getWikiConfig={this.props.getWikiConfig}
                />
              );
            })}
          </tbody>
        </table>
        <Paginator
          gotoPreviousPage={this.getPreviousPage}
          gotoNextPage={this.getNextPage}
          currentPage={currentPage}
          hasNextPage={hasNextPage}
          curPerPage={curPerPage}
          resetPerPage={this.props.resetPerPage}
          noURLUpdate={true}
        />
      </React.Fragment>
    );
  }
}

Content.propTypes = {
  data: PropTypes.object.isRequired,
  getListByPage: PropTypes.func.isRequired,
  resetPerPage: PropTypes.func.isRequired,
  currentPage: PropTypes.number.isRequired,
  curPerPage: PropTypes.number.isRequired,
  hasNextPage: PropTypes.bool.isRequired,
  getWikiConfig: PropTypes.func.isRequired

};

class Item extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      restored: false,
      isIconShown: false,
      getWikiConfig: PropTypes.func.isRequired
    };
  }

  handleMouseOver = () => {
    this.setState({ isIconShown: true });
  };

  handleMouseOut = () => {
    this.setState({ isIconShown: false });
  };

  restoreItem = (e) => {
    e.preventDefault();
    const item = this.props.item;
    wikiAPI.revertTrashPage(wikiId, item.page_id).then(res => {
      this.setState({
        restored: true
      });
      this.props.getWikiConfig();
      toaster.closeAll();
      toaster.success(gettext('Restored 1 item'));
    }).catch((error) => {
      let errorMsg = '';
      if (error.response) {
        errorMsg = error.response.data.error_msg || gettext('Error');
      } else {
        errorMsg = gettext('Please check the network.');
      }
      toaster.danger(errorMsg);
    });
  };

  render() {
    const item = this.props.item;
    const { restored, isIconShown } = this.state;
    if (restored) {
      return null;
    }
    const { isAdmin } = window.wiki.config;
    if (isMobile) {
      return (
        <tr>
          <td>{item.name}</td>
          <td>{Utils.bytesToSize(item.size)}</td>
          <td title={dayjs(item.deleted_time).format('dddd, MMMM D, YYYY h:mm:ss A')}>{dayjs(item.deleted_time).format('YYYY-MM-DD')}</td>
          <td>{isAdmin && <a href="#" onClick={this.restoreItem} role="button">{gettext('Restore')}</a>}</td>
        </tr>
      );
    }
    return (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut} onFocus={this.handleMouseOver}>
        <td><NavItemIcon symbol={'file'} disable={true} /></td>
        <td>{item.name}</td>
        <td>{Utils.bytesToSize(item.size)}</td>
        <td title={dayjs(item.deleted_time).format('dddd, MMMM D, YYYY h:mm:ss A')}>{dayjs(item.deleted_time).format('YYYY-MM-DD')}</td>
        <td>
          {isAdmin &&
            <a href="#" className={isIconShown ? '' : 'invisible'} onClick={this.restoreItem} role="button">{gettext('Restore')}</a>
          }
        </td>
      </tr>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired
};


WikiTrashDialog.propTypes = propTypes;

export default WikiTrashDialog;
