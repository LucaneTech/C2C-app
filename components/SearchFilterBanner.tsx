import React, { useEffect, useState, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ImageBackground,
    Animated,
    Dimensions,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';

interface Category {
    id: string | number;
    name: string;
}

interface SearchFilterBannerProps {
    searchQuery: string;
    onSearchChange: (text: string) => void;
    categories: Category[];
    selectedCategory: string | number | null;
    onCategorySelect: (categoryId: string | number | null) => void;
}

const DEFAULT_BANNER_IMAGE = 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=800&auto=format&fit=crop';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Ajustement de la largeur du conteneur du carrousel (pleine largeur moins les paddings habituels si applicable)
const BANNER_WIDTH = SCREEN_WIDTH - 32; 

export default function SearchFilterBanner({
    searchQuery,
    onSearchChange,
    categories,
    selectedCategory,
    onCategorySelect,
}: SearchFilterBannerProps) {
    const [bannerImages, setBannerImages] = useState<string[]>([DEFAULT_BANNER_IMAGE, DEFAULT_BANNER_IMAGE, DEFAULT_BANNER_IMAGE]);
    const [activeIndex, setActiveIndex] = useState(0);
    
    const scrollViewRef = useRef<ScrollView>(null);
    const scrollX = useRef(new Animated.Value(0)).current;
    const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);

    const handleClearSearch = () => {
        onSearchChange('');
    };

    // 1. Récupération des images depuis Supabase
    useEffect(() => {
        const fetchRandomListingImages = async () => {
            try {
                const { data, error } = await supabase
                    .from('listings')
                    .select('image')
                    .not('image', 'is', null)
                    .limit(20);

                if (!error && data && data.length > 0) {
                    const urls = data
                        .map((item) => item.image)
                        .filter((img): img is string => typeof img === 'string' && img.length > 0)
                        .sort(() => 0.5 - Math.random())
                        .slice(0, 3); // On cible 3 images pour correspondre aux 3 points demandés

                    // Si on récupère moins de 3 images, on complète avec l'image par défaut
                    while (urls.length < 3) {
                        urls.push(DEFAULT_BANNER_IMAGE);
                    }
                    setBannerImages(urls);
                }
            } catch (err) {
                console.error('Erreur carrousel:', err);
            }
        };

        fetchRandomListingImages();
    }, []);

    // 2. Défilement automatique de droite à gauche
    useEffect(() => {
        if (bannerImages.length <= 1) return;

        const startAutoScroll = () => {
            autoScrollTimer.current = setInterval(() => {
                const nextIndex = (activeIndex + 1) % bannerImages.length;
                
                scrollViewRef.current?.scrollTo({
                    x: nextIndex * BANNER_WIDTH,
                    animated: true,
                });
                
                setActiveIndex(nextIndex);
            }, 5000); // Changement toutes les 5 secondes
        };

        startAutoScroll();

        return () => {
            if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
        };
    }, [activeIndex, bannerImages]);

    // Événement manuel quand l'utilisateur slide lui-même
    const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffsetX / BANNER_WIDTH);
        setActiveIndex(index);
    };

    return (
        <View style={styles.container}>
            {/* 1. Modern Minimalist Search Input */}
            <View style={styles.searchBarContainer}>
                <Ionicons name="search-outline" size={20} color="#D4AF37" style={styles.searchIcon} />

                <TextInput
                    style={styles.searchInput}
                    placeholder="Recherchez vos articles..."
                    placeholderTextColor="#94A3B8"
                    value={searchQuery}
                    onChangeText={onSearchChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                />

                {searchQuery.length > 0 && (
                    <TouchableOpacity
                        onPress={handleClearSearch}
                        style={styles.clearButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="close-circle" size={20} color="#D4AF37" />
                    </TouchableOpacity>
                )}
            </View>

            {/* 2. Dynamic Categories Filter List */}
            <View style={styles.categoriesSection}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesScroll}
                >
                    <TouchableOpacity
                        style={[
                            styles.categoryButton,
                            selectedCategory === null && styles.categoryButtonActive,
                        ]}
                        onPress={() => onCategorySelect(null)}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[
                                styles.categoryText,
                                selectedCategory === null && styles.categoryTextActive,
                            ]}
                        >
                            Tous
                        </Text>
                    </TouchableOpacity>

                    {categories.map((category) => {
                        const isSelected = selectedCategory === category.id;
                        return (
                            <TouchableOpacity
                                key={category.id.toString()}
                                style={[
                                    styles.categoryButton,
                                    isSelected && styles.categoryButtonActive,
                                ]}
                                onPress={() => onCategorySelect(category.id)}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        styles.categoryText,
                                        isSelected && styles.categoryTextActive,
                                    ]}
                                >
                                    {category.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* 3. Modern Sliding Banner avec indicateurs de progression */}
            <View style={styles.bannerContainer}>
                <Animated.ScrollView
                    ref={scrollViewRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={handleMomentumScrollEnd}
                    // Capture le scroll en temps réel de manière native pour animer les points de navigation
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                        { useNativeDriver: false }
                    )}
                    scrollEventThrottle={16}
                >
                    {bannerImages.map((imageUri, index) => (
                        <View key={index} style={styles.slideWidthWrapper}>
                            <ImageBackground
                                source={{ uri: imageUri }}
                                style={styles.bannerBackground}
                                imageStyle={styles.bannerImage}
                            >
                                <View style={styles.overlay} />
                            </ImageBackground>
                        </View>
                    ))}
                </Animated.ScrollView>

                {/* Contenu textuel invariant au premier plan */}
                <View style={styles.bannerContent} pointerEvents="box-none">
                    <View style={styles.newCollectionBadge}>
                        <Text style={styles.badgeText}>PLUS DE 1 000 ANNONCES</Text>
                    </View>

                    <Text style={styles.bannerTitle}>
                        Tout ce dont vous avez besoin, au même endroit.
                    </Text>

                    <Text style={styles.bannerSubtitle}>
                        Explorez des milliers d'annonces publiées par des particuliers et des professionnels. Contactez les vendeurs en quelques secondes et achetez facilement partout au Maroc.
                    </Text>

                    <TouchableOpacity style={styles.ctaButton} activeOpacity={0.9}>
                        <Text style={styles.ctaText}>Commencer à explorer</Text>
                    </TouchableOpacity>
                </View>

                {/* 3 points d'indexation interactifs et stylisés */}
                <View style={styles.paginationContainer}>
                    {bannerImages.map((_, index) => {
                        // Calcul d'expansion fluide du point actif
                        const inputRange = [
                            (index - 1) * BANNER_WIDTH,
                            index * BANNER_WIDTH,
                            (index + 1) * BANNER_WIDTH,
                        ];

                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [8, 20, 8],
                            extrapolate: 'clamp',
                        });

                        const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.4, 1, 0.4],
                            extrapolate: 'clamp',
                        });

                        return (
                            <Animated.View
                                key={index}
                                style={[styles.dot, { width: dotWidth, opacity }]}
                            />
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: 16,
    },
    /* --- Search Bar --- */
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        paddingLeft: 16,
        paddingRight: 8,
        height: 52,
        marginBottom: 20,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#0A2540',
        fontWeight: '500',
        height: '100%',
    },
    clearButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    /* --- Horizontal Scroll Categories --- */
    categoriesSection: {
        marginBottom: 24,
    },
    categoriesScroll: {
        paddingHorizontal: 4,
        gap: 8,
    },
    categoryButton: {
        paddingHorizontal: 22,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    categoryButtonActive: {
        backgroundColor: '#0a2540',
        borderColor: '#0a2540',
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0a2540',
    },
    categoryTextActive: {
        color: '#FFFFFF',
    },
    /* --- Stylized Banner --- */
    bannerContainer: {
        borderRadius: 20,
        overflow: 'hidden',
        height: 350, // Légèrement rehaussé pour intégrer la pagination proprement
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        position: 'relative',
        backgroundColor: '#0A2540',
    },
    slideWidthWrapper: {
        width: BANNER_WIDTH,
        height: 350,
    },
    bannerBackground: {
        flex: 1,
    },
    bannerImage: {
        borderRadius: 0,
    },
    overlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(10, 37, 64, 0.45)',
    },
    bannerContent: {
        ...StyleSheet.absoluteFill,
        padding: 24,
        paddingBottom: 36, // Espace préservé pour ne pas piétiner les points de pagination
        justifyContent: 'flex-end',
        zIndex: 2,
    },
    newCollectionBadge: {
        backgroundColor: '#ffd053',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 5,
        alignSelf: 'flex-start',
        marginBottom: 14,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#0a2540',
        letterSpacing: 0.5,
    },
    bannerTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    bannerSubtitle: {
        fontSize: 13,
        color: '#F1F5F9',
        lineHeight: 18,
        fontWeight: '400',
        marginBottom: 16,
        opacity: 0.9,
    },
    ctaButton: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: '100%',
        width: '100%',
        alignSelf: 'flex-start',
    },
    ctaText: {
        color: '#0a2540',
        fontSize: 14,
        fontWeight: '700',
    },
    /* --- Pagination Points --- */
    paginationContainer: {
        position: 'absolute',
        bottom: 14,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        zIndex: 3,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
    },
});