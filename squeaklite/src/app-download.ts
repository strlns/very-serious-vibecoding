/** Link to the app asset, never to a serialization of the live workspace DOM. */
export function appDownloadHref(
  pageUrl: string,
  singlefile: boolean,
  version = "",
): string {
  const page = new URL(pageUrl);
  if (singlefile) {
    page.hash = "";
    // File URLs need no HTTP cache busting, and query strings can confuse local viewers.
    if (version && /^https?:$/.test(page.protocol))
      page.searchParams.set("v", version);
    return page.href;
  }
  // Support both a nested portable deployment and sibling build directories.
  const path = /\/dist\/(?:index\.html)?$/.test(page.pathname)
    ? "../dist-singlefile/index.html"
    : "./dist-singlefile/index.html";
  return version ? path + "?v=" + encodeURIComponent(version) : path;
}
