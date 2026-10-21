export type AuthUser = {
  id: string;
  nickname: string;
  publicId: string;
  avatarUrl: string;
};
export type QrStatus =
  "waiting" | "scanned" | "confirmed" | "expired" | "cancelled" | "used";
export type QrChallenge = {
  attempt: string;
  qrDataUrl: string;
  expiresAt: string;
  pollAfterSeconds: number;
};
export type QrProgress = { status: QrStatus };
