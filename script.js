const bellSchedules = [
	{
		name: 'regular',
		schedule: [
			{ pd: '1', time: '8:00' },
			{ pd: 'b2', time: '8:41' },
			{ pd: '2', time: '8:45' },
			{ pd: 'b3', time: '9:26' },
			{ pd: '3', time: '9:31' },
			{ pd: 'b4', time: '10:15' },
			{ pd: '4', time: '10:20' },
			{ pd: 'b5', time: '11:01' },
			{ pd: '5', time: '11:06' },
			{ pd: 'b6', time: '11:47' },
			{ pd: '6', time: '11:52' },
			{ pd: 'b7', time: '12:33' },
			{ pd: '7', time: '12:38' },
			{ pd: 'b8', time: '13:19' },
			{ pd: '8', time: '13:24' },
			{ pd: 'b9', time: '14:05' },
			{ pd: '9', time: '14:09' },
			{ pd: 'b10', time: '14:50' },
			{ pd: '10', time: '14:54' },
			{ pd: 'end', time: '15:35' },
		],
	},
]

const optimizedBellSchedules = bellSchedules.map(i => ({ name: i.name, schedule: i.schedule.map(j => ({ pd: j.pd, time: getSecondsFromString(j.time) })) }))

const displayBellSchedule = []

bellSchedules.map(({ name, schedule }) => {
	const newSchedule = []
	for (let i = 0; i < schedule.length / 2; i++) {
		const pd = i + 1
		const startTimeSplit = schedule[i * 2].time.split(':')
		let startTime = startTimeSplit[0] + ':' + startTimeSplit[1]
		if (Number(startTimeSplit[0]) > 12) {
			startTime = (Number(startTimeSplit[0]) % 12) + ':' + startTimeSplit[1]
		}
		const endTimeSplit = schedule[i * 2 + 1].time.split(':')
		let endTime = endTimeSplit[0] + ':' + endTimeSplit[1]
		if (Number(endTimeSplit[0]) > 12) {
			endTime = (Number(endTimeSplit[0]) % 12) + ':' + endTimeSplit[1]
		}
		newSchedule.push({
			pd: pd,
			startTime: startTime,
			endTime: endTime,
		})
	}
	displayBellSchedule[name] = newSchedule
})

const noADayBDayDays = [
	'May 29',
	'June 1',
	'June 8',
	'June 14',
	'June 15',
	'June 16',
	'June 19',
	'June 20',
	'June 21',
	'June 22',
	'June 23',
	'June 27',
]

// This is an a-day
const aDayBDayStartDate = 'May 1'

const getByID = (id) => document.getElementById(id)
const changeTextContent = (element, newText) => { if (element.textContent != newText) element.textContent = newText }

let timeElapsedElement = getByID('time-elapsed'),
	timeElapsedUnitsElement = getByID('time-elapsed-units'),
	timeRemainingElement = getByID('time-remaining'),
	timeRemainingUnitsElement = getByID('time-remaining-units'),
	ADayBDayBeforeElement = getByID('a-day-b-day-before'),
	ADayBDayElement = getByID('a-day-b-day'),
	bellScheduleTable = getByID('bell-schedule-table')

// EST is -5 hours, EDT is -4 hours
const secondsOffsetFromUTC = -4 * 60 * 60

function getSecondsFromString(time) {
	const [hours, minutes] = time.split(':')
	return Number(hours) * 3600 + Number(minutes) * 60
}
const currentSchedule = 'regular'
let currentPeriod = ''

// The CSLab computers have incorrect unix times, this code figures out how off it is to be able to correct for it
let unixTimeFixOffset = 0
async function updateUnixTimeFixOffset() {
	unixTimeFixOffset = (await (await fetch('https://worldtimeapi.org/api/timezone/America/New_York')).json()).unixtime - Date.now() / 1000
}
updateUnixTimeFixOffset()



function createDiv(text='', className='') {
	const div = document.createElement('div')
	div.textContent = text
	div.className = className
	return div
}

let previousPeriod // To let the function below know when to update the table
function updateBellScheduleTable() {
	if (currentPeriod == previousPeriod) return

	previousPeriod = currentPeriod
	Array(...bellScheduleTable.children).slice(1).forEach(i => i.remove())

	for (const {pd, startTime, endTime} of displayBellSchedule[currentSchedule]) {
		const row = createDiv('', 'actual-row')

		// Add cells to row
		Array(pd, startTime, endTime).forEach(i => row.append(createDiv(i)))

		// Current period coloring
		if (currentPeriod == String(pd)) {
			row.classList.add('current-period')
		}

		// Create dividers
		if (![String(pd), String(pd - 1)].includes(currentPeriod) && String(pd) != currentPeriod.replace('b', '')) {
			bellScheduleTable.append(document.createElement('hr'))
		}

		// If in passsing
		if (currentPeriod.startsWith('b') && currentPeriod.substring(1) == String(pd)) {
			bellScheduleTable.append(createDiv('In passing', 'current-period'))
		}

		bellScheduleTable.append(row)
	}
}


function updateStuff() {
	let secondsSinceMidnight = (Date.now() / 1000 + unixTimeFixOffset + secondsOffsetFromUTC) % (24 * 60 * 60)
	const currentBellSchedule = optimizedBellSchedules.find(e => (e.name = currentSchedule)).schedule
	/* --------------------------- A day B day display -------------------------- */
	const currentDate = new Date()
	const startDate = new Date(aDayBDayStartDate + ' ' + currentDate.getFullYear())
	let daySwaps = 0
	for (const day of noADayBDayDays) {
		if (new Date(day + ' ' + currentDate.getFullYear()) < currentDate) {
			daySwaps++
		}
	}
	daySwaps += Math.floor((currentDate.getTime() - startDate.getTime()) / 1000 / 60 / 60 / 24)
	const currentADayBDay = daySwaps % 2 == 0 ? 'A' : 'B'
	changeTextContent(ADayBDayElement, currentADayBDay)
	changeTextContent(ADayBDayBeforeElement, `Today ${secondsSinceMidnight < currentBellSchedule[0].time
		? 'will be'
		: secondsSinceMidnight > currentBellSchedule.at(-1).time
			? 'was'
			: 'is'
		} ${currentADayBDay.toLowerCase().startsWith('a') ? 'an' : 'a'}`)

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

	let foundPeriod = false
	for (let i = currentBellSchedule.length - 1; i >= 0; i--) {
		const period = currentBellSchedule[i].pd

		const time = currentBellSchedule[i].time

		if (secondsSinceMidnight >= time) {
			foundPeriod = true
			const secondsElapsed = secondsSinceMidnight - time
			const textAndUnits = getElapsedTextFromSecondsElapsed(secondsElapsed)
			changeTextContent(timeElapsedElement, textAndUnits[0])
			changeTextContent(timeElapsedUnitsElement, textAndUnits[1])

			// If last period
			if (i == currentBellSchedule.length - 1) {
				const nextPeriodStartTime = currentBellSchedule[0].time
				const secondsToMidnight = 24 * 60 * 60 - secondsSinceMidnight
				const secondsRemaining = secondsToMidnight + nextPeriodStartTime
				const remainingTextAndUnits = getRemainingTextFromSecondsRemaining(secondsRemaining)
				changeTextContent(timeRemainingElement, remainingTextAndUnits[0])
				changeTextContent(timeRemainingUnitsElement, remainingTextAndUnits[1])
			} else {
				const nextPeriodStartTime = currentBellSchedule[i + 1].time
				const secondsRemaining = nextPeriodStartTime - secondsSinceMidnight
				const remainingTextAndUnits = getRemainingTextFromSecondsRemaining(secondsRemaining)
				changeTextContent(timeRemainingElement, remainingTextAndUnits[0])
				changeTextContent(timeRemainingUnitsElement, remainingTextAndUnits[1])
			}

			currentPeriod = period
			break
		}
	}
	if (!foundPeriod) {
		const secondsElapsed = 24 * 60 * 60 - currentBellSchedule.at(-1).time + secondsSinceMidnight
		const textAndUnits = getElapsedTextFromSecondsElapsed(secondsElapsed)
		changeTextContent(timeElapsedElement, textAndUnits[0])
		changeTextContent(timeElapsedUnitsElement, textAndUnits[1])

		const nextPeriodStartTime = currentBellSchedule[0].time
		const secondsRemaining = nextPeriodStartTime - secondsSinceMidnight
		const remainingTextAndUnits = getRemainingTextFromSecondsRemaining(secondsRemaining)
		changeTextContent(timeRemainingElement, remainingTextAndUnits[0])
		changeTextContent(timeRemainingUnitsElement, remainingTextAndUnits[1])
		currentPeriod = ''
	}

	updateBellScheduleTable()
}

updateStuff()
setInterval(() => {
	updateStuff()
}, 1000)