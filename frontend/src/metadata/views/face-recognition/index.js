import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { CenteredLoading } from '@seafile/sf-metadata-ui-component';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import metadataAPI from '../../api';
import FaceGroup from './face-group';

import './index.css';

const FaceRecognition = ({ repoID }) => {
  const [loading, setLoading] = useState(true);
  const [faceData, setFaceData] = useState([]);

  useEffect(() => {
    setLoading(true);
    metadataAPI.getFaceData(repoID).then(res => {
      const faceData = res.data.results || [];
      setFaceData(faceData);
      setLoading(false);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (<CenteredLoading />);
  }

  return (
    <div className="sf-metadata-face-recognition">
      {faceData.length > 0 && faceData.map((face) => {
        return (<FaceGroup key={face.record_id} group={face} repoID={repoID} />);
      })}
    </div>
  );
};

FaceRecognition.propTypes = {
  repoID: PropTypes.string.isRequired,
};

export default FaceRecognition;
