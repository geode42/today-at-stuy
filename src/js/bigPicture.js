const bigPictureOverlay = document.getElementById('big-picture-overlay')

const doubleTapDurationMS = 400

let timeOfLastTap = 0

function setBigPicture(enabled) {
	if (enabled) {
		bigPictureOverlay.style.display = null
		bigPictureOverlay.classList.add('open')
		bigPictureOverlay.style.fontSize = `${window.innerWidth / 100 * 3.2}px`
		if (navigator.userAgentData && navigator.userAgentData.mobile) {
			document.documentElement.requestFullscreen()
		}
	} else {
		bigPictureOverlay.style.display = 'none'
		bigPictureOverlay.classList.remove('open')
		if (document.fullscreenElement) {
			document.exitFullscreen()
		}
	}
}

function toggleBigPicture() {
	setBigPicture(!bigPictureOverlay.classList.contains('open'))
}

const tapHandler = () => {
	if (Date.now() - timeOfLastTap <= doubleTapDurationMS) {
		timeOfLastTap = 0
		toggleBigPicture()
		return
	}
	timeOfLastTap = Date.now()
}

document.addEventListener('mousedown', tapHandler)

screen.orientation.onchange = () => {
	setBigPicture(screen.orientation.type.includes('landscape'))
}

setBigPicture([90, 270].includes(screen.orientation.angle) && screen.orientation.type.includes('landscape'))
