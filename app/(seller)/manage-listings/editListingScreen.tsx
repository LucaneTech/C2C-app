import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer'; // Nécessaire pour upload Storage

// Structure des catégories pour le sélecteur
interface Category {
  id: number;
  name: string;
}

// Structure de l'image locale avant upload
interface LocalImage {
  uri: string;
  base64?: string; // Requis pour l'upload Storage Supabase
  isApiImage?: boolean; // Pour distinguer les images existantes des nouvelles
}

export default function EditListingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>(); // ID présent = Mode Édition
  const isEditing = !!id;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(isEditing); // Loader de chargement initial
  const [submitting, setSubmitting] = useState(false); // Loader de soumission

  // --- État du Formulaire ---
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [images, setImages] = useState<LocalImage[]>([]); // Gère multi-photos (on en prendra 1 comme principale pour la V1)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null); // Stocke l'URL existante en mode édition

  // 1. Chargement initial (Catégories + Données si édition)
  useEffect(() => {
    async function initialize() {
      await fetchCategories();
      if (isEditing) {
        await fetchListingData();
      }
    }
    initialize();
  }, [id]);

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('category').select('id, name').order('name');
    if (!error && data) setCategories(data);
  };

  const fetchListingData = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setTitle(data.title);
        setDescription(data.description);
        setPrice(data.price.toString());
        setQuantity(data.quantity.toString());
        setSelectedCategoryId(data.category_id);
        if (data.image) {
          setExistingImageUrl(data.image);
          setImages([{ uri: data.image, isApiImage: true }]); // Prévisualisation de l'image existante
        }
      }
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de charger l\'annonce.');
      router.back();
    } finally {
      setLoadingData(false);
    }
  };

  // 2. Gestion de la sélection et optimisation d'image
  const pickImage = async () => {
    // Demande de permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Nous avons besoin d\'accès à vos photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, // Permet de recadrer (carré recommandé pour ton design)
      aspect: [1, 1], // Force le ratio carré 1:1
      quality: 1, // Haute qualité initiale avant compression
      base64: true, // Requis pour Supabase Storage
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      // --- Optimisation de l'image (Compression + Redimensionnement) ---
      // Crucial pour ne pas saturer le Storage et pour la vitesse de chargement
      const manipResult = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800 } }], // Redimensionne à 800px de large max
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true } // Compresse à 70% JPEG
      );

      setImages([{ uri: manipResult.uri, base64: manipResult.base64, isApiImage: false }]); // Remplace l'image (V1 : photo unique)
      setExistingImageUrl(null); // Si on choisit une nouvelle photo, on ignore l'ancienne
    }
  };

  const removeImage = () => {
    setImages([]);
    setExistingImageUrl(null);
  };

  // 3. Logique d'upload vers Supabase Storage
  const uploadImageAndGetUrl = async (image: LocalImage): Promise<string | null> => {
    if (!image.base64 || image.isApiImage) return existingImageUrl; // Rien à uploader

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // Nom de fichier unique : user_id/timestamp.jpg
      const fileName = `${user.id}/${Date.now()}.jpg`;
      
      // Upload vers le bucket 'listings-images' (doit être créé dans Supabase)
      const { data, error } = await supabase.storage
        .from('listings-images')
        .upload(fileName, decode(image.base64), {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) throw error;

      // Récupération de l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('listings-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Erreur upload:', error);
      return null;
    }
  };

  // 4. Soumission du Formulaire (Création ou Mise à jour)
  const handleSubmit = async () => {
    // --- Validation basique ---
    if (!title || !price || !quantity || !selectedCategoryId || images.length === 0) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs et ajouter une photo.');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // A. Upload de la photo si nécessaire
      const finalImageUrl = await uploadImageAndGetUrl(images[0]);
      if (!finalImageUrl) throw new Error('Échec de l\'envoi de l\'image.');

      // B. Préparation des données
      const listingData = {
        vendor_id: user.id,
        category_id: selectedCategoryId,
        title,
        description,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        image: finalImageUrl,
        status: 'active', // Par défaut actif à la création
        updated_at: new Date().toISOString(),
      };

      // C. Requête Insert ou Update
      if (isEditing) {
        const { error } = await supabase
          .from('listings')
          .update(listingData)
          .eq('id', id);
        if (error) throw error;
        Alert.alert('Succès', 'Annonce mise à jour !');
      } else {
        const { error } = await supabase
          .from('listings')
          .insert([{ ...listingData, created_at: new Date().toISOString() }]);
        if (error) throw error;
        Alert.alert('Succès', 'Annonce publiée !');
      }

      router.back(); // Retour à l'écran précédent (Mes Annonces)
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible d\'enregistrer l\'annonce.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0A2540" />
        <Text style={styles.loadingText}>Chargement des données...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Modifier l\'annonce' : 'Nouvelle annonce'}
        </Text>
        <View style={{ width: 40 }} /> {/* Équilibreur visuel */}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section Image Unique (V1) */}
          <Text style={styles.label}>Photo principale *</Text>
          <View style={styles.imageSelectorContainer}>
            {images.length > 0 ? (
              <View style={styles.imageWrapper}>
                <Image source={{ uri: images[0].uri }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={removeImage}>
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                <Ionicons name="camera-outline" size={32} color="#94A3B8" />
                <Text style={styles.addImageText}>Ajouter une photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Titre */}
          <Text style={styles.label}>Titre de l'annonce *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Samsung Galaxy S21 État Neuf"
            value={title}
            onChangeText={setTitle}
            maxLength={70}
          />

          {/* Catégorie (Sélecteur basique, V1) */}
          <Text style={styles.label}>Catégorie *</Text>
          <View style={styles.pickerContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesTabs}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryTab, selectedCategoryId === cat.id && styles.categoryTabActive]}
                  onPress={() => setSelectedCategoryId(cat.id)}
                >
                  <Text style={[styles.categoryTabText, selectedCategoryId === cat.id && styles.categoryTabTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Prix et Quantité */}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Prix (Dhs) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 4500"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: 100 }}>
              <Text style={styles.label}>Quantité *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 1"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
          </View>

          {/* Description */}
          <Text style={styles.label}>Description (Détails, État...)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Décrivez votre article en détail..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bouton de soumission fixe en bas */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#D4AF37" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={18} color="#D4AF37" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>
                {isEditing ? 'Mettre à jour' : 'Publier l\'annonce'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 100, // Espace pour le footer fixe
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 5, // Contrainte max 5px
    paddingHorizontal: 16,
    height: 50,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    height: 120,
    paddingTop: 14,
    paddingBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // --- Section Image ---
  imageSelectorContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  addImageBtn: {
    width: '100%',
    height: 160,
    backgroundColor: '#F1F5F9',
    borderRadius: 5, // Contrainte max 5px
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addImageText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  imageWrapper: {
    width: 160,
    height: 160,
    position: 'relative',
    borderRadius: 5, // Contrainte max 5px
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
  },
  // --- Section Catégories (Tabs) ---
  pickerContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  categoriesTabs: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 5, // Contrainte max 5px
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryTabActive: {
    backgroundColor: '#0A2540',
    borderColor: '#0A2540',
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
  },
  // --- Footer & Submit ---
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    zIndex: 10,
  },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: '#0A2540',
    height: 52,
    borderRadius: 5, // Contrainte max 5px
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0A2540',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // --- Loading ---
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
});