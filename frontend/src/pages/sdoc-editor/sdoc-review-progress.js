import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';

const PROGRESS_STEPS = [
  { key: 'reading_document', label: gettext('Reading the latest content') },
  { key: 'drafting_suggestion', label: gettext('Drafting a revision suggestion') },
];

const SdocReviewProgress = ({ phase, total }) => {
  const activeIndex = useMemo(() => {
    const index = PROGRESS_STEPS.findIndex((step) => step.key === phase);
    return index < 0 ? 0 : index;
  }, [phase]);

  if (typeof total === 'number' && total > 0) {
    return (
      <div className="sdoc-review-progress" aria-live="polite">
        <div className="sdoc-review-progress-steps">
          <div className="sdoc-review-progress-step is-active">
            <span className="sdoc-review-progress-step-mark" aria-hidden="true">
              <span className="sdoc-review-progress-spinner" />
            </span>
            <span>
              {gettext('Reviewing document…')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sdoc-review-progress" aria-live="polite">
      <div className="sdoc-review-progress-steps">
        {PROGRESS_STEPS.map((step, index) => (
          <div key={step.key} className={`sdoc-review-progress-step ${index < activeIndex ? 'is-complete' : ''} ${index === activeIndex ? 'is-active' : ''}`}>
            <span className="sdoc-review-progress-step-mark" aria-hidden="true">
              {index < activeIndex ? '✓' : (index === activeIndex ? <span className="sdoc-review-progress-spinner" /> : '')}
            </span>
            <span>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

SdocReviewProgress.propTypes = {
  phase: PropTypes.string,
  completed: PropTypes.number,
  total: PropTypes.number,
};

export default SdocReviewProgress;
