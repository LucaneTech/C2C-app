import { AppRefreshControl } from '@/components/AppRefreshControl';
import HeaderUserBadge from '@/components/HeaderUserBadge';
import SearchFilterBanner from '@/components/SearchFilterBanner';
import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from "@expo/vector-icons/MaterialIcons"
import Entypo  from "@expo/vector-icons/Entypo"
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Button,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Category {
  id: number;
  name: string;
}

interface Listing {
  id: number;
  vendor_id: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  image: string | null;
  status: 'active' | 'hidden' | 'sold' | 'archived';
  category: Category | null;
  city: string;
}

export default function App() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | number | null>(null);

  // Fonction réutilisable pour récupérer les données (initiale + rafraîchissement)
  async function getListings() {
    try {
      // Utilisation de l'index partiel natif en filtrant sur status = 'active'
      const { data, error } = await supabase
        .from('listings')
        .select(`
          id, 
          vendor_id,
          profiles:vendor_id(
           city
        ),
          title, 
          description, 
          price,
          quantity,
          image,
          status,
          category:category_id(id, name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedData: Listing[] = data.map((item: any) => ({
          id: item.id,
          vendor_id: item.vendor_id,
          title: item.title,
          description: item.description,
          price: Number(item.price),
          quantity: item.quantity,
          image: item.image,
          status: item.status,
          city: item.profiles.city,
          category: item.category ? { id: item.category.id, name: item.category.name } : null,
        }));
        setListings(formattedData);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des annonces :", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getListings();
  }, []);

  /**
   * Extrait dynamiquement les catégories uniques des annonces récupérées
   */
  const uniqueCategories = useMemo(() => {
    const categoriesMap = new Map<number, string>();
    listings.forEach((item) => {
      if (item.category?.id && item.category?.name) {
        categoriesMap.set(item.category.id, item.category.name);
      }
    });

    return Array.from(categoriesMap.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [listings]);

  /**
   * Filtre les annonces localement via la barre de recherche et les catégories
   */
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      const matchesCategory =
        selectedCategory === null || item.category?.id === selectedCategory;

      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.name.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [listings, searchQuery, selectedCategory]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0a2540" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HeaderUserBadge />

      <FlatList
        data={filteredListings}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"

        // Ajout du Pull-to-Refresh globalisé
        refreshControl={
          <AppRefreshControl onRefresh={getListings} />
        }

        ListHeaderComponent={
          <SearchFilterBanner
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            categories={uniqueCategories}
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
          />
        }

        renderItem={({ item }) => {
          const isOutOfStock = item.quantity <= 0;

          return (
            <Pressable
              style={[styles.card, isOutOfStock && styles.disabledCard]}
              disabled={isOutOfStock}
              onPress={() =>
                router.push({
                  pathname: '/listings/[id]',
                  params: { id: item.id.toString() },
                })
              }
              accessibilityRole="button"
            >
              {/* Section Image */}
              <View style={styles.imageContainer}>
                {item.image ? (
                  <Image
                    source={{ uri: item.image }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Ionicons name="image-outline" size={32} color="#94A3B8" />
                  </View>
                )}

                {/* Overlay Épuisé */}
                {isOutOfStock && (
                  <View style={styles.soldOverlay}>
                    <Text style={styles.soldOverlayText}>ÉPUISÉ</Text>
                  </View>
                )}
              </View>

              {/* Section Contenu & Métadonnées */}
              <View style={styles.cardContent}>
                <View style={styles.metaRow}>
                  {item.category?.name ? (
                    <View style={styles.badge}>
                      <Entypo name = "location" size ={10} color = "#008080"/>
                      <Text style={styles.badgeText} numberOfLines={1}>

                        {item.city}
                      </Text>
                    </View>
                  ) : (
                    <View />
                  )}

                  {!isOutOfStock && (
                    <Text style={styles.stockText}>Stock: {item.quantity}</Text>
                  )}
                </View>

                <Text style={styles.itemName} numberOfLines={1}>
                  {item.title}
                </Text>

                {/* Ligne Prix + Bouton d'action rapide */}
                <View style={styles.actionRow}>
                  <View style={styles.priceContainer}>
                    <Text style={styles.itemPrice}>{item.price}</Text>
                    <Text style={styles.currencyText}>Dhs</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.cartButton, isOutOfStock && styles.cartButtonDisabled]}
                    disabled={isOutOfStock}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="add-shopping-cart" size={18} color="#D4AF37" />
                  </TouchableOpacity>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun article ne correspond à votre recherche.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 10,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    paddingTop: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 5, // Contrainte : max 5px
    marginBottom: 16,
    flex: 0.485,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    // Ombres fines pour relief subtil
    shadowColor: '#0A2540',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledCard: {
    opacity: 0.6,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1, // Ratio carré 1:1 moderne
    position: 'relative',
    backgroundColor: '#F8FAFC',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soldOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 37, 64, 0.89)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soldOverlayText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3, // Max 5px
  },
  cardContent: {
    padding: 10,
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badge: {
    flex:1,
    flexDirection:"row",
    gap:2,
    maxWidth: '65%',
  },
  badgeText: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stockText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '700',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#D4AF37',
  },
  currencyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  cartButton: {
    backgroundColor: '#0A2540', // Bleu marine profond
    width: 34,
    height: 34,
    borderRadius: 50, // Max 5px
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)', // Liseré Or subtil
  },
  cartButtonDisabled: {
    backgroundColor: '#CBD5E1',
    borderColor: 'transparent',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 14,
  },

 
});