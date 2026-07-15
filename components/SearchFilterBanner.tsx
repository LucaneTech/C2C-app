import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ImageBackground,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

interface Category {
    id: string | number;
    name: string;
}

interface SearchFilterBannerProps {
    searchQuery: string;
    onSearchChange: (text: string) => void;
    categories: Category[];
    selectedCategory: string | number | null; // null represents "All"
    onCategorySelect: (categoryId: string | number | null) => void;
}

export default function SearchFilterBanner({
    searchQuery,
    onSearchChange,
    categories,
    selectedCategory,
    onCategorySelect,
}: SearchFilterBannerProps) {
    const handleClearSearch = () => {
        onSearchChange('');
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
                    {/* Static "All" button */}
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

                    {/* Dynamic categories map */}
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

            {/* 3. Replicated Elegant Marketing Banner */}
            <View style={styles.bannerContainer}>
                <ImageBackground
                    source={{ uri: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=800&auto=format&fit=crop' }}
                    style={styles.bannerBackground}
                    imageStyle={styles.bannerImage}
                >
                    {/* Overlay gradient darkness for text readability */}
                    <View style={styles.overlay} />

                    <View style={styles.bannerContent}>
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
                </ImageBackground>
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
        paddingRight: 8, // Réduit pour compenser le padding interne du bouton clear
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
        height: '100%', // Occupe toute la hauteur pour éviter les coupures de texte
    },
    clearButton: {
        padding: 8, // Zone de clic élargie pour une meilleure expérience utilisateur
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
        height: 340,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    bannerBackground: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    bannerImage: {
        borderRadius: 0,
    },
    overlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(10, 37, 64, 0.45)',
    },
    bannerContent: {
        padding: 24,
        zIndex: 2,
    },
    newCollectionBadge: {
        backgroundColor: '#ffd053',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 5,
        alignSelf: 'flex-start',
        marginBottom: 16,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#0a2540',
        letterSpacing: 0.5,
    },
    bannerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 10,
    },
    bannerSubtitle: {
        fontSize: 13,
        color: '#F1F5F9',
        lineHeight: 18,
        fontWeight: '400',
        marginBottom: 20,
        opacity: 0.9,
    },
    ctaButton: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 140,
    },
    ctaText: {
        color: '#0a2540',
        fontSize: 14,
        fontWeight: '700',
    },
});