import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "INVALID_JSON"
  | "RATE_LIMITED"
  | "LICENSE_REVOKED"
  | "LICENSE_EXPIRED"
  | "HARDWARE_MISMATCH"
  | "INSTALLATION_MISMATCH"
  | "INSTALLATION_NOT_FOUND"
  | "DUPLICATE_LICENSE"
  | "STALE_REQUEST"
  | "INTERNAL_ERROR";

type ApiErrorBody = {
  success: false;
  error: ApiErrorCode;
  message: string;
};

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
) {
  const body: ApiErrorBody = { success: false, error: code, message };
  return NextResponse.json(body, { status });
}
