import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import COLORS from '../../constants/colors';

/**
 * Spinner centré — affiché pendant les chargements.
 * @param {string} message - texte optionnel sous le spinner
 * @param {boolean} fullScreen - si true, prend tout l'écran
 */
export default function Loader({ message, fullScreen = false }) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {message ? (
        <Text style={styles.message}>{message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        32,
  },
  fullScreen: {
    position:        'absolute',
    top:    0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.background,
    zIndex:          999,
  },
  message: {
    marginTop: 16,
    fontSize:  15,
    color:     COLORS.textSecondary,
    textAlign: 'center',
  },
});
