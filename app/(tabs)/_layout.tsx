import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true, // Hide text labels as shown in the image
        tabBarStyle: styles.tabBar,
      }}
    >
      {/* 1. Home Tab (Active state shown in yellow circle) */}
      <Tabs.Screen
        name="index"
        options={{

          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconWrapper]}>
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={25}
                color={focused ? "#0a2540" : "#ffffff"}
              />
            </View>
          ),
        }}
      />

      {/* 2. Explore / Compass Tab */}
      {/* <Tabs.Screen
        name="setting"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconWrapper]}>
              <Ionicons 
                name={focused ? "settings" : "settings-outline"} 
                size={25} 
                color={focused ? "#0a2540" : "#ffffff"} 
              />
            </View>
          ),
        }}
      /> */}

      {/* 3. Marketplace / Bag Tab */}
      <Tabs.Screen
        name="orders"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconWrapper]}>
              <Ionicons
                name={focused ? "bag" : "bag-outline"}
                size={25}
                color={focused ? "#0a2540" : "#ffffff"}
              />
            </View>
          ),
        }}
      />
      {/* <Tabs.Screen
        name="orders"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconWrapper]}>
              <Ionicons
                name={focused ? "archive" : "archive-outline"}
                size={22} // Taille légèrement réduite pour un rendu plus fin et professionnel
                color={focused ? "#0A2540" : "#FFFFFF"}
              />
            </View>
          ),
        }}
      /> */}

      {/* 4. Profile Tab */}
      <Tabs.Screen
        name="profile"

        options={{

          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconWrapper]}>
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={25}
                color={focused ? "#0a2540" : "#ffffff"}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  /**
   * Floating, fully rounded tab bar matching the exact shape and colors from the mockup
   */
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    left: 20,
    right: 20,
    backgroundColor: '#0a2540', // Deep Navy background matching login/signup forms
    borderRadius: 35,
    height: 70,
    borderTopWidth: 0, // Removes the standard grey top border line
    // Floating drop-shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
    // Horizontal spacing alignment for items
    paddingBottom: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
    borderWidth: 2,
    borderColor: "#ffd053",

  },
  /**
   * Base styling for all tab icons to ensure proper alignment
   */
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /**
   * Beautiful round yellow badge layout applied to the currently active icon
   */
  activeIconWrapper: {
    backgroundColor: '#ffd053', // Bright yellow circle as seen in the mockup
    shadowColor: '#ffd053',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
});