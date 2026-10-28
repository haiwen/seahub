import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { chatAPI } from '@/api/chat-api';
import toaster from '@/components/toast';
import { gettext } from '@/utils/constants';
import { Utils } from '@/utils/utils';
import './index.css';

const stateLabelFor = (state) => {
  switch (state) {
    case 'applied': return gettext('Applied');
    case 'approved': return gettext('Approving');
    case 'rejected': return gettext('Rejected');
    case 'apply_failed': return gettext('Apply failed');
    case 'conflicted': return gettext('Conflict detected');
    case 'outcome_unknown': return gettext('Apply outcome unknown');
    case 'pending': return gettext('Pending');
    default: return '';
  }
};

const stateIconFor = (state) => (
  ['rejected', 'apply_failed', 'conflicted'].includes(state) ? '✗' : '✓'
);

const blockTypeLabelFor = (type) => {
  switch (type) {
    case 'unordered_list': return gettext('Bulleted list');
    case 'ordered_list': return gettext('Numbered list');
    default: return type || '';
  }
};

const COLLAPSED_ITEM_LIMIT = 3;
const REVIEW_DECISION_BATCH_SIZE = 10;

const ListTypePreview = ({ type, items, marker }) => {
  const List = type === 'ordered_list' ? 'ol' : 'ul';
  return (
    <div className={`sdoc-review-card__list-preview sdoc-review-card__list-preview--${marker === '−' ? 'before' : 'after'}`}>
      <div className="sdoc-review-card__list-preview-label">{marker} {blockTypeLabelFor(type)}</div>
      {items.length > 0 ? (
        <List>
          {items.map((text, index) => <li key={`${index}-${text}`}>{text}</li>)}
        </List>
      ) : (
        <div className="sdoc-review-card__list-preview-empty">{blockTypeLabelFor(type)}</div>
      )}
    </div>
  );
};

ListTypePreview.propTypes = {
  type: PropTypes.string,
  items: PropTypes.arrayOf(PropTypes.string),
  marker: PropTypes.string.isRequired,
};

const SdocReviewCard = ({ reviewTaskId, onMessageContentChange, onTaskRunningChange }) => {
  const [card, setCard] = useState(null);
  const [task, setTask] = useState(null);
  const [pendingItemIds, setPendingItemIds] = useState({});
  const [bulkPending, setBulkPending] = useState(null);
  const [isExpanded, setExpanded] = useState(true);
  const [expandedItemIds, setExpandedItemIds] = useState(() => new Set());
  const messageContentCallbackRef = useRef(onMessageContentChange);
  const snapshotRef = useRef(null);

  useEffect(() => {
    messageContentCallbackRef.current = onMessageContentChange;
  }, [onMessageContentChange]);

  const updateSnapshot = useCallback((data) => {
    const previous = snapshotRef.current;
    let next = data;
    if (previous?.card && previous.task.id === data.task.id &&
        (!data.card || previous.card.task_id === data.card.task_id)) {
      if (!data.card || previous.card.card_revision > data.card.card_revision) return previous;
      if (previous.card.card_revision === data.card.card_revision) {
        const previousItems = new Map(previous.card.items.map((item) => [item.item_id, item]));
        const items = data.card.items.map((item) => {
          const current = previousItems.get(item.item_id);
          // A decision cannot be undone by an older HTTP response. Unknown
          // outcomes may still advance, and preflight-blocked pending items
          // remain retryable rather than being frozen as approved.
          if (['applied', 'rejected', 'apply_failed', 'conflicted'].includes(current?.state) ||
              (current?.state === 'outcome_unknown' && ['pending', 'approved'].includes(item.state))) {
            return current;
          }
          return item;
        });
        const nextItemIds = new Set(items.map((item) => item.item_id));
        previous.card.items.forEach((item) => {
          if (!nextItemIds.has(item.item_id)) items.push(item);
        });
        const active = ['queued', 'reading', 'drafting'];
        const nextTask = !active.includes(previous.task.generation_status) && active.includes(data.task.generation_status)
          ? previous.task : data.task;
        next = { ...data, task: nextTask, card: { ...data.card, generation_status: nextTask.generation_status, items } };
      }
    }
    snapshotRef.current = next;
    setTask(next.task);
    setCard(next.card);
    if (next.task?.assistant_content) {
      messageContentCallbackRef.current?.(next.task.assistant_content);
    }
    return next;
  }, []);

  const loadCard = useCallback(async () => {
    const response = await chatAPI.getSdocReview(reviewTaskId);
    return updateSnapshot(response.data);
  }, [reviewTaskId, updateSnapshot]);

  useEffect(() => {
    loadCard().catch((error) => toaster.danger(Utils.getErrorMsg(error)));
  }, [loadCard]);

  const items = useMemo(() => (card?.items || []), [card]);
  const pendingIds = useMemo(() => items.filter((item) => item.state === 'pending').map((item) => item.item_id), [items]);
  const pendingCount = pendingIds.length;
  const isDone = items.length > 0 && items.every((item) => ['applied', 'rejected'].includes(item.state));

  const generationStatus = task?.generation_status;
  const isGenerating = ['queued', 'reading', 'drafting'].includes(generationStatus);
  const isDecisionReady = generationStatus === 'review_ready';
  const isApplying = items.some((item) => item.state === 'approved');
  const hasUnknownOutcome = items.some((item) => item.state === 'outcome_unknown');
  const isRunning = isGenerating || isApplying;
  const generationFailed = ['failed', 'cancelled'].includes(generationStatus);
  const truncated = !!task?.generation_truncated;
  const generationStopReason = task?.generation_stop_reason;
  const batchConflict = card?.batch_conflict;
  const totalChunks = task?.total_chunks || 0;
  const completedChunks = task?.completed_chunks || 0;
  const totalReviewBlocks = task?.total_review_blocks || 0;
  const completedReviewBlocks = task?.completed_review_blocks || 0;
  const progressPercent = useMemo(() => {
    if (totalReviewBlocks > 0) {
      return Math.min(100, Math.round((completedReviewBlocks / totalReviewBlocks) * 100));
    }
    if (totalChunks > 0) {
      return Math.min(100, Math.round((completedChunks / totalChunks) * 100));
    }
    return 0;
  }, [completedChunks, completedReviewBlocks, totalChunks, totalReviewBlocks]);

  useEffect(() => {
    if (!task) return;
    onTaskRunningChange?.(reviewTaskId, isRunning, isGenerating);
  }, [isGenerating, isRunning, onTaskRunningChange, reviewTaskId, task]);

  useEffect(() => {
    if (!isGenerating) return undefined;
    let cancelled = false;
    let retryDelay = 1000;
    let lastUpdatedAt = null;

    const poll = async () => {
      while (!cancelled) {
        if (document.hidden) {
          await new Promise((resolve) => window.setTimeout(resolve, 5000));
          continue;
        }
        try {
          const nextData = await loadCard();
          const nextTask = nextData?.task;
          if (cancelled || !['queued', 'reading', 'drafting'].includes(nextTask?.generation_status)) {
            return;
          }
          const hasProgress = nextTask.updated_at !== lastUpdatedAt;
          lastUpdatedAt = nextTask.updated_at;
          retryDelay = hasProgress ? 1000 : Math.min(retryDelay * 2, 5000);
        } catch (error) {
          retryDelay = Math.min(retryDelay * 2, 8000);
        }
        await new Promise((resolve) => window.setTimeout(resolve, retryDelay));
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [isGenerating, loadCard]);

  useEffect(() => {
    if (!isApplying) return undefined;
    let cancelled = false;
    let retryDelay = 1000;

    const poll = async () => {
      while (!cancelled) {
        await new Promise((resolve) => window.setTimeout(resolve, retryDelay));
        if (cancelled) return;
        try {
          const nextData = await loadCard();
          const nextItems = nextData?.card?.items || [];
          if (!nextItems.some((item) => item.state === 'approved')) return;
          retryDelay = Math.min(retryDelay * 2, 5000);
        } catch (error) {
          retryDelay = Math.min(retryDelay * 2, 8000);
        }
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [isApplying, loadCard]);

  useEffect(() => {
    if (!hasUnknownOutcome) return undefined;
    let cancelled = false;
    let retryDelay = 1000;

    const poll = async () => {
      while (!cancelled) {
        await new Promise((resolve) => window.setTimeout(resolve, retryDelay));
        if (cancelled) return;
        try {
          const nextData = await loadCard();
          const nextItems = nextData?.card?.items || [];
          if (!nextItems.some((item) => item.state === 'outcome_unknown')) return;
          retryDelay = Math.min(retryDelay * 2, 5000);
        } catch (error) {
          retryDelay = Math.min(retryDelay * 2, 8000);
        }
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [hasUnknownOutcome, loadCard]);

  useEffect(() => {
    if (isDone) setExpanded(false);
  }, [isDone]);

  const locate = useCallback((blockId) => {
    if (!blockId) return;
    const element = document.querySelector(`[data-id="${blockId}"]`);
    if (!element) return;
    element.classList.add('sdoc-review-target');
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => element.classList.remove('sdoc-review-target'), 3000);
  }, []);

  const toggleItem = useCallback((itemId) => {
    setExpandedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const decideItem = useCallback(async (itemId, action) => {
    setPendingItemIds((prev) => ({ ...prev, [itemId]: action }));
    try {
      const response = action === 'approve'
        ? await chatAPI.approveSdocReview(reviewTaskId, [itemId])
        : await chatAPI.rejectSdocReview(reviewTaskId, [itemId]);
      updateSnapshot(response.data);
    } catch (error) {
      toaster.danger(Utils.getErrorMsg(error));
    } finally {
      setPendingItemIds((prev) => ({ ...prev, [itemId]: null }));
    }
  }, [reviewTaskId, updateSnapshot]);

  const collapseAfterBulkDecision = useCallback((response) => {
    const resultItems = response?.data.card?.items || [];
    if (resultItems.length > COLLAPSED_ITEM_LIMIT && resultItems.every((item) => item.state !== 'pending')) {
      setExpanded(false);
    }
  }, []);

  const approveAll = useCallback(async () => {
    setBulkPending('approve');
    try {
      let response;
      const approveBatch = async (itemIds) => {
        try {
          response = await chatAPI.approveSdocReview(reviewTaskId, itemIds);
          updateSnapshot(response.data);
        } catch (error) {
          const code = error.response?.data?.error_code;
          const isSizeError = error.response?.status === 413 &&
            ['review_request_too_large', 'review_text_too_large'].includes(code);
          if (!isSizeError) throw error;
          if (itemIds.length === 1) {
            toaster.danger(Utils.getErrorMsg(error));
            return;
          }
          // These errors occur before a decision exists: each half gets its
          // own signed decision and attempt, never a split of an existing one.
          const middle = Math.floor(itemIds.length / 2);
          await approveBatch(itemIds.slice(0, middle));
          await approveBatch(itemIds.slice(middle));
        }
      };
      for (let index = 0; index < pendingIds.length; index += REVIEW_DECISION_BATCH_SIZE) {
        await approveBatch(pendingIds.slice(index, index + REVIEW_DECISION_BATCH_SIZE));
      }
      collapseAfterBulkDecision(response);
    } catch (error) {
      toaster.danger(Utils.getErrorMsg(error));
    } finally {
      setBulkPending(null);
    }
  }, [reviewTaskId, pendingIds, collapseAfterBulkDecision, updateSnapshot]);

  const rejectAll = useCallback(async () => {
    setBulkPending('reject');
    try {
      const response = await chatAPI.rejectSdocReview(reviewTaskId, pendingIds);
      updateSnapshot(response.data);
      collapseAfterBulkDecision(response);
    } catch (error) {
      toaster.danger(Utils.getErrorMsg(error));
    } finally {
      setBulkPending(null);
    }
  }, [reviewTaskId, pendingIds, collapseAfterBulkDecision, updateSnapshot]);

  if (!task) return null;
  if (generationStatus === 'cancelled') return null;

  if (!isExpanded && items.length > COLLAPSED_ITEM_LIMIT && !isGenerating) {
    return (
      <div className="sdoc-review-card sdoc-review-card--summary">
        <div className="sdoc-review-card__summary-header">
          <span className="sdoc-review-card__summary-icon">✓</span>
          <span className="sdoc-review-card__summary-content">
            <span className="sdoc-review-card__summary-title">{gettext('Review finished')}</span>
            <span className="sdoc-review-card__summary-text">{gettext('{count} suggestions').replace('{count}', items.length)}</span>
          </span>
          <button type="button" className="sdoc-review-card__summary-action" onClick={() => setExpanded(true)}>
            {gettext('Show all')}
          </button>
        </div>
        <div className="sdoc-review-card__summary-items">
          {items.slice(0, COLLAPSED_ITEM_LIMIT).map((item) => {
            const summaryText = item.after_type ? blockTypeLabelFor(item.after_type) : (item.after_text || '');
            return (
              <div key={item.item_id} className={`sdoc-review-card__item-summary sdoc-review-card__item-summary--${item.state.replace(/_/g, '-')}`}>
                <span className="sdoc-review-card__item-summary-icon">{stateIconFor(item.state)}</span>
                <span className="sdoc-review-card__item-summary-label">{stateLabelFor(item.state)}</span>
                {summaryText && (
                  <>
                    <span className="sdoc-review-card__item-summary-divider">·</span>
                    <span className="sdoc-review-card__item-summary-title">{summaryText}</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div className="sdoc-review-card__summary-more">
          {gettext('{count} more suggestions').replace('{count}', items.length - COLLAPSED_ITEM_LIMIT)}
        </div>
      </div>
    );
  }

  return (
    <div className="sdoc-review-card">
      <div className="sdoc-review-card__header">
        <span>{gettext('AI review')}</span>
        {isDone && (
          <button type="button" className="sdoc-review-card__collapse" onClick={() => setExpanded(false)}>{gettext('Hide')}</button>
        )}
      </div>

      {isGenerating && (
        <div className="sdoc-review-card__banner">
          <div>{gettext('Review in progress · {percent}% complete').replace('{percent}', progressPercent)}</div>
          {items.length > 0 && (
            <div className="sdoc-review-card__banner-detail">
              {gettext('{count} suggestions ready to review').replace('{count}', items.length)}
            </div>
          )}
        </div>
      )}
      {generationFailed && (
        <div className="sdoc-review-card__banner sdoc-review-card__banner--error" role="alert">
          {gettext('Unable to generate a review suggestion. Please try again.')}
        </div>
      )}
      {!isGenerating && truncated && (
        <div className="sdoc-review-card__banner">
          <div>
            {generationStopReason === 'suggestion_limit_reached'
              ? gettext('Review limit reached · the first 50 suggestions are shown')
              : gettext('Review stopped early · {percent}% of document reviewed').replace('{percent}', progressPercent)}
          </div>
          {items.length > 0 && (
            <div className="sdoc-review-card__banner-detail">
              {gettext('{count} suggestions are ready to review').replace('{count}', items.length)}
            </div>
          )}
        </div>
      )}
      {batchConflict && (
        <div className="sdoc-review-card__banner sdoc-review-card__banner--warning" role="status">
          <div>
            {gettext('{count} suggestion needs review because the document changed.')
              .replace('{count}', batchConflict.conflict_item_count)}
          </div>
          {batchConflict.blocked_item_count > 0 && (
            <div className="sdoc-review-card__banner-detail">
              {gettext('{count} other suggestions were not applied. You can approve them again.')
                .replace('{count}', batchConflict.blocked_item_count)}
            </div>
          )}
        </div>
      )}

      {pendingCount > 1 && (
        <div className="sdoc-review-card__bulk-actions">
          <span className="sdoc-review-card__bulk-count">{gettext('{count} suggestions').replace('{count}', pendingCount)}</span>
          <div className="sdoc-review-card__bulk-actions-buttons">
            <button type="button" className="btn btn-secondary btn-sm" disabled={!!bulkPending || !isDecisionReady} onClick={rejectAll}>
              {gettext('Reject all')}
            </button>
            <button type="button" className="btn btn-primary btn-sm" disabled={!!bulkPending || !isDecisionReady} onClick={approveAll}>
              {gettext('Approve all')}
            </button>
          </div>
        </div>
      )}

      <div className="sdoc-review-card__items">
        {items.map((item, index) => {
          const isPending = item.state === 'pending';
          const pendingAction = pendingItemIds[item.item_id];
          const summaryText = item.after_type ? blockTypeLabelFor(item.after_type) : (item.after_text || '');

          if (!isPending && !expandedItemIds.has(item.item_id)) {
            return (
              <button
                key={item.item_id}
                type="button"
                className={`sdoc-review-card__item-summary sdoc-review-card__item-summary--${item.state.replace(/_/g, '-')}`}
                onClick={() => toggleItem(item.item_id)}
              >
                <span className="sdoc-review-card__item-summary-icon">{stateIconFor(item.state)}</span>
                <span className="sdoc-review-card__item-summary-label">{stateLabelFor(item.state)}</span>
                {summaryText && (
                  <>
                    <span className="sdoc-review-card__item-summary-divider">·</span>
                    <span className="sdoc-review-card__item-summary-title">{summaryText}</span>
                  </>
                )}
              </button>
            );
          }

          return (
            <div key={item.item_id} className={`sdoc-review-card__item ${item.conflicted ? 'sdoc-review-card__item--conflicted' : ''}`}>
              <div className="sdoc-review-card__item-header">
                <span className="sdoc-review-card__item-title">
                  {gettext('Suggestion {current} of {total}')
                    .replace('{current}', index + 1)
                    .replace('{total}', items.length)}
                </span>
                {item.state !== 'pending' && (
                  <span className={`sdoc-review-card__item-status sdoc-review-card__item-status--${item.state.replace(/_/g, '-')}`}>{stateLabelFor(item.state)}</span>
                )}
                <button type="button" className="sdoc-review-card__locate" onClick={() => locate(item.target?.block_id)}>{gettext('Locate')}</button>
                {isPending && (
                  <div className="sdoc-review-card__item-inline-actions">
                    <button
                      type="button"
                      className="sdoc-review-card__item-icon-btn sdoc-review-card__item-icon-btn--reject"
                      aria-label={gettext('Reject')}
                      title={gettext('Reject')}
                      disabled={!!pendingAction || !isDecisionReady}
                      onClick={() => decideItem(item.item_id, 'reject')}
                    >
                      <svg viewBox="0 0 14 14" aria-hidden="true">
                        <path d="M2.5 2.5 11.5 11.5M11.5 2.5 2.5 11.5" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="sdoc-review-card__item-icon-btn sdoc-review-card__item-icon-btn--approve"
                      aria-label={gettext('Approve')}
                      title={gettext('Approve')}
                      disabled={!!pendingAction || !isDecisionReady}
                      onClick={() => decideItem(item.item_id, 'approve')}
                    >
                      <svg viewBox="0 0 14 14" aria-hidden="true">
                        <path d="m2 7.5 3.1 3L12 3.5" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              <div className="sdoc-review-card__item-body">
                {item.kind === 'set_list_type' ? (
                  <div className="sdoc-review-card__diff">
                    <ListTypePreview type={item.before_type} items={item.list_items || []} marker="−" />
                    <ListTypePreview type={item.after_type} items={item.list_items || []} marker="+" />
                  </div>
                ) : item.kind === 'set_block_type' ? (
                  <div className="sdoc-review-card__diff">
                    <div className="sdoc-review-card__before">− {blockTypeLabelFor(item.before_type)}</div>
                    <div className="sdoc-review-card__after">+ {blockTypeLabelFor(item.after_type)}</div>
                  </div>
                ) : item.kind === 'delete_block' ? (
                  <div className="sdoc-review-card__diff">
                    <div className="sdoc-review-card__before">− {blockTypeLabelFor(item.before_type)}</div>
                  </div>
                ) : item.kind === 'insert_block' ? (
                  <div className="sdoc-review-card__diff">
                    <div className="sdoc-review-card__after">
                      + {blockTypeLabelFor(item.after_type)} {item.after_text}
                    </div>
                    <div className="sdoc-review-card__rationale">
                      {gettext('Placement:')} {item.placement === 'before' ? gettext('Before') : gettext('After')}
                    </div>
                  </div>
                ) : (
                  <div className="sdoc-review-card__diff">
                    <div className="sdoc-review-card__before">− {item.before_text}</div>
                    <div className="sdoc-review-card__after">+ {item.after_text}</div>
                  </div>
                )}
                {item.rationale && (
                  <div className="sdoc-review-card__rationale">
                    <span className="sdoc-review-card__rationale-label">{gettext('Why:')}</span> {item.rationale}
                  </div>
                )}
                {item.conflicted && item.conflict_summary && (
                  <div className="sdoc-review-card__rationale">{item.conflict_summary}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

SdocReviewCard.propTypes = {
  reviewTaskId: PropTypes.string.isRequired,
  onMessageContentChange: PropTypes.func,
  onTaskRunningChange: PropTypes.func,
};

export default SdocReviewCard;
