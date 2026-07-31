import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { t } from '../../../../ui/tokens';
import { RowItem } from './RowItem';

type Props = {
  profileName: string;
  profileSubtitle: string;
  email: string;
  referralToken: string;
  hasPix: boolean;
  hasBeneficiary: boolean;
  isBlocked: boolean;
  onOpenDetails: () => void;
  onOpenToken: () => void;
  onOpenPix: () => void;
  onOpenBeneficiary: () => void;
  onOpenLinkSalon: () => void;
  onOpenReferrals: () => void;
  onLogout: () => void;
};

function getInitials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function SummaryDetail({
  iconName,
  value,
}: {
  iconName: string;
  value: string;
}) {
  return (
    <View style={s.summaryDetail}>
      <Ionicons name={iconName} size={18} color={t.colors.muted} />
      <Text style={s.summaryDetailText} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionCard}>{children}</View>
    </View>
  );
}

export function HomeView({
  profileName,
  profileSubtitle,
  email,
  referralToken,
  hasPix,
  hasBeneficiary,
  isBlocked,
  onOpenDetails,
  onOpenToken,
  onOpenPix,
  onOpenBeneficiary,
  onOpenLinkSalon,
  onOpenReferrals,
  onLogout,
}: Props) {
  const initials = getInitials(profileName);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.scrollContent}
    >
      <View style={s.header}>
        <Text style={s.screenTitle}>Perfil</Text>
      </View>

      <Pressable
        onPress={onOpenDetails}
        accessibilityRole="button"
        accessibilityLabel="Meu perfil. Abrir dados do vendedor"
        style={({ pressed }) => [s.summaryCard, pressed && s.pressedCard]}
      >
        <View style={s.summaryHeader}>
          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              <Ionicons name="person-outline" size={34} color="#334155" />
            </View>
            <View style={s.initialsBadge}>
              <Text style={s.initialsText}>{initials}</Text>
            </View>
          </View>

          <View style={s.summaryIdentity}>
            <Text style={s.summaryName} numberOfLines={2}>
              {profileName}
            </Text>
            <Text style={s.summarySubtitle} numberOfLines={1}>
              {profileSubtitle}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={21} color={t.colors.muted} />
        </View>

        <View style={s.summaryDivider} />
        <SummaryDetail iconName="mail-outline" value={email} />
      </Pressable>

      <SectionCard title="Vínculos">
        <RowItem
          iconName="key-outline"
          title="Meu token e link"
          subtitle="Copie ou compartilhe seu convite"
          rightText={referralToken ? 'ATIVO' : 'FALTA'}
          onPress={onOpenToken}
        />
        <RowItem
          iconName="git-network-outline"
          title="Quem usou meu token"
          subtitle="Ver clientes e salões vinculados"
          onPress={onOpenReferrals}
        />
        <RowItem
          iconName="storefront-outline"
          title="Vincular a um salão"
          subtitle="Cole o código do salão e peça acesso"
          onPress={onOpenLinkSalon}
          hideDivider
        />
      </SectionCard>

      <SectionCard title="Recebimentos">
        <RowItem
          iconName="cash-outline"
          title="Recebimento (PIX)"
          subtitle={
            hasPix ? 'Editar dados do PIX' : 'Cadastrar PIX para receber'
          }
          rightText={hasPix ? (isBlocked ? 'BLOQ.' : 'OK') : 'FALTA'}
          onPress={onOpenPix}
        />
        <RowItem
          iconName="person-outline"
          title="Beneficiário"
          subtitle={
            hasBeneficiary
              ? 'Editar dados do beneficiário'
              : 'Cadastrar beneficiário'
          }
          rightText={hasBeneficiary ? 'OK' : 'FALTA'}
          onPress={onOpenBeneficiary}
          hideDivider
        />
      </SectionCard>

      <Pressable
        onPress={onLogout}
        accessibilityRole="button"
        accessibilityLabel="Sair da conta"
        style={({ pressed }) => [s.logoutButton, pressed && s.pressedRow]}
      >
        <View style={s.logoutCopy}>
          <View style={s.logoutIcon}>
            <Ionicons name="log-out-outline" size={19} color="#334155" />
          </View>
          <Text style={s.logoutText}>Sair</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={t.colors.muted} />
      </Pressable>
    </ScrollView>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
  android: { elevation: 2 },
  default: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
});

const s = StyleSheet.create({
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 116,
  },
  header: {
    minHeight: 48,
    justifyContent: 'center',
    marginBottom: 18,
  },
  screenTitle: {
    color: t.colors.text,
    fontFamily: t.fonts.sans,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: 16,
    ...cardShadow,
  },
  pressedCard: {
    opacity: 0.94,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2F7',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  initialsBadge: {
    position: 'absolute',
    right: -3,
    bottom: -2,
    minWidth: 25,
    height: 25,
    paddingHorizontal: 5,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  initialsText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  summaryIdentity: {
    flex: 1,
    minWidth: 0,
  },
  summaryName: {
    color: t.colors.text,
    fontFamily: t.fonts.sans,
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 24,
  },
  summarySubtitle: {
    marginTop: 3,
    color: t.colors.text2,
    fontSize: 13,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    marginVertical: 15,
    backgroundColor: t.colors.border,
  },
  summaryDetail: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryDetailText: {
    flex: 1,
    color: t.colors.text2,
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginTop: 22,
  },
  sectionTitle: {
    marginBottom: 9,
    paddingHorizontal: 2,
    color: t.colors.text2,
    fontFamily: t.fonts.sans,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  sectionCard: {
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: t.colors.border,
    ...cardShadow,
  },
  logoutButton: {
    minHeight: 60,
    marginTop: 22,
    marginBottom: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...cardShadow,
  },
  logoutCopy: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutIcon: {
    width: 38,
    height: 38,
    marginRight: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  logoutText: {
    color: t.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  pressedRow: {
    backgroundColor: '#F8FAFC',
  },
});
