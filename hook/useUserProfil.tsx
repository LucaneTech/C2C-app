import { useContext } from "react";
import {UserContext} from "@/context/UserContext";

// Hook personnalisé pour consommer le contexte facilement
export function useUserProfil() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser doit être utilisé à l'intérieur d'un UserProvider");
  }
  return context;
}