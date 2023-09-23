const getByID = id => document.getElementById(id)
const changeTextContent = (element, newText) => { if (element.textContent != newText) element.textContent = newText }

function createDiv(text='', className='') {
	const div = document.createElement('div')
	div.textContent = text
	div.className = className
	return div
}

function getSecondsFromString(time) {
	const [hours, minutes] = time.split(':')
	return Number(hours) * 3600 + Number(minutes) * 60
}