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
  status: string;
  listing_id: number;
  listings: {
    id: number;
    title: string;
    price: number;
    image: string | null;
    quantity: number;
  };
};

export default function CartScreen() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const insets = useSafeAreaInsets();
  const FLOATING_TAB_BAR_HEIGHT = 80;

  const fetchCart = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          quantity,
          status,
          listing_id,
          listings:listing_id(id, title, price, image, quantity)
        `)
        .eq('buyer_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
      setCartItems((data as any) || []);
    } catch (error) {
      console.error('Erreur chargement panier:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCart(true);
  };

  const updateQuantity = async (orderId: string, currentQty: number, stockMax: number, delta: number) => {
    const newQty = currentQty + delta;
    if (newQty < 1) return;
    if (newQty > stockMax) {
      Alert.alert("Limite de stock", `Seulement ${stockMax} unités sont disponibles.`);
      return;
    }

    try {
      setCartItems(prev => prev.map(item => item.id === orderId ? { ...item, quantity: newQty } : item));
      const { error } = await supabase
        .from('orders')
        .update({ quantity: newQty })
        .eq('id', orderId);

      if (error) throw error;
    } catch (error) {
      console.error('Erreur mise à jour quantité:', error);
      fetchCart(true);
    }
  };

  const removeItem = async (orderId: string) => {
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
            setCartItems(prev => prev.filter(item => item.id !== orderId));

            try {
              const { error } = await supabase
                .from('orders')
                .delete()
                .eq('id', orderId);

              if (error) {
                Alert.alert("Erreur", error.message);
                setCartItems(previousItems);
              }
            } catch (error: any) {
              console.error('Erreur suppression article:', error);
              setCartItems(previousItems);
            }
          }
        }
      ]
    );
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.listings?.price * item.quantity), 0);
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
      {/* Header Minimaliste Linéaire */}
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
                    {item.listings.price.toLocaleString('fr-FR')} Dhs
                  </Text>

                  {/* Sélecteur de quantité carré et moderne */}
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
      />

      {/* Zone de validation et redirection vers l'écran de commandes */}
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
              style={({ pressed }) => [styles.checkoutButton, pressed && styles.checkoutButtonPressed]}
              onPress={() => {
                // Redirection vers l'écran des commandes / historique
                router.push('/(tabs)/orders'); 
              }}
            >
              <Text style={styles.checkoutText}>CONFIRMER LA SÉLECTION</Text>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={styles.checkoutIcon} />
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
    borderRadius: 2, // Architectural / Structure droite
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
    borderRadius: 2, // Finition bords angulaires professionnels
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
  footerWrapper: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 99,
  },
  footerBar: {
    backgroundColor: '#09090B',
    borderRadius: 2, // Redirection vers un style droit et premium
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
    borderRadius: 2, // Bouton rectangulaire moderne hyper clean
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutButtonPressed: {
    opacity: 0.95,
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