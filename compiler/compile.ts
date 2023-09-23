import * as path from "https://deno.land/std@0.190.0/path/mod.ts"
import * as fs from "https://deno.land/std@0.190.0/fs/mod.ts"
import { minify } from 'npm:html-minifier-terser@7'
import { bundleLocalHTMLImports } from './htmlimportbundler.ts'
import * as brotli from "https://deno.land/x/brotli@0.1.7/mod.ts"
import * as compress from "https://deno.land/x/compress@v0.4.5/mod.ts"
import { assert } from "https://deno.land/std@0.202.0/assert/mod.ts"

const srcDirectory = './src'
const distDirectory = './dist'

const bundleInfo = await bundleLocalHTMLImports(path.join(srcDirectory, 'index.html'))
assert(bundleInfo != null, "bundleInfo is null")

const html = '<!DOCTYPE html>' + await minify(bundleInfo.html, {
	minifyCSS: true,
	collapseBooleanAttributes: true,
	collapseWhitespace: true,
	removeAttributeQuotes: true,
	removeComments: true,
	removeRedundantAttributes: true,
	removeScriptTypeAttributes: true,
	removeStyleLinkTypeAttributes: true,
})

// Creates directory if it doesn't exist
await fs.emptyDir(distDirectory)

async function addCompressedVersionsOfFile(path: string): Promise<void> {
	await Deno.writeFile(path + '.gz', compress.gzip(await Deno.readFile(path)))
	await Deno.writeFile(path + '.br', brotli.compress(await Deno.readFile(path)))
}

Deno.writeTextFile(path.join(distDirectory, 'index.html'), html)
addCompressedVersionsOfFile(path.join(distDirectory, 'index.html'))

for await (const entry of fs.walk(srcDirectory)) {
	if (path.resolve(entry.path) == path.resolve(srcDirectory)) continue
	console.log(entry.name)
	if (entry.isDirectory) {
		// Check to see if it has any files that haven't been embedded into the HTML
		let nonEmbeddedFiles = false
		for await (const innerEntry of fs.walk(entry.path, { includeDirs: false })) {
			if (!bundleInfo.embeddedFiles.includes(path.resolve(innerEntry.path))) {
				nonEmbeddedFiles = true
				break
			}
		}
		// If it does, make the directory
		if (nonEmbeddedFiles) {
			await Deno.mkdir(path.join(distDirectory, path.relative(srcDirectory, entry.path)))
		}
		continue
	}
	if (bundleInfo.embeddedFiles.includes(path.resolve(entry.path))) {
		continue
	}

	const outpathPath = path.join(distDirectory, path.relative(srcDirectory, entry.path))

	await fs.copy(entry.path, outpathPath)

	addCompressedVersionsOfFile(outpathPath)
}