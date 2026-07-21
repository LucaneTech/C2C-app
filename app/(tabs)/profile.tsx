import { AppRefreshControl } from '@/components/AppRefreshControl';
import { useAuth } from '@/hook/UseAuth';
import { useUserProfil } from '@/hook/useUserProfil';
import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Hooks globaux
  const { profile, loading, refreshProfile } = useUserProfil();
  const { handleSignOut } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);

  // États locaux pour l'édition
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [saving, setSaving] = useState(false);

  // Synchronisation
  useEffect(() => {
    if (profile) {
      setEditFullName(profile.full_name || '');
      setEditPhone(profile.phone || '');
      setEditCity(profile.city || '');
    }
  }, [profile]);

  // Enregistrer les modifications
  const handleSaveChanges = async () => {
    if (!profile?.id) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editFullName.trim(),
          phone: editPhone.trim(),
          city: editCity.trim(),
        })
        .eq('id', profile.id);

      if (error) throw error;

      if (typeof refreshProfile === 'function') {
        await refreshProfile();
      }

      setIsModalOpen(false);
      Alert.alert('Succès', 'Vos informations ont été mises à jour.');
    } catch (error) {
      console.error('Erreur mise à jour profil :', error);
      Alert.alert('Erreur', "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  // Confirmation avant déconnexion
  const onSignoutPress = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter de votre compte ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            try {
              await handleSignOut();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de vous déconnecter pour le moment.');
            }
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    if (typeof refreshProfile === 'function') {
      await refreshProfile();
    }
  };

  if (loading && !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color="#0A2540" />
      </View>
    );
  }

  // Calcul du dégagement bas pour le Tab Bar flottant
  const bottomPaddingForTabBar = insets.bottom + 100;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPaddingForTabBar } // Espace de sécurité sous le dernier élément
        ]}
        refreshControl={<AppRefreshControl onRefresh={handleRefresh} />}
      >
        {/* En-tête principal */}
        {/* <View style={styles.header}>
          <Text style={styles.headerTitle}>Mon Profil</Text>
          <Text style={styles.headerSubtitle}>Gérez vos préférences et vos activités</Text>
        </View> */}

        {/* Carte d'identité du profil */}
        <View style={styles.identityCard}>
          <View style={styles.avatarWrapper}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLetter}>
                  {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.avatarEditBadge}
              onPress={() => setIsModalOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="pencil-sharp" size={12} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.profileName}>{profile?.full_name || 'Utilisateur'}</Text>
            <Ionicons name="checkmark-circle" size={18} color="#05a026" style={styles.verifiedBadge} />
          </View>

          <Text style={styles.profileEmail}>{profile?.email || 'Adresse e-mail non renseignée'}</Text>
        </View>

        {/* Section 1 : Informations Personnelles */}
        <View style={styles.menuGroup}>
          <Text style={styles.menuGroupTitle}>Informations Personnelles</Text>

          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="location-outline" size={18} color="#0A2540" />
              </View>
              <View>
                <Text style={styles.menuItemLabel}>Ville de résidence</Text>
                <Text style={styles.menuItemValue}>{profile?.city || 'Non spécifiée'}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.menuItem, styles.noBorder]}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              </View>
              <View>
                <Text style={styles.menuItemLabel}>WhatsApp</Text>
                <Text style={styles.menuItemValue}>{profile?.phone || 'Non renseigné'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section 2 : Espace Vendeur Premium */}
        <View style={styles.menuGroup}>
          <Text style={styles.menuGroupTitle}>Espace Vendeur</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(seller)/manage-listings')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconContainer, styles.goldIconBg]}>
                <Ionicons name="grid-outline" size={18} color="#0A2540" />
              </View>
              <View>
                <Text style={styles.actionMenuText}>Mes annonces</Text>
                <Text style={styles.actionMenuSubtext}>Gérer le stock et les prix</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#A1A1AA" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.noBorder]}
            onPress={() => router.push('/(seller)/orders')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconContainer, styles.goldIconBg]}>
                <Ionicons name="receipt-outline" size={18} color="#D4AF37" />
              </View>
              <View>
                <Text style={styles.actionMenuText}>Commandes clients</Text>
                <Text style={styles.actionMenuSubtext}>Suivre et valider vos ventes</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#A1A1AA" />
          </TouchableOpacity>
        </View>

        {/* Section 3 : Paramètres de Compte */}
        <View style={styles.menuGroup}>
          <Text style={styles.menuGroupTitle}>Paramètres</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setIsModalOpen(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="create-outline" size={18} color="#0A2540" />
              </View>
              <Text style={styles.actionMenuText}>Modifier mon profil</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#A1A1AA" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.noBorder]}
            onPress={onSignoutPress}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconContainer, styles.dangerIconBg]}>
                <Ionicons name="log-out-outline" size={18} color="#DC2626" />
              </View>
              <Text style={[styles.actionMenuText, { color: '#DC2626' }]}>Se déconnecter</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal d'édition moderne */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalDismissArea} onPress={() => setIsModalOpen(false)} />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalDragIndicator} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier mon profil</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setIsModalOpen(false)}
              >
                <Ionicons name="close" size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalForm}>
              {/* Input : Nom complet */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nom complet</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={18} color="#71717A" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={editFullName}
                    onChangeText={setEditFullName}
                    placeholder="Votre nom complet"
                    placeholderTextColor="#A1A1AA"
                  />
                </View>
              </View>

              {/* Input : Ville */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ville</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="location-outline" size={18} color="#71717A" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={editCity}
                    onChangeText={setEditCity}
                    placeholder="Ex: Casablanca, Rabat, Fès..."
                    placeholderTextColor="#A1A1AA"
                  />
                </View>
              </View>

              {/* Input : Numéro WhatsApp */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Numéro WhatsApp</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="call-outline" size={18} color="#71717A" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder="Ex: +212600000000"
                    keyboardType="phone-pad"
                    placeholderTextColor="#A1A1AA"
                  />
                </View>
              </View>

              {/* Bouton Enregistrer */}
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveChanges}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Enregistrer les modifications</Text>
                )}
              </TouchableOpacity>

              <View style={{ height: insets.bottom + 28 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    marginTop: 16,
    marginBottom: 10,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#71717A',
    marginTop: 3,
    fontWeight: '500',
  },
  identityCard: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 20,
    
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#0A2540',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#D4AF37',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  verifiedBadge: {
    marginTop: 1,
  },
  profileEmail: {
    fontSize: 12,
    color: '#71717A',
    marginTop: 2,
    fontWeight: '500',
  },
  menuGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  menuGroupTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A1A1AA',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#F4F4F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goldIconBg: {
    backgroundColor: '#FEFCE8',
  },
  dangerIconBg: {
    backgroundColor: '#FEE2E2',
  },
  menuItemLabel: {
    fontSize: 10,
    color: '#A1A1AA',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  menuItemValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
    marginTop: 1,
  },
  actionMenuText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionMenuSubtext: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    maxHeight: '85%',
  },
  modalDragIndicator: {
    width: 36,
    height: 4,
    backgroundColor: '#E4E4E7',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeModalButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F4F4F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalForm: {
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 5,
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#0A2540',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 5,
    marginTop: 12,
  },
  saveButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});