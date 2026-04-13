import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import moment from 'moment';

export default function MessageBubble({ message, isOwn, isRead, showReadReceipt }) {
  const time = moment(message.createdAt).format('HH:mm');

  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={[styles.text, isOwn ? styles.textOwn : styles.textOther]}>
          {message.contenu}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.time, isOwn ? styles.timeOwn : styles.timeOther]}>
            {time}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row:      { marginVertical: 2, paddingHorizontal: 10 },
  rowOwn:   { alignItems: 'flex-end' },
  rowOther: { alignItems: 'flex-start' },

  bubble: {
    maxWidth:          '75%',
    paddingTop:        8,
    paddingBottom:     6,
    paddingHorizontal: 14,
    borderRadius:      20,
  },
  bubbleOwn: {
    backgroundColor:         '#007AFF',
    borderBottomRightRadius: 5,
  },
  bubbleOther: {
    backgroundColor:        '#E5E5EA',
    borderBottomLeftRadius: 5,
  },

  text:      { fontSize: 16, lineHeight: 22 },
  textOwn:   { color: '#FFFFFF' },
  textOther: { color: '#000000' },

  // Ligne heure + tick alignés à droite en bas
  meta: {
    flexDirection: 'row',
    alignItems:    'center',
    justifyContent:'flex-end',
    gap:           3,
    marginTop:     4,
  },
  time:      { fontSize: 11 },
  timeOwn:   { color: 'rgba(255,255,255,0.65)' },
  timeOther: { color: '#8E8E93' },
});