import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    Switch,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { AppRefreshControl } from '@/components/AppRefreshControl';

type ListingStatus = 'active' | 'sold_out' | 'inactive';

interface MyListing {
    id: number;
    title: string;
    price: number;
    quantity: number;
    image: string | null;
    status: ListingStatus;
    created_at: string;
    category: { name: string } | null;
}

export default function MyListingsScreen() {
    const [listings, setListings] = useState<MyListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState<ListingStatus | 'all'>('all');

    // 1. Récupération des annonces du vendeur connecté
    const fetchMyListings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('listings')
                .select(`
          id,
          title,
          price,
          quantity,
          image,
          status,
          created_at,
          category:category_id (name)
        `)
                .eq('vendor_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const formatted: MyListing[] = data.map((item: any) => ({
                    id: item.id,
                    title: item.title,
                    price: Number(item.price),
                    quantity: item.quantity,
                    image: item.image,
                    status: item.quantity <= 0 ? 'sold' : item.status,
                    created_at: item.created_at,
                    category: item.category ? { name: item.category.name } : null,
                }));
                setListings(formatted);
            }
        } catch (err: any) {
            Alert.alert('Erreur', err.message || 'Impossible de charger vos annonces.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchMyListings();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchMyListings();
    };

    // 2. Basculer entre 'active' et 'inactive' (Toggle rapide)
    const toggleStatus = async (item: MyListing) => {
        const newStatus: ListingStatus = item.status === 'active' ? 'inactive' : 'active';

        // Mise à jour optimiste dans le state local
        setListings(prev =>
            prev.map(l => (l.id === item.id ? { ...l, status: newStatus } : l))
        );

        try {
            const { error } = await supabase
                .from('listings')
                .update({ status: newStatus })
                .eq('id', item.id);

            if (error) throw error;
        } catch (err: any) {
            // Rollback en cas d'erreur
            setListings(prev =>
                prev.map(l => (l.id === item.id ? { ...l, status: item.status } : l))
            );
            Alert.alert('Erreur', 'Impossible de modifier la visibilité.');
        }
    };

    // 3. Marquer une annonce comme vendue / épuisée (Stock à 0)
    const markAsSold = async (id: number) => {
        Alert.alert(
            'Marquer comme vendue ?',
            'Le stock passera à 0 et l\'article sera marqué comme épuisé.',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Confirmer',
                    style: 'destructive',
                    onPress: async () => {
                        setListings(prev =>
                            prev.map(l => (l.id === id ? { ...l, quantity: 0, status: 'sold_out' } : l))
                        );
                        await supabase.from('listings').update({ quantity: 0, status: 'sold_out' }).eq('id', id);
                    },
                },
            ]
        );
    };

    // 4. Supprimer définitivement une annonce
    const deleteListing = async (id: number) => {
        Alert.alert(
            'Supprimer l\'annonce',
            'Cette action est irréversible. Voulez-vous continuer ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        setListings(prev => prev.filter(l => l.id !== id));
                        const { error } = await supabase.from('listings').delete().eq('id', id);
                        if (error) {
                            Alert.alert('Erreur', 'Échec de la suppression.');
                            fetchMyListings();
                        }
                    },
                },
            ]
        );
    };

    // Filtrage local selon l'onglet actif
    const filteredListings = listings.filter(l => {
        if (selectedFilter === 'all') return true;
        if (selectedFilter === 'sold_out') return l.quantity <= 0 || l.status === 'sold_out';
        return l.status === selectedFilter && l.quantity > 0;
    });

    const renderItem = ({ item }: { item: MyListing }) => {
        const isSold_out = item.quantity <= 0 || item.status === 'sold_out';
        const isinactive = item.status === 'inactive';

        return (
            <View style={[styles.card, (isSold_out || isinactive) && styles.dimmedCard]}>
                <View style={styles.cardHeader}>
                    {item.image ? (
                        <Image source={{ uri: item.image }} style={styles.cardImage} />
                    ) : (
                        <View style={styles.placeholderImage}>
                            <Ionicons name="image-outline" size={24} color="#94A3B8" />
                        </View>
                    )}

                    <View style={styles.cardInfo}>
                        <View style={styles.topBadgeRow}>
                            {item.category?.name && (
                                <Text style={styles.categoryBadge}>{item.category.name}</Text>
                            )}
                            <Text
                                style={[
                                    styles.statusTag,
                                    isSold_out
                                        ? styles.tagsold_out
                                        : isinactive
                                            ? styles.taginactive
                                            : styles.tagActive,
                                ]}
                            >
                                {isSold_out ? 'ÉPUISÉ' : isinactive ? 'MASQUÉ' : 'EN LIGNE'}
                            </Text>
                        </View>

                        <Text style={styles.itemTitle} numberOfLines={1}>
                            {item.title}
                        </Text>

                        <View style={styles.priceStockRow}>
                            <Text style={styles.itemPrice}>{item.price} Dhs</Text>
                            <Text style={styles.itemStock}>Stock: {item.quantity}</Text>
                        </View>
                    </View>
                </View>

                {/* Barre d'actions rapides du vendeur */}
                <View style={styles.actionFooter}>
                    {/* Toggle Visibilité */}
                    {!isSold_out && (
                        <View style={styles.toggleContainer}>
                            <Text style={styles.toggleLabel}>Visibilité</Text>
                            <Switch
                                value={item.status === 'active'}
                                onValueChange={() => toggleStatus(item)}
                                trackColor={{ false: '#CBD5E1', true: '#0A2540' }}
                                thumbColor="#FFFFFF"
                            />
                        </View>
                    )}

                    <View style={styles.btnGroup}>
                        {!isSold_out && (
                            <TouchableOpacity
                                style={styles.actionIconBtn}
                                onPress={() => markAsSold(item.id)}
                            >
                                <MaterialIcons name="check-circle-outline" size={20} color="#10B981" />
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={styles.actionIconBtn}
                            onPress={() =>
                                router.push({
                                    pathname: '/manage-listings/createListingScreen',
                                    params: { id: item.id.toString() },
                                })
                            }
                        >
                            <MaterialIcons name="edit" size={20} color="#0A2540" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionIconBtn, styles.deleteBtnBg]}
                            onPress={() => deleteListing(item.id)}
                        >
                            <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* En-tête */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Mes Annonces</Text>
                    <Text style={styles.headerSubtitle}>
                        {listings.length} article{listings.length > 1 ? 's' : ''} enregistré{listings.length > 1 ? 's' : ''}
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.createBtn}
                    onPress={() => router.push('/')}
                    activeOpacity={0.8}
                >
                    <Ionicons name="home" size={20} color="#ffff" />
                    {/* <Text style={styles.createBtnText}>Publier</Text> */}
                </TouchableOpacity>
            </View>

            {/* Filtres par statut */}
            <View style={styles.tabsContainer}>
                {[
                    { key: 'all', label: 'Toutes' },
                    { key: 'active', label: 'En ligne' },
                    { key: 'inactive', label: 'Masquées' },
                    { key: 'sold_out', label: 'Épuisées' },
                ].map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[
                            styles.tab,
                            selectedFilter === tab.key && styles.activeTab,
                        ]}
                        onPress={() => setSelectedFilter(tab.key as any)}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                selectedFilter === tab.key && styles.activeTabText,
                            ]}
                        >
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Liste principale */}
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="small" color="#0A2540" />
                </View>
            ) : (
                <FlatList
                    data={filteredListings}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <AppRefreshControl onRefresh={handleRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="cube-outline" size={36} color="#94A3B8" />
                            <Text style={styles.emptyText}>Aucune annonce dans cette catégorie</Text>
                        </View>
                    }
                />
            )}

            {/* Bouton Flottant (FAB) d'Accueil */}
            <TouchableOpacity
                style={styles.fabHome}
                activeOpacity={0.85}
                onPress={() => router.replace('/manage-listings/createListingScreen')}
            >
                <Ionicons name="add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0F172A',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    createBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#0A2540',
        padding: 10,
        borderRadius: 50, // Contrainte : max 5px
    },
    createBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 13,
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginVertical: 12,
        gap: 8,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 5, // Max 5px
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    activeTab: {
        backgroundColor: '#0A2540',
        borderColor: '#0A2540',
    },
    tabText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
    },
    activeTabText: {
        color: '#FFFFFF',
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 88, // Espace pour éviter le chevauchement avec le FAB
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 5, // Max 5px
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: 1,
    },
    dimmedCard: {
        backgroundColor: '#F1F5F9',
    },
    cardHeader: {
        flexDirection: 'row',
        gap: 12,
    },
    cardImage: {
        width: 70,
        height: 70,
        borderRadius: 4,
    },
    placeholderImage: {
        width: 70,
        height: 70,
        borderRadius: 4,
        backgroundColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    topBadgeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    categoryBadge: {
        fontSize: 9,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
    },
    statusTag: {
        fontSize: 8,
        fontWeight: '800',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
    },
    tagActive: {
        backgroundColor: '#DCFCE7',
        color: '#16A34A',
    },
    taginactive: {
        backgroundColor: '#F1F5F9',
        color: '#64748B',
    },
    tagsold_out: {
        backgroundColor: '#FEE2E2',
        color: '#DC2626',
    },
    itemTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4,
    },
    priceStockRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0A2540',
    },
    itemStock: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
    },
    actionFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    toggleLabel: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
    },
    btnGroup: {
        flexDirection: 'row',
        gap: 8,
        marginLeft: 'auto',
    },
    actionIconBtn: {
        padding: 6,
        borderRadius: 4,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    deleteBtnBg: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
        gap: 8,
    },
    emptyText: {
        color: '#94A3B8',
        fontSize: 13,
    },
    fabHome: {
        position: 'absolute',
        bottom: 24,
        right: 20,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#D4AF37',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
    },
});