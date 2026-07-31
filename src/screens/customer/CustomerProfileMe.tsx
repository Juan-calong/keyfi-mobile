import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { Screen } from '../../ui/components/Screen';
import { Container } from '../../ui/components/Container';
import { Loading, ErrorState } from '../../ui/components/State';
import { t } from '../../ui/tokens';

import { api } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { CUSTOMER_SCREENS } from '../../navigation/customer.routes';
import { AppBackButton } from '../../ui/components/AppBackButton';
import {
  IosConfirm,
  type IosConfirmAction,
} from '../../ui/components/IosConfirm';

type MeDTO = any;
type IconName = string;

type AddressParts = {
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
};

const trim = (value: any) => String(value ?? '').trim();

function onlyDigits(value: any) {
  return String(value ?? '').replace(/\D/g, '');
}

function formatPhoneBR(value?: string | null) {
  const digits = onlyDigits(value);
  if (!digits) return 'Sem telefone';

  if (digits.length <= 10) {
    const areaCode = digits.slice(0, 2);
    const firstPart = digits.slice(2, 6);
    const secondPart = digits.slice(6, 10);
    if (!areaCode) return digits;
    return `(${areaCode}) ${firstPart}${secondPart ? `-${secondPart}` : ''}`;
  }

  const areaCode = digits.slice(0, 2);
  const firstPart = digits.slice(2, 7);
  const secondPart = digits.slice(7, 11);
  return `(${areaCode}) ${firstPart}${secondPart ? `-${secondPart}` : ''}`;
}

function pickUserName(me: any) {
  return (
    trim(me?.name || me?.fullName || me?.profile?.name || me?.user?.name) ||
    'Minha conta'
  );
}

function pickEmail(me: any) {
  return (
    trim(me?.email || me?.profile?.email || me?.user?.email) || 'Sem e-mail'
  );
}

function pickPhone(me: any) {
  return (
    me?.phone ||
    me?.phoneNumber ||
    me?.profile?.phone ||
    me?.profile?.phoneNumber ||
    ''
  );
}

function pickAddress(me: any): AddressParts {
  const address = me?.address || me?.profile?.address || {};

  return {
    street: trim(address?.street || me?.street),
    number: trim(address?.number || me?.number),
    district: trim(address?.district || me?.district),
    city: trim(address?.city || me?.city),
    state: trim(address?.state || me?.state),
  };
}

function formatAddress(address: AddressParts) {
  const parts: string[] = [];
  const street = [address.street, address.number].filter(Boolean).join(', ');
  const city = [address.city, address.state].filter(Boolean).join(' - ');

  if (street) parts.push(street);
  if (address.district) parts.push(address.district);
  if (city) parts.push(city);

  return parts.join(' · ') || 'Endereço não informado';
}

function getInitials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function SummaryDetail({
  iconName,
  value,
  numberOfLines = 1,
  last = false,
}: {
  iconName: IconName;
  value: string;
  numberOfLines?: number;
  last?: boolean;
}) {
  return (
    <View style={[s.summaryDetail, !last && s.summaryDetailDivider]}>
      <Ionicons name={iconName} size={18} color={t.colors.muted} />
      <Text style={s.summaryDetailText} numberOfLines={numberOfLines}>
        {value}
      </Text>
    </View>
  );
}

function ProfileSummaryCard({
  userName,
  initials,
  email,
  phone,
  address,
  onPress,
}: {
  userName: string;
  initials: string;
  email: string;
  phone: string;
  address: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Minha conta. Abrir dados do perfil"
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
            {userName}
          </Text>
          <Text style={s.summaryRole} numberOfLines={1}>
            Cliente
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={21} color={t.colors.muted} />
      </View>

      <View style={s.summaryDivider} />

      <SummaryDetail iconName="mail-outline" value={email} />
      <SummaryDetail iconName="call-outline" value={phone} />
      <SummaryDetail
        iconName="location-outline"
        value={address}
        numberOfLines={2}
        last
      />
    </Pressable>
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

function MenuRow({
  iconName,
  title,
  subtitle,
  onPress,
  last = false,
}: {
  iconName: IconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
  last?: boolean;
}) {
  const accessibilityLabel = subtitle ? `${title}. ${subtitle}` : title;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        s.menuRow,
        !last && s.menuRowDivider,
        pressed && s.pressedRow,
      ]}
    >
      <View style={s.menuIcon}>
        <Ionicons name={iconName} size={20} color="#334155" />
      </View>

      <View style={s.menuCopy}>
        <Text style={s.menuTitle} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={s.menuSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={20} color={t.colors.muted} />
    </Pressable>
  );
}

export function CustomerProfileMe() {
  const nav = useNavigation<any>();

  const handleBack = () => {
    if (nav.canGoBack()) {
      nav.goBack();
      return;
    }

    nav.navigate(CUSTOMER_SCREENS.Home);
  };

  const [confirm, setConfirm] = useState<null | {
    title: string;
    message: string;
    actions: IosConfirmAction[];
  }>(null);

  const meQ = useQuery<MeDTO>({
    queryKey: ['me'],
    queryFn: async () => (await api.get(endpoints.profiles.me)).data,
    retry: false,
  });

  const me = meQ.data;
  const userName = pickUserName(me);
  const email = pickEmail(me);
  const phone = formatPhoneBR(pickPhone(me));
  const address = formatAddress(pickAddress(me));
  const initials = getInitials(userName);

  return (
    <Screen style={s.screen}>
      <Container style={s.container}>
        {meQ.isLoading ? (
          <Loading />
        ) : meQ.isError ? (
          <ErrorState onRetry={() => meQ.refetch()} />
        ) : (
          <>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.scrollContent}
            >
              <View style={s.header}>
                <AppBackButton
                  onPress={handleBack}
                  showLabel={false}
                  color={t.colors.text}
                  iconSize={24}
                  style={s.backButton}
                />
                <Text style={s.screenTitle}>Perfil</Text>
              </View>

              <ProfileSummaryCard
                userName={userName}
                initials={initials}
                email={email}
                phone={phone}
                address={address}
                onPress={() => nav.navigate(CUSTOMER_SCREENS.ProfileDetails)}
              />

              <SectionCard title="Compras">
                <MenuRow
                  iconName="receipt-outline"
                  title="Pedidos"
                  onPress={() => nav.navigate(CUSTOMER_SCREENS.Orders)}
                  last
                />
              </SectionCard>

              <SectionCard title="Conta e comunicação">
                <MenuRow
                  iconName="notifications-outline"
                  title="Notificações"
                  onPress={() => nav.navigate(CUSTOMER_SCREENS.Notifications)}
                />
                <MenuRow
                  iconName="link-outline"
                  title="Vincular por token"
                  subtitle="Cole o token do vendedor ou salão"
                  onPress={() => nav.navigate(CUSTOMER_SCREENS.ApplyReferral)}
                  last
                />
              </SectionCard>
            </ScrollView>

            <IosConfirm
              visible={!!confirm}
              title={confirm?.title}
              message={confirm?.message}
              actions={confirm?.actions || []}
              onClose={() => setConfirm(null)}
            />
          </>
        )}
      </Container>
    </Screen>
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
  screen: {
    backgroundColor: '#F3F4F6',
  },
  container: {
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    marginBottom: 18,
  },
  backButton: {
    marginRight: 6,
    paddingRight: 0,
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
  summaryRole: {
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
    paddingVertical: 7,
    gap: 10,
  },
  summaryDetailDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.06)',
  },
  summaryDetailText: {
    flex: 1,
    color: t.colors.text2,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
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
  menuRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.08)',
  },
  pressedRow: {
    backgroundColor: '#F8FAFC',
  },
  menuIcon: {
    width: 38,
    height: 38,
    marginRight: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  menuCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  menuTitle: {
    color: t.colors.text,
    fontFamily: t.fonts.sans,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  menuSubtitle: {
    marginTop: 2,
    color: t.colors.text2,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },
});
