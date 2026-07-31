import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { t } from '../../../../ui/tokens';

type Props = {
  iconName: string;
  title: string;
  subtitle?: string;
  rightText?: string;
  onPress: () => void;
  hideDivider?: boolean;
};

export function RowItem({
  iconName,
  title,
  subtitle,
  rightText,
  onPress,
  hideDivider,
}: Props) {
  const accessibilityLabel = subtitle ? `${title}. ${subtitle}` : title;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        s.row,
        !hideDivider && s.divider,
        pressed && s.pressed,
      ]}
    >
      <View style={s.iconWrap}>
        <Ionicons name={iconName} size={20} color="#334155" />
      </View>

      <View style={s.copy}>
        <Text style={s.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={s.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={s.trailing}>
        {rightText ? <Text style={s.status}>{rightText}</Text> : null}
        <Ionicons name="chevron-forward" size={20} color={t.colors.muted} />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.08)',
  },
  pressed: {
    backgroundColor: '#F8FAFC',
  },
  iconWrap: {
    width: 38,
    height: 38,
    marginRight: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  title: {
    color: t.colors.text,
    fontFamily: t.fonts.sans,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  subtitle: {
    marginTop: 2,
    color: t.colors.text2,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  status: {
    color: t.colors.text2,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
