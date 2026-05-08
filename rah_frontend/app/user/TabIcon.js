import React from 'react';
import Icon from 'react-native-vector-icons/MaterialIcons'; 

const TabIcon = ({ name, color, size = 24 }) => {
  return <Icon name={name} size={size} color={color} />;
};

export default TabIcon;