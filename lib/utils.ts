import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ADMIN_EMAIL = "admin@nixlor.com";

export function isValidAdminEmail(email: string): boolean {
  return email.toLowerCase() === ADMIN_EMAIL;
}
