import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { chatAPI } from '../../../utils/chat-api';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';

const SdocReviewCard = ({ reviewTaskId }) => {
  const [task, setTask] = useState(null);
  const [pending, setPending] = useState(false);
  const [isExpanded, setExpanded] = useState(true);

  const loadTask = useCallback(async () => {
    const response = await chatAPI.getSdocReview(reviewTaskId);
    setTask(response.data.task);
  }, [reviewTaskId]);

  useEffect(() => {
    loadTask().catch((error) => toaster.danger(Utils.getErrorMsg(error)));
  }, [loadTask]);

  const isApplied = task?.status === 'applied' || task?.status === 'persisted';
  const summary = useMemo(() => {
    const content = task?.after_text || '';
    return content.length > 48 ? `${content.slice(0, 48)}…` : content;
  }, [task?.after_text]);

  useEffect(() => {
    if (isApplied) {
      setExpanded(false);
    }
  }, [isApplied]);

  const locate = useCallback(() => {
    if (!task?.target_block_id) return;
    const element = document.querySelector(`[data-id="${task.target_block_id}"]`);
    if (!element) return;
    element.classList.add('sdoc-review-target');
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => element.classList.remove('sdoc-review-target'), 3000);
  }, [task]);

  const approve = useCallback(async () => {
    setPending(true);
    try {
      const response = await chatAPI.approveSdocReview(reviewTaskId);
      setTask(response.data.task);
    } catch (error) {
      toaster.danger(Utils.getErrorMsg(error));
    } finally {
      setPending(false);
    }
  }, [reviewTaskId]);

  const reject = useCallback(async () => {
    setPending(true);
    try {
      const response = await chatAPI.rejectSdocReview(reviewTaskId);
      setTask(response.data.task);
    } catch (error) {
      toaster.danger(Utils.getErrorMsg(error));
    } finally {
      setPending(false);
    }
  }, [reviewTaskId]);

  if (!task) return null;
  const canReview = task.status === 'review_ready';

  if (isApplied && !isExpanded) {
    return (
      <button
        type="button"
        className="sdoc-review-card sdoc-review-card-summary"
        onClick={() => setExpanded(true)}
        aria-expanded="false"
      >
        <span className="sdoc-review-card-summary-icon">✓</span>
        <span className="sdoc-review-card-summary-content">
          <span className="sdoc-review-card-summary-title">{gettext('Suggestion applied')}</span>
          {summary && <span className="sdoc-review-card-summary-text">{summary}</span>}
        </span>
        <span className="sdoc-review-card-summary-action">{gettext('Show')}</span>
      </button>
    );
  }

  return (
    <div className="sdoc-review-card">
      <div className="sdoc-review-card-header">
        <span>{gettext('AI review suggestion')}</span>
        <div className="sdoc-review-card-header-actions">
          <span className="sdoc-review-card-status">{task.status.replaceAll('_', ' ')}</span>
          {isApplied && (
            <button type="button" className="sdoc-review-card-collapse" onClick={() => setExpanded(false)}>
              {gettext('Hide')}
            </button>
          )}
        </div>
      </div>
      <button type="button" className="btn btn-link p-0 sdoc-review-card-locate" onClick={locate}>
        {gettext('Locate')}
      </button>
      <div className="sdoc-review-card-diff">
        <div className="sdoc-review-card-before">- {task.before_range_text}</div>
        <div className="sdoc-review-card-after">+ {task.after_text}</div>
      </div>
      {task.rationale && <div className="sdoc-review-card-rationale">{task.rationale}</div>}
      {canReview && (
        <div className="sdoc-review-card-actions">
          <button type="button" className="btn btn-secondary" disabled={pending} onClick={reject}>{gettext('Reject')}</button>
          <button type="button" className="btn btn-primary" disabled={pending} onClick={approve}>{gettext('Approve')}</button>
        </div>
      )}
    </div>
  );
};

SdocReviewCard.propTypes = {
  reviewTaskId: PropTypes.string.isRequired,
};

export default SdocReviewCard;
