export function invitationUrl(pageUrl: string, invite: string) {
  const url = new URL(pageUrl);
  url.search = '';
  url.hash = new URLSearchParams({ invite }).toString();
  return url.toString();
}
