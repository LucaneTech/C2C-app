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
      Alert.alert("Succès", "Vos informations ont été mises à jour.");
    } catch (error) {
      console.error("Erreur mise à jour profil :", error);
      Alert.alert("Erreur", "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  // Confirmation avant déconnexion
  const onSignoutPress = () => {
    Alert.alert(
      "Déconnexion",
      "Êtes-vous sûr de vouloir vous déconnecter de votre compte ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Se déconnecter", 
          style: "destructive", 
          onPress: async () => {
            try {
              await handleSignOut();
            } catch (error) {
              Alert.alert("Erreur", "Impossible de vous déconnecter pour le moment.");
            }
          } 
        }
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
        <ActivityIndicator size="large" color="#0A2540" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<AppRefreshControl onRefresh={handleRefresh} />}
      >
        {/* En-tête de la page */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mon Profil</Text>
          <Text style={styles.headerSubtitle}>Configurez votre profil et vos préférences</Text>
        </View>

        {/* Section Identité */}
        <View style={styles.identityContainer}>
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
            <Pressable style={styles.avatarEditBadge} onPress={() => setIsModalOpen(true)}>
              <Ionicons name="pencil" size={12} color="#FFFFFF" />
            </Pressable>
          </View>

          <Text style={styles.profileName}>
            {profile?.full_name || 'Utilisateur'}
          </Text>
          <Text style={styles.profileEmail}>{profile?.email || 'Aucune adresse e-mail'}</Text>
        </View>

        {/* Groupe 1 : Détails Personnels */}
        <View style={styles.menuGroup}>
          <Text style={styles.menuGroupTitle}>Vos informations</Text>
          
          {/* Ligne : Ville */}
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="location-outline" size={20} color="#0A2540" />
              </View>
              <View>
                <Text style={styles.menuItemLabel}>Ville de résidence</Text>
                <Text style={styles.menuItemValue}>{profile?.city || 'Non spécifiée'}</Text>
              </View>
            </View>
          </View>

          {/* Ligne : WhatsApp */}
          <View style={[styles.menuItem, styles.noBorder]}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="logo-whatsapp" size={20} color="#777779" />
              </View>
              <View>
                <Text style={styles.menuItemLabel}>Numéro WhatsApp</Text>
                <Text style={styles.menuItemValue}>{profile?.phone || 'Non renseigné'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Groupe 2 : Actions Compte */}
        <View style={styles.menuGroup}>
          <Text style={styles.menuGroupTitle}>Paramètres</Text>

          {/* Bouton de modification */}
          <Pressable style={styles.menuItem} onPress={() => setIsModalOpen(true)}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#F4F4F5' }]}>
                <Ionicons name="options-outline" size={20} color="#0A2540" />
              </View>
              <Text style={styles.actionMenuText}>Modifier mon compte</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#777779" />
          </Pressable>

          {/* Bouton Espace Vendeur / Commandes */}
          <Pressable style={styles.menuItem} onPress={() => router.push('/(seller)/orders')}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#F4F4F5' }]}>
                <Ionicons name="bag-outline" size={20} color="#D4AF37" />
              </View>
              <Text style={styles.actionMenuText2}>Voir les commandes clients</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#D4AF37" />
          </Pressable>

          {/* Bouton Se Déconnecter */}
          <Pressable style={[styles.menuItem, styles.noBorder]} onPress={onSignoutPress}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#F4F4F5' }]}>
                <Ionicons name="log-out-outline" size={20} color="#AF1D1D" />
              </View>
              <Text style={[styles.actionMenuText, { color: '#AF1D1D' }]}>Se déconnecter</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#AF1D1D" />
          </Pressable>
        </View>
      </ScrollView>

      {/* Interface Slider Bas-Haut (Modal) */}
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
              <Text style={styles.modalTitle}>Modifier mes données</Text>
              <Pressable style={styles.closeModalButton} onPress={() => setIsModalOpen(false)}>
                <Ionicons name="close" size={20} color="#777779" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalForm}>
              {/* Input : Nom complet */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nom complet</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={18} color="#777779" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={editFullName}
                    onChangeText={setEditFullName}
                    placeholder="Entrez votre nom"
                    placeholderTextColor="#777779"
                  />
                </View>
              </View>

              {/* Input : Ville */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ville</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="location-outline" size={18} color="#777779" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={editCity}
                    onChangeText={setEditCity}
                    placeholder="Ex: Abidjan, Kinshasa..."
                    placeholderTextColor="#777779"
                  />
                </View>
              </View>

              {/* Input : Téléphone / WhatsApp */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Numéro WhatsApp (avec code pays)</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="call-outline" size={18} color="#777779" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder="Ex: 2250707070707"
                    keyboardType="phone-pad"
                    placeholderTextColor="#777779"
                  />
                </View>
              </View>

              {/* Bouton Enregistrer */}
              <Pressable
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveChanges}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={styles.btnIcon} />
                    <Text style={styles.saveButtonText}>Enregistrer les modifications</Text>
                  </>
                )}
              </Pressable>

              <View style={{ height: insets.bottom + 40 }} />
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
    backgroundColor: '#F4F4F5', // Fond clair du design system
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F5',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginTop: 20,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0A2540', // Primary Text
    letterSpacing: -0.5,
    textAlign: 'center'
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#777779', // Neutral text
    marginTop: 2,
    fontWeight: '500',
    textAlign: 'center'
  },
  identityContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
    padding: 4,
    borderRadius: 55,
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#0A2540', // Primary background for avatar
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#0A2540', // Primary color badge
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0A2540',
    letterSpacing: -0.3,
  },
  profileEmail: {
    fontSize: 13,
    color: '#777779',
    marginTop: 3,
    fontWeight: '500',
  },
  menuGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    shadowColor: '#0a25402f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  menuGroupTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#777779',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
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
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F4F4F5', // Card item bg format
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuItemLabel: {
    fontSize: 11,
    color: '#777779',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  menuItemValue: {
    fontSize: 14,
    color: '#0A2540',
    fontWeight: '700',
    marginTop: 1,
  },
  actionMenuText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0A2540',
  },
  actionMenuText2: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D4AF37', // Secondary action color text
  },
  btnIcon: {
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 37, 64, 0.4)', // Overlay matching core theme tone
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    maxHeight: '85%',
  },
  modalDragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#E4E4E7',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0A2540',
  },
  closeModalButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F4F4F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalForm: {
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0A2540',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F4F5',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#0A2540',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#0A2540', // Primary button design
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 10,
    marginTop: 12,
  },
  saveButtonDisabled: {
    backgroundColor: '#777779',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});