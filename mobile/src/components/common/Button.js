import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '../../constants/colors';

/**
 * Bouton réutilisable
 * @param {string}   variant   - 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
 * @param {string}   size      - 'sm' | 'md' | 'lg'
 * @param {boolean}  loading
 * @param {boolean}  disabled
 * @param {Function} onPress
 * @param {string}   title
 * @param {ReactNode} leftIcon
 * @param {ReactNode} rightIcon
 */
export default function Button({
  title,
  onPress,
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
}) {
  const sizeStyles = {
    sm: { paddingVertical: 8,  paddingHorizontal: 16, borderRadius: 8  },
    md: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
    lg: { paddingVertical: 18, paddingHorizontal: 32, borderRadius: 14 },
  };

  const textSizes = { sm: 13, md: 15, lg: 17 };

  const isDisabled = disabled || loading;

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.85}
        style={[styles.base, style]}
      >
        <LinearGradient
          colors={isDisabled ? ['#CCC', '#BBB'] : COLORS.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, sizeStyles[size]]}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <View style={styles.row}>
              {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
              <Text style={[styles.textPrimary, { fontSize: textSizes[size] }, textStyle]}>
                {title}
              </Text>
              {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantMap = {
    secondary: {
      container: { backgroundColor: COLORS.secondary },
      text:      { color: COLORS.white },
    },
    outline: {
      container: { backgroundColor: COLORS.transparent, borderWidth: 1.5, borderColor: COLORS.primary },
      text:      { color: COLORS.primary },
    },
    ghost: {
      container: { backgroundColor: COLORS.transparent },
      text:      { color: COLORS.primary },
    },
    danger: {
      container: { backgroundColor: COLORS.error },
      text:      { color: COLORS.white },
    },
  };

  const chosen = variantMap[variant] || variantMap.outline;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        styles.nonGradient,
        sizeStyles[size],
        chosen.container,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? COLORS.primary : COLORS.white}
          size="small"
        />
      ) : (
        <View style={styles.row}>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Text style={[styles.textBase, { fontSize: textSizes[size] }, chosen.text, textStyle]}>
            {title}
          </Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'stretch',
    overflow:  'hidden',
  },
  gradient: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  nonGradient: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
  },
  iconLeft:  { marginRight: 8 },
  iconRight: { marginLeft:  8 },
  textPrimary: {
    color:      COLORS.white,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  textBase: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.5,
  },
});
