import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import COLORS from '../../constants/colors';
import { t } from '../../i18n/index';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const logoScale   = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const dotOpacity  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // ✅ Les valeurs Animated sont des refs stables — on désactive l'avertissement
    // eslint-disable-next-line react-hooks/exhaustive-deps
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.timing(textOpacity, { toValue: 1, duration: 500, delay: 100, useNativeDriver: true }),
      Animated.timing(dotOpacity,  { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <LinearGradient
      colors={['#FF6B35', '#FF8C42', '#1C1C2E']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <Animated.View style={[styles.logoWrapper, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
        <View style={styles.logoBox}>
          <MaterialCommunityIcons name="truck-fast" size={56} color={COLORS.primary} />
        </View>
      </Animated.View>

      <Animated.Text style={[styles.appName, { opacity: textOpacity }]}>UCOLIS</Animated.Text>
      <Animated.Text style={[styles.tagline, { opacity: textOpacity }]}>{t('app.tagline')}</Animated.Text>

      <Animated.View style={[styles.dotsRow, { opacity: dotOpacity }]}>
        {[0, 1, 2].map((i) => <View key={i} style={styles.dot} />)}
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bgCircle1:   { position: 'absolute', width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4, backgroundColor: 'rgba(255,255,255,0.05)', top: -width * 0.2, right: -width * 0.2 },
  bgCircle2:   { position: 'absolute', width: width * 0.6, height: width * 0.6, borderRadius: width * 0.3, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -width * 0.1, left: -width * 0.1 },
  logoWrapper: { marginBottom: 28 },
  logoBox:     { width: 110, height: 110, borderRadius: 30, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 12 },
  appName:     { fontSize: 42, fontWeight: '900', color: COLORS.white, letterSpacing: 6, marginBottom: 10 },
  tagline:     { fontSize: 16, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5, textAlign: 'center', paddingHorizontal: 32, marginBottom: 60 },
  dotsRow:     { flexDirection: 'row', gap: 10 },
  dot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.6)' },
});
