import NumberFormatter from '@/metadata/components/cell-formatter/number';

const SizeFormatter = ({ value, formats }) => {
  return (
    <NumberFormatter
      value={value}
      formats={formats}
      className="dir-table-size-formatter"
    />
  );
};

export default SizeFormatter;
