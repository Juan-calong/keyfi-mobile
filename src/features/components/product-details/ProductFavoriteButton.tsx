import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFavoriteIds } from '../../favorites/useFavoriteIds';
import { useSetFavorite } from '../../favorites/useSetFavorite';

type Props = {
  productId: string;
  containerStyle?: StyleProp<ViewStyle>;
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
  loaderColor?: string;
  variant?: 'default' | 'plain';
};
export function ProductFavoriteButton({ productId, containerStyle, size = 20, activeColor = '#E11D48', inactiveColor = '#2E2A29', loaderColor = '#E11D48', variant = 'default' }: Props) {
  const ids = useFavoriteIds();
  const mutation = useSetFavorite(productId);
  const favorited = ids.isFavorite(productId);
  const unknown = favorited === undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unknown ? (ids.isError ? 'Tentar carregar favoritos' : 'Carregando favoritos') : favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      accessibilityState={{ disabled: unknown && !ids.isError, busy: ids.isLoading, selected: favorited === true }}
      disabled={unknown && !ids.isError}
      onPress={(e) => {
        e.stopPropagation?.();
        if (unknown) { ids.refetch(); return; }
        mutation.toggle().catch(() => { /* Rollback and GET reconciliation are shared. */ });
      }}
      hitSlop={10}
      style={({ pressed }) => [variant === 'default' ? styles.button : styles.buttonPlain, containerStyle, pressed && styles.buttonPressed]}
    >
      {unknown ? (ids.isError ? <Icon name="refresh" size={size} color={inactiveColor} /> : <ActivityIndicator size="small" color={loaderColor} />) : <Icon name={favorited ? 'heart' : 'heart-outline'} size={size} color={favorited ? activeColor : inactiveColor} />}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
    buttonPlain: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
