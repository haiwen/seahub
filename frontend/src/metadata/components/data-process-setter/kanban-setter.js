import React from 'react';

const ToggleSetting = ({ value, label, settingKey, onToggle }) => {
  const handleUpdateSetting = (e) => {
    const newValue = e.target.checked;
    window.sfMetadataContext.localStorage.setItem(settingKey, newValue);
    onToggle(newValue);
  };

  return (
    <label className="custom-switch d-flex position-relative switch-setting-item">
      <input
        type="checkbox"
        className="custom-switch-input"
        checked={value}
        onChange={handleUpdateSetting}
        name="custom-switch-checkbox"
      />
      <span className="custom-switch-description text-truncate ml-0">
        {label}
      </span>
      <span className="custom-switch-indicator"></span>
    </label>
  );
};

export default ToggleSetting;
