import React, { useEffect, useState } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

let toastId = 0;
const listeners: Set<(msg: ToastMessage) => void> = new Set();

export const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', duration = 2000) => {
  const id = String(toastId++);
  const msg: ToastMessage = { id, message, type, duration };
  listeners.forEach(listener => listener(msg));
};

export default function Toast() {
  const styles = getStyles();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToast = (msg: ToastMessage) => {
      setToasts(prev => [...prev, msg]);
      
      const timeout = setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== msg.id));
      }, msg.duration || 2000);

      return () => clearTimeout(timeout);
    };
    listeners.add(handleToast);
    return () => {
      listeners.delete(handleToast);
    };
  }, []);

  return (
    <View style={styles.container}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} styles={styles} />
      ))}
    </View>
  );
}

function ToastItem({ toast, styles }: { toast: ToastMessage; styles: any }) {
  const { colors } = useTheme();
  const [opacity] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(toast.duration || 2000),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, toast.duration]);

  const bgColor = toast.type === 'success' ? colors.green : toast.type === 'error' ? colors.danger : colors.greenTint;
  const textColor = toast.type === 'success' || toast.type === 'error' ? colors.onAccent : colors.text;
  const icon = toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ';

  return (
    <Animated.View style={[styles.toast, { opacity, backgroundColor: bgColor }]}>
      <Text style={[styles.toastIcon, { color: textColor }]}>{icon}</Text>
      <Text style={[styles.toastMessage, { color: textColor }]}>{toast.message}</Text>
    </Animated.View>
  );
}

const getStyles = () => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    gap: 8,
    zIndex: 999,
    pointerEvents: 'none',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  toastIcon: {
    fontSize: 16,
    fontWeight: '700',
  },
  toastMessage: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});
