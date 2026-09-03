/** Shared by LoginUserCommandHandler and RefreshSessionCommandHandler. */
export interface ILoginSessionResult {
  accessToken: string;
  refreshToken: string;
}
