import React from 'react';
import { act } from 'react-test-renderer';
import { harness, deferred, flush, setUser } from '../testing/testUtils';
import { api } from '../../../core/api/client';
import { favoritesKeys } from '../favorites.keys';
import { ProductFavoriteButton } from '../../components/product-details/ProductFavoriteButton';
import { CustomerHomeScreen } from '../../../screens/customer/CustomerHomeScreen';
import { OwnerHomeScreen } from '../../../screens/owner/OwnerHomeScreen';
import { CustomerBuyScreen } from '../../../screens/customer/CustomerBuyScreen';
import { OwnerBuyScreen } from '../../../screens/owner/OwnerBuyScreen';
import { SharedProductDetails } from '../../components/product-details/SharedProductDetails';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn(), dispatch: jest.fn() }), useRoute: () => ({ params: {} }), useFocusEffect: jest.fn(), DrawerActions: { openDrawer: jest.fn() } }));
jest.mock('@react-navigation/bottom-tabs', () => ({ useBottomTabBarHeight: () => 0 }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('../../components/product-details/ProductMediaViewerModal', () => ({ ProductMediaViewerModal: () => null }));
const product = { id: 'p', name: 'Produto', sku: 'SKU', price: '10', active: true, stock: 10, isFavorite: true, favorited: true, images: [] };

it.each(['CUSTOMER', 'SALON_OWNER'] as const)('Home + Shop + Details + related share membership for %s despite catalog flags', async (role) => {
  setUser('A', role);
  const h = harness();
  h.client.setQueryData(favoritesKeys.ids('A', role), []);
  (api.get as jest.Mock).mockImplementation(async (url) => {
    if (url === '/products') { return { data: { items: [product] } }; }
    if (url.includes('/comments/me')) { return { data: { canComment: false } }; }
    return { data: { items: [], productIds: [] } };
  });
  const pending = deferred<{ data: { favorited: boolean } }>();
  (api.put as jest.Mock).mockReturnValue(pending.promise);
  const Home = role === 'CUSTOMER' ? CustomerHomeScreen : OwnerHomeScreen;
  const Shop = role === 'CUSTOMER' ? CustomerBuyScreen : OwnerBuyScreen;
  try {
    const tree = await h.mount(<><Home /><Shop /><SharedProductDetails product={product} productQuery={{ isLoading: false, isError: false, refetch: jest.fn() }} relatedQuery={{ isLoading: false, isError: false, refetch: jest.fn() }} relatedItems={[product]} viewerMode={role === 'CUSTOMER' ? 'CUSTOMER' : 'OWNER'} onBack={jest.fn()} onOpenRelatedProduct={jest.fn()} onAddToCart={jest.fn()} onDecreaseCartItem={jest.fn()} onRemoveFromCart={jest.fn()} onGoToCart={jest.fn()} qtyInCart={0} /></>);
    await flush();
    const buttons = tree.root.findAllByType(ProductFavoriteButton).filter((b) => b.props.productId === 'p');
    expect(buttons.length).toBeGreaterThanOrEqual(4);
    buttons.forEach((b) => expect(b.findByType('Ionicons' as any).props.name).toBe('heart-outline'));
    act(() => { buttons[0].findByProps({ accessibilityRole: 'button' }).props.onPress({ stopPropagation: jest.fn() }); });
    await flush();
    buttons.forEach((b) => expect(b.findByType('Ionicons' as any).props.name).toBe('heart'));
    (api.get as jest.Mock).mockImplementation(async () => ({ data: { items: [], productIds: ['p'] } }));
    pending.resolve({ data: { favorited: true } }); await flush();
  } finally { await h.cleanup(); }
});
it('renders unknown membership as loading, then server membership', async () => {
  const h = harness();
  const http = deferred<{ data: { productIds: string[] } }>();
  (api.get as jest.Mock).mockReturnValue(http.promise);
  try {
    const tree = await h.mount(<ProductFavoriteButton productId="p" />);
    expect(tree.root.findAllByType('Ionicons' as any)).toHaveLength(0);
    http.resolve({ data: { productIds: ['p'] } }); await flush();
    expect(tree.root.findByType('Ionicons' as any).props.name).toBe('heart');
  } finally { await h.cleanup(); }
});
