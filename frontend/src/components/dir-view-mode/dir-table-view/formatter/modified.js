import CTimeFormatter from '@/metadata/components/cell-formatter/ctime';

const LastModifiedFormatter = ({ value }) => {
  return (
    <CTimeFormatter
      value={value}
      format="relativeTime"
      className="dir-table-modified-formatter"
    />
  );
};

export default LastModifiedFormatter;
