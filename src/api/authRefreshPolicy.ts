// Domain validation may use HTTP 401 without indicating an expired access token.
export function isRefreshExcludedForError(
  errorCode: string | undefined,
  excludedCodes: readonly string[] | undefined,
): boolean {
  return errorCode !== undefined && excludedCodes?.includes(errorCode) === true;
}
