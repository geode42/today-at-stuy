import { initParser, DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm-noinit.ts"
import * as path from "https://deno.land/std@0.190.0/path/mod.ts"

export async function bundleLocalHTMLImports(htmlPath: string): Promise<{html: string | null, embeddedFiles: string[]} | null> {
	await initParser() // I don't know what this does but it's probably important

	const embeddedFiles = []

	const HTMLDocument = new DOMParser().parseFromString(await Deno.readTextFile(htmlPath), 'text/html')
	if (HTMLDocument == null) {
		return null
	}
	embeddedFiles.push(path.resolve(htmlPath))

	/* ------------------------------- CSS imports ------------------------------ */
	const links = HTMLDocument.getElementsByTagName('link')
	for (const link of links) {
		if (!link.hasAttribute('href')) continue
		if (link.getAttribute('rel') == 'stylesheet') {
			const href = link.getAttribute('href') || ''
	
			// We're only bundling local files
			if (href.startsWith('http')) continue
	
			const styleElement = HTMLDocument.createElement('style')
			styleElement.innerHTML = await Deno.readTextFile(path.join(path.dirname(htmlPath), href))
			link.replaceWith(styleElement)
			embeddedFiles.push(path.resolve(path.join(path.dirname(htmlPath), href)))
		} else if (link.getAttribute('rel') == 'icon' && link.getAttribute('type') == 'image/svg+xml') {
			const href = link.getAttribute('href') || ''
	
			// We're only bundling local files
			if (href.startsWith('http')) continue

			const SVGHTML = await Deno.readTextFile(path.join(path.dirname(htmlPath), href))
			link.setAttribute('href', `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(SVGHTML)))}`)
			embeddedFiles.push(path.resolve(path.join(path.dirname(htmlPath), href)))
		} else if (link.getAttribute('rel') == 'manifest') {
			const href = link.getAttribute('href') || ''
	
			// We're only bundling local files
			if (href.startsWith('http')) continue

			const manifestJSON = await Deno.readTextFile(path.join(path.dirname(htmlPath), href))
			link.setAttribute('href', `data:application/manifest+json;base64,${btoa(unescape(encodeURIComponent(manifestJSON)))}`)
			embeddedFiles.push(path.resolve(path.join(path.dirname(htmlPath), href)))
		}
	}

	/* ------------------------------- JS imports ------------------------------- */
	const scripts = HTMLDocument.getElementsByTagName('script')
	for (const script of scripts) {
		if (script.getAttribute('type') == 'module') continue // Modules can't be inline without hacks

		const src = script.getAttribute('src')
		if (src == null) continue

		// We're only bundling local files
		if (src.startsWith('http')) continue

		script.remove()

		const newScript = HTMLDocument.createElement('script')
		newScript.innerText = await Deno.readTextFile(path.join(path.dirname(htmlPath), src))

		if (script.hasAttribute('defer')) {
			HTMLDocument.body.append(newScript)
		} else {
			HTMLDocument.head.append(newScript)
		}
		embeddedFiles.push(path.resolve(path.join(path.dirname(htmlPath), src)))
	}

	return {html: HTMLDocument.documentElement?.outerHTML || '', embeddedFiles: embeddedFiles}
}