import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'react-native';
import  supabase  from '../lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from 'expo-router/build/react-navigation';
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
    const { error } = await supabase.auth.signOut()
    router.replace('/') // Redirige vers l'écran de connexion après la déconnexion
    if (error) Alert.alert(error.message)
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
      <Text style={styles.headerTitle}>Catalogue</Text>
      <Button onPress={signOut}>
        Deconnexion
      </Button>

      <FlatList
        data={instruments}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={true}
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
            <View style={styles.categoryContainer}>
              {item.category?.name && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.category.name}</Text>
                </View>
              )}
              <Ionicons name="information-circle" size={20} color="#008080" aria-label='infos'/>
            </View>
             <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              {item.image ? (
                <Image
                  source={{ uri: item.image }}
                  style={{ width: 100, height: 50, borderRadius: 5}}
                />
              ) : (
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 5,
                    backgroundColor: '#E0E0E0',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 10,
                  }}
                >
                  <Ionicons name="image" size={24} color="#A0A0A0" />
                </View>
              )}
              
            </View>
            <Text style={styles.itemName}>{item.name}</Text>

            {item.description && (
              <Text style={styles.itemDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
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
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 20,
    marginTop: 20,
    alignSelf: 'center',
  },
  listContainer: {
    paddingBottom: 30,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderColor: '#20db0736',
    borderWidth: 1,
  },
  badge: {
    backgroundColor: '#E6F2F2',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,

  },
  badgeText: {
    color: '#008080',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  itemName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999999',
    fontSize: 15,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    
  },
});