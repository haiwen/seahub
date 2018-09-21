import React from 'react';
import { gettext } from '../../components/constants';
import editUtilties from '../../utils/editor-utilties';
import Loading from '../../components/loading';
import ListView from '../../components/list-view/list-view';
import ListMenu from '../../components/list-view/list-menu';

class DraftsView extends React.Component {
  
  constructor(props) {
    super(props);
    this.state = {
      draftList: [],
      isLoadingDraft: true,
      isMenuShow: false,
      menuPosition: {top:'', left: ''},
      currentDraft: null,
      isItemFreezed: false, 
    };
  }

  componentDidMount() {
    this.initDraftList();
    document.addEventListener('click', this.onHideContextMenu);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.onHideContextMenu);
  }

  initDraftList() {
    this.setState({isLoadingDraft: true});
    editUtilties.listDrafts().then(res => {
      this.setState({
        draftList: res.data.data,
        isLoadingDraft: false,
      });
    });
  }

  onDeleteHandler = () => {
    let draft = this.state.currentDraft;
    editUtilties.deleteDraft(draft.id).then(res => {
      this.initDraftList();
    });
  }

  onPublishHandler = () => {
    let draft = this.state.currentDraft;
    editUtilties.publishDraft(draft.id).then(res => {
      this.initDraftList();
    });
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
  
  render() {
    return (
      <div className="cur-view-container">
        <div className="cur-view-path panel-heading text-left">{gettext('Drafts')}</div>
        <div className="cur-view-content" style={{padding: 0}}>
          {this.state.isLoadingDraft && <Loading /> }
          {(!this.state.isLoadingDraft && this.state.draftList.length !==0) &&
            <ListView
              draftList={this.state.draftList} 
              isItemFreezed={this.state.isItemFreezed}
              onMenuToggleClick={this.onMenuToggleClick}
            />
          }
          {(!this.state.isLoadingDraft && this.state.draftList.length === 0) &&
            <div className="message empty-tip">
              <h2>{gettext('There is no draft file existing')}</h2>
            </div>
          }
          {this.state.isMenuShow && 
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

export default DraftsView;