import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '@/utils/constants';
import './index.css';

const PROGRESS_STEPS = [
  { key: 'reading_document', label: gettext('Reading the latest content') },
  { key: 'drafting_suggestion', label: gettext('Drafting a revision suggestion') },
];

const SdocReviewProgress = ({ phase }) => {
  const activeIndex = useMemo(() => {
    const index = PROGRESS_STEPS.findIndex((step) => step.key === phase);
    return index < 0 ? 0 : index;
  }, [phase]);

  return (
    <div className="sdoc-review-progress" aria-live="polite">
      <div className="sdoc-review-progress__steps">
        {PROGRESS_STEPS.map((step, index) => (
          <div key={step.key} className={`sdoc-review-progress__step ${index < activeIndex ? 'is-complete' : ''} ${index === activeIndex ? 'is-active' : ''}`}>
            <span className="sdoc-review-progress__step-mark" aria-hidden="true">
              {index < activeIndex ? '✓' : (index === activeIndex ? <span className="sdoc-review-progress__spinner" /> : '')}
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
};

export default SdocReviewProgress;
