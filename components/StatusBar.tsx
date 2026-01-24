
import React from 'react';

const StatusBar: React.FC<{ light?: boolean }> = ({ light = false }) => {
  return (
    <div className={`h-6 z-50`}>
    </div>
  );
};

export default StatusBar;
