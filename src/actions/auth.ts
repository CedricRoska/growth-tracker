"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import type { ActionState } from "./accounts";

export async function authenticate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? "").toLowerCase(),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/dashboard",
    });
    return undefined;
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") return { error: "Email ou mot de passe incorrect" };
      // CallbackRouteError = exception dans authorize(), en pratique la base de données injoignable.
      if (error.type === "CallbackRouteError") {
        return { error: "Base de données injoignable. En local, lance `npm run db:local` dans un autre terminal." };
      }
      return { error: "Connexion impossible" };
    }
    // Next.js utilise une exception pour la redirection : il faut la laisser remonter.
    throw error;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
