import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';

type InstrumentDetails = {
  id: number;
  name: string;
  description?: string | null;
  price?: number | null;
  category: {
    id?: number;
    name: string;
  } | null;
};

export default function InstrumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const [instrument, setInstrument] = useState<InstrumentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const instrumentId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    async function getInstrument() {
      if (!instrumentId) {
        setError('Aucun identifiant d’instrument fourni.');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('instruments')
          .select<string, InstrumentDetails>('id, name, description, category:category_id(id, name), price')
          .eq('id', Number(instrumentId))
          .single();

        if (error) throw error;
        setInstrument(data);
      } catch (err) {
        console.error('Erreur lors du chargement de l’instrument :', err);
        setError('Impossible de charger cet instrument.');
      } finally {
        setLoading(false);
      }
    }

    getInstrument();
  }, [instrumentId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Instrument' }} />
        <ActivityIndicator size="large" color="#008080" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: instrument?.name ?? 'Instrument' }} />

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : instrument ? (
        <>
          <Text style={styles.title}>{instrument.name}</Text>
          <Text style={styles.price}>{instrument.price}MAD</Text>
          {instrument.category?.name ? (
            <Text style={styles.category}>{instrument.category.name}</Text>
          ) : null}
          <Text style={styles.description}>
            {instrument.description || 'Aucune description disponible.'}
          </Text>
        </>
      ) : (
        <Text style={styles.errorText}>Instrument introuvable.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F8F9FA',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0808',
    marginBottom: 16,
  },
  category: {
    fontSize: 14,
    fontWeight: '600',
    color: '#008080',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4B5563',
  },
  errorText: {
    fontSize: 16,
    color: '#C2410C',
  },
});
