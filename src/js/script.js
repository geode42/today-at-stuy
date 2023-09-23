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
	const today = new Date(Date.now() + secondsOffsetFromUTC * 1000)
	
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

function updateBellScheduleTable() {
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

function updateStuff() {
	if (today != new Date().getDay()) {
		updateTodayInfo()
		updateTodayInfoFromAPI()
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