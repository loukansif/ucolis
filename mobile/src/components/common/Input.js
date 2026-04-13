import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../constants/colors';

/**
 * Input stylisé avec icône, label, erreur et toggle mot de passe.
 */
export default function Input({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  keyboardType    = 'default',
  autoCapitalize  = 'none',
  leftIcon,
  rightElement,
  multiline       = false,
  numberOfLines   = 1,
  editable        = true,
  style,
  inputStyle,
  maxLength,
  returnKeyType,
  onSubmitEditing,
  onBlur,
  onFocus,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused,    setIsFocused]    = useState(false);

  const isPassword = secureTextEntry;

  return (
    <View style={[styles.wrapper, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={[
        styles.container,
        isFocused && styles.focused,
        error     && styles.errorBorder,
        !editable && styles.disabled,
        multiline && styles.multiline,
      ]}>
        {leftIcon && (
          <View style={styles.leftIcon}>{leftIcon}</View>
        )}

        <TextInput
          style={[
            styles.input,
            leftIcon   && styles.inputWithLeft,
            isPassword && styles.inputWithRight,
            multiline  && { height: numberOfLines * 44 },
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          editable={editable}
          maxLength={maxLength}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => { setIsFocused(true); onFocus && onFocus(); }}
          onBlur={()  => { setIsFocused(false); onBlur && onBlur(); }}
        />

        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.rightIcon}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        )}

        {!isPassword && rightElement && (
          <View style={styles.rightIcon}>{rightElement}</View>
        )}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:      { marginBottom: 16 },
  label: {
    fontSize:     13,
    fontWeight:   '600',
    color:        COLORS.textPrimary,
    marginBottom: 6,
  },
  container: {
    flexDirection:  'row',
    alignItems:     'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius:   12,
    borderWidth:    1.5,
    borderColor:    COLORS.border,
    minHeight:      52,
    paddingHorizontal: 14,
  },
  focused:      { borderColor: COLORS.primary, backgroundColor: COLORS.white },
  errorBorder:  { borderColor: COLORS.error },
  disabled:     { opacity: 0.6 },
  multiline:    { alignItems: 'flex-start', paddingVertical: 12 },
  leftIcon:     { marginRight: 10 },
  rightIcon:    { marginLeft: 8 },
  input: {
    flex:      1,
    fontSize:  15,
    color:     COLORS.textPrimary,
    paddingVertical: 0,
  },
  inputWithLeft:  { paddingLeft: 0 },
  inputWithRight: { paddingRight: 0 },
  errorText: {
    fontSize:   12,
    color:      COLORS.error,
    marginTop:  4,
    marginLeft: 4,
  },
});
