// Hash routes work both in a browser and from Electron's packaged index.html.
export function currentRoute() {
  const route = window.location.hash.slice(1);
  return new URL(route || (window.location.protocol === 'file:' ? '/' : window.location.pathname + window.location.search), 'http://keppler.local');
}

export function navigate(route: string) {
  window.location.hash = route;
}
