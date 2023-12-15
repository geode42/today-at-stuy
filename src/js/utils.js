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

function createRadioButton(group, text, onclick, active=false) {
	const button = document.createElement('button')
	button.textContent = text
	button.classList.add('radio-button')
	button.classList.add(group)
	if (active) button.classList.add('active')

	button.onclick = e => {
		document.querySelectorAll(`.radio-button.${group}`).forEach(e => e.classList.remove('active'))
		button.classList.add('active')
		onclick(e)
	}

	return button
}

/* ------------------------------- Color Utils ------------------------------ */

// Mostly copied from https://stackoverflow.com/a/17243070 because I'm lazy
function HSVAtoRGBA(hsva) {
    let r, g, b, i, f, p, q, t;
	const [h, s, v, a] = hsva
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
	return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), Math.round(a * 255)]
}
function RGBAtoHSVA(rgba) {
    const [r, g, b, a] = rgba
	let max = Math.max(r, g, b), min = Math.min(r, g, b),
        d = max - min,
        h,
        s = (max === 0 ? 0 : d / max),
        v = max / 255;

    switch (max) {
        case min: h = 0; break;
        case r: h = (g - b) + d * (g < b ? 6: 0); h /= 6 * d; break;
        case g: h = (b - r) + d * 2; h /= 6 * d; break;
        case b: h = (r - g) + d * 4; h /= 6 * d; break;
    }

	return [h, s, v, a / 255]
}

// Somewhat copied from https://stackoverflow.com/a/39077686 because I haven't stopped being lazy
const RGBAToHex = rgba => '#' + rgba.map(x => x.toString(16).padStart(2, '0')).join('')
const HexToRGBA = hex => {
	if (hex.startsWith('#')) hex = hex.substring(1)
	switch (hex.length) {
		case 3:
			hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] + 'FF'
			break
		case 4:
			hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3]
			break
		case 6:
			hex += 'FF'
			break
	}

	const bigint = parseInt(hex, 16)
	return [bigint >> 24 & 255, bigint >> 16 & 255, bigint >> 8 & 255, bigint & 255]
}

const convertNameToSlug = name => name.replaceAll(' ', '-').toLowerCase().replaceAll(/[^-a-z0-9]/g, '')

// Also in themer (wanted themer to be self sufficient, but also wanted it here)
// Could probably make this shorter
const convertCamelCaseToKebabCase = i=>i.split('').reduce((a,i)=>a+(i==i.toLowerCase()?i:'-'+i.toLowerCase()))