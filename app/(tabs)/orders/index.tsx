import { useStartConversation } from '@/hook/useStartConversation';
import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

type Order = {
  id: string;
  quantity: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  listing_id: number;
  listings: {
    id: number;
    title: string;
    price: number;
    image: string | null;
    category_id: number;
    vendor_id: string; // Utilisation de vendor_id
    profiles: {
      full_name: string | null;
      city: string | null;
    } | null;
  };
};

type Recommendation = {
  id: number;
  title: string;
  price: number;
  image: string | null;
};

export default function OrdersScreen() {
  const router = useRouter();
  const { startConversation, loading: chatLoading } = useStartConversation();

  const [orders, setOrders] = useState<Order[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeListingId, setActiveListingId] = useState<number | null>(null);

  const FLOATING_TAB_BAR_HEIGHT = 80;

  // Handler d'ouverture de discussion
  const handleContactSeller = async (listingId: number, sellerId: string) => {
    setActiveListingId(listingId);
    await startConversation(listingId, sellerId);
    setActiveListingId(null);
  };

  const fetchOrdersAndSuggestions = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          quantity,
          status,
          created_at,
          listing_id,
          listings:listing_id(
            id, 
            title, 
            price, 
            image, 
            category_id,
            vendor_id,
            profiles(full_name, city)
          )
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      
      const fetchedOrders = (ordersData as any) || [];
      setOrders(fetchedOrders);

      if (fetchedOrders.length > 0 && fetchedOrders[0].listings) {
        const lastOrderCategoryId = fetchedOrders[0].listings.category_id;
        const lastOrderListingId = fetchedOrders[0].listings.id;

        const { data: recData, error: recError } = await supabase
          .from('listings')
          .select('id, title, price, image')
          .eq('category_id', lastOrderCategoryId)
          .neq('id', lastOrderListingId)
          .limit(4);

        if (!recError && recData) {
          setRecommendations(recData);
        }
      }
    } catch (error) {
      console.error('Erreur chargement commandes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrdersAndSuggestions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrdersAndSuggestions(true);
  };

  const cancelOrder = async (orderId: string) => {
    Alert.alert(
      "Annuler la commande",
      "Êtes-vous sûr de vouloir annuler cette demande ?",
      [
        { text: "Retour", style: "cancel" },
        {
          text: "Confirmer l'annulation",
          style: "destructive",
          onPress: async () => {
            const previousOrders = [...orders];
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));

            try {
              const targetId = isNaN(Number(orderId)) ? orderId : Number(orderId);
              
              const { error } = await supabase
                .from('orders')
                .update({ status: 'cancelled' })
                .eq('id', targetId);

              if (error) throw error;
              Alert.alert("Annulée", "Votre commande a bien été annulée.");
            } catch (error: any) {
              console.error("Erreur annulation:", error);
              Alert.alert("Erreur", "Impossible d'annuler la commande.");
              setOrders(previousOrders);
            }
          }
        }
      ]
    );
  };

  const reactivateOrder = async (orderId: string) => {
    Alert.alert(
      "Réactiver la commande",
      "Souhaitez-vous repasser cette commande en attente de validation ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Réactiver",
          onPress: async () => {
            const previousOrders = [...orders];
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'pending' } : o));

            try {
              const targetId = isNaN(Number(orderId)) ? orderId : Number(orderId);
              
              const { error } = await supabase
                .from('orders')
                .update({ status: 'pending' })
                .eq('id', targetId);

              if (error) throw error;
              Alert.alert("Réactivée", "Votre commande est de nouveau en attente.");
            } catch (error: any) {
              console.error("Erreur réactivation:", error);
              Alert.alert("Erreur", "Impossible de réactiver la commande.");
              setOrders(previousOrders);
            }
          }
        }
      ]
    );
  };

  const getStatusDetails = (status: Order['status']) => {
    switch (status) {
      case 'pending': return { label: 'EN ATTENTE', color: '#381D00', allowCancel: true, allowReactivate: false };
      case 'completed': return { label: 'CONFIRMÉE', color: '#16A34A', allowCancel: false, allowReactivate: false };
      case 'cancelled': return { label: 'ANNULÉE', color: '#DC2626', allowCancel: false, allowReactivate: true };
      default: return { label: 'STATUT INCONNU', color: '#71717A', allowCancel: false, allowReactivate: false };
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Suivi Historique</Text>
        <Text style={styles.headerSubtitle}>{orders.length} commande(s) répertoriée(s)</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContainer, { paddingBottom: 40 + FLOATING_TAB_BAR_HEIGHT }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#09090B" />
        }
      >
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune activité récente</Text>
          </View>
        ) : (
          orders.map((item) => {
            if (!item.listings) return null;
            const statusConfig = getStatusDetails(item.status);
            const sellerName = item.listings.profiles?.full_name || 'Vendeur particulier';
            const sellerCity = item.listings.profiles?.city || 'Non renseignée';
            const sellerId = item.listings.vendor_id; // Correction: récupération de vendor_id
            const isThisCardLoading = chatLoading && activeListingId === item.listings.id;

            return (
              <View key={item.id} style={styles.orderCard}>
                <View style={styles.orderCardHeader}>
                  <Text style={[styles.statusTag, { color: statusConfig.color }]}>
                    • {statusConfig.label}
                  </Text>
                  <Text style={styles.orderDate}>
                    {new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>

                <Pressable 
                  style={styles.orderCardBody}
                  onPress={() => router.push({ pathname: '/listings/[id]', params: { id: item.listings.id.toString() } })}
                >
                  {item.listings.image ? (
                    <Image source={{ uri: item.listings.image }} style={styles.itemImage} />
                  ) : (
                    <View style={styles.itemPlaceholder}>
                      <Ionicons name="image-outline" size={18} color="#A1A1AA" />
                    </View>
                  )}

                  <View style={styles.itemDetails}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{item.listings.title}</Text>
                    <Text style={styles.sellerInfo} numberOfLines={1}>
                      Par : {sellerName} • {sellerCity}
                    </Text>
                    <Text style={styles.itemMeta}>Quantité : {item.quantity}</Text>
                    <Text style={styles.itemPrice}>
                      {(item.listings.price * item.quantity).toLocaleString('fr-FR')} Dhs
                    </Text>
                  </View>
                </Pressable>

                {/* Bouton de contact vendeur */}
                {sellerId && (
                  <Pressable
                    style={styles.chatSellerButton}
                    disabled={chatLoading}
                    onPress={() => handleContactSeller(item.listings.id, sellerId)}
                  >
                    {isThisCardLoading ? (
                      <ActivityIndicator size="small" color="#09090B" />
                    ) : (
                      <>
                        <Ionicons name="chatbubble-ellipses-outline" size={16} color="#09090B" />
                        <Text style={styles.chatSellerButtonText}>DISCUTER AVEC LE VENDEUR</Text>
                      </>
                    )}
                  </Pressable>
                )}

                {statusConfig.allowCancel && (
                  <Pressable 
                    style={styles.cancelButton} 
                    onPress={() => cancelOrder(item.id)}
                  >
                    <Text style={styles.cancelButtonText}>ANNULER LA DEMANDE</Text>
                  </Pressable>
                )}

                {statusConfig.allowReactivate && (
                  <Pressable 
                    style={styles.reactivateButton} 
                    onPress={() => reactivateOrder(item.id)}
                  >
                    <Text style={styles.reactivateButtonText}>RÉACTIVER LA DEMANDE</Text>
                  </Pressable>
                )}
              </View>
            );
          })
        )}

        {recommendations.length > 0 && (
          <View style={styles.recommendationSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>SÉLECTION COMPLÉMENTAIRE</Text>
              <View style={styles.sectionLine} />
            </View>

            <View style={styles.gridContainer}>
              {recommendations.map((rec) => (
                <Pressable 
                  key={rec.id} 
                  style={({ pressed }) => [
                    styles.recCard,
                    { opacity: pressed ? 0.8 : 1 }
                  ]}
                  onPress={() => router.push({ pathname: '/listings/[id]', params: { id: rec.id } })}
                >
                  {rec.image ? (
                    <Image source={{ uri: rec.image }} style={styles.recImage} />
                  ) : (
                    <View style={styles.recPlaceholder}>
                      <Ionicons name="image-outline" size={16} color="#A1A1AA" />
                    </View>
                  )}
                  <Text style={styles.recTitle} numberOfLines={1}>{rec.title}</Text>
                  <Text style={styles.recPrice}>{rec.price.toLocaleString('fr-FR')} Dhs</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#FAFAFA',
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
  scrollContainer: {
    paddingHorizontal: 24,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 4,
    padding: 16,
    marginBottom: 20,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#F4F4F5',
    paddingBottom: 12,
    marginBottom: 12,
  },
  statusTag: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  orderDate: {
    fontSize: 12,
    color: '#71717A',
    fontWeight: '500',
  },
  orderCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: 2,
    resizeMode: 'cover',
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  itemPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 2,
    backgroundColor: '#F4F4F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#09090B',
    letterSpacing: -0.1,
  },
  sellerInfo: {
    fontSize: 12,
    color: '#27272A',
    fontWeight: '500',
    marginTop: 2,
  },
  itemMeta: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#09090B',
    marginTop: 4,
  },
  chatSellerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F4F5',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 2,
    height: 40,
    marginTop: 14,
    gap: 6,
  },
  chatSellerButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#09090B',
    letterSpacing: 0.5,
  },
  cancelButton: {
    backgroundColor: '#e2260e',
    borderRadius: 2,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  reactivateButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 2,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  reactivateButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#71717A',
    fontWeight: '500',
  },
  recommendationSection: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#09090B',
    letterSpacing: 1,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E4E4E7',
    marginLeft: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  recCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 2,
    padding: 10,
    marginBottom: 16,
  },
  recImage: {
    width: '100%',
    height: 120,
    borderRadius: 0,
    resizeMode: 'cover',
  },
  recPlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#F4F4F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#09090B',
    marginTop: 8,
  },
  recPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#71717A',
    marginTop: 2,
  },
});