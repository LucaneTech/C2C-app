import HeaderUserBadge from '@/components/HeaderUserBadge';
import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

interface Instrument {
  id: number;
  name: string;
  price?: number;
  image: string | null;
  description?: string;
  category: {
    id?: number;
    name: string;
  } | null;
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  router.replace('/');
  if (error) Alert.alert(error.message);
}

export default function App() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getInstruments() {
      try {
        const { data, error } = await supabase
          .from('instruments')
          .select<string, Instrument>('id, name, description, category:category_id(id, name), image, price')
          .order('name', { ascending: true });

        if (error) throw error;
        if (data) setInstruments(data);
      } catch (error) {
        console.error("Erreur lors de la récupération :", error);
      } finally {
        setLoading(false);
      }
    }

    getInstruments();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#008080" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HeaderUserBadge />
       <View style ={{ marginBottom: 15}}/>     

      <FlatList
        data={instruments}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2} // Active l'affichage sur deux colonnes
        columnWrapperStyle={styles.row} // Ajoute de l'espace horizontal entre les colonnes
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
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
            {/* Image au format 4:3 (plus adapté pour une grille à 2 colonnes) */}
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

            {/* Contenu */}
            <View style={styles.cardContent}>
              
              {/* Catégorie */}
              {item.category?.name && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText} numberOfLines={1}>
                    {item.category.name}
                  </Text>
                </View>
              )}

              {/* Titre */}
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name}
              </Text>

              {/* Prix */}
              {item.price !== undefined && (
                <Text style={styles.itemPrice}>{item.price} €</Text>
              )}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun instrument disponible.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingTop: 60,
    paddingHorizontal: 12, // Léger ajustement pour maximiser l'espace des grilles
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0A2540',
    marginBottom: 16,
    marginTop: 16,
    alignSelf: 'center',
  },
  listContainer: {
    paddingBottom: 24,
  },
  row: {
    justifyContent: 'space-between', // Aligne parfaitement les deux colonnes aux extrémités
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    marginBottom: 12,
    flex: 0.485, // Distribue l'espace de manière strictement égale sur tous les écrans
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 4 / 3, // Format compact idéal pour deux colonnes
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  placeholderImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardContent: {
    padding: 10,
  },
  badge: {
    backgroundColor: '#E6F2F2',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
    maxWidth: '100%',
  },
  badgeText: {
    color: '#008080',
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
    color: '#008080',
    marginTop: 2,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 15,
  },
});