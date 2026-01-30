import { useMemo } from 'react';
import FileNameFormatter from '@/metadata/components/cell-formatter/file-name-formatter';
import { checkIsDir } from '@/metadata/utils/row';
import { Utils } from '@/utils/utils';
import { siteRoot, thumbnailDefaultSize } from '@/utils/constants';

// Dirent Name Formatter - reuses metadata FileNameFormatter
const NameFormatter = ({ repoID, path, record, value, onClick, ...params }) => {
  const iconUrl = useMemo(() => {
    const isDir = checkIsDir(record);

    if (isDir) {
      const url = Utils.getFolderIconUrl();
      return { iconUrl: url, defaultIconUrl: url };
    }

    const defaultIconUrl = Utils.getFileIconUrl(value);
    if (Utils.imageCheck(value)) {
      const fullPath = Utils.encodePath(Utils.joinPath(path, value));
      const thumbnail = `${siteRoot}thumbnail/${repoID}/${thumbnailDefaultSize}${fullPath}?mtime=${record._mtime}`;
      return { iconUrl: thumbnail, defaultIconUrl };
    }
    return { iconUrl: defaultIconUrl, defaultIconUrl };
  }, [value, record, repoID, path]);

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
