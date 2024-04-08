import React from 'react';
import PropTypes from 'prop-types';
import { Col } from 'reactstrap';

function ColumnName(props) {
  const { column } = props;
  const { name } = column;

  return (
    <Col md={3} className="d-flex column-name">
      <div className="w-100 text-truncate">
        {name || ''}
      </div>
    </Col>
  );
}

ColumnName.propTypes = {
  column: PropTypes.object.isRequired,
};

export default ColumnName;
