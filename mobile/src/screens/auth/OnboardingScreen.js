import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Dimensions, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS      from '../../constants/colors';
import { t }       from '../../i18n/index';
import { APP_CONFIG } from '../../constants/config';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    key:         'slide1',
    icon:        'package-variant',
    color:       COLORS.primary,
    title:       () => t('onboarding.slide1.title'),
    description: () => t('onboarding.slide1.description'),
  },
  {
    key:         'slide2',
    icon:        'tag-multiple-outline',
    color:       '#4ECDC4',
    title:       () => t('onboarding.slide2.title'),
    description: () => t('onboarding.slide2.description'),
  },
  {
    key:         'slide3',
    icon:        'truck-fast',
    color:       '#6366F1',
    title:       () => t('onboarding.slide3.title'),
    description: () => t('onboarding.slide3.description'),
  },
];

export default function OnboardingScreen({ navigation }) {
  const insets      = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX     = useRef(new Animated.Value(0)).current;

  async function finishOnboarding() {
    await AsyncStorage.setItem(APP_CONFIG.ONBOARDING_KEY, 'done').catch(() => {});
    navigation.replace('Login');
  }

  function goNext() {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      finishOnboarding();
    }
  }

  // ✅ onMomentumScrollEnd à la place de viewabilityConfigCallbackPairs
  // Évite l'erreur "Changing viewabilityConfigCallbackPairs on the fly"
  function onMomentumScrollEnd(e) {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  }

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      {/* Bouton Passer */}
      <TouchableOpacity onPress={finishOnboarding} style={styles.skipBtn}>
        <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
      </TouchableOpacity>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={onMomentumScrollEnd} // ✅ remplace viewabilityConfig
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={[styles.iconCircle, { backgroundColor: item.color + '20' }]}>
              <MaterialCommunityIcons name={item.icon} size={80} color={item.color} />
            </View>
            <Text style={styles.slideTitle}>{item.title()}</Text>
            <Text style={styles.slideDesc}>{item.description()}</Text>
          </View>
        )}
      />

      {/* Dots indicateurs */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                { width: dotWidth, opacity, backgroundColor: COLORS.primary },
              ]}
            />
          );
        })}
      </View>

      {/* Bouton Suivant / Commencer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity onPress={goNext} style={styles.nextBtn} activeOpacity={0.88}>
          <LinearGradient
            colors={COLORS.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextGradient}
          >
            <Text style={styles.nextText}>
              {isLast ? t('onboarding.start') : t('onboarding.next')}
            </Text>
            <MaterialCommunityIcons
              name={isLast ? 'check' : 'arrow-right'}
              size={20}
              color={COLORS.white}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:         { flex: 1, backgroundColor: COLORS.background },
  skipBtn:      { alignSelf: 'flex-end', paddingHorizontal: 20, paddingVertical: 12 },
  skipText:     { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  slide:        { width, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  iconCircle:   { width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  slideTitle:   { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 16 },
  slideDesc:    { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 26 },
  dotsRow:      { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 32 },
  dot:          { height: 8, borderRadius: 4 },
  footer:       { paddingHorizontal: 24 },
  nextBtn:      { borderRadius: 18, overflow: 'hidden' },
  nextGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  nextText:     { fontSize: 17, fontWeight: '800', color: COLORS.white },
});
