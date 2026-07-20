import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width } = Dimensions.get('window');

type CartItem = {
  id: string;
  quantity: number;
  listing_id: number;
  listings: {
    id: number;
    title: string;
    price: number;
    image: string | null;
    quantity: number;
  };
};

type RecommendationItem = {
  id: number;
  title: string;
  price: number;
  image: string | null;
};

export default function CartScreen() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const insets = useSafeAreaInsets();
  const FLOATING_TAB_BAR_HEIGHT = 80;

  // Safely fetch cart records targeting the public.cart table structure
  const fetchCart = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) return;

      const { data, error } = await supabase
        .from('cart')
        .select(`
          id,
          quantity,
          listing_id,
          listings(id, title, price, image, quantity)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      
      const fetchedCartItems = (data as any) || [];
      setCartItems(fetchedCartItems);

      // Trigger recommendation fetch loop if items exist in the cart
      if (fetchedCartItems.length > 0) {
        await fetchPriceBasedRecommendations(fetchedCartItems);
      } else {
        setRecommendations([]);
      }
    } catch (error: any) {
      console.error('Error fetching cart data cleanly:', error);
      Alert.alert('Erreur', 'Impossible de charger les éléments du panier.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Safe search logic to fetch items with similar pricing architectures
  const fetchPriceBasedRecommendations = async (currentCart: CartItem[]) => {
    try {
      // Aggregate unique listing ids to prevent self-recommendation
      const excludedIds = currentCart.map(item => item.listing_id);
      
      // Compute price range criteria based on the first item in the cart array
      const targetPrice = currentCart[0]?.listings?.price || 0;
      const minPrice = targetPrice * 0.7; // 30% below target price
      const maxPrice = targetPrice * 1.3; // 30% above target price

      const { data, error } = await supabase
        .from('listings')
        .select('id, title, price, image')
        .eq('status', 'active')
        .gte('price', minPrice)
        .lte('price', maxPrice)
        .not('id', 'in', `(${excludedIds.join(',')})`)
        .limit(10);

      if (error) throw error;

      if (data) {
        // Shuffle results array randomly to alter display order on every load execution
        const randomizedList = [...data].sort(() => Math.random() - 0.5);
        setRecommendations(randomizedList as RecommendationItem[]);
      }
    } catch (recError) {
      console.error('Failed to load pricing recommendations safely:', recError);
      setRecommendations([]); // Fail-safe fallback state
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCart(true);
  };

  // Safely update specific item quantity directly inside public.cart table
  const updateQuantity = async (cartItemId: string, currentQty: number, stockMax: number, delta: number) => {
    const newQty = currentQty + delta;
    if (newQty < 1) return;
    if (newQty > stockMax) {
      Alert.alert("Limite de stock", `Seulement ${stockMax} unités sont disponibles pour cet article.`);
      return;
    }

    // Optimistic UI update implementation
    const previousItems = [...cartItems];
    setCartItems(prev => prev.map(item => item.id === cartItemId ? { ...item, quantity: newQty } : item));

    try {
      const { error } = await supabase
        .from('cart')
        .update({ quantity: newQty })
        .eq('id', cartItemId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating cart record quantity safely:', error);
      // Fallback to absolute server state on update failure
      setCartItems(previousItems);
    }
  };

  // Safely remove a single record from the public.cart table
  const removeItem = async (cartItemId: string) => {
    Alert.alert(
      "Retirer l'article",
      "Voulez-vous vraiment retirer cet article de votre sélection ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Retirer",
          style: "destructive",
          onPress: async () => {
            const previousItems = [...cartItems];
            const updatedItems = cartItems.filter(item => item.id !== cartItemId);
            setCartItems(updatedItems);

            try {
              const { error } = await supabase
                .from('cart')
                .delete()
                .eq('id', cartItemId);

              if (error) throw error;
              
              // Dynamically re-evaluate recommendations state on array changes
              if (updatedItems.length > 0) {
                await fetchPriceBasedRecommendations(updatedItems);
              } else {
                setRecommendations([]);
              }
            } catch (error: any) {
              console.error('Error handling single record cart drop execution:', error);
              Alert.alert("Erreur", "Impossible de supprimer l'article pour le moment.");
              setCartItems(previousItems);
            }
          }
        }
      ]
    );
  };

  // Safe transactional checkout pipeline leveraging the PostgreSQL RPC method
  const handleConfirmCheckout = async () => {
    if (cartItems.length === 0 || isSubmitting) return;

    try {
      setIsSubmitting(true);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      
      if (!user) {
        Alert.alert('Connexion requise', 'Veuillez vous connecter pour valider votre panier.');
        return;
      }

      // Execute database logic: transfers cart rows to structural orders table atomically
      const { error: rpcError } = await supabase.rpc('convert_cart_to_orders', {
        p_buyer_id: user.id,
      });

      if (rpcError) throw rpcError;

      Alert.alert(
        'Commande validée !',
        'Votre sélection a été transmise avec succès aux vendeurs correspondants.',
        [{ text: 'Super', onPress: () => router.replace('/(tabs)/orders') }]
      );
      
    } catch (error: any) {
      console.error('Transactional error captured inside checkout loop:', error);
      Alert.alert('Échec de validation', error.message || 'Une erreur système est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + ((item.listings?.price || 0) * item.quantity), 0);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color="#09090B" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Minimalist Linear Header Layout */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mon Panier</Text>
          <Text style={styles.headerSubtitle}>
            {cartItems.length === 0
              ? 'Aucun article sélectionné'
              : `${cartItems.length} article${cartItems.length > 1 ? 's' : ''} en attente`
            }
          </Text>
        </View>
        <View style={styles.bagIconContainer}>
          <Ionicons name="bag-handle-outline" size={18} color="#09090B" />
          {cartItems.length > 0 && <View style={styles.badgeDot} />}
        </View>
      </View>

      <FlatList
        data={cartItems}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: cartItems.length > 0 ? 180 + FLOATING_TAB_BAR_HEIGHT : 40 }
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#09090B" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="bag-remove-outline" size={28} color="#A1A1AA" />
            </View>
            <Text style={styles.emptyText}>Votre panier est vide</Text>
            <Text style={styles.emptySubtext}>Découvrez nos collections exclusives et commencez votre sélection.</Text>
          </View>
        }
        renderItem={({ item }) => {
          if (!item.listings) return null;
          return (
            <View style={styles.cartCard}>
              <View style={styles.imageWrapper}>
                {item.listings.image ? (
                  <Image source={{ uri: item.listings.image }} style={styles.itemImage} />
                ) : (
                  <View style={styles.itemPlaceholder}>
                    <Ionicons name="image-outline" size={18} color="#A1A1AA" />
                  </View>
                )}
              </View>

              <View style={styles.itemDetails}>
                <View style={styles.titleRow}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{item.listings.title}</Text>
                  <Pressable onPress={() => removeItem(item.id)} style={styles.deleteButton}>
                    <Ionicons name="trash-outline" size={15} color="#EF4444" />
                  </Pressable>
                </View>

                <View style={styles.actionRow}>
                  <Text style={styles.itemPrice}>
                    {Number(item.listings.price || 0).toLocaleString('fr-FR')} Dhs
                  </Text>

                  {/* Squared modern quantity adjuster */}
                  <View style={styles.quantitySelector}>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.id, item.quantity, item.listings.quantity, -1)}
                    >
                      <Ionicons name="remove" size={12} color="#09090B" />
                    </Pressable>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.id, item.quantity, item.listings.quantity, 1)}
                    >
                      <Ionicons name="add" size={12} color="#09090B" />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          cartItems.length > 0 && recommendations.length > 0 ? (
            <View style={styles.recommendationsContainer}>
              <View style={styles.recHeaderRow}>
                <Text style={styles.recSectionTitle}>Sélectionné pour vous</Text>
                <View style={styles.recBadge}>
                  <Text style={styles.recBadgeText}>Prix similaire</Text>
                </View>
              </View>
              <FlatList
                data={recommendations}
                
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.recHorizontalList}
                renderItem={({ item }) => (
                  <Pressable 
                    style={styles.recCard}
                    onPress={() => router.push(`/listings/${item.id}`)}
                  >
                    <View style={styles.recImageWrapper}>
                      {item.image ? (
                        <Image source={{ uri: item.image }} style={styles.recImage} />
                      ) : (
                        <View style={styles.recPlaceholder}>
                          <Ionicons name="image-outline" size={20} color="#A1A1AA" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.recTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.recPrice}>
                      {Number(item.price || 0).toLocaleString('fr-FR')} Dhs
                    </Text>
                  </Pressable>
                )}
              />
            </View>
          ) : null
        }
      />

      {/* Checkout control component rendering overlay */}
      {cartItems.length > 0 && (
        <View style={[
          styles.footerWrapper,
          { bottom: FLOATING_TAB_BAR_HEIGHT + (insets.bottom > 0 ? 0 : 12) }
        ]}>
          <View style={styles.footerBar}>
            <View style={styles.totalRow}>
              <View>
                <Text style={styles.totalLabel}>Sous-total estimé</Text>
                <Text style={styles.currencyNote}>Frais de livraison calculés à la validation</Text>
              </View>
              <Text style={styles.totalPrice}>
                {calculateTotal().toLocaleString('fr-FR')} Dhs
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.checkoutButton, 
                (pressed || isSubmitting) && styles.checkoutButtonPressed
              ]}
              disabled={isSubmitting}
              onPress={handleConfirmCheckout}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#09090B" />
              ) : (
                <>
                  <Text style={styles.checkoutText}>CONFIRMER LA SÉLECTION</Text>
                  <Ionicons name="arrow-forward" size={14} color="#09090B" style={styles.checkoutIcon} />
                </>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#09090B',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#71717A',
    fontWeight: '500',
    marginTop: 2,
  },
  bagIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#09090B',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  cartCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  imageWrapper: {
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#F4F4F5',
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  itemImage: {
    width: 72,
    height: 72,
    resizeMode: 'cover',
  },
  itemPlaceholder: {
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 16,
    height: 72,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#09090B',
    flex: 1,
    marginRight: 12,
    letterSpacing: -0.1,
  },
  deleteButton: {
    padding: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#09090B',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F4F5',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    padding: 1,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#09090B',
    paddingHorizontal: 8,
    textAlign: 'center',
    minWidth: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 2,
    backgroundColor: '#F4F4F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#09090B',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#71717A',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  recommendationsContainer: {
    marginTop: 24,
    paddingTop: 8,
  },
  recHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  recSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#09090B',
    letterSpacing: -0.3,
  },
  recBadge: {
    backgroundColor: '#F4F4F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  recBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#71717A',
  },
  recHorizontalList: {
    gap: 12,
    paddingBottom: 8,
  },
  recCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 2,
    padding: 8,
  },
  recImageWrapper: {
    backgroundColor: '#F4F4F5',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    marginBottom: 8,
  },
  recImage: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
  },
  recPlaceholder: {
    width: '100%',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#09090B',
    marginBottom: 4,
  },
  recPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#09090B',
  },
  footerWrapper: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 99,
  },
  footerBar: {
    backgroundColor: '#09090B',
    borderRadius: 2,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 11,
    color: '#A1A1AA',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currencyNote: {
    fontSize: 10,
    color: '#71717A',
    marginTop: 1,
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  checkoutButton: {
    backgroundColor: '#FFFFFF',
    height: 48,
    borderRadius: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutButtonPressed: {
    opacity: 0.85,
  },
  checkoutIcon: {
    marginLeft: 8,
  },
  checkoutText: {
    color: '#09090B',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});