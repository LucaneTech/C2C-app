import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    city: string | null;   
    phone: string | null;  
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
  
  // Cart management states
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const insets = useSafeAreaInsets();

  useEffect(() => {
    async function getListingAndSimilar() {
      if (!id) {
        setError('Aucun identifiant d’annonce fourni.');
        setLoading(false);
        return;
      }

      try {
        // Safe check to retrieve the authenticated user session
        try {
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          if (authError) throw authError;
          if (user) {
            setCurrentUserId(user.id);
          }
        } catch (authErr) {
          console.error('Failed to fetch authenticated user:', authErr);
          // Keep execution going, user might browse as a guest safely
        }

        // Fetch primary listing data with relational vendor constraints
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

          // Fetch items within the same category safely
          if (fetchedListing.category_id) {
            try {
              const { data: similarData, error: similarError } = await supabase
                .from('listings')
                .select('id, title, price, image')
                .eq('category_id', fetchedListing.category_id)
                .eq('status', 'active')
                .neq('id', fetchedListing.id)
                .limit(6);

              if (similarError) throw similarError;
              if (similarData) {
                setSimilarListings(similarData as SimilarListing[]);
              }
            } catch (similarErr) {
              console.error('Failed to load similar listings safely:', similarErr);
              // Safe fallback: do not crash the view if similar items fail to load
              setSimilarListings([]);
            }
          }
        } else {
          setError('Annonce introuvable.');
        }
      } catch (err: any) {
        console.error('Error within getListingAndSimilar timeline:', err);
        setError('Impossible de charger les détails.');
      } finally {
        setLoading(false);
      }
    }

    getListingAndSimilar();
  }, [id]);

  // Refactored cart system integration targeted on public.cart table
  const handlePlaceOrder = async () => {
    if (!listing) return;

    if (!currentUserId) {
      Alert.alert("Connexion requise", "Veuillez vous connecter pour ajouter cet article à votre panier.");
      return;
    }

    // Safety constraint: block vendors from adding their own listing to their cart
    if (currentUserId === listing.vendor?.id) {
      Alert.alert("Action impossible", "Vous ne pouvez pas ajouter votre propre article au panier.");
      return;
    }

    // Dynamic stock availability verification
    if (listing.quantity < 1) {
      Alert.alert("Rupture de stock", "Cet article n'est plus disponible.");
      return;
    }

    setSubmittingOrder(true);

    try {
      // Step 1: Safely check if the item already exists inside the cart table
      const { data: existingCartItem, error: checkError } = await supabase
        .from('cart')
        .select('id, quantity')
        .eq('user_id', currentUserId)
        .eq('listing_id', listing.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingCartItem) {
        // Step 2A: Update existing record incrementing the payload quantity safely
        const { error: updateError } = await supabase
          .from('cart')
          .update({ quantity: existingCartItem.quantity + 1 })
          .eq('id', existingCartItem.id);

        if (updateError) throw updateError;
      } else {
        // Step 2B: Run standard insert statement if listing row is totally unique
        const { error: insertError } = await supabase
          .from('cart')
          .insert({
            user_id: currentUserId,
            listing_id: listing.id,
            quantity: 1
          });

        if (insertError) {
          // Check for Postgres unique constraint race condition error code
          if (insertError.code === '23505') {
            Alert.alert(
              "Déjà au panier", 
              "Cet article est déjà dans votre panier. Vous pouvez modifier sa quantité directement depuis votre panier.",
              [
                { text: "Continuer" },
                { text: "Voir le panier", onPress: () => router.push('/cart') }
              ]
            );
            return;
          }
          throw insertError;
        }
      }

      // Success feedback alert trigger
      Alert.alert(
        "Ajouté au panier !",
        `"${listing.title}" a bien été ajouté à votre panier.`,
        [
          { text: "Continuer mes achats" },
          { text: "Voir le panier", onPress: () => router.push('/cart') }
        ]
      );

    } catch (err: any) {
      console.error('Safe catch intercepted a cart action error:', err);
      Alert.alert('Erreur', err.message || "Impossible d'ajouter cet article au panier pour le moment.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Safe WhatsApp external Deep Linking handler
  const handleWhatsAppContact = async () => {
    try {
      if (!listing?.vendor?.phone) return;

      const cleanedPhone = listing.vendor.phone.replace(/[^0-9]/g, '');
      
      if (!cleanedPhone) {
        Alert.alert('Erreur', 'Le numéro de téléphone du vendeur est invalide.');
        return;
      }

      const message = `Bonjour, je suis intéressé par votre annonce "${listing.title}" sur Yabisso.`;
      const whatsappUrl = `whatsapp://send?phone=${cleanedPhone}&text=${encodeURIComponent(message)}`;
      const webWhatsappUrl = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`;

      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Linking.openURL(webWhatsappUrl);
      }
    } catch (err) {
      console.error('Error handling external communication intent:', err);
      Alert.alert('Erreur', "Impossible d'ouvrir l'application WhatsApp.");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="small" color="#0A2540" />
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
  const isOwnListing = currentUserId === listing.vendor?.id;
  const hasPhone = !!listing.vendor?.phone && listing.vendor.phone.trim().length > 0;
  
  // Safe date parser formatting block
  let formattedDate = '';
  try {
    formattedDate = new Date(listing.created_at).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (dateErr) {
    formattedDate = 'Récemment';
  }

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
        
        {/* Main Image View Header Section */}
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

        {/* Content detail layout details */}
        <View style={styles.detailsContent}>
          
          {/* Metadata structural layer */}
          <View style={styles.metaRow}>
            {listing.category?.name && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText} numberOfLines={1}>{listing.category.name}</Text>
              </View>
            )}
            <Text style={styles.dateText}>Publié le {formattedDate}</Text>
          </View>

          {/* Core Title */}
          <Text style={styles.title}>{listing.title}</Text>

          {/* Pricing data and Inventory visualization */}
          <View style={styles.priceStockRow}>
            <Text style={styles.price} numberOfLines={1}>
              {Number(listing.price || 0).toFixed(2)} Dhs
            </Text>
            <View style={[styles.stockBadge, isOutOfStock ? styles.stockEmpty : styles.stockAvailable]}>
              <View style={[styles.stockDot, { backgroundColor: isOutOfStock ? '#EF4444' : '#10B981' }]} />
              <Text style={[styles.stockText, { color: isOutOfStock ? '#991B1B' : '#065F46' }]} numberOfLines={1}>
                {isOutOfStock ? 'Rupture' : `${listing.quantity} dispo.`}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Merchant vendor details panel */}
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

          {/* Description layout column */}
          <Text style={styles.sectionTitle}>Description du produit</Text>
          <Text style={styles.description}>
            {listing.description || 'Aucune description fournie pour cet article.'}
          </Text>

          {/* Recommendations and Similar entities list component */}
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
                      {Number(item.price || 0).toFixed(2)} Dhs
                    </Text>
                  </Pressable>
                )}
              />
            </View>
          )}

        </View>
      </ScrollView>

      {/* Primary bottom user utility interaction bar */}
      <View style={[
        styles.bottomActionBar, 
        { 
          paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16,
          paddingTop: 12
        }
      ]}>
        <View style={styles.barPriceContainer}>
          <Text style={styles.barPriceLabel}>Prix unitaire</Text>
          <Text style={styles.barPriceValue} numberOfLines={1}>
            {Number(listing.price || 0).toFixed(2)} Dhs
          </Text>
        </View>

        <View style={styles.actionsContainer}>
          {/* External application trigger for WhatsApp communication */}
          {hasPhone && (
            <Pressable 
              style={[styles.whatsappButton, (isOutOfStock || isOwnListing) && styles.actionButtonDisabled]}
              disabled={isOutOfStock || isOwnListing}
              onPress={handleWhatsAppContact}
            >
              <Ionicons name="logo-whatsapp" size={22} color="#FFFFFF" />
            </Pressable>
          )}

          {/* Main Action Call interface mapped into public.cart operations */}
          <Pressable 
            style={[
              styles.actionButton, 
              (isOutOfStock || isOwnListing || submittingOrder) && styles.actionButtonDisabled
            ]}
            disabled={isOutOfStock || isOwnListing || submittingOrder}
            onPress={handlePlaceOrder}
          >
            {submittingOrder ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="basket-outline" size={18} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.actionButtonText} numberOfLines={1}>
                  {isOwnListing ? "Mon annonce" : "Ajouter au panier"}
                </Text>
              </>
            )}
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
    backgroundColor: '#0a254009',
    padding: 12,
    borderRadius: 5,
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
    backgroundColor: '#D4AF37',
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
    fontSize: 20,
    fontWeight: '800',
    color: '#D4AF37',
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
    borderRadius: 50,
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