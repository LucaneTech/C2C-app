import HeaderUserBadge from '@/components/HeaderUserBadge';
import SearchFilterBanner from '@/components/SearchFilterBanner';
import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
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

interface Instrument {
  id: number;
  name: string;
  price?: number;
  image: string | null;
  description?: string;
  category: Category | null;
}

export default function App() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);

  // States dedicated for searching and filtering capabilities
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | number | null>(null);

  useEffect(() => {
    async function getInstruments() {
      try {
        const { data, error } = await supabase
          .from('instruments')
          .select<string, any>(`
            id, 
            name, 
            description, 
            category:category_id(id, name), 
            image, 
            price
          `)
          .order('name', { ascending: true });

        if (error) throw error;
        if (data) {
          // Adapt the nested return payload structures to match your frontend model interface
          const formattedData: Instrument[] = data.map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            image: item.image,
            category: item.category ? { id: item.category.id, name: item.category.name } : null,
          }));
          setInstruments(formattedData);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération :", error);
      } finally {
        setLoading(false);
      }
    }

    getInstruments();
  }, []);

  /**
   * Automatically derives and extracts unique categories from the retrieved products list
   */
  const uniqueCategories = useMemo(() => {
    const categoriesMap = new Map<number, string>();
    instruments.forEach((item) => {
      if (item.category?.id && item.category?.name) {
        categoriesMap.set(item.category.id, item.category.name);
      }
    });

    return Array.from(categoriesMap.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [instruments]);

  /**
   * Memoized computation that filters the instruments by search query and category
   */
  const filteredInstruments = useMemo(() => {
    return instruments.filter((item) => {
      const matchesCategory =
        selectedCategory === null || item.category?.id === selectedCategory;

      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.name.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [instruments, searchQuery, selectedCategory]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0a2540" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sticky User Header */}
      <HeaderUserBadge />

      <FlatList
        data={filteredInstruments}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        
        // Inject Search, Filters, and Banner dynamically as Header of the list
        ListHeaderComponent={
          <SearchFilterBanner
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            categories={uniqueCategories}
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
          />
        }
        
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: '/instruments/[id]',
                params: { id: item.id.toString() },
              })
            }
            accessibilityRole="button"
          >
            {item.image ? (
              <Image
                source={{ uri: item.image }}
                style={styles.cardImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="image" size={28} color="#94A3B8" />
              </View>
            )}

            <View style={styles.cardContent}>
              {item.category?.name && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText} numberOfLines={1}>
                    {item.category.name}
                  </Text>
                </View>
              )}

              <Text style={styles.itemName} numberOfLines={1}>
                {item.name}
              </Text>

              {item.price !== undefined && (
                <Text style={styles.itemPrice}>{item.price} €</Text>
              )}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun instrument ne correspond à votre recherche.</Text>
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
    paddingBottom: 100, // Extra padding to make sure content clears the floating tab bar
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
  cardContent: {
    padding: 12,
  },
  badge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
    maxWidth: '100%',
  },
  badgeText: {
    color: '#0A2540',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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