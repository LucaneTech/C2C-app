import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useUserProfil } from '@/hook/useUserProfil';

export default function SellerLayout() {
  const { profile, loading } = useUserProfil();
  const router = useRouter();

  useEffect(() => {
    // Si le chargement est fini et que le profil n'est pas "seller", on redirige vers l'accueil
    if (!loading && profile?.role !== 'seller') {
      router.replace('/(tabs)'); 
    }
  }, [profile, loading]);

  // Pendant la vérification du rôle, on affiche un écran de chargement neutre
  if (loading || profile?.role !== 'seller') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#09090B" />
      </View>
    );
  }

  // Si l'utilisateur est un vendeur, on affiche l'arbre de navigation normalement
  return (
    <Stack>
      <Stack.Screen 
        name="orders" 
        options={{ 
          headerShown: false 
        }} 
      />
       <Stack.Screen 
        name="manage-listings" 
        options={{ 
          headerShown: false 
        }} 
      />

      <Stack.Screen 
        name="manage-listings/createListingScreen" 
        options={{ 
          headerShown: false 
        }} 
      />

       <Stack.Screen 
        name="manage-listings/editListingScreen" 
        options={{ 
          headerShown: false 
        }} 
      />
    </Stack>

    
     
   
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});