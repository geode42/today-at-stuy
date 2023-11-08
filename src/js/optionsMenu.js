const optionsMenu = getByID('options-menu')
const themeList = getByID('theme-list')

const themer = new Themer()

themer.add('Default Light', 'default-light', {
	foreground: '#444',
	background: '#FFF',

	timeElapsed: '#000',
	timeRemaining: '#000',
	elapsedRemainingUnits: '#AAA',
	elapsedRemainingLabels: '#AAA',
	elapsedRemainingDivider: '#DFDFDF',
	elapsedRemainingDividerThickness: '0.09rem',
	
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
	background: 'black',
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

function updateThemeList() {
	for (const theme of themer.getAllThemes()) {
		themeList.append(createRadioButton('theme-list', theme.name, () => {themer.theme = theme.slug}, themer.theme == theme.slug))
	}
}

updateThemeList()
