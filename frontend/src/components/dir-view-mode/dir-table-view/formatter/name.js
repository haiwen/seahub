import { useCallback, useMemo } from 'react';
import FileNameFormatter from '@/metadata/components/cell-formatter/file-name-formatter';
import { checkIsDir } from '@/metadata/utils/row';
import { Utils } from '@/utils/utils';
import { siteRoot, thumbnailDefaultSize } from '@/utils/constants';
import { getParentDirFromRecord } from '@/metadata/utils/cell';
import EventBus from '@/components/common/event-bus';
import { EVENT_BUS_TYPE } from '@/components/sf-table/constants/event-bus-type';
import { EDITOR_TYPE } from '@/components/sf-table/constants/grid';
import { openFile } from '@/metadata/utils/file';

// Dirent Name Formatter - reuses metadata FileNameFormatter
const NameFormatter = ({ repoID, record, value, ...params }) => {
  const eventBus = EventBus.getInstance();
  const iconUrl = useMemo(() => {
    const isDir = checkIsDir(record);

    if (isDir) {
      const url = Utils.getFolderIconUrl();
      return { iconUrl: url, defaultIconUrl: url };
    }

    const defaultIconUrl = Utils.getFileIconUrl(value);
    if (Utils.imageCheck(value)) {
      const parentDir = getParentDirFromRecord(record);
      const fullPath = Utils.encodePath(Utils.joinPath(parentDir, value));
      const thumbnail = `${siteRoot}thumbnail/${repoID}/${thumbnailDefaultSize}${fullPath}?mtime=${record._mtime}`;
      return { iconUrl: thumbnail, defaultIconUrl };
    }
    return { iconUrl: defaultIconUrl, defaultIconUrl };
  }, [value, record, repoID]);

  const onClick = useCallback((e) => {
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation();
    openFile(repoID, record, () => {
      eventBus.dispatch(EVENT_BUS_TYPE.OPEN_EDITOR, EDITOR_TYPE.PREVIEWER);
    });

  }, [eventBus, record, repoID]);

  return (
    <div className="dir-table-name-cell">
      <FileNameFormatter
        {...params}
        value={value}
        onClickName={onClick}
        {...iconUrl}
      />
    </div>
  );
};

export default NameFormatter;
