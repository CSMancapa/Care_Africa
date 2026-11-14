import { usePractice } from "@/context/PracticeContext";

/**
 * The id of the practice the signed-in user is working in, or null while
 * loading / when they belong to none.
 *
 * Previously this looked up practices.id = auth user id, which doesn't work
 * with the new schema (users are linked to practices via practice_members).
 * It now reads from PracticeProvider, which loads the membership once.
 */
export const useCurrentPractice = (): string | null => {
  return usePractice().practice?.id ?? null;
};
