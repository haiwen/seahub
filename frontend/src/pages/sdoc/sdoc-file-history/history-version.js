import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem, Modal, ModalBody } from 'reactstrap';
import classnames from 'classnames';
import { gettext, filePath } from '../../../utils/constants';
import URLDecorator from '../../../utils/url-decorator';
import Rename from '../../../components/rename';
import { isMobile } from '../../../utils/utils';

import '../../../css/history-record-item.css';

dayjs.locale(window.app.config.lang);

class HistoryVersion extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowOperationIcon: false,
      isMenuShow: false,
      isRenameShow: false,
    };
    this.isMobile = isMobile;
  }

  onMouseEnter = () => {
    const { currentVersion, historyVersion } = this.props;
    if (currentVersion.commit_id === historyVersion.commit_id) return;
    this.setState({ isShowOperationIcon: true });
  };

  onMouseLeave = () => {
    const { currentVersion, historyVersion } = this.props;
    if (currentVersion.commit_id === historyVersion.commit_id) return;
    this.setState({ isShowOperationIcon: false });
  };

  onToggleClick = (e) => {
    this.setState({ isMenuShow: !this.state.isMenuShow });
  };

  onClick = () => {
    this.setState({ isShowOperationIcon: false });
    const { currentVersion, historyVersion, path } = this.props;
    if (currentVersion.commit_id === historyVersion.commit_id) return;
    this.props.onSelectHistoryVersion(path);
  };

  onRestore = () => {
    const { historyVersion } = this.props;
    this.props.onRestore(historyVersion);
  };

  onItemCopy = () => {
    const { historyVersion } = this.props;
    historyVersion.ctime_format = dayjs(historyVersion.ctime).format('YYYY-MM-DD HH:mm');
    this.props.onCopy(historyVersion);
  };

  toggleRename = () => {
    this.isMobile && this.setState({ isMenuShow: false });
    this.setState({ isRenameShow: !this.state.isRenameShow });
  };

  onRenameConfirm = (newName) => {
    const { obj_id } = this.props.historyVersion;
    this.props.renameHistoryVersion(obj_id, newName);
    this.toggleRename();
  };

  onRenameCancel = () => {
    this.toggleRename();
  };

  showDailyHistory = (event) => {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    const { path } = this.props;
    this.props.showDailyHistory(path, () => {
      this.props.onSelectHistoryVersion(path);
    });
  };

  render() {
    const { currentVersion, historyVersion, path, showDaily } = this.props;
    if (!currentVersion || !historyVersion) return null;
    const { ctime, commit_id, creator_name, obj_id, name, count } = historyVersion;
    const isHighlightItem = commit_id === currentVersion.commit_id;
    const url = URLDecorator.getUrl({ type: 'download_historic_file', filePath: filePath, objID: obj_id });
    return (
      <li
        className={`history-list-item ${isHighlightItem ? 'item-active' : ''} ${path[2] > 0 ? 'daily-history-detail' : ''}`}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        onClick={this.onClick}
      >
        {path[2] === 0 && (
          <div className="daily-history-detail-toggle-container">
            {count > 1 && (
              <div className={classnames('daily-history-detail-toggle', { 'daily-history-detail-show': showDaily })} onClick={this.showDailyHistory}>
                <i className="direction-icon sf3-font sf3-font-down"></i>
              </div>
            )}
          </div>
        )}
        {path[2] > 0 && (<div className="daily-history-detail-no-more"></div>)}
        <div className="history-info">
          {this.state.isRenameShow ?
            <Rename name={name} onRenameConfirm={this.onRenameConfirm} onRenameCancel={this.onRenameCancel}/>
            : <div className="name">{name}</div>
          }
          <div className="time">{dayjs(ctime).format('YYYY-MM-DD HH:mm')}</div>
          <div className="owner">
            <span className="squire-icon"></span>
            <span>{creator_name}</span>
          </div>
        </div>
        <div className="history-operation">
          {this.isMobile ?
            <>
              <a
                className={`sf3-font sf3-font-more ${(this.state.isShowOperationIcon || isHighlightItem) ? '' : 'invisible'}`}
                title={gettext('More operations')}
                aria-label={gettext('More operations')}
                aria-expanded={this.state.isMenuShow}
                onClick={this.onToggleClick}
              />
              <Modal
                className='sdoc-mobile-history-options-modal'
                isOpen={this.state.isMenuShow}
                toggle={this.onToggleClick}
              >
                <ModalBody className='sdoc-operation-mobile-modal-body'>
                  <div className='option-item'>
                    <i className='mr-3 sf3-font sf3-font-download1'></i>
                    <a href={url} onClick={this.onItemDownLoad}>{gettext('Download')}</a>
                  </div>
                  {(path[0] !== 0 && path[1] !== 0 && path[2] !== 0) && (
                    <div className='option-item'>
                      <i className='mr-3 sf3-font sf3-font-copy1'></i>
                      <span href={url} onClick={this.onItemCopy}>{gettext('Copy')}</span>
                    </div>
                  )}
                  <div className='option-item' onClick={this.toggleRename}>
                    <i className='mr-3 sf3-font sf3-font-rename'></i>
                    <span>{gettext('Rename')}</span>
                  </div>
                </ModalBody>
              </Modal>
            </>
            :
            <Dropdown isOpen={this.state.isMenuShow} toggle={this.onToggleClick}>
              <DropdownToggle
                tag='a'
                className={`sf3-font sf3-font-more ${(this.state.isShowOperationIcon || isHighlightItem) ? '' : 'invisible'}`}
                data-toggle="dropdown"
                aria-expanded={this.state.isMenuShow}
                title={gettext('More operations')}
                aria-label={gettext('More operations')}
              />
              <DropdownMenu>
                {(path[0] + path[1] + path[2] !== 0) && <DropdownItem onClick={this.onRestore}>{gettext('Restore')}</DropdownItem>}
                <DropdownItem tag='a' href={url} onClick={this.onItemDownLoad}>{gettext('Download')}</DropdownItem>
                {(path[0] !== 0 && path[1] !== 0 && path[2] !== 0) && <DropdownItem onClick={this.onItemCopy}>{gettext('Copy')}</DropdownItem>}
                <DropdownItem onClick={this.toggleRename}>{gettext('Rename')}</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          }
        </div>
      </li>
    );
  }
}

HistoryVersion.propTypes = {
  showDaily: PropTypes.bool,
  path: PropTypes.array,
  currentVersion: PropTypes.object.isRequired,
  historyVersion: PropTypes.object,
  onSelectHistoryVersion: PropTypes.func.isRequired,
  onRestore: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
  renameHistoryVersion: PropTypes.func.isRequired,
  showDailyHistory: PropTypes.func.isRequired,
};

export default HistoryVersion;
