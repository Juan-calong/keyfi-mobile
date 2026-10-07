import React from 'react';
import { Linking } from 'react-native';
import { act, create } from 'react-test-renderer';
import * as support from '../support.service';
import { CustomerProfileMe } from '../../../screens/customer/CustomerProfileMe';
import { ProfileMeScreen } from '../../../screens/ProfileMeScreen';
import { HomeView } from '../../../features/components/seller-profile/components/HomeView';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), canGoBack: () => false }),
}));
jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: { name: 'Pessoa', wallet: {} },
    isLoading: false,
    isError: false,
  }),
}));
jest.mock('../../api/client', () => ({ api: { get: jest.fn() } }));
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
}));

const sellerProps = {
  profileName: 'Pessoa',
  profileSubtitle: 'Vendedor',
  email: 'seller@example.com',
  referralToken: '',
  hasPix: false,
  hasBeneficiary: false,
  isBlocked: false,
  onOpenDetails: jest.fn(),
  onOpenToken: jest.fn(),
  onOpenPix: jest.fn(),
  onOpenBeneficiary: jest.fn(),
  onOpenLinkSalon: jest.fn(),
  onOpenReferrals: jest.fn(),
  onLogout: jest.fn(),
  onDeleteAccount: jest.fn(),
};

it.each([
  ['CUSTOMER', <CustomerProfileMe />],
  ['SALON_OWNER', <ProfileMeScreen />],
  ['SELLER', <HomeView {...sellerProps} />],
])(
  'offers WhatsApp support in the %s profile through the shared helper',
  async (_role, element) => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const helper = jest.spyOn(support, 'openWhatsAppSupport');
    let tree!: ReturnType<typeof create>;
    try {
      await act(async () => {
        tree = create(element as React.ReactElement);
      });
      const button = tree.root.findByProps({
        accessibilityLabel: 'Suporte. Fale com a KeyFi pelo WhatsApp',
      });
      expect(button.props.accessibilityRole).toBe('button');
      await act(async () => {
        await button.props.onPress();
      });
      expect(helper).toHaveBeenCalledTimes(1);
      expect(open).toHaveBeenCalledWith(
        'https://wa.me/5511996827356?text=Ol%C3%A1%2C%20preciso%20de%20suporte%20com%20a%20KeyFi.',
      );
    } finally {
      if (tree) {
        await act(async () => {
          tree.unmount();
        });
      }
      helper.mockRestore();
      open.mockRestore();
    }
  },
);
