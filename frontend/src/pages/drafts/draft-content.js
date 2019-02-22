import React, { Fragment } from 'react';
import { siteRoot, gettext } from '../../utils/constants';
import editUtilties from '../../utils/editor-utilties';
import { Utils } from '../../utils/utils';
import PropTypes from 'prop-types';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import DraftListView from '../../components/draft-list-view/draft-list-view';

const propTypes = {
  isLoadingDraft: PropTypes.bool.isRequired,
  updateDraftsList: PropTypes.func.isRequired,
  draftList: PropTypes.array.isRequired,
  getDrafts: PropTypes.func.isRequired,
};

class DraftContent extends React.Component {

  componentDidMount() {
    this.props.getDrafts();
  }

  onDeleteHandler = (draft) => {
    // let draft = this.state.currentDraft;
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

  onReviewHandler = (draft) => {
    editUtilties.createDraftReview(draft.id).then(res => {
      const w = window.open();
      w.location = siteRoot + 'drafts/review/' + res.data.id;
    }).catch((error) => { 
      if (error.response.status == '409') {
        toaster.danger(gettext('Review already exists.'));
      }    
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
  
  render() {
    return (
      <div className="cur-view-content">
        {this.props.isLoadingDraft && <Loading />}
        {!this.props.isLoadingDraft && (
          <Fragment>
            {this.props.draftList.length === 0 && (
              <div className="message empty-tip">
                <h2>{gettext('No draft yet')}</h2>
                <p>{gettext('Draft is a way to let you collaborate with others on files. You can create a draft from a file, edit the draft and then ask for a review. The original file will be updated only after the draft be reviewed.')}</p>
              </div>
            )}
            {this.props.draftList.length !==0 && (
              <DraftListView
                draftList={this.props.draftList} 
                onDeleteHandler={this.onDeleteHandler}
                onReviewHandler={this.onReviewHandler}
              />
            )}
          </Fragment>
        )}
      </div>
    );
  }
}

DraftContent.propTypes = propTypes;

export default DraftContent;
