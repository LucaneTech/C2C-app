import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      {/* L'ensemble des onglets est traité comme un seul bloc dans le Stack */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {/* L'écran de détails est empilé par-dessus, masquant la barre d'onglets */}
      <Stack.Screen 
        name="instruments/[id]" 
        options={{ 
          title: "Détails de l'instrument",
          headerBackTitle: "Retour" 
        }} 
      />
    </Stack>
  );
}