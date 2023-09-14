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

const timeElapsedElement = getByID('time-elapsed'),
      timeElapsedUnitsElement = getByID('time-elapsed-units'),
      timeRemainingElement = getByID('time-remaining'),
      timeRemainingUnitsElement = getByID('time-remaining-units'),
      ADayBDayElement = getByID('a-day-b-day'),
      bellScheduleTable = getByID('bell-schedule-table'),
	  noSchoolMessageElement = getByID('no-school-message'),
      noSchoolReasonElement = getByID('no-school-reason'),
	  scheduleNameDisplay = getByID('schedule-name-display'),
	  noSchoolInfoContainer = getByID('no-school-info-container'),
	  timeElapsedRemainingContainer = getByID('time-elapsed-remaining-container')

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

let previousTableSchedulePeriod = 'Hi! Thanks for looking through the code, any suggestions are appreciated :)' // To let the function below know when to update the table
const currentPeriodRect = createDiv('', 'current-period-rect')

let displayCurrentSchedule = currentSchedule

scheduleNameDisplay.onclick = () => {
	displayCurrentSchedule = Object.keys(bellSchedules).find((_, index) => Object.keys(bellSchedules)[--index] == displayCurrentSchedule) || Object.keys(bellSchedules)[0]
	updateBellScheduleTable()
}

let resizeTableTimeout
addEventListener('resize', () => {
	clearTimeout(resizeTableTimeout)
	resizeTableTimeout = setTimeout(() => {updateBellScheduleTable()}, 10)
})

async function updateBellScheduleTable() {
	let innerCurrentPeriod = displayCurrentSchedule == currentSchedule ? currentPeriod?.pd : undefined
	if (JSON.stringify([bellScheduleTable, displayCurrentSchedule, innerCurrentPeriod, passing, window.innerWidth]) == previousTableSchedulePeriod) return
	previousTableSchedulePeriod = JSON.stringify([bellScheduleTable, displayCurrentSchedule, innerCurrentPeriod, passing, window.innerWidth])

	changeTextContent(scheduleNameDisplay, displayCurrentSchedule)

	Array(...bellScheduleTable.children).slice(1).forEach(i => i.remove())

	for (const {pd, start, end} of bellSchedules[displayCurrentSchedule]) {
		const row = createDiv('', 'actual-row')

		// Add cells to row
		const timeTo12HourTime = time => {
			let [hours, minutes] = time.split(':')
			if (hours > 12) hours %= 12  // lol, type coercion
			return `${hours}:${minutes}`
		}
		[pd, timeTo12HourTime(start), timeTo12HourTime(end)].forEach(i => row.append(createDiv(i)))

		// Current period coloring
		if (innerCurrentPeriod == pd) {
			setTimeout(() => {
				currentPeriodRect.style.display = null
				const rowOffset = row.getBoundingClientRect()
				if (passing) {
					const height = 10
					currentPeriodRect.classList.add('passing')
					currentPeriodRect.style.top = `${rowOffset.y - height / 2}px`
					currentPeriodRect.style.left = `${rowOffset.x}px`
					currentPeriodRect.style.width = `${rowOffset.width}px`
					currentPeriodRect.style.height = `${height}px`
				} else {
					currentPeriodRect.classList.remove('passing')
					currentPeriodRect.style.top = `${rowOffset.y}px`
					currentPeriodRect.style.left = `${rowOffset.x}px`
					currentPeriodRect.style.width = `${rowOffset.width}px`
					currentPeriodRect.style.height = `${rowOffset.height}px`
				}
			}, 0);
		} else {
			currentPeriodRect.style.display = 'none'
		}

		// Create dividers
		bellScheduleTable.append(document.createElement('hr'))
		
		bellScheduleTable.append(row)
	}

	bellScheduleTable.append(currentPeriodRect)

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
		noSchoolInfoContainer.style.display = null
		timeElapsedRemainingContainer.style.display = 'none'
		changeTextContent(noSchoolMessageElement, [0, 6].includes(today) ? "Enjoy your weekend!" : "There's no school today!")
		changeTextContent(noSchoolReasonElement, noSchoolReason)
		updateBellScheduleTable()
		return
	}
	noSchoolInfoContainer.style.display = 'none'
	timeElapsedRemainingContainer.style.display = null

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

		if ((previousInfo?.end <= secondsSinceMidnight) && secondsSinceMidnight < info.start) {
			currentPeriod = info
			previousPeriod = previousInfo
			passing = true
			break
		}

	}
	if (currentPeriod) {
		if (passing) {
			const secondsElapsed = secondsSinceMidnight - previousPeriod?.end || 0
			const textAndUnits = getElapsedTextFromSecondsElapsed(secondsElapsed)
			changeTextContent(timeElapsedElement, textAndUnits[0])
			changeTextContent(timeElapsedUnitsElement, textAndUnits[1])
		
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

		updateBellScheduleTable()
	} else {
		const secondsRemaining = currentBellSchedule[0].start - secondsSinceMidnight

		if (secondsRemaining >= 0) {
			changeTextContent(timeElapsedElement, '-')
			changeTextContent(timeElapsedUnitsElement, '')
			const remainingTextAndUnits = getRemainingTextFromSecondsRemaining(secondsRemaining)
			changeTextContent(timeRemainingElement, remainingTextAndUnits[0])
			changeTextContent(timeRemainingUnitsElement, remainingTextAndUnits[1])
	
			updateBellScheduleTable()
		} else {
			noSchoolInfoContainer.style.display = null
			timeElapsedRemainingContainer.style.display = 'none'
			updateBellScheduleTable()
			changeTextContent(noSchoolMessageElement, "Enjoy the rest of your day!")
		}
	}
}

updateStuff()
setInterval(() => {
	updateStuff()
}, 1000)