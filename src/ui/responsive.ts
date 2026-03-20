import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

export function useBreakpoints() {
    const { width, height } = useWindowDimensions();

    const isTablet = width >= 768;
    const isWide = width >= 1024;

    const gutter = isTablet ? 24 : 16;
    const maxWidth = isWide ? 980 : isTablet ? 820 : undefined;

    return useMemo(
        () => ({ width, height, isTablet, isWide, gutter, maxWidth }),
        [width, height, isTablet, isWide, gutter, maxWidth]
    );
}
