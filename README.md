# Epic Web Cours

An app built during the [Epic Web](https://epicweb.dev) course by Kent C. Dodds.

## Styling

This was a pretty simple module covering mostly how CSS is importated in Remix.
One of the things that was cool to refresh was all the dev tools that Chrome has
to look at whats happening when a page is loaded.

### Links To Public Files

When loading a website browser will automatically make a request to
`favicon.ico` if you don't have something configured. In the case of this app,
the server is configured to serve everything in the `/public` directory, which
includes a `favicon.ico` file, so the browser automatically uses that image.

In this exercises we are presented for the first time with the function exports
that Remix uses to populate our app components with data. In this case the
`links` function:

```js
import { type LinksFunction } from '@remix-run/node'

export const links: LinksFunction = () => {
	return [
		{
			rel: 'stylesheet',
			// all files in the public directory are served at the root of the site
			href: '/my-stylesheet.css',
		},
	]
}
```

### Asset Imports

The difference between just hard-coding the file in the href and using a asset
import is that Remix will add a hash to the files we import and that will allow
us to set the cache to be really long and any time we make any change to the
file that hash will change and it will break the hash.
