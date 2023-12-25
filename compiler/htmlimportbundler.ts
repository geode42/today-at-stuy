import { assert } from "https://deno.land/std@0.202.0/assert/mod.ts"
import * as path from "https://deno.land/std@0.190.0/path/mod.ts"
import { initParser, DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm-noinit.ts"
import * as terser from "npm:terser@5.20.0"
// @deno-types="npm:@types/mime-types@2.1.1"
import mime from "npm:mime-types@2.1.35"
import svgo from 'npm:svgo@3.0.2'


function textToDataURL(text: string, mimeType: string): string {
	return `data:${mimeType};base64,${btoa(unescape(encodeURIComponent(text)))}`
}

export async function bundleLocalHTMLImports(htmlPath: string): Promise<{html: string | null, embeddedFiles: string[]} | null> {
	await initParser() // I don't know what this does but it's probably important

	function getFileRelativeToHTML(href: string) {
		return path.resolve(path.join(path.dirname(htmlPath), href))
	}

	const embeddedFiles = []

	const HTMLDocument = new DOMParser().parseFromString(await Deno.readTextFile(htmlPath), 'text/html')
	if (HTMLDocument == null) {
		return null
	}
	embeddedFiles.push(path.resolve(htmlPath))

	/* --------------------------- All links with href -------------------------- */
	const links = HTMLDocument.getElementsByTagName('link')

	for (const link of links) {
		const href = link.getAttribute('href')
		if (!href) continue
		if (href.startsWith('http')) continue

		const filePath = getFileRelativeToHTML(href)



		// Use a style tag if it's a CSS file (for compatability, data URLs don't seem to support relative URL paths for example)
		if (link.getAttribute('rel') == 'stylesheet') {
			const styleElement = HTMLDocument.createElement('style')
			styleElement.innerHTML = await Deno.readTextFile(filePath)
			link.replaceWith(styleElement)
			embeddedFiles.push(filePath)
			continue
		}



		const mimeType = link.getAttribute('type') || mime.lookup(href)
		if (link.getAttribute('rel') && link.getAttribute('rel') == 'icon') {
			continue
		}
		if (link.getAttribute('rel') && link.getAttribute('rel') == 'manifest') {
			continue
		}
		if (!mimeType) continue
		
		let text = await Deno.readTextFile(filePath)

		// Minify SVGs with SVGO
		if (mimeType == 'image/svg+xml') {
			text = svgo.optimize(text, { multipass: true }).data
		}

		const dataURL = textToDataURL(text, mimeType)

		link.setAttribute('href', dataURL)

		embeddedFiles.push(filePath)
	}

	/* ------------------------------- JS imports ------------------------------- */
	const scriptElements = HTMLDocument.getElementsByTagName('script')
	const scripts: string[] = []
	for (const script of scriptElements) {
		const src = script.getAttribute('src')
		if (!src || src.startsWith('http')) continue

		const filePath = getFileRelativeToHTML(src)
		embeddedFiles.push(filePath)

		const text = await Deno.readTextFile(filePath)

		// If the script is a module
		if (script.getAttribute('type') == 'module') {
			const minifyOutput = await terser.minify(text, { compress: true, ie8: false, keep_classnames: true, mangle: true, module: true, safari10: false, sourceMap: false, toplevel: true })
			assert(minifyOutput.code != undefined, "MinifyOutput's code attribute is undefined")

			script.innerText = minifyOutput.code
			script.removeAttribute('src')

			continue
		}

		// If the script isn't a module, add it to the list
		scripts.push(text)
		script.remove()
	}

	// Add a single script element with all the non type=module scripts
	const minifyOutput = await terser.minify(scripts.join('\n'), { compress: true, ie8: false, keep_classnames: true, mangle: true, module: true, safari10: false, sourceMap: false, toplevel: true })
	assert(minifyOutput.code != undefined, "MinifyOutput's code attribute is undefined")

	const scriptElement = HTMLDocument.createElement('script')
	// Defer doesn't work on inline scripts,
	// But type=module defers, and does work on inline scripts
	// Since all the scripts that share stuff are already in this script, making it a module shouldn't affect anything
	// Except for inline scripts, which aren't supported rn
	scriptElement.setAttribute('type', 'module')
	scriptElement.innerText = minifyOutput.code
	HTMLDocument.head.append(scriptElement)

	return {html: HTMLDocument.documentElement?.outerHTML || '', embeddedFiles: embeddedFiles}
}