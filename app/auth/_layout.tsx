import { Stack } from 'expo-router';

const AuthNavigator = () => {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FAFBFB' },
        headerTintColor: '#0a2540',
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        headerBackTitle: "Retour",
      }}
    >
      {/* Écran de Connexion */}
      <Stack.Screen 
        name="LoginScreen" 
        options={{ 
          headerShown: false,
          gestureEnabled: false ,
        }} 
      />
      
      {/* Écran d'Inscription */}
      <Stack.Screen 
        name="SignupScreen" 
        options={{ 
          title: "" ,
           headerShown: false
        }} 
      />

      {/* Écran de Demande de Réinitialisation */}
      <Stack.Screen 
        name="ForgotPasswordScreen" 
        options={{ 
          title: "",
          headerShown: false // Géré par notre propre bouton retour personnalisé
        }} 
      />

      {/* Écran de Saisie du Nouveau Mot de Passe */}
      <Stack.Screen 
        name="ResetPasswordScreen" 
        options={{ 
          title: "",
          headerShown: false,
          gestureEnabled: false // Évite de quitter accidentellement pendant la réinitialisation
        }} 
      />
    </Stack>    
  );
};


export default AuthNavigator
