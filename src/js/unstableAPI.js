const irregularBellScheduleDays = {
	'October 3 2023': 'Homeroom',
	'October 4 2023': 'Conference',
	'October 31 2023': 'Extended Homeroom',
	'November 14 2023': 'Extended Homeroom',
	'November 17 2023': 'Parent Teacher Conferences',
	'December 5 2023': 'Homeroom',
	'December 6 2023': 'Conference',
	'December 20 2023': 'Conference',
	'January 2 2024': 'Homeroom',
	'February 7 2024': 'Conference',
	'February 14 2024': 'Homeroom',
	'March 5 2024': 'Homeroom',
	'March 6 2024': 'Conference',
	'March 27 2024': 'Conference',
	'April 2 2024': 'Homeroom',
	'April 17 2024': 'Conference',
	'May 1 2024': 'Conference',
	'May 7 2024': 'Homeroom',
	'May 15 2024': 'Conference',
}

const noSchoolDays = {
	'September 25 2023': 'Yom Kippur',
	'October 9 2023': "Italian Heritage and Indigenous People' Day",
	'November 7 2023': 'Election Day',
	'November 23 2023': 'Thanksgiving',
	'November 24 2023': 'Thanksgiving',
	'December 25 2023': 'Winter Recess',
	'December 26 2023': 'Winter Recess',
	'December 27 2023': 'Winter Recess',
	'December 28 2023': 'Winter Recess',
	'December 29 2023': 'Winter Recess',
	'January 1 2024': 'Winter Recess',
	'January 15 2024': 'Martin Luther',
	'January 29 2024': "Chancellor's Conference Day",
	'February 19 2024': 'Midwinter Recess',
	'February 20 2024': 'Midwinter Recess',
	'February 21 2024': 'Midwinter Recess',
	'February 22 2024': 'Midwinter Recess',
	'February 23 2024': 'Midwinter Recess',
	'March 29 2024': 'Easter Weekend',
	'April 1 2024': 'Easter Weekend',
	'April 10 2024': 'Eid al-Fitr',
	'April 22 2024': 'Spring Recess',
	'April 23 2024': 'Spring Recess',
	'April 24 2024': 'Spring Recess',
	'April 25 2024': 'Spring Recess',
	'April 26 2024': 'Spring Recess',
	'April 29 2024': 'Spring Recess',
	'April 30 2024': 'Spring Recess',
	'May 27 2024': 'Memorial Day',
	'June 6 2024': "Chancellor's Conference Day",
	'June 17 2024': 'Eid al-Adha',
	'June 19 2024': 'Juneteenth',
}

/**
 * 
 * @param {Date} date
 * @returns {'A' | 'B'} The daytype of the given date
 */

function getADayBDay(date) {
	// This is an a-day
	const aDayBDayStartDate = 'September 7 2023'

	const startDate = new Date(aDayBDayStartDate)
	let daySwaps = 0
	for (const day of Object.keys(noSchoolDays)) {
		if (new Date(day) > date) break
		daySwaps++
	}
	daySwaps += Math.floor((date.getTime() - startDate.getTime()) / 1000 / 60 / 60 / 24)
	
	return ['A', 'B'][daySwaps % 2]
}
