import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type OrderStatus = 'pending' | 'completed' | 'cancelled';

interface Order {
  id: string;
  created_at: string;
  status: OrderStatus;
  buyer_id: string;
  vendor_id: string;
  quantity: number;
  listings: {
    title: string;
    price: number;
    image?: string; // Ajout de l'image de l'article
  } | null;
  profiles: {
    full_name?: string;
    phone?: string;
    city?: string;
  } | null;
}

export default function SellerOrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');

  const fetchSellerOrders = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupération des détails de l'annonce et du profil de l'acheteur (via la FK buyer_id vers profiles)
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          status,
          buyer_id,
          vendor_id,
          quantity,
          listing_id,
          listings(
            title,
            price,
            image
          ),
          profiles!orders_buyer_id_fkey (
            full_name,
            phone,
            city
          )
        `)
        .eq('vendor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data as any) || []);
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de charger les commandes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellerOrders();
  }, []);

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setUpdatingId(orderId);
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Échec de la mise à jour du statut.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = orders.filter(order => 
    filterStatus === 'all' ? true : order.status === filterStatus
  );

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return { bg: '#FEF3C7', text: '#D97706' };
      case 'completed': return { bg: '#DCFCE7', text: '#16A34A' };
      case 'cancelled': return { bg: '#FEE2E2', text: '#DC2626' };
    }
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const statusColors = getStatusColor(item.status);
    const totalPrice = item.listings ? item.listings.price * item.quantity : 0;
    const buyer = item.profiles;

    return (
      <View style={styles.orderCard}>
        {/* Entête avec statut */}
        <View style={styles.orderHeader}>
          <Text style={styles.orderIdText}>Commande #{item.id.slice(0, 8).toUpperCase()}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusText, { color: statusColors.text }]}>
              {item.status === 'pending' ? 'EN ATTENTE' : item.status === 'completed' ? 'VALIDÉ' : 'ANNULÉ'}
            </Text>
          </View>
        </View>

        {/* Bloc Article : Image + Infos */}
        <View style={styles.productRow}>
          {item.listings?.image ? (
            <Image source={{ uri: item.listings.image }} style={styles.productImage} />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="image-outline" size={20} color="#A1A1AA" />
            </View>
          )}
          <View style={styles.productInfo}>
            <Text style={styles.productTitle} numberOfLines={1}>
              {item.listings?.title || 'Article inconnu'}
            </Text>
            <Text style={styles.detailText}>Quantité : {item.quantity}</Text>
            <Text style={styles.priceText}>{totalPrice.toLocaleString('fr-FR')} Dhs</Text>
          </View>
        </View>

        {/* Bloc Acheteur dédié */}
        <View style={styles.buyerContainer}>
          <Text style={styles.buyerSectionTitle}>Détails de l'acheteur</Text>
          
          <View style={styles.buyerDetailRow}>
            <Ionicons name="person-outline" size={14} color="#71717A" />
            <Text style={styles.buyerDetailText}>
              {buyer?.full_name || 'Nom non renseigné'}
            </Text>
          </View>

          {buyer?.phone && (
            <View style={styles.buyerDetailRow}>
              <Ionicons name="call-outline" size={14} color="#71717A" />
              <Text style={styles.buyerDetailText}>{buyer.phone}</Text>
            </View>
          )}

          {buyer?.city && (
            <View style={styles.buyerDetailRow}>
              <Ionicons name="location-outline" size={14} color="#71717A" />
              <Text style={styles.buyerDetailText}>{buyer.city}</Text>
            </View>
          )}
        </View>

        {/* Actions de validation */}
        {item.status === 'pending' && (
          <View style={styles.actionRow}>
            {updatingId === item.id ? (
              <ActivityIndicator color="#09090B" style={styles.loader} />
            ) : (
              <>
                <TouchableOpacity 
                  style={[styles.btnAction, styles.btnCancel]}
                  onPress={() => updateOrderStatus(item.id, 'cancelled')}
                >
                  <Ionicons name="close-circle-outline" size={14} color="#DC2626" />
                  <Text style={styles.btnCancelText}>Refuser</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.btnAction, styles.btnComplete]}
                  onPress={() => updateOrderStatus(item.id, 'completed')}
                >
                  <Ionicons name="checkmark-circle-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.btnCompleteText}>Accepter</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Commandes Reçues</Text>
        <Text style={styles.headerSubtitle}>Gérez vos ventes et demandes de réservation</Text>
      </View>

      <View style={styles.filterTabs}>
        {(['all', 'pending', 'completed', 'cancelled'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, filterStatus === tab && styles.activeTab]}
            onPress={() => setFilterStatus(tab)}
          >
            <Text style={[styles.tabText, filterStatus === tab && styles.activeTabText]}>
              {tab === 'all' ? 'Toutes' : tab === 'pending' ? 'En attente' : tab === 'completed' ? 'Acceptées' : 'Refusées'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color="#09090B" />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="receipt-outline" size={26} color="#A1A1AA" />
              </View>
              <Text style={styles.emptyText}>Aucune commande trouvée</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#09090B',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#71717A',
    marginTop: 2,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginVertical: 14,
    gap: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  activeTab: {
    backgroundColor: '#09090B',
    borderColor: '#09090B',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#71717A',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 2,
    padding: 16,
    marginBottom: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
  },
  orderIdText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#71717A',
  },
  productRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 12,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 2,
    backgroundColor: '#F4F4F5',
  },
  productImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 2,
    backgroundColor: '#F4F4F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#09090B',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 2,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  detailText: {
    fontSize: 12,
    color: '#71717A',
    fontWeight: '500',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#09090B',
    marginTop: 2,
  },
  buyerContainer: {
    marginTop: 14,
    padding: 12,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#F4F4F5',
    borderRadius: 2,
    gap: 6,
  },
  buyerSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#09090B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  buyerDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buyerDetailText: {
    fontSize: 13,
    color: '#3F3F46',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F4F4F5',
    paddingTop: 12,
    marginTop: 14,
  },
  btnAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 2,
    borderWidth: 1,
  },
  btnCancel: {
    borderColor: '#E4E4E7',
    backgroundColor: '#FFFFFF',
  },
  btnCancelText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  btnComplete: {
    borderColor: '#09090B',
    backgroundColor: '#09090B',
  },
  btnCompleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  loader: {
    paddingVertical: 6,
    paddingHorizontal: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyIconBox: {
    width: 54,
    height: 54,
    borderRadius: 2,
    backgroundColor: '#F4F4F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  emptyText: {
    color: '#71717A',
    fontSize: 14,
    fontWeight: '600',
  },
});