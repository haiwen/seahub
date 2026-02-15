import classNames from 'classnames';

const SizeFormatter = ({ value, className }) => {
  return (
    <div
      className={classNames('sf-metadata-ui cell-formatter-container text-formatter number-formatter', className)}
      title={value}
    >
      {value}
    </div>
  );
};

export default SizeFormatter;
