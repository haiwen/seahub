import SingleSelectFormatter from '@/metadata/components/cell-formatter/single-select';

const StatusFormatter = ({ value, column }) => {
  return (
    <SingleSelectFormatter value={value} options={column?.data?.options || []} />
  );
};

export default StatusFormatter;
