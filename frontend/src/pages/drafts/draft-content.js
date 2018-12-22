import React from 'react';
import { siteRoot, gettext } from '../../utils/constants';
import editUtilties from '../../utils/editor-utilties';
import { Utils } from '../../utils/utils';
import PropTypes from 'prop-types';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import DraftListView from '../../components/draft-list-view/draft-list-view';
import DraftListMenu from '../../components/draft-list-view/draft-list-menu';

const propTypes = {
  updateDraftsList: PropTypes.func.isRequired,
  isLoadingDraft: PropTypes.bool.isRequired,
  draftList: PropTypes.arrayOf(PropTypes.object),
  getDrafts: PropTypes.func.isRequired,
};

class DraftContent extends React.Component {
  
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
    this.props.getDrafts();
    document.addEventListener('click', this.onHideContextMenu);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.onHideContextMenu);
  }

  onDeleteHandler = () => {
    let draft = this.state.currentDraft;
    let draft_name = Utils.getFileName(draft.draft_file_path);
    editUtilties.deleteDraft(draft.id).then(res => {
      this.props.updateDraftsList(draft.id);
      let msg_s = gettext('Successfully deleted draft %(draft)s.');
      msg_s = msg_s.replace('%(draft)s', draft_name);
      toaster.success(msg_s);
    }).catch(() => {
      let msg_s = gettext('Failed to delete draft %(draft)s.');
      msg_s = msg_s.replace('%(draft)s', draft_name);
      toaster.danger(msg_s);
    });
  }

  onPublishHandler = () => {
    let draft = this.state.currentDraft;
    let draft_name = Utils.getFileName(draft.draft_file_path);
    editUtilties.publishDraft(draft.id).then(res => {
      this.props.updateDraftsList(draft.id);
      let msg_s = gettext('Successfully published draft %(draft)s.');
      msg_s = msg_s.replace('%(draft)s', draft_name);
      toaster.success(msg_s);
    }).catch(() => {
      let msg_s = gettext('Failed to publish draft %(draft)s.');
      msg_s = msg_s.replace('%(draft)s', draft_name);
      toaster.danger(msg_s);
    });
  }

  onReviewHandler = () => {
    let draft = this.state.currentDraft;

    editUtilties.createDraftReview(draft.id).then(res => {
      const w = window.open();
      w.location = siteRoot + 'drafts/review/' + res.data.id;
    }).catch((error) => { 
      if (error.response.status == '409') {
        toaster.danger(gettext('Review already exists.'));
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
      <div className="cur-view-content">
        {this.props.isLoadingDraft && <Loading /> }
        {(!this.props.isLoadingDraft && this.props.draftList.length !==0) &&
          <DraftListView
            draftList={this.props.draftList} 
            isItemFreezed={this.state.isItemFreezed}
            onMenuToggleClick={this.onMenuToggleClick}
          />
        }
        {(!this.props.isLoadingDraft && this.props.draftList.length === 0) &&
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

DraftContent.propTypes = propTypes;

export default DraftContent;
