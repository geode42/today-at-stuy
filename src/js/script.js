const timeElapsedElement = getByID('time-elapsed'),
	  timeElapsedUnitsElement = getByID('time-elapsed-units'),
	  timeRemainingElement = getByID('time-remaining'),
	  timeRemainingUnitsElement = getByID('time-remaining-units'),

	  bigPictureTimeElapsedRemainingContainer = getByID('big-picture-time-elapsed-remaining-container'),
	  bigPictureTimeElapsedElement = getByID('big-picture-time-elapsed'),
	  bigPictureTimeElapsedUnitsElement = getByID('big-picture-time-elapsed-units'),
	  bigPictureTimeRemainingElement = getByID('big-picture-time-remaining'),
	  bigPictureTimeRemainingUnitsElement = getByID('big-picture-time-remaining-units'),
	  bigPictureNoSchoolInfoContainer = getByID('big-picture-no-school-info-container'),
	  bigPictureNoSchoolMessageElement = getByID('big-picture-no-school-message'),
	  bigPictureNoSchoolReasonElement = getByID('big-picture-no-school-reason'),

	  ADayBDayElement = getByID('a-day-b-day'),
	  bellScheduleTable = getByID('bell-schedule-table'),
	  noSchoolMessageElement = getByID('no-school-message'),
	  noSchoolReasonElement = getByID('no-school-reason'),
	  scheduleNameDisplay = getByID('schedule-name-display'),
	  noSchoolInfoContainer = getByID('no-school-info-container'),
	  timeElapsedRemainingContainer = getByID('time-elapsed-remaining-container'),
	  
	  optionsDialog = getByID('options-dialog'),
	  optionsMenuOpenButton = getByID('options-menu-open-button'),
	  optionsMenuCloseButton = getByID('options-menu-close-button')

/* -------------------- Options menu button history stuff ------------------- */
// So that you'll go to the main page when you press back while in the options menu

addEventListener('popstate', e => {
	optionsDialog.open ? optionsDialog.close() : optionsDialog.showModal()
})

optionsMenuOpenButton.onclick = e => {
	history.pushState({}, '')
	optionsDialog.showModal() // pushState doesn't trigger popstate
}

optionsMenuCloseButton.onclick = e => {
	history.back() // the popstate listener will handle the rest
}
/* -------------------------------------------------------------------------- */

if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
}

// EST is -5 hours, EDT is -4 hours
const secondsOffsetFromUTC = -5 * 60 * 60

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

function updateTodayInfo() {
	const today = new Date()
	
	const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
	const humanDateFormat = `${months[today.getMonth()]} ${today.getDate()} ${today.getFullYear()}`

	schoolDay = (!Object.hasOwn(noSchoolDays, humanDateFormat)) && ![0, 6].includes(today.getDay())

	noSchoolReason = noSchoolDays[humanDateFormat] || ''

	if (schoolDay) {
		currentSchedule = irregularBellScheduleDays[humanDateFormat] || 'Regular'
		currentDayType = getADayBDay(today)
	}
}


async function updateTodayInfoFromAPI() {
	const t1 = Date.now()
	const response = await (await fetch(`https://todayatstuy.com/unstableapi?t=${Date.now() / 1000}`)).json()
	const t2 = Date.now()
	const responseDuration = (t2 - t1) / 1000

	// I'm guessing that most of the time goes to getting to the server and back, and that both times are equal
	// This reminds me of that one Veritasium video about the speed of light
	unixTimeFixOffset = response.unixTime + responseDuration / 2 - Date.now() / 1000

	schoolDay = response.schoolDay
	noSchoolReason = response.event
	
	if (schoolDay) {
		currentDayType = response.dayType
		currentSchedule = response.bellSchedule
	}
}


let previousTableSchedulePeriod = 'Hi! Thanks for looking through the code, any suggestions are appreciated :)' // To let the function below know when to update the table
const currentPeriodRect = createDiv('', 'current-period-rect')

let scheduleOverride

scheduleNameDisplay.onclick = () => {
	scheduleOverride = Object.keys(bellSchedules).find((_, index) => Object.keys(bellSchedules)[--index] == (scheduleOverride || currentSchedule)) || Object.keys(bellSchedules)[0]
	if (scheduleOverride == currentSchedule) {
		scheduleOverride = undefined
	}
	updateBellScheduleTable()
}

let resizeTableTimeout
addEventListener('resize', () => {
	clearTimeout(resizeTableTimeout)
	resizeTableTimeout = setTimeout(() => {updateBellScheduleTable()}, 10)
})

function updateBellScheduleTable() {
	let innerCurrentPeriod = scheduleOverride ? undefined : currentPeriod?.pd
	let innerCurrentSchedule = scheduleOverride || currentSchedule
	if (JSON.stringify([bellScheduleTable, innerCurrentSchedule, innerCurrentPeriod, passing, window.innerWidth]) == previousTableSchedulePeriod) return
	previousTableSchedulePeriod = JSON.stringify([bellScheduleTable, innerCurrentSchedule, innerCurrentPeriod, passing, window.innerWidth])

	changeTextContent(scheduleNameDisplay, innerCurrentSchedule)

	Array(...bellScheduleTable.children).slice(1).forEach(i => i.remove())

	for (const {pd, start, end} of bellSchedules[innerCurrentSchedule]) {
		const row = createDiv('', 'actual-row')

		// Add cells to row
		const timeTo12HourTime = time => {
			let [hours, minutes] = time.split(':')
			if (hours > 12) hours %= 12  // lol, type coercion
			return `${hours}:${minutes}`
		}

		const customPeriodName = localStorage.getItem(`custom-period-names.${pd}`)
		const periodNameDiv = createDiv(customPeriodName || pd)
		periodNameDiv.contentEditable = true

		// Select the div's text on focus
		periodNameDiv.onfocus = e => {
			const range = document.createRange()
			range.selectNodeContents(periodNameDiv)
			const selection = getSelection()
			selection.removeAllRanges()
			selection.addRange(range)
		}

		// Save the new value on input
		periodNameDiv.oninput = e => {
			localStorage.setItem(`custom-period-names.${pd}`, e.target.textContent)
		}

		row.append(periodNameDiv, createDiv(timeTo12HourTime(start)), createDiv(timeTo12HourTime(end)))

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

function updateStuff() {
	if (today != new Date().getDay()) {
		updateTodayInfo()
		updateTodayInfoFromAPI()
		today = new Date().getDay()
	}

	const secondsSinceMidnight = (Date.now() / 1000 + unixTimeFixOffset + secondsOffsetFromUTC) % (24 * 60 * 60)
	const currentBellSchedule = optimizedBellSchedules.find(e => (e.name == (scheduleOverride || currentSchedule))).schedule
	/* ---------------------------- No school dialog ---------------------------- */
	if (!schoolDay) {
		noSchoolInfoContainer.style.display = null
		bigPictureNoSchoolInfoContainer.style.display = null
		timeElapsedRemainingContainer.style.display = 'none'
		bigPictureTimeElapsedRemainingContainer.style.display = 'none'
		changeTextContent(noSchoolMessageElement, [0, 6].includes(today) ? "Enjoy your weekend!" : "There's no school today!")
		changeTextContent(noSchoolReasonElement, noSchoolReason)
		changeTextContent(bigPictureNoSchoolMessageElement, [0, 6].includes(today) ? "Enjoy your weekend!" : "There's no school today!")
		changeTextContent(bigPictureNoSchoolReasonElement, noSchoolReason)
		updateBellScheduleTable()
		return
	}
	noSchoolInfoContainer.style.display = 'none'
	timeElapsedRemainingContainer.style.display = null
	bigPictureNoSchoolInfoContainer.style.display = 'none'
	bigPictureTimeElapsedRemainingContainer.style.display = null

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
			changeTextContent(bigPictureTimeElapsedElement, textAndUnits[0])
			changeTextContent(bigPictureTimeElapsedUnitsElement, textAndUnits[1])
		
			const secondsRemaining = currentPeriod.start - secondsSinceMidnight
			const remainingTextAndUnits = getRemainingTextFromSecondsRemaining(secondsRemaining)
			changeTextContent(timeRemainingElement, remainingTextAndUnits[0])
			changeTextContent(timeRemainingUnitsElement, remainingTextAndUnits[1])
			changeTextContent(bigPictureTimeRemainingElement, remainingTextAndUnits[0])
			changeTextContent(bigPictureTimeRemainingUnitsElement, remainingTextAndUnits[1])
		} else {
			const secondsElapsed = secondsSinceMidnight - currentPeriod.start
			const textAndUnits = getElapsedTextFromSecondsElapsed(secondsElapsed)
			changeTextContent(timeElapsedElement, textAndUnits[0])
			changeTextContent(timeElapsedUnitsElement, textAndUnits[1])
			changeTextContent(bigPictureTimeElapsedElement, textAndUnits[0])
			changeTextContent(bigPictureTimeElapsedUnitsElement, textAndUnits[1])
		
			const secondsRemaining = currentPeriod.end - secondsSinceMidnight
			const remainingTextAndUnits = getRemainingTextFromSecondsRemaining(secondsRemaining)
			changeTextContent(timeRemainingElement, remainingTextAndUnits[0])
			changeTextContent(timeRemainingUnitsElement, remainingTextAndUnits[1])
			changeTextContent(bigPictureTimeRemainingElement, remainingTextAndUnits[0])
			changeTextContent(bigPictureTimeRemainingUnitsElement, remainingTextAndUnits[1])
		}

		updateBellScheduleTable()
	} else {
		const secondsRemaining = currentBellSchedule[0].start - secondsSinceMidnight

		if (secondsRemaining >= 0) {
			changeTextContent(timeElapsedElement, '-')
			changeTextContent(timeElapsedUnitsElement, '')
			changeTextContent(bigPictureTimeElapsedElement, '-')
			changeTextContent(bigPictureTimeElapsedUnitsElement, '')
			const remainingTextAndUnits = getRemainingTextFromSecondsRemaining(secondsRemaining)
			changeTextContent(timeRemainingElement, remainingTextAndUnits[0])
			changeTextContent(timeRemainingUnitsElement, remainingTextAndUnits[1])
			changeTextContent(bigPictureTimeRemainingElement, remainingTextAndUnits[0])
			changeTextContent(bigPictureTimeRemainingUnitsElement, remainingTextAndUnits[1])
	
			updateBellScheduleTable()
		} else {
			noSchoolInfoContainer.style.display = null
			timeElapsedRemainingContainer.style.display = 'none'
			bigPictureNoSchoolInfoContainer.style.display = null
			bigPictureTimeElapsedRemainingContainer.style.display = 'none'
			updateBellScheduleTable()
			changeTextContent(noSchoolMessageElement, "Enjoy the rest of your day!")
			changeTextContent(bigPictureNoSchoolMessageElement, "Enjoy the rest of your day!")
		}
	}
}

updateStuff()
setInterval(() => {
	updateStuff()
}, 1000)