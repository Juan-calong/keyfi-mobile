import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextStyle,
  ViewStyle,
  Platform,
  Image,
} from "react-native";
import { t } from "../tokens";

import KEYFI_LOGO from "../../assets/logo/keyfi-img.jpeg";

type Props = {
  title?: string;
  onMenu?: () => void;

  titleStyle?: TextStyle;
  menuVariant?: "default" | "bare";
  menuIconSize?: number;

  backgroundColor?: string;
  showDivider?: boolean;
  containerStyle?: ViewStyle;
};

export function HeaderBar({
  title,
  onMenu,
  titleStyle,
  menuVariant = "default",
  menuIconSize = 20,
  backgroundColor = "transparent",
  showDivider = true,
  containerStyle,
}: Props) {
  const bare = menuVariant === "bare";
  const showLogo = String(title ?? "").trim().toUpperCase() === "KEYFI";

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor },
        showDivider && styles.divider,
        containerStyle,
      ]}
    >
      <Pressable
        onPress={onMenu}
        hitSlop={10}
        style={[styles.menuBtn, bare && styles.menuBtnBare]}
      >
        <View style={{ gap: 4 }}>
          <View style={[styles.line, { width: menuIconSize }]} />
          <View style={[styles.line, { width: menuIconSize }]} />
          <View style={[styles.line, { width: menuIconSize }]} />
        </View>
      </Pressable>

      <View style={styles.titleContainer}>
        {showLogo ? (
          <Image
            source={KEYFI_LOGO}
            style={styles.logo}
            resizeMode="contain"
          />
        ) : (
          <Text style={[t.text.brand, styles.title, titleStyle]} numberOfLines={1}>
            {title}
          </Text>
        )}
      </View>

      <View style={styles.rightSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 56,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: "transparent",
        shadowOpacity: 0,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 0 },
      },
      android: {
        elevation: 0,
      },
    }),
  },

  titleContainer: {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
},

logo: {
  width: 140,
  height: 95,
},

  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.12)",
  },

  rightSpacer: {
    width: 44,
    height: 44,
  },

title: {
  textAlign: "center",
  color: "#000000",
},

  menuBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.14)",
  },

  menuBtnBare: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },

  line: {
    height: 2,
    borderRadius: 999,
    backgroundColor: "#000000",
    opacity: 0.9,
  },
});