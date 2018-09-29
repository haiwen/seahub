import React from 'react';
import classNames from 'classnames';
import { siteRoot, gettext } from '../../components/constants';
import editUtilties from '../../utils/editor-utilties';
import Loading from '../../components/loading';
import DraftListView from '../../components/draft-list-view/draft-list-view';
import DraftListMenu from '../../components/draft-list-view/draft-list-menu';

import ReviewsListView from '../../components/reviews-list-view/reviews-list-view';

class DraftsView extends React.Component {
  
  constructor(props) {
    super(props);
    this.state = {
      draftList: [],
      reviewsList: [],
      isLoadingDraft: true,
      isLoadingReviews: true,
      isMenuShow: false,
      menuPosition: {top:'', left: ''},
      currentDraft: null,
      isItemFreezed: false, 
      showDrafts: true,
      showReviews: false,
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

  initReviewsList() {
    this.setState({isLoadingReviews: true});
    editUtilties.listReviews().then(res => {
      this.setState({
        reviewsList: res.data.data,
        isLoadingReviews: false,
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

  onReviewHandler = () => {
    let draft = this.state.currentDraft;

    editUtilties.createDraftReview(draft.id).then(res => {
      window.location.href = siteRoot + 'drafts/review/' + draft.review_id;
    })
    .catch((error) => { 
      if (error.response.status == '409') {
        window.location.href = siteRoot + 'drafts/review/' + draft.review_id;
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

  onDraftsView = () => {
    this.setState({
      showDrafts: true,
      showReviews: false
    })
  }

  onReviewsView = () => {
    this.setState({
      showDrafts: false,
      showReviews: true
    })
    this.initReviewsList()
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
    let draftsClass = classNames( 'tab', { 'ui-state-active': this.state.showDrafts});
    let reviewsClass = classNames( 'tab', { 'ui-state-active': this.state.showReviews});
    return (
      <div className="cur-view-container">
        <div className="cur-view-path">
          <ul className="tab-tabs-nav">
            <li className={draftsClass} onClick={this.onDraftsView}><a className='a'>{gettext('Drafts')}</a></li>
            <li className={reviewsClass} onClick={this.onReviewsView}><a className='a'>{gettext('Reviews')}</a></li>
          </ul>
        </div>
        { this.state.showDrafts &&
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
                <h2>{gettext('No draft yet')}</h2>
                <p>{gettext('Draft is a way to let you collaborate with others on files. You can create a draft from a file, edit the draft and then ask for a review. The original file will be updated only after the draft be reviewed.')}</p>
              </div>
            }
            {this.state.isMenuShow && 
              <ListMenu 
                isMenuShow={this.state.isMenuShow} 
                currentDraft={this.state.currentDraft} 
                menuPosition={this.state.menuPosition} 
                onPublishHandler={this.onPublishHandler}
                onDeleteHandler={this.onDeleteHandler}
                onReviewHandler={this.onReviewHandler}
              />
            }
          </div>
        }
        { this.state.showReviews && 
           <div className="cur-view-content" style={{padding: 0}}>
            {this.state.isLoadingReviews && <Loading /> }
            {(!this.state.isLoadingReviews && this.state.reviewsList.length !==0) &&
              <ReviewsListView
                itemsList={this.state.reviewsList} 
                isItemFreezed={this.state.isItemFreezed}
                onMenuToggleClick={this.onMenuToggleClick}
              />
            }
            {(!this.state.isLoadingReviews && this.state.reviewsList.length === 0) &&
              <div className="message empty-tip">
                <h2>{gettext('There is no Review file existing')}</h2>
              </div>
            }
          </div>
        }
      </div>
    );
  }
}

export default DraftsView;
