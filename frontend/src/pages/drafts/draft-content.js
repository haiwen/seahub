import React from 'react';
import { siteRoot, gettext } from '../../utils/constants';
import editUtilties from '../../utils/editor-utilties';
import Toast from '../../components/toast';
import Loading from '../../components/loading';
import DraftListView from '../../components/draft-list-view/draft-list-view';
import DraftListMenu from '../../components/draft-list-view/draft-list-menu';


class DraftContent extends React.Component {
  
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
      Toast.success('Delete draft succeeded.');
    }).catch(() => {
      Toast.error('Delete draft failed.');
    });
  }

  onPublishHandler = () => {
    let draft = this.state.currentDraft;
    editUtilties.publishDraft(draft.id).then(res => {
      this.initDraftList();
      Toast.success('Publish draft succeeded.');
    }).catch(() => {
      Toast.error('Publish draft failed.');
    });
  }

  onReviewHandler = () => {
    let draft = this.state.currentDraft;

    editUtilties.createDraftReview(draft.id).then(res => {
      window.open(siteRoot + 'drafts/review/' + res.data.id);
    })
    .catch((error) => { 
      if (error.response.status == '409') {
        Toast.error("The draft review is existing.");
      }    
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
      <div className="cur-view-content" style={{padding: 0}}>
        {this.state.isLoadingDraft && <Loading /> }
        {(!this.state.isLoadingDraft && this.state.draftList.length !==0) &&
          <DraftListView
            draftList={this.state.draftList} 
            isItemFreezed={this.state.isItemFreezed}
            onMenuToggleClick={this.onMenuToggleClick}
          />
        }
        {(!this.state.isLoadingDraft && this.state.draftList.length === 0) &&
          <div className="message empty-tip">
            <h2>{gettext('No draft yet')}</h2>
            <p>{gettext('Draft is a way to let you collaborate with others on files. You can create a draft from a file, edit the draft and then ask for a review. The original file will be updated only after the draft be reviewed.')}</p>
          </div>
        }
        {this.state.isMenuShow &&
          <DraftListMenu 
            isMenuShow={this.state.isMenuShow} 
            currentDraft={this.state.currentDraft} 
            menuPosition={this.state.menuPosition} 
            onPublishHandler={this.onPublishHandler}
            onDeleteHandler={this.onDeleteHandler}
            onReviewHandler={this.onReviewHandler}
          />
        }
      </div>
     );
  }
}

export default DraftContent;
