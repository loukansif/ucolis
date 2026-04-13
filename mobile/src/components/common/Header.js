import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../../constants/colors';

/**
 * Header gradient réutilisable.
 * @param {string}   title
 * @param {boolean}  showBack     - affiche le bouton retour
 * @param {Function} onBack
 * @param {ReactNode} rightElement - élément à droite (bouton, icône…)
 * @param {boolean}  transparent  - header transparent (sur carte)
 */
export default function Header({
  title,
  showBack     = false,
  onBack,
  rightElement,
  transparent  = false,
  subtitle,
}) {
  const insets = useSafeAreaInsets();
  const paddingTop = insets.top + (Platform.OS === 'android' ? 8 : 0);

  const content = (
    <View style={[styles.inner, { paddingTop, minHeight: paddingTop + 56 }]}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.center}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>

      <View style={styles.right}>
        {rightElement || null}
      </View>
    </View>
  );

  if (transparent) {
    return (
      <View style={[styles.transparentContainer, { paddingTop }]}>
        {content}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={COLORS.gradientHeader}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.gradient}
    >
      {content}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius:  6,
    elevation:     6,
  },
  transparentContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 10,
  },
  inner: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingHorizontal: 16,
    paddingBottom:   12,
  },
  left: {
    width: 44,
    alignItems: 'flex-start',
  },
  center: {
    flex:       1,
    alignItems: 'center',
  },
  right: {
    width: 44,
    alignItems: 'flex-end',
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize:   18,
    fontWeight: '700',
    color:      COLORS.white,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    color:    'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
});
