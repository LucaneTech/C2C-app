import { AppRefreshControl } from '@/components/AppRefreshControl';
import HeaderUserBadge from '@/components/HeaderUserBadge';
import SearchFilterBanner from '@/components/SearchFilterBanner';
import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
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
              {item.image ? (
                <View>
                  <Image
                    source={{ uri: item.image }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                  {isOutOfStock && (
                    <View style={styles.soldOverlay}>
                      <Text style={styles.soldOverlayText}>ÉPUISÉ</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.placeholderImage}>
                  <Ionicons name="image" size={28} color="#94A3B8" />
                </View>
              )}

              <View style={styles.cardContent}>
                <View style={styles.metaRow}>
                  {item.category?.name && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText} numberOfLines={1}>
                        {item.category.name}
                      </Text>
                    </View>
                  )}
                  
                  {/* Indication visuelle de la quantité disponible */}
                  {!isOutOfStock && (
                    <Text style={styles.stockText}>
                      Stock: {item.quantity}
                    </Text>
                  )}
                </View>

                <Text style={styles.itemName} numberOfLines={1}>
                  {item.title}
                </Text>

                <Text style={styles.itemPrice}>{item.price} Dhs</Text>
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
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 16,
    flex: 0.485,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  disabledCard: {
    opacity: 0.6,
  },
  cardImage: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  placeholderImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soldOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soldOverlayText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  cardContent: {
    padding: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    maxWidth: '70%',
  },
  badgeText: {
    color: '#0A2540',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stockText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0A2540',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0a2540',
    marginTop: 2,
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