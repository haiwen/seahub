import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../components/constance';
import Loading from '../../components/loading';
import Account from '../../components/account';
import { seafileAPI } from '../../utils/editor-utilties';
import Notification from '../../components/notification';
import ListView from '../../components/list-view/list-view';
import ListMenu from '../../components/list-view/list-menu';

const propTypes = {
  draftList: PropTypes.array.isRequired,
};

class MainPanel extends React.Component {
  
  constructor(props) {
    super(props);
    this.state = {
      isMenuShow: false,
      menuPosition: {top:'', left: ''},
      currentDraft: null,
      isItemFreezed: false, 
    };
  }

  componentDidMount() {
    document.addEventListener('click', this.onHideContextMenu);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.onHideContextMenu);
  }

  onMenuToggleClick = (e, draft) => {
    if (this.state.isMenuShow) {
      this.onHideContextMenu();
    } else {
      this.onShowContextMenu(e, draft);
    }
  }

  onShowContextMenu = (e, draft) => {
    let left = e.clientX - 8*16;
    let top  = e.clientY + 10;
    let position = {top: top, left: left};
    this.setState({
      isMenuShow: true,
      menuPosition: position,
      currentDraft: draft,
      isItemFreezed: true
    });
  }

  onHideContextMenu = () => {
    this.setState({
      isMenuShow: false,
      currentDraft: null,
      isItemFreezed: false
    });
  }

  onPublishHandler = () => {
    this.props.publishDraft(this.state.currentDraft);
  }

  onDeleteHandler = () => {
    this.props.deleteDraft(this.state.currentDraft);
  }
  
  render() {
    return (
      <div className="main-panel">
        <div className="main-panel-north flex-right">
          <Notification seafileAPI={seafileAPI}/>
          <Account />
        </div>
        <div className="main-panel-center">
          <div className="panel-heading text-left">{gettext('Drafts')}</div>
          {this.props.isLoadingDraft ?
            <Loading /> :
            <div className="table-container">
              {this.props.draftList.length ? 
                <ListView
                  draftList={this.props.draftList} 
                  isItemFreezed={this.state.isItemFreezed}
                  onMenuToggleClick={this.onMenuToggleClick}
                /> :
                <div className="message empty-tip">
                  <h2>{gettext('There is no draft file existing')}</h2>
                </div>
              }
            </div>
          }
          {
            this.state.isMenuShow && 
            <ListMenu 
              isMenuShow={this.state.isMenuShow} 
              currentDraft={this.state.currentDraft} 
              menuPosition={this.state.menuPosition} 
              onPublishHandler={this.onPublishHandler}
              onDeleteHandler={this.onDeleteHandler}
            />
          }
        </div>
      </div>
    );
  }
}

MainPanel.propTypes = propTypes;

export default MainPanel;
