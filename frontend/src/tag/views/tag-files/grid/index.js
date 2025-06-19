import { useCallback, useMemo, useRef, useState } from 'react';
import { useTags, useTagView } from '../../../hooks';
import { getRecordIdFromRecord } from '../../../../metadata/utils/cell';
import TagFile from './item';
import { hideMenu } from '../../../../components/context-menu/actions';

const GridView = ({ repoID, openImagePreview, handleRenameTagFile, onTagFileContextMenu }) => {
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);

  const containerRef = useRef(null);

  const { tagsData } = useTags();
  const { tagFiles, selectedFileIds, updateSelectedFileIds } = useTagView();

  const tagFileIds = useMemo(() => tagFiles.rows.map(file => getRecordIdFromRecord(file)), [tagFiles.rows]);

  const onMouseDown = useCallback((e) => {
    hideMenu();
    if (e.button !== 0 || e.target.closest('.grid-item')) return;
    updateSelectedFileIds([]);
    const rect = containerRef.current.getBoundingClientRect();
    setStartPoint({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setEndPoint({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsMouseDown(true);
  }, [updateSelectedFileIds]);

  const onMouseMove = useCallback((e) => {
    if (!isMouseDown) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newEnd = {
      x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(e.clientY - rect.top, rect.height)),
    };

    const distance = Math.sqrt(Math.pow(newEnd.x - startPoint.x, 2) + Math.pow(newEnd.y - startPoint.y, 2));
    if (distance > 15) {
      setEndPoint(newEnd);
      setIsSelecting(true);
      const selectionRect = {
        left: Math.min(startPoint.x, newEnd.x),
        top: Math.min(startPoint.y, newEnd.y),
        right: Math.max(startPoint.x, newEnd.x),
        bottom: Math.max(startPoint.y, newEnd.y),
      };

      const selectedIds = Array.from(containerRef.current.querySelectorAll('.grid-item'))
        .filter((item) => {
          const itemRect = item.getBoundingClientRect();
          const relativeBounds = {
            left: itemRect.left - rect.left,
            top: itemRect.top - rect.top,
            right: itemRect.right - rect.left,
            bottom: itemRect.bottom - rect.top,
          };
          return (relativeBounds.right > selectionRect.left &&
                relativeBounds.left < selectionRect.right &&
                relativeBounds.bottom > selectionRect.top &&
                relativeBounds.top < selectionRect.bottom);
        })
        .map((item) => item.getAttribute('data-fileid'));
      updateSelectedFileIds(selectedIds);
    }
  }, [isMouseDown, startPoint, updateSelectedFileIds]);

  const onMouseUp = useCallback(() => {
    setIsSelecting(false);
    setIsMouseDown(false);
  }, []);

  const onMultiSelect = useCallback((e, fileId) => {
    const isCtrlOrMetaKeyPressed = e.ctrlKey || e.metaKey;
    const isShiftKeyPressed = e.shiftKey;
    if (isCtrlOrMetaKeyPressed) {
      const newSelectedFileIds = selectedFileIds.includes(fileId)
        ? selectedFileIds.filter(id => id !== fileId)
        : [...selectedFileIds, fileId];
      updateSelectedFileIds(newSelectedFileIds);
    } else if (isShiftKeyPressed) {
      // Shift + click to select multiple files between the current file and the first selected file
      const currentIndex = tagFileIds.indexOf(fileId);
      const firstSelectedIndex = tagFileIds.indexOf(selectedFileIds[0]);
      const startIndex = Math.min(currentIndex, firstSelectedIndex);
      const endIndex = Math.max(currentIndex, firstSelectedIndex);
      const newSelectedFileIds = tagFileIds.slice(startIndex, endIndex + 1);
      updateSelectedFileIds(newSelectedFileIds);
    }
  }, [tagFileIds, selectedFileIds, updateSelectedFileIds]);

  return (
    <div className="table-container user-select-none">
      <ul className="grid-view" ref={containerRef} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
        {tagFiles.rows.map((file) => {
          const fileId = getRecordIdFromRecord(file);
          return (
            <TagFile
              key={fileId}
              repoID={repoID}
              file={file}
              tagsData={tagsData}
              selectedFileIds={selectedFileIds}
              onSelectFile={updateSelectedFileIds}
              onMultiSelect={onMultiSelect}
              openImagePreview={openImagePreview}
              onRenameFile={handleRenameTagFile}
              onContextMenu={onTagFileContextMenu}
            />
          );
        })}
        {isSelecting && (
          <div
            className="selection-box"
            style={{
              left: Math.min(startPoint.x, endPoint.x),
              top: Math.min(startPoint.y, endPoint.y),
              width: Math.abs(startPoint.x - endPoint.x),
              height: Math.abs(startPoint.y - endPoint.y),
            }}
          />
        )}
      </ul>
    </div>
  );
};

export default GridView;
