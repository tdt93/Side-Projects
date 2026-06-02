/** Hard navigation — reliable for auth redirects and tunnel/dev testing. */
export function navigateTo(href: string) {
  window.location.assign(href);
}
