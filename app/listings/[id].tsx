import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { 
  ActivityIndicator, 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Image, 
  Pressable, 
  Dimensions,
  FlatList,
  Linking,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width } = Dimensions.get('window');

type ListingDetails = {
  id: number;
  title: string;
  description: string;
  price: number;
  quantity: number;
  image: string | null;
  status: 'active' | 'hidden' | 'sold' | 'archived';
  created_at: string;
  category_id: number;
  category: {
    id: number;
    name: string;
  } | null;
  vendor: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    city: string | null;   // Ajout de la ville
    phone: string | null;  // Ajout du téléphone pour WhatsApp
  } | null;
};

type SimilarListing = {
  id: number;
  title: string;
  price: number;
  image: string | null;
};

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [listing, setListing] = useState<ListingDetails | null>(null);
  const [similarListings, setSimilarListings] = useState<SimilarListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const insets = useSafeAreaInsets();

  useEffect(() => {
    async function getListingAndSimilar() {
      if (!id) {
        setError('Aucun identifiant d’annonce fourni.');
        setLoading(false);
        return;
      }

      try {
        // 1. Récupérer l'annonce principale avec les détails du vendeur (city et phone inclus)
        const { data: mainData, error: fetchError } = await supabase
          .from('listings')
          .select(`
            id, 
            title, 
            description, 
            price, 
            quantity, 
            image, 
            status,
            created_at,
            category_id,
            category:category_id(id, name),
            vendor:vendor_id(id, full_name, avatar_url, city, phone)
          `)
          .eq('id', Number(id))
          .single();

        if (fetchError) throw fetchError;

        if (mainData) {
          const fetchedListing = mainData as unknown as ListingDetails;
          setListing(fetchedListing);

          // 2. Récupérer les articles similaires de la même catégorie
          if (fetchedListing.category_id) {
            const { data: similarData, error: similarError } = await supabase
              .from('listings')
              .select('id, title, price, image')
              .eq('category_id', fetchedListing.category_id)
              .eq('status', 'active')
              .neq('id', fetchedListing.id)
              .limit(6);

            if (!similarError && similarData) {
              setSimilarListings(similarData as SimilarListing[]);
            }
          }
        }
      } catch (err) {
        console.error('Erreur lors du chargement des données :', err);
        setError('Impossible de charger les détails.');
      } finally {
        setLoading(false);
      }
    }

    getListingAndSimilar();
  }, [id]);

  // Fonction sécurisée pour initier le chat WhatsApp
  const handleWhatsAppContact = async () => {
    if (!listing?.vendor?.phone) return;

    // Nettoyage du numéro de téléphone (conserver uniquement les chiffres)
    const cleanedPhone = listing.vendor.phone.replace(/[^0-9]/g, '');
    
    if (!cleanedPhone) {
      Alert.alert('Erreur', 'Le numéro de téléphone du vendeur est invalide.');
      return;
    }

    const message = `Bonjour, je suis intéressé par votre annonce "${listing.title}" sur Yabisso.`;
    const whatsappUrl = `whatsapp://send?phone=${cleanedPhone}&text=${encodeURIComponent(message)}`;
    const webWhatsappUrl = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Alternative si l'application WhatsApp n'est pas installée sur l'appareil (redirection web)
        await Linking.openURL(webWhatsappUrl);
      }
    } catch (err) {
      console.error('Erreur ouverture WhatsApp:', err);
      Alert.alert('Erreur', "Impossible d'ouvrir l'application WhatsApp.");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#0A2540" />
      </View>
    );
  }

  if (error || !listing) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: true, title: 'Erreur' }} />
        <Text style={styles.errorText}>{error || 'Annonce introuvable.'}</Text>
      </View>
    );
  }

  const isOutOfStock = listing.quantity <= 0;
  const hasPhone = !!listing.vendor?.phone && listing.vendor.phone.trim().length > 0;
  const formattedDate = new Date(listing.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[
          styles.scrollContainer, 
          { paddingBottom: 110 + insets.bottom }
        ]}
      >
        
        {/* Section Image Principale */}
        <View style={styles.imageContainer}>
          {listing.image ? (
            <Image source={{ uri: listing.image }} style={styles.mainImage} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image-outline" size={64} color="#94A3B8" />
            </View>
          )}
          
          <Pressable 
            style={[styles.backButton, { top: Math.max(insets.top, 16) }]} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#0A2540" />
          </Pressable>

          {isOutOfStock && (
            <View style={styles.soldBadgeOverlay}>
              <Text style={styles.soldBadgeText}>ÉPUISÉ</Text>
            </View>
          )}
        </View>

        {/* Corps des détails */}
        <View style={styles.detailsContent}>
          
          {/* Ligne Catégorie & Date */}
          <View style={styles.metaRow}>
            {listing.category?.name && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText} numberOfLines={1}>{listing.category.name}</Text>
              </View>
            )}
            <Text style={styles.dateText}>Publié le {formattedDate}</Text>
          </View>

          {/* Titre principal */}
          <Text style={styles.title}>{listing.title}</Text>

          {/* Ligne Prix & Stock */}
          <View style={styles.priceStockRow}>
            <Text style={styles.price} numberOfLines={1}>
              {Number(listing.price).toFixed(2)} Dhs
            </Text>
            <View style={[styles.stockBadge, isOutOfStock ? styles.stockEmpty : styles.stockAvailable]}>
              <View style={[styles.stockDot, { backgroundColor: isOutOfStock ? '#EF4444' : '#10B981' }]} />
              <Text style={[styles.stockText, { color: isOutOfStock ? '#991B1B' : '#065F46' }]} numberOfLines={1}>
                {isOutOfStock ? 'Rupture' : `${listing.quantity} dispo.`}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Section Profil Vendeur */}
          <Text style={styles.sectionTitle}>Vendeur</Text>
          <View style={styles.vendorCard}>
            <View style={styles.vendorAvatarContainer}>
              {listing.vendor?.avatar_url ? (
                <Image source={{ uri: listing.vendor.avatar_url }} style={styles.vendorAvatar} />
              ) : (
                <View style={styles.vendorAvatarPlaceholder}>
                  <Text style={styles.vendorAvatarLetter}>
                    {listing.vendor?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.vendorInfo}>
              <Text style={styles.vendorName} numberOfLines={1}>
                {listing.vendor?.full_name || 'Utilisateur Yabisso'}
              </Text>
              <View style={styles.vendorSubRow}>
                <Text style={styles.vendorSubtitle}>Membre vérifié</Text>
                {listing.vendor?.city && (
                  <>
                    <Text style={styles.vendorSeparator}>•</Text>
                    <Ionicons name="location" size={12} color="#64748B" style={styles.locationIcon} />
                    <Text style={styles.vendorCity} numberOfLines={1}>{listing.vendor.city}</Text>
                  </>
                )}
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Section Description */}
          <Text style={styles.sectionTitle}>Description du produit</Text>
          <Text style={styles.description}>
            {listing.description || 'Aucune description fournie pour cet article.'}
          </Text>

          {/* Section Articles Similaires */}
          {similarListings.length > 0 && (
            <View style={styles.similarSection}>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Vous pourriez aussi aimer</Text>
              
              <FlatList
                data={similarListings}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.similarList}
                renderItem={({ item }) => (
                  <Pressable 
                    style={styles.similarCard}
                    onPress={() => router.push(`/listings/${item.id}`)}
                  >
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.similarImage} />
                    ) : (
                      <View style={styles.similarPlaceholder}>
                        <Ionicons name="image-outline" size={24} color="#94A3B8" />
                      </View>
                    )}
                    <Text style={styles.similarTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.similarPrice}>
                      {Number(item.price).toFixed(2)} Dhs
                    </Text>
                  </Pressable>
                )}
              />
            </View>
          )}

        </View>
      </ScrollView>

      {/* Barre d'Action Premium avec intégration WhatsApp */}
      <View style={[
        styles.bottomActionBar, 
        { 
          paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16,
          paddingTop: 12
        }
      ]}>
        <View style={styles.barPriceContainer}>
          <Text style={styles.barPriceLabel}>Prix total</Text>
          <Text style={styles.barPriceValue} numberOfLines={1}>
            {Number(listing.price).toFixed(2)} $
          </Text>
        </View>

        <View style={styles.actionsContainer}>
          {/* Bouton WhatsApp - Affiché uniquement si le téléphone existe */}
          {hasPhone && (
            <Pressable 
              style={[styles.whatsappButton, isOutOfStock && styles.actionButtonDisabled]}
              disabled={isOutOfStock}
              onPress={handleWhatsAppContact}
            >
              <Ionicons name="logo-whatsapp" size={22} color="#FFFFFF" />
            </Pressable>
          )}

          {/* Bouton Contacter classique */}
          <Pressable 
            style={[styles.actionButton, isOutOfStock && styles.actionButtonDisabled]}
            disabled={isOutOfStock}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.actionButtonText} numberOfLines={1}>Contacter</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {},
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  imageContainer: {
    position: 'relative',
    width: width,
    height: Math.min(width * 0.85, 360),
    backgroundColor: '#F1F5F9',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  soldBadgeOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soldBadgeText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  detailsContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexShrink: 1,
  },
  categoryText: {
    color: '#0A2540',
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    color: '#64748B',
    fontSize: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0A2540',
    lineHeight: 28,
    marginBottom: 12,
  },
  priceStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 12,
  },
  price: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0A2540',
    flexShrink: 1,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    flexShrink: 2,
  },
  stockAvailable: {
    backgroundColor: '#D1FAE5',
  },
  stockEmpty: {
    backgroundColor: '#FEE2E2',
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0A2540',
    marginBottom: 10,
  },
  vendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  vendorAvatarContainer: {
    marginRight: 12,
  },
  vendorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  vendorAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vendorAvatarLetter: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0A2540',
  },
  vendorSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  vendorSubtitle: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  vendorSeparator: {
    fontSize: 11,
    color: '#94A3B8',
    marginHorizontal: 6,
  },
  locationIcon: {
    marginRight: 2,
  },
  vendorCity: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    flexShrink: 1,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
  },
  similarSection: {
    marginTop: 8,
  },
  similarList: {
    paddingVertical: 8,
    gap: 12,
  },
  similarCard: {
    width: 130,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
  },
  similarImage: {
    width: '100%',
    height: 90,
    borderRadius: 6,
    marginBottom: 6,
  },
  similarPlaceholder: {
    width: '100%',
    height: 90,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  similarTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0A2540',
    marginBottom: 2,
  },
  similarPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0A2540',
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
  },
  barPriceContainer: {
    flexDirection: 'column',
    flexShrink: 1,
    marginRight: 10,
  },
  barPriceLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  barPriceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0A2540',
    marginTop: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexGrow: 1,
    justifyContent: 'flex-end',
    maxWidth: '70%',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  actionButton: {
    backgroundColor: '#0A2540',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 10,
    flexGrow: 1,
    maxWidth: 180,
    shadowColor: '#0A2540',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  actionButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonIcon: {
    marginRight: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});