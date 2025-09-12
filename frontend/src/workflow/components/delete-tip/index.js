import { useCallback, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import ModalPortal from '../../../components/modal-portal';
import { gettext } from '../../../utils/constants';

import './index.css';

const CONTAINER_MARGIN_BOTTOM = 4;

const WorkflowDeleteTip = ({ position, offsets, deleteTip, toggle, onDelete }) => {

  const tipContainerRef = useRef(null);

  const containerStyle = useMemo(() => {
    let style = {
      top: position.top,
      left: position.left,
    };
    if (offsets) {
      style = Object.assign(style, offsets);
    }
    return style;
  }, [offsets, position]);

  const handleOutsideClick = useCallback((e) => {
    if (!tipContainerRef.current || !tipContainerRef.current.contains(e.target)) {
      toggle();
    }
  }, [toggle]);

  const fixContainerPosition = useCallback(() => {
    if (!tipContainerRef.current) {
      return;
    }
    const documentHeight = document.body.clientHeight;
    const { top: containerTop, height: containerHeight } = tipContainerRef.current.getBoundingClientRect();
    if (containerTop + containerHeight + CONTAINER_MARGIN_BOTTOM > documentHeight) {
      tipContainerRef.current.style.top = `${documentHeight - containerHeight - CONTAINER_MARGIN_BOTTOM}px`;
    }
  }, []);

  useEffect(() => {
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [handleOutsideClick]);

  useEffect(() => {
    fixContainerPosition();
  }, [fixContainerPosition]);

  return (
    <ModalPortal>
      <div
        ref={tipContainerRef}
        className="workflow-delete-tip tip-container"
        style={containerStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <b className="mb-4">{deleteTip}</b>
        <div className="d-flex justify-content-end">
          <button className="btn btn-secondary mr-2" onClick={toggle}>{gettext('Cancel')}</button>
          <button className="btn btn-primary" onClick={onDelete}>{gettext('Delete')}</button>
        </div>
      </div>
    </ModalPortal>
  );
};

WorkflowDeleteTip.propTypes = {
  position: PropTypes.object.isRequired,
  offsets: PropTypes.object,
  onDelete: PropTypes.func.isRequired,
  toggle: PropTypes.func.isRequired,
  deleteTip: PropTypes.string.isRequired,
};

export default WorkflowDeleteTip;
