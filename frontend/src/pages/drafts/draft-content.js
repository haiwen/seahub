import React, { Fragment } from 'react';
import { gettext } from '../../utils/constants';
import editUtilities from '../../utils/editor-utilities';
import { Utils } from '../../utils/utils';
import PropTypes from 'prop-types';
import toaster from '../../components/toast';
import EmptyTip from '../../components/empty-tip';
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
    editUtilities.deleteDraft(draft.id).then(res => {
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

  onPublishHandler = (draft) => {
    // let draft = this.state.currentDraft;
    let draft_name = Utils.getFileName(draft.draft_file_path);
    editUtilities.publishDraft(draft.id).then(res => {
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
              <EmptyTip>
                <h2>{gettext('No draft yet')}</h2>
                <p>{gettext('Draft is a way to let you collaborate with others on files. You can create a draft from a file, edit the draft and then ask for a review. The original file will be updated only after the draft has been reviewed.')}</p>
              </EmptyTip>
            )}
            {this.props.draftList.length !==0 && (
              <DraftListView
                draftList={this.props.draftList}
                onDeleteHandler={this.onDeleteHandler}
                onPublishHandler={this.onPublishHandler}
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
