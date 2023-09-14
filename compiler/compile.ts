import * as path from "https://deno.land/std@0.190.0/path/mod.ts"
import * as fs from "https://deno.land/std@0.190.0/fs/mod.ts"
import { minify } from 'npm:html-minifier-terser@7'
import { bundleLocalHTMLImports } from './htmlimportbundler.ts'
import * as brotli from "https://deno.land/x/brotli@0.1.7/mod.ts"
import * as compress from "https://deno.land/x/compress@v0.4.5/mod.ts"

const srcDirectory = './src'
const distDirectory = './dist'

const bundleInfo = await bundleLocalHTMLImports(path.join(srcDirectory, 'index.html'))
if (bundleInfo == null) {
	console.log('bundleInfo is null?')
	Deno.exit(1)
}

const html = '<!DOCTYPE html>' + await minify(bundleInfo.html, {
	minifyCSS: true,
	minifyJS: true,
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

Deno.writeTextFile(path.join(distDirectory, 'index.html'), html)

for await (const entry of fs.walk(srcDirectory)) {
	if (path.resolve(entry.path) == path.resolve(srcDirectory)) continue
	console.log(entry.name)
	if (entry.isDirectory) {
		await Deno.mkdir(path.join(distDirectory, path.relative(srcDirectory, entry.path)))
		continue
	}
	if (bundleInfo.embeddedFiles.includes(path.resolve(entry.path))) {
		continue
	}

	await fs.copy(entry.path, path.join(distDirectory, path.relative(srcDirectory, entry.path)))
}

for await (const entry of Deno.readDir(distDirectory)) {
	Deno.writeFile(path.join(distDirectory, entry.name + '.gz'), compress.gzip(await Deno.readFile(path.join(distDirectory, entry.name))))
	Deno.writeFile(path.join(distDirectory, entry.name + '.br'), brotli.compress(await Deno.readFile(path.join(distDirectory, entry.name))))
}