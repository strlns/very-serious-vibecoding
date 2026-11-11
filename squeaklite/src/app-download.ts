/** Link to the app asset, never to a serialization of the live workspace DOM. */
export function appDownloadHref(pageUrl: string, singlefile: boolean): string {
  const page = new URL(pageUrl);
  if (singlefile) {
    page.hash = '';
    return page.href;
  }
  // Also support serving the two output directories side by side from the
  // project directory, in addition to publishing dist/ as the site's root.
  return /\/dist\/(?:index\.html)?$/.test(page.pathname)
    ? '../dist-singlefile/index.html'
    : './dist-singlefile/index.html';
}
