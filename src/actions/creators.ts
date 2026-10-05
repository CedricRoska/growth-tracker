"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ActionState } from "./accounts";

const creatorSchema = z.object({
  name: z.string().min(1, "Nom requis").max(80),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
});

export async function createCreator(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { workspaceId } = await requireSession();
  const parsed = creatorSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") || "",
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  await prisma.creator.create({
    data: { workspaceId, name: parsed.data.name.trim(), email: parsed.data.email || null, notes: parsed.data.notes || null },
  });
  revalidatePath("/", "layout");
  return { success: `${parsed.data.name} ajouté` };
}

export async function deleteCreator(creatorId: string) {
  const { workspaceId } = await requireSession();
  await prisma.creator.deleteMany({ where: { id: creatorId, workspaceId } });
  revalidatePath("/", "layout");
}
