const bellSchedules = {
	'Regular': [
		{ pd: '1', start: '8:00', end: '8:41' },
		{ pd: '2', start: '8:45', end: '9:26' },
		{ pd: '3', start: '9:31', end: '10:15' },
		{ pd: '4', start: '10:20', end: '11:01' },
		{ pd: '5', start: '11:06', end: '11:47' },
		{ pd: '6', start: '11:52', end: '12:33' },
		{ pd: '7', start: '12:38', end: '13:19' },
		{ pd: '8', start: '13:24', end: '14:05' },
		{ pd: '9', start: '14:09', end: '14:50' },
		{ pd: '10', start: '14:54', end: '15:35' },
	],
	'Conference': [
		{ pd: '1', start: '8:00', end: '8:37' },
		{ pd: '2', start: '8:41', end: '9:18' },
		{ pd: '3', start: '9:22', end: '9:59' },
		{ pd: '4', start: '10:03', end: '10:40' },
		{ pd: '5', start: '10:44', end: '11:21' },
		{ pd: '6', start: '11:25', end: '12:02' },
		{ pd: '7', start: '12:06', end: '12:43' },
		{ pd: '8', start: '12:47', end: '13:24' },
		{ pd: '9', start: '13:28', end: '14:05' },
		{ pd: '10', start: '14:09', end: '14:46' },
	],
	'Homeroom': [
		{ pd: '1', start: '8:00', end: '8:40' },
		{ pd: '2', start: '8:45', end: '9:25' },
		{ pd: '3', start: '9:29', end: '10:09' },
		{ pd: 'hr', start: '10:13', end: '10:25' },
		{ pd: '4', start: '10:30', end: '11:10' },
		{ pd: '5', start: '11:14', end: '11:54' },
		{ pd: '6', start: '11:58', end: '12:38' },
		{ pd: '7', start: '12:42', end: '13:22' },
		{ pd: '8', start: '13:26', end: '14:06' },
		{ pd: '9', start: '14:10', end: '14:50' },
		{ pd: '10', start: '14:55', end: '15:35' },
	],
}

const optimizedBellSchedules = Object.entries(bellSchedules).map(([name, schedule]) => ({ name: name, schedule: schedule.map(j => ({ pd: j.pd, start: getSecondsFromString(j.start), end: getSecondsFromString(j.end) })) }))

const getByID = id => document.getElementById(id)
const changeTextContent = (element, newText) => { if (element.textContent != newText) element.textContent = newText }

const liveViewer = getByID('live-viewer'),
	  scheduleViewer = getByID('schedule-viewer')
	
const scheduleViewerTable = getByID('schedule-viewer-table'),
	  scheduleViewerRadioButtonContainer = getByID('schedule-viewer-radio-button-container')

const timeElapsedElement = getByID('time-elapsed'),
      timeElapsedUnitsElement = getByID('time-elapsed-units'),
      timeRemainingElement = getByID('time-remaining'),
      timeRemainingUnitsElement = getByID('time-remaining-units'),
      ADayBDayElement = getByID('a-day-b-day'),
      bellScheduleTable = getByID('bell-schedule-table'),
	  noSchoolMessageElement = getByID('no-school-message'),
      noSchoolReasonElement = getByID('no-school-reason')

// EST is -5 hours, EDT is -4 hours
const secondsOffsetFromUTC = -4 * 60 * 60

function getSecondsFromString(time) {
	const [hours, minutes] = time.split(':')
	return Number(hours) * 3600 + Number(minutes) * 60
}
let currentSchedule = 'Regular'
let scheduleViewerSchedule = 'Regular'
let currentDayType = 'A'
let currentPeriod
let previousPeriod
let passing = false
let schoolDay = true
let noSchoolReason = ''

// The CSLab computers have incorrect unix times, this code figures out how off it is to be able to correct for it
let unixTimeFixOffset = 0

/**
 * Gets a response from the todayatstuy API
 * @returns {Promise<{schoolDay?: boolean, event?: string, dayType?: 'A' | 'B', bellSchedule?: 'Regular' | 'Conference' | 'Homeroom', unixTime?: number}>}
 */
async function getTodayAtStuyAPIResponse(unixtime) {
	return await (await fetch(`https://todayatstuy.com/unstableapi?t=${unixtime}`)).json()
}

async function updateTodayInfo() {
	const response = await getTodayAtStuyAPIResponse(Date.now() / 1000)
	schoolDay = response.schoolDay
	noSchoolReason = response.event
	unixTimeFixOffset = response.unixTime - Date.now() / 1000
	
	if (schoolDay) {
		currentDayType = response.dayType
		currentSchedule = response.bellSchedule
	}
}


function createDiv(text='', className='') {
	const div = document.createElement('div')
	div.textContent = text
	div.className = className
	return div
}

function createRadioButton(group, text, onclick, active=false) {
	const button = document.createElement('button')
	button.textContent = text
	button.classList.add('radio-button')
	button.classList.add(group)
	if (active) button.classList.add('active')

	button.onclick = (e) => {
		document.querySelectorAll(`.radio-button.${group}`).forEach(e => e.classList.remove('active'))
		button.classList.add('active')
		onclick(e)
	}

	return button
}

for (const schedule in bellSchedules) {
	scheduleViewerRadioButtonContainer.append(createRadioButton('schedule-viewer-schedule-picker', schedule, () => {scheduleViewerSchedule = schedule; updateBellScheduleTable(scheduleViewerTable, scheduleViewerSchedule, undefined)}, scheduleViewerSchedule == schedule))
}

let previousTableSchedulePeriod = 'Hi! Thanks for looking through the code, any suggestions are appreciated :)' // To let the function below know when to update the table
function updateBellScheduleTable(table, currentSchedule, currentPeriod) {
	if (JSON.stringify([table, currentSchedule, currentPeriod]) == previousTableSchedulePeriod) return
	previousTableSchedulePeriod = JSON.stringify([table, currentSchedule, currentPeriod])

	Array(...table.children).slice(1).forEach(i => i.remove())

	for (const {pd, start, end} of bellSchedules[currentSchedule]) {
		const row = createDiv('', 'actual-row')

		// Add cells to row
		const timeTo12HourTime = time => {
			let [hours, minutes] = time.split(':')
			if (hours > 12) hours %= 12  // lol, type coercion
			return `${hours}:${minutes}`
		}
		[pd, timeTo12HourTime(start), timeTo12HourTime(end)].forEach(i => row.append(createDiv(i)))

		// Current period coloring
		if (currentPeriod == pd) {
			if (passing) table.append(createDiv('In passing', 'current-period'))
			else row.classList.add('current-period')
		}

		// Create dividers
		const previousPeriod = Object.values(bellSchedules[currentSchedule])[Object.entries(bellSchedules[currentSchedule]).findIndex(([_, value]) => value.pd == pd) - 1]?.pd
		if (currentPeriod != pd && (currentPeriod != previousPeriod || currentPeriod == undefined || passing)) {
			table.append(document.createElement('hr'))
		}
		table.append(row)
	}
}

let today = 'not today'

async function updateStuff() {
	if (today != new Date().getDay()) {
		await updateTodayInfo()
		today = new Date().getDay()
	}

	const secondsSinceMidnight = (Date.now() / 1000 + unixTimeFixOffset + secondsOffsetFromUTC) % (24 * 60 * 60)
	const currentBellSchedule = optimizedBellSchedules.find(e => (e.name = currentSchedule)).schedule
	/* ---------------------------- No school dialog ---------------------------- */
	if (!schoolDay) {
		liveViewer.style.display = 'none'
		scheduleViewer.style.display = null
		updateBellScheduleTable(scheduleViewerTable, scheduleViewerSchedule, undefined)
		changeTextContent(noSchoolMessageElement, [0, 6].includes(today) ? "Enjoy your weekend!" : "There's no school today!")
		changeTextContent(noSchoolReasonElement, noSchoolReason)
		return
	}
	liveViewer.style.display = null
	scheduleViewer.style.display = 'none'


	/* --------------------------- A day B day display -------------------------- */
	changeTextContent(ADayBDayElement, currentDayType)

	/* ------------ Time elapsed & remaining + current period display ----------- */

	// Helpful functions
	function getElapsedTextFromSecondsElapsed(secondsElapsed) {
		const minutesElapsed = Math.floor(secondsElapsed / 60)
		let elapsedText = minutesElapsed.toString()
		let elapsedUnits = ''
		if (secondsElapsed < 60) {
			if (Math.floor(secondsElapsed) != 0) {
				elapsedText = String(Math.floor(secondsElapsed))
				elapsedUnits = 's'
			}
		} else if (minutesElapsed >= 60) {
			const hoursElapsed = Math.floor(minutesElapsed / 60)
			elapsedText = String(hoursElapsed)
			elapsedUnits = 'hr'
		}

		return [elapsedText, elapsedUnits]
	}

	function getRemainingTextFromSecondsRemaining(secondsRemaining) {
		const minutesRemaining = Math.ceil(secondsRemaining / 60)
		let remainingText = minutesRemaining.toString()
		let remainingUnits = ''
		if (secondsRemaining < 60) {
			remainingText = String(Math.ceil(secondsRemaining))
			remainingUnits = 's'
		} else if (minutesRemaining >= 60) {
			const hoursRemaining = Math.ceil(minutesRemaining / 60)
			remainingText = String(hoursRemaining)
			remainingUnits = 'hr'
		}

		return [remainingText, remainingUnits]
	}

	previousPeriod = undefined
	currentPeriod = undefined
	for (let i = 0; i < currentBellSchedule.length; i++) {
		const previousInfo = currentBellSchedule[i - 1]
		const info = currentBellSchedule[i]

		if (info.start <= secondsSinceMidnight && secondsSinceMidnight < info.end) {
			currentPeriod = info
			previousPeriod = previousInfo
			passing = false
			break
		}

		if (!previousInfo || (previousInfo.end <= secondsSinceMidnight && secondsSinceMidnight < info.start)) {
			currentPeriod = info
			previousPeriod = previousInfo
			passing = true
			break
		}

	}
	if (currentPeriod) {
		if (passing) {
			if (!previousPeriod) {
				changeTextContent(timeElapsedElement, '-')
				changeTextContent(timeElapsedUnitsElement, '')
			} else {
				const secondsElapsed = secondsSinceMidnight - previousPeriod?.end || 0
				const textAndUnits = getElapsedTextFromSecondsElapsed(secondsElapsed)
				changeTextContent(timeElapsedElement, textAndUnits[0])
				changeTextContent(timeElapsedUnitsElement, textAndUnits[1])
			}
		
			const secondsRemaining = currentPeriod.start - secondsSinceMidnight
			const remainingTextAndUnits = getRemainingTextFromSecondsRemaining(secondsRemaining)
			changeTextContent(timeRemainingElement, remainingTextAndUnits[0])
			changeTextContent(timeRemainingUnitsElement, remainingTextAndUnits[1])
		} else {
			const secondsElapsed = secondsSinceMidnight - currentPeriod.start
			const textAndUnits = getElapsedTextFromSecondsElapsed(secondsElapsed)
			changeTextContent(timeElapsedElement, textAndUnits[0])
			changeTextContent(timeElapsedUnitsElement, textAndUnits[1])
		
			const secondsRemaining = currentPeriod.end - secondsSinceMidnight
			const remainingTextAndUnits = getRemainingTextFromSecondsRemaining(secondsRemaining)
			changeTextContent(timeRemainingElement, remainingTextAndUnits[0])
			changeTextContent(timeRemainingUnitsElement, remainingTextAndUnits[1])
		}
	}


	updateBellScheduleTable(bellScheduleTable, currentSchedule, currentPeriod)
}

updateStuff()
setInterval(() => {
	updateStuff()
}, 1000)