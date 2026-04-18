import {
  admin,
  ai,
  auth,
  findings,
  recon,
  reports,
  scans,
  search,
  settings,
  type AuthResponse,
  type AuthUser,
  type Finding,
  type ReconResult,
  type Report,
  type Scan,
  type SearchResults,
  type SearchCategory,
  type SearchMeta,
  type SearchResponse,
} from "../api/endpoints";

export type {
  AuthResponse,
  AuthUser,
  Finding,
  ReconResult,
  Report,
  Scan,
  SearchCategory,
  SearchMeta,
  SearchResponse,
  SearchResults,
};

export { settings, admin, scans, findings, recon, ai, reports, search };

export const api = {
  auth: {
    login: (email: string, password: string, rememberMe = false) =>
      auth.login(email, password, rememberMe),
    register: (payload: { email: string; password: string; full_name: string }) =>
      auth.register(payload),
    forgotPassword: (email: string) => auth.forgotPassword(email),
    verify2FA: (payload: {
      email: string;
      code: string;
      temp_token?: string;
      is_backup?: boolean;
    }) => auth.verify2FA(payload),
    resend2FA: (payload: { email: string; temp_token?: string }) => auth.resend2FA(payload),
    refresh: (refreshToken: string) => auth.refresh(refreshToken),
    me: () => auth.me(),
  },
  scans,
  findings,
  recon,
  ai,
  reports,
  settings,
  search,
  admin,
};
