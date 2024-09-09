import React, { useCallback, useEffect, useState } from 'react';
import { Modal, ModalBody, ModalHeader, ModalFooter, Button } from 'reactstrap';
import PropTypes from 'prop-types';
import toaster from '../../../../../components/toast';
import { Utils } from '../../../../../utils/utils';
import moment from 'moment';
import Loading from '../../../../../components/loading';
import { gettext, siteRoot } from '../../../../../utils/constants';
import { PRIVATE_COLUMN_KEY, } from '../../../_basic';

import './index.css';

const theadData = [
  { width: '5%', text: '' },
  { width: '30%', text: gettext('Name') },
  { width: '20%', text: gettext('Original path') },
  { width: '12%', text: gettext('Last Update') },
  { width: '13%', text: gettext('Size') },
];

const SimilarImageDialog = ({ repoID, onToggle, record }) => {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fileName = record[PRIVATE_COLUMN_KEY.FILE_NAME];
    const parentDir = record[PRIVATE_COLUMN_KEY.PARENT_DIR];
    const path = Utils.joinPath(parentDir, fileName);
    if (path === '') return;
    window.sfMetadataContext.imageSearch(path).then(res => {
      const results = res.data.results;
      setImages(results);
      setIsLoading(false);
    }).catch(error => {
      const errorMessage = gettext('Failed to get similar images.');
      toaster.danger(errorMessage);
    });

  }, [record, repoID]);

  const renderItem = useCallback((items) => {
    return (
      <table className="table-hover">
        <thead>
          <tr>
            {theadData.map((item, index) => {
              return <th key={index} width={item.width}>{item.text}</th>;
            })}
          </tr>
        </thead>
        <tbody>{
          items.map((item, index) => {
            return (
              <tr key={index}>
                <td className="text-center"><img src={Utils.getFileIconUrl(item.file_name)} alt={gettext('File')} width="24" /></td>
                <td><a href={`${siteRoot}lib/${repoID}/file${item.path}`} target="_blank" rel="noreferrer">{item.file_name}</a></td>
                <td>{item.parent_dir}</td>
                <td title={moment(item.mtime).format('LLLL')}>{moment(item.mtime).format('YYYY-MM-DD')}</td>
                <td>{Utils.bytesToSize(item.size)}</td>
              </tr>
            );
          })
        }
        </tbody>
      </table>
    );
  }, [repoID]);

  return (
    <Modal isOpen={true} className="sea-similar-image-dialog" toggle={onToggle}>
      <ModalHeader toggle={onToggle}>{'Similar images'}</ModalHeader>
      <ModalBody>
        <>
          { isLoading ?
            <Loading /> :
            (images.length > 0 ? renderItem(images) : 'No similar images')
          }
        </>
      </ModalBody>
      <ModalFooter>
        <Button color="primary" onClick={onToggle}>{gettext('Close')}</Button>
      </ModalFooter>
    </Modal>
  );
};

SimilarImageDialog.propTypes = {
  repoID: PropTypes.string.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default SimilarImageDialog;
