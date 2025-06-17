const defaultStyle = {
  control: {
    backgroundColor: '#fff',
    fontSize: 14,
    fontWeight: 'normal',
  },
  highlighter: {
    overflow: 'hidden',
  },
  input: {
    margin: 0,
  },
  '&singleLine': {
    control: {
      display: 'inline-block',
      width: 130,
    },
    highlighter: {
      padding: 1,
      border: '2px inset transparent',
    },
    input: {
      padding: 1,
      border: '2px inset',
    },
  },
  '&multiLine': {
    control: {
    },
    highlighter: {
      padding: 9,
    },
    input: {
      padding: '8px',
      maxHeight: 90,
      minHeight: 90,
      height: 90,
      lineHeight: 'default',
      overflowY: 'auto',
      outline: 'none',
      borderBottom: 'none',
      borderRadius: '5px',
      border: '1px solid #e6e6dd',
    },
  },
  suggestions: {
    list: {
      backgroundColor: 'white',
      border: '1px solid rgba(0,0,0,0.15)',
      fontSize: 14,
      maxHeight: 200,
      overflow: 'auto',
      position: 'absolute',
      bottom: 14,
      width: '150px',
    },
    item: {
      width: 'auto',
      padding: '5px 0px',
      overflowX: 'auto',
      borderBottom: '1px solid rgba(0, 0, 0, 0)',
      '&focused': {
        backgroundColor: '#f5f5f5',
        fontWeight: '400',
      },
    },
  },
};

export { defaultStyle };
