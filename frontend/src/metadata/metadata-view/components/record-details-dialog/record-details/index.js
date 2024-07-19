import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, Col } from 'reactstrap';
import { IconBtn, CenteredLoading } from '@seafile/sf-metadata-ui-component';
import { gettext } from '../../../utils';
import FieldLabel from './field-label';
import CellFormatter from '../../cell-formatter';
import { getCellValueByColumn } from '../../../_basic';

import './index.css';

const RecordDetails = ({ fields, record, onToggle, ...params }) => {
  const [isAnimation, setAnimation] = useState(true);
  const [isLoading, setLoading] = useState(true);
  const modalRef = useRef(null);

  const initStyle = useMemo(() => {
    const defaultMargin = 80; // sequence cell width
    const defaultHeight = 100;
    return {
      width: `${window.innerWidth - defaultMargin}px`,
      maxWidth: `${window.innerWidth - defaultMargin}px`,
      marginLeft: `${defaultMargin}px`,
      height: `${defaultHeight}px`,
      marginRight: `${defaultMargin}px`,
      marginTop: '30%',
      transition: 'all .3s',
    };
  }, []);

  const style = useMemo(() => {
    const width = 800;
    return {
      width,
      maxWidth: width,
      marginLeft: (window.innerWidth - width) / 2,
      height: 'calc(100% - 56px)', // Dialog margin is 3.5rem (56px)
    };
  }, []);

  useEffect(() => {
    // use setTimeout to make sure real dom rendered
    setTimeout(() => {
      let dom = modalRef.current.firstChild;
      const { width, maxWidth, marginLeft, height } = style;
      dom.style.width = `${width}px`;
      dom.style.maxWidth = `${maxWidth}px`;
      dom.style.marginLeft = `${marginLeft}px`;
      dom.style.height = height;
      dom.style.marginRight = 'unset';
      dom.style.marginTop = '28px';
      // after animation, change style and run callback
      setTimeout(() => {
        setAnimation(false);
        dom.style.transition = 'none';
        setLoading(false);
      }, 280);
    }, 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = useCallback(() => {
    onToggle();
  }, [onToggle]);

  const renderFieldValue = useCallback((field) => {
    const cellValue = getCellValueByColumn(record, field);
    return (<CellFormatter field={field} value={cellValue} { ...params }/>);
  }, [record, params]);

  const renderRowContent = useCallback(() => {
    if (isLoading) return (<CenteredLoading />);
    if (!Array.isArray(fields) || fields.length === 0) return null;
    return (
      <>
        {fields.map((field) => {
          return (
            <div className={`sf-metadata-record-details-item sf-metadata-record-details-item-field-${field.type}`} key={field.key}>
              <div className="pb-4 row">
                <FieldLabel field={field} />
                <Col md={9} className='d-flex align-items-center sf-metadata-record-details-item-col'>
                  {renderFieldValue(field)}
                </Col>
              </div>
            </div>
          );
        })}
      </>
    );
  }, [isLoading, fields, renderFieldValue]);

  return (
    <Modal
      isOpen={true}
      toggle={toggle}
      className="sf-metadata-record-details-dialog"
      style={isAnimation ? initStyle : style}
      zIndex={1048}
      contentClassName="sf-metadata-record-details-content"
      modalClassName="sf-metadata-record-details-modal"
      fade={false}
      innerRef={modalRef}
      keyboard={false}
    >
      {!isAnimation && (
        <div className="sf-metadata-record-details">
          <ModalHeader close={(
            <div className="header-close-list">
              <IconBtn iconName="close" size={24} onClick={toggle} />
            </div>
          )}>
            <div className="sf-metadata-record-details-left-btns">
              <div className="sf-metadata-record-details-title text-truncate">{gettext('Details')}</div>
            </div>
          </ModalHeader>
          <ModalBody className="sf-metadata-record-details-container">
            {renderRowContent()}
          </ModalBody>
        </div>
      )}
    </Modal>
  );

};

RecordDetails.propTypes = {
  record: PropTypes.object,
  fields: PropTypes.array,
  columns: PropTypes.array,
  onToggle: PropTypes.func,
};

export default RecordDetails;
