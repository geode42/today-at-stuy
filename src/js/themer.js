/**
 * @typedef {{ name: string, slug: string, isDarkTheme: boolean, properties: Record<string, string> }} Theme
 */

class Themer {
	#theme = 'default-light'
	#themes = []
	#styleElement

	constructor() {
		this.#styleElement = document.createElement('style')
		document.head.append(this.#styleElement)
	}

	/**
	 * Returns the slugs of all available themes
	 * @returns {Theme[]}
	 */
	getAllThemes() {
		return this.#themes
	}

	get theme() {
		return this.#theme
	}

	set theme(value) {
		this.#theme = value
		this.#applyCurrentTheme()
	}

	#applyCurrentTheme() {
		const theme = this.get(this.theme)

		// Could probably make this shorter
		const convertCamelCaseToKebabCase = i=>i.split('').reduce((a,i)=>a+(i==i.toLowerCase()?i:'-'+i.toLowerCase()))
	
		const fallback = this.get('default-light')
		if (!fallback) return
		const themeColorMeta = document.querySelector("meta[name='theme-color']")

		this.#styleElement.textContent = ':root,::backdrop{'
	
		for (const property in fallback.properties) {
			if (theme && Object.hasOwn(theme.properties, property)) {
				this.#styleElement.textContent += `--${convertCamelCaseToKebabCase(property)}:${theme.properties[property]};`
				if (property == 'background') themeColorMeta && themeColorMeta.setAttribute('content', theme.properties[property])
			} else {
				this.#styleElement.textContent += `--${convertCamelCaseToKebabCase(property)}:${fallback.properties[property]};`
				if (property == 'background') themeColorMeta && themeColorMeta.setAttribute('content', fallback.properties[property])
			}
		}

		this.#styleElement.textContent += '}'
	}

	/**
	 * Returns a theme with the same slug
	 * @param {string} slug
	 * @returns {Theme}
	 */
	get(slug) {
		return this.#themes.find(i => i.slug == slug)
	}

	/**
	 * Adds a theme to themer
	 * @param {string} name - The name the user sees, could be anything
	 * @param {string} slug - The name used internally, must be unique
	 * @param {Record<string, any>} properties - The colors and whatnot
	 */
	add(name, slug, properties) {
		this.#themes.push({ name, slug, properties })
		this.#applyCurrentTheme()
	}
	/**
	 * Removes a theme from themer
	 * @param {string} slug - The theme's slug
	 * @returns {boolean} Whether the operation was successful
	 */
	remove(slug) {
		const index = this.#themes.findIndex(i => i.slug = slug)
		if (index == -1) return false
		this.#themes = this.#themes.filter(i => i.slug != slug)
		return true
	}
}