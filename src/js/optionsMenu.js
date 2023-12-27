// declared in script.js
// const optionsDialog = getByID('options-dialog')
// const optionsMenuOpenButton = getByID('options-menu-open-button')
const optionsMenu = getByID('options-menu')
const themeList = getByID('theme-list')

const themer = new Themer()

// getByID('options-dialog').showModal()

themer.add('Default Light', 'default-light', {
	foreground: '#444',
	background: '#FFF',

	timeElapsed: '#000',
	timeRemaining: '#000',
	elapsedRemainingUnits: '#AAA',
	elapsedRemainingLabels: '#AAA',
	elapsedRemainingDivider: '#DFDFDF',
	elapsedRemainingDividerThickness: '0.09rem',

	bigPictureTimeElapsed: '#65d55b',
	bigPictureTimeRemaining: '#d94c4c',
	
	tableDividers: '#DFDFDF',
	tableDividersThickness: '0.09rem',
	
	currentPeriod: '#3AFF3380',
	currentPeriodBorder: '#60D65C',
	currentPeriodBorderRadius: '0.3rem',
	currentPeriodBorderWidth: '0.15rem',
	currentPeriodPassing1: '#3AFF3380',
	currentPeriodPassing2: '#24E21D80',
	
	button: '#EEE',
	buttonHover: '#DDD',
	radioButtonActive: '#5BE657',
	
	dialog: 'transparent',
	dialogBackdrop: '#FFF5',
	dialogBackdropBlur: '1rem',
})

themer.add('Default Dark', 'default-dark', {
	foreground: '#CCC',
	background: '#1B1B1B',
	
	timeElapsed: '#DDD',
	timeRemaining: '#DDD',
	elapsedRemainingUnits: '#FFF5',
	elapsedRemainingLabels: '#777',
	elapsedRemainingDivider: '#333',
	elapsedRemainingDividerThickness: '0.09rem',

	bigPictureTimeElapsed: '#65d55b',
	bigPictureTimeRemaining: '#d94c4c',
	
	tableDividers: '#333',
	tableDividerThickness: '0.09rem',
	
	currentPeriod: '#56E05280',
	currentPeriodBorder: '#36A932',
	currentPeriodBorderRadius: '0.3rem',
	currentPeriodBorderWidth: '0.15rem',
	currentPeriodPassing1: '#56E05280',
	currentPeriodPassing2: '#4dbb4980',

	button: '#222',
	buttonHover: '#3C3C3C',
	radioButtonActive: '#37A433',

	dialog: 'transparent',
	dialogBackdrop: '#1B1B1B50',
	dialogBackdropBlur: '1rem',
})

themer.add('OLED Dark', 'oled-dark', {...themer.get('default-dark').properties, ...{
	background: '#000',
	elapsedRemainingDivider: '#222',
	tableDividers: '#222'
}})

themer.add('Monkeytype', 'monkeytype', {...themer.get('default-dark').properties, ...{
	background: '#323437',
	timeElapsed: '#E2B714',
	timeRemaining: '#E2B714',
	elapsedRemainingLabels: '#636871',
	elapsedRemainingDivider: '#42454A',
	tableDividers: '#42454A',
}})

function changeThemeWithTransitionAndSave(newTheme) {
	themer.theme = newTheme.slug
	localStorage.setItem('theme', newTheme.slug)
	
	document.body.style.transition = '300ms all'
	setTimeout(() => {
		document.body.style = null
	}, 300)
}

let customThemes = JSON.parse(localStorage.getItem('custom-themes')) || []
customThemes.forEach(i => themer.add(i.name, i.slug, i.properties))

function saveCustomThemes() {
	for (let i = 0; i < customThemes.length; i++) {
		const slug = customThemes[i].slug
		const theme = themer.get(slug)
		const newSlug = convertNameToSlug(theme.name)
		theme.slug = newSlug
		customThemes[i] = { name: theme.name, slug: theme.slug, properties: theme.properties }
	}
	localStorage.setItem(`custom-themes`, JSON.stringify(customThemes))
}

function createNewThemeDialog() {
	const createNewThemeDialog = getByID('create-new-theme-dialog')
	const inheritMenu = getByID('create-new-theme-inherits-input')

	const nameInput = getByID('create-new-theme-name-input')
	const inheritsInput = getByID('create-new-theme-inherits-input')

	const cancelButton = getByID('create-new-theme-cancel-button')
	const createButton = getByID('create-new-theme-create-button')

	nameInput.value = ''

	cancelButton.onclick = e => {
		createNewThemeDialog.close()
	}
	
	createButton.onclick = e => {
		const name = nameInput.value
		const inherits = inheritsInput.value
		const theme = structuredClone(themer.get(inherits))
		theme.name = name
		theme.slug = convertNameToSlug(name)
		
		customThemes.push(theme)
		themer.add(theme.name, theme.slug, theme.properties)
		saveCustomThemes()
		changeThemeWithTransitionAndSave(theme)

		updateThemeList()

		createNewThemeDialog.close()
	}

	inheritMenu.replaceChildren()
	for (const theme of themer.getAllThemes()) {
		const option = document.createElement('option')
		option.textContent = theme.name
		option.value = theme.slug
		inheritMenu.append(option)
	}


	createNewThemeDialog.showModal()
}

function editThemeProperty(theme, property) {
	const editThemeDialog = document.getElementById('edit-theme-dialog')

	const oldTheme = themer.theme
	themer.theme = theme.slug

	const CSSProperty = `--${convertCamelCaseToKebabCase(property)}`
	const colorPicker = document.createElement('form')
	const rangeContainer = document.createElement('div')
	rangeContainer.classList.add('range-container')
	colorPicker.classList.add('color-picker')

	const createColorRange = (name, initialValue) => {
		const input = document.createElement('input')
		input.type = 'range'
		input.min = '0'
		input.max = '100'
		input.value = initialValue
		input.name = name

		const label = document.createElement('label')
		label.htmlFor = name
		label.textContent = name.substring(0, 1).toUpperCase() + name.substring(1)

		return [label, input]
	}

	const oldHSVA = RGBAtoHSVA(HexToRGBA(theme.properties[property]))

	const [hueLabel, hueInput] = createColorRange('hue', oldHSVA[0] * 100)
	const [saturationLabel, saturationInput] = createColorRange('saturation', oldHSVA[1] * 100)
	const [valueLabel, valueInput] = createColorRange('value', oldHSVA[2] * 100)
	const [alphaLabel, alphaInput] = createColorRange('alpha', oldHSVA[3] * 100)

	let [h, s, v, a] = [hueInput.value / 100, saturationInput.value / 100, valueInput.value / 100, alphaInput.value / 100]

	const updateHSVA = () => {
		document.documentElement.style.setProperty(CSSProperty, RGBAToHex(HSVAtoRGBA([h, s, v, a])))
	}

	// Not necessary?
	updateHSVA()

	hueInput.oninput = e => {
		h = e.target.value / 100
		updateHSVA()
	}
	saturationInput.oninput = e => {
		s = e.target.value / 100
		updateHSVA()
	}
	valueInput.oninput = e => {
		v = e.target.value / 100
		updateHSVA()
	}
	alphaInput.oninput = e => {
		a = e.target.value / 100
		updateHSVA()
	}

	editThemeDialog.close()
	optionsDialog.close()
	optionsMenuOpenButton.hidden = 'true'
	document.body.append(colorPicker)
	document.documentElement.style.setProperty('--compact-ui', '1')
	
	const buttonContainer = document.createElement('div')
	buttonContainer.id = 'edit-theme-property-button-container'

	const cancelButton = document.createElement('button')
	cancelButton.type = 'button'
	cancelButton.textContent = 'Cancel'
	cancelButton.classList.add('cancel-button')
	cancelButton.onclick = () => {
		colorPicker.remove()
		optionsDialog.showModal()
		editThemeDialog.showModal()
		document.documentElement.style.setProperty('--compact-ui', '0')
		optionsMenuOpenButton.hidden = null
		themer.theme = oldTheme
		saveCustomThemes()
		document.documentElement.style.setProperty(CSSProperty, theme.properties[property])
	}

	const acceptButton = document.createElement('button')
	acceptButton.type = 'button'
	acceptButton.textContent = 'Accept'
	acceptButton.classList.add('accept-button')
	acceptButton.onclick = () => {
		colorPicker.remove()
		optionsDialog.showModal()
		editThemeDialog.showModal()
		theme.properties[property] = RGBAToHex(HSVAtoRGBA([h, s, v, a]))
		document.documentElement.style.setProperty('--compact-ui', '0')
		optionsMenuOpenButton.hidden = null
		themer.theme = oldTheme
		saveCustomThemes()
	}

	buttonContainer.append(cancelButton, acceptButton)

	rangeContainer.append(hueLabel, hueInput, saturationLabel, saturationInput, valueLabel, valueInput, alphaLabel, alphaInput)
	colorPicker.append(rangeContainer, buttonContainer)
}

function editThemeDialog(theme) {
	const editThemeDialog = document.getElementById('edit-theme-dialog')
	const editThemeMenuCloseButton = document.getElementById('edit-theme-menu-close-button')
	const editThemeNameInput = document.getElementById('edit-theme-name-input')
	const editThemePropertiesList = document.getElementById('edit-theme-properties-list')
	const editThemeDeleteThemeButton = document.getElementById('edit-theme-delete-theme-button')

	editThemePropertiesList.replaceChildren()

	editThemeMenuCloseButton.onclick = e => {
		editThemeDialog.close()
	}

	editThemeNameInput.value = theme.name
	editThemeNameInput.oninput = e => {
		theme.name = editThemeNameInput.value
		saveCustomThemes()
		changeThemeWithTransitionAndSave(theme)
		updateThemeList()
	}

	for (const property in theme.properties) {
		// temp solution to exclude non-colors
		if (!theme.properties[property].includes('#')) continue
		const button = document.createElement('button')
		button.textContent = property
		button.onclick = e => {
			editThemeProperty(theme, property)
		}
		editThemePropertiesList.append(button)
	}

	editThemeDeleteThemeButton.onclick = e => {
		themer.remove(theme.slug)
		customThemes = customThemes.filter(i => i.slug != theme.slug)
		changeThemeWithTransitionAndSave(themer.get('default-light'))
		saveCustomThemes()
		updateThemeList()
		editThemeDialog.close()
	}

	editThemeDialog.showModal()
}

function updateThemeList() {
	themeList.replaceChildren()

	const editIconSVG = '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 -960 960 960"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>'

	for (const theme of themer.getAllThemes()) {
		const button = document.createElement('button')
		button.textContent = theme.name
		button.classList.add('radio-button', 'theme-list')
		if (themer.theme == theme.slug) button.classList.add('active')

		button.onclick = e => {
			document.querySelectorAll(`.radio-button.${'theme-list'}`).forEach(e => e.classList.remove('active'))
			button.classList.add('active')
			changeThemeWithTransitionAndSave(theme)
		}

		if (customThemes.find(i => i.slug == theme.slug)) {
			const customThemeEntryContainer = document.createElement('div')
			customThemeEntryContainer.classList.add('custom-theme-entry')
			
			const editButton = document.createElement('button')
			editButton.innerHTML = editIconSVG
			editButton.classList.add('edit-button')
			customThemeEntryContainer.append(button, editButton)

			editButton.onclick = e => {
				editThemeDialog(theme)
			}

			themeList.append(customThemeEntryContainer)
		} else {
			themeList.append(button)
		}
	}

	const newThemeButton = document.createElement('button')
	newThemeButton.textContent = 'Create New Theme'
	newThemeButton.onclick = e => {
		createNewThemeDialog()
	}
	themeList.append(newThemeButton)
}

if (localStorage.getItem('theme')) {
	themer.theme = localStorage.getItem('theme')
}

updateThemeList()
